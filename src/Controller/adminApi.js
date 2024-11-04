const connection = require("../../mysql.js");

const moment = require('moment');
const bcrypt = require("bcrypt");
const csv = require("csvtojson");
const { generateLoginToken } = require("../Middleware/jwt");
const uuid = require('uuid')
const SibApiV3Sdk = require('sib-api-v3-sdk')
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];

apiKey.apiKey = process.env.EMAIL_API_KEY

const senderMail = process.env.EMAIL

function isEmail(email) {
    var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (email !== '' && email.match(emailFormat)) { return true; }

    return false;
}

async function queryPromiseWithAsync(sql, values) {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (err, result) => {
            if (err) {
                console.error("Error in queryPromise:", err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

const adminLogin = async (req, res) => {
    try {
        const { email_Id, password } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // console.log("email",password);
        if (!email_Id || !password) {
            return res.json({ message: "Can't set empty fields", success: false });
        }

        if (!emailRegex.test(email_Id)) {
            return res.json({ message: "Invalid Email", success: false });
        }

        const companyDetailsSql = "SELECT * FROM lms_companyDetails WHERE admin_email =?"
        connection.query(companyDetailsSql, [email_Id], async (companyErr, companyResult) => {
            if (companyErr) {
                console.log("Company details query error:", companyErr);
                return res.status(500).json({ message: "Internal server error" });
            }

            if (companyResult?.length > 0) {
                const isPasswordValid = await bcrypt.compare(password, companyResult[0].admin_password);

                if (!isPasswordValid) {
                    return res.status(401).json({ message: "Incorrect password" ,success:false});
                }
                const companyObj = {
                    roleId: companyResult?.[0]?.role_Id,
                    email: companyResult?.[0]?.admin_email,
                    password: companyResult?.[0]?.admin_password
                };

                const adminToken = await generateLoginToken(companyObj);

                const updateSql = "UPDATE lms_companyDetails SET token = ? WHERE admin_email = ?";
                connection.query(updateSql, [adminToken, email_Id], function (
                    err,
                    updateResult
                ) {
                    if (err) {
                        console.log("Update error:", err);
                        return res.status(500).json({ message: "Internal server error" });
                    }
                    //   console.log("updateResult[0]",companyResult[0]);
                    return res.status(200).json({
                        status: 200,
                        message: "Login successful",
                        token: adminToken,
                        comp_id: companyResult[0].id,
                        success: true,
                    });
                });
            } else {
                console.log("User not found");
                return res.status(404).json({
                    message: "User not found",
                    success: false,
                });
            }
        });
    } catch (error) {
        return res.json({ message: "Internal Server Error", error: error, success: false })
    }
}

// ------------------------------------------Not in use----------------------------------------------

const getCourseLicenseManagement = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = "SELECT start_date, end_date,total_no_of_attendies FROM lms_CourseCompany WHERE comp_id =?";

        connection.query(sql, [comp_id], (err, resp) => {
            if (err) {
                console.log("err", err);
                return res.json({ message: "Error in query", success: false, error: err });
            }
            const startDate = resp[0].start_date;
            const endDate = resp[0].end_date;
            const total_no_of_attendies = resp[0].total_no_of_attendies

            // Convert endDate to Date object
            const endDateAsDate = new Date(endDate);

            // Remove the time part
            endDateAsDate.setHours(0, 0, 0, 0);

            // Increase the date by 1 day
            endDateAsDate.setDate(endDateAsDate.getDate() + 1);

            const data = {
                startDate: startDate,
                endDate: endDateAsDate.toISOString().split("T")[0], // Convert Date to string in YYYY-MM-DD format
                total_no_of_attendies: total_no_of_attendies
            };

            // console.log("data", data);
            return res.json({ message: "Success", data: data, success: true });
        });

    } catch (error) {
        console.log("Internal Server Error", error);
        return res.status(500).json({ message: "Internal Server Error", success: false, error: error });
    }
};

const getTNALicenseManagement = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = "SELECT start_date, end_date, total_no_of_attendies FROM TNA_licensing WHERE comp_id =?";
        connection.query(sql, [comp_id], (err, resp) => {
            if (err) {
                console.log(err);
                return res.json({ message: "Error in query", success: false, error: err });
            }

            const startDate = resp[0].start_date;
            const endDate = resp[0].end_date;

            // Convert start and end dates to Date objects
            const startDateAsDate = new Date(startDate);
            const endDateAsDate = new Date(endDate);

            // Increase end date by 1 day
            startDateAsDate.setDate(startDateAsDate.getDate() + 1);
            endDateAsDate.setDate(endDateAsDate.getDate() + 1);

            // Format dates to "YYYY-MM-DD" strings
            const formattedStartDate = startDateAsDate.toISOString().split("T")[0];
            const formattedEndDate = endDateAsDate.toISOString().split("T")[0];

            const data = {
                start_date: formattedStartDate,
                end_date: formattedEndDate,
                total_no_of_attendies: resp[0].total_no_of_attendies,
            };

            // console.log("data", data);
            return res.json({ message: "Success", data: data, success: true });
        });
    } catch (error) {
        console.log("Internal Server Error", error);
        return res.status(500).json({ message: "Internal Server Error", success: false, error: error });
    }
};

// -----------------combine api of courseLicenseManagement and tna---------------------------------

const getLicenseManagement = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        // Query for Course License
        const courseLicenseQuery = "SELECT start_date, end_date, total_no_of_attendies FROM lms_CourseCompany WHERE comp_id =?";
        connection.query(courseLicenseQuery, [comp_id], (courseErr, courseResp) => {
            if (courseErr) {
                console.log("Course License Error:", courseErr);
                return res.json({ message: "Error in Course License query", success: false, error: courseErr });
            }

            let courseData = {};
            if (courseResp?.length > 0) {
                const courseStartDate = courseResp[0].start_date;
                const courseEndDate = courseResp[0].end_date;
                const courseTotalAttendies = courseResp[0].total_no_of_attendies;
                // const v = JSON.parse(courseEndDate);
                // console.log("courseEndDate",courseEndDate);
                // Convert end dates to Date objects
                const courseEndDateAsDate = new Date(courseEndDate);

                const formattedCourseStartDate = new Date(courseStartDate).toLocaleDateString('en-GB');
                const formattedCourseEndDate = courseEndDateAsDate.toLocaleDateString('en-GB');

                courseData = {
                    start_date: formattedCourseStartDate,
                    end_date: formattedCourseEndDate,
                    total_no_of_attendies: courseTotalAttendies,
                };
            }

            // Query for TNA License
            const tnaLicenseQuery = "SELECT start_date, end_date, total_no_of_attendies FROM TNA_licensing WHERE comp_id =?";
            connection.query(tnaLicenseQuery, [comp_id], (tnaErr, tnaResp) => {
                if (tnaErr) {
                    console.log("TNA License Error:", tnaErr);
                    return res.json({ message: "Error in TNA License query", success: false, error: tnaErr });
                }

                let tnaData = {};
                if (tnaResp?.length > 0) {
                    const tnaStartDate = tnaResp[0].start_date;
                    const tnaEndDate = tnaResp[0].end_date;
                    const tnaTotalAttendies = tnaResp[0].total_no_of_attendies;

                    // Convert end dates to Date objects
                    const tnaStartDateAsDate = new Date(tnaStartDate);
                    const tnaEndDateAsDate = new Date(tnaEndDate);

                    const formattedTnaStartDate = tnaStartDateAsDate.toLocaleDateString('en-GB');
                    const formattedTnaEndDate = tnaEndDateAsDate.toLocaleDateString('en-GB');

                    tnaData = {
                        start_date: formattedTnaStartDate,
                        end_date: formattedTnaEndDate,
                        total_no_of_attendies: tnaTotalAttendies,
                    };
                }

                const data = {
                    courseLicense: courseData,
                    tnaLicense: tnaData,
                };

                return res.json({ message: "Success", data: data, success: true });
            });
        });
    } catch (error) {
        console.log("Internal Server Error", error);
        return res.status(500).json({ message: "Internal Server Error", success: false, error: error });
    }
};

const tnaAndCourseCount = async (req, res) => {
    try {
        const comp_id = req.params.comp_id
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = "SELECT no_of_tna,no_of_course FROM lms_companyDetails WHERE id =?"
        connection.query(sql, [comp_id], (err, resp) => {
            if (err) {
                console.log("Fatal Error", err);
                return res.json({ message: "Fatal error", success: false, error: err })
            }
            return res.json({ message: "Success", data: resp[0], success: true })
        })


    } catch (error) {
        console.log("Internal server error", error);
    }
}

const tnaLicenseDetails = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = `
        SELECT lms_employee.id as emp_id, lms_companyDetails.tna_license_code, lms_employee.emp_name, TNA_licensing.end_date, TNA_licensing.status
        FROM lms_companyDetails
        LEFT JOIN lms_employee ON lms_companyDetails.id = lms_employee.comp_id
        LEFT JOIN TNA_licensing ON lms_companyDetails.id = TNA_licensing.comp_id
        WHERE lms_companyDetails.id = ?`;

        connection.query(sql, [comp_id], (err, result) => {
            if (err) {
                console.error("Fatal Error:", err);
                return res.json({ message: "Fatal Error", success: false, error: err });
            }

            if (result?.length <= 0) {
                return res.json({ message: "Data does not exist for this company", success: true });
            }

            // Extract unique tna_license_code
            const tna_license_code = [...new Set(result.map(row => row.tna_license_code))];

            // Filter out rows with null comp_id
            const employees = result.filter(row => row.comp_id !== null);

            if (employees?.length <= 0) {
                return res.json({ message: "Data does not exist for this company", tna_license_code, success: true });
            }

            // Format dates and handle null values
            employees.forEach(employee => {
                if (employee.end_date) {
                    employee.end_date = moment(employee.end_date).format('DD-MM-YY');
                }
            });

            return res.json({ message: "Success", data: employees, success: true });
        });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return res.json({ message: "Internal Server error", success: false, error: error });
    }
};

const tnaLicenseManagementView = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = `
        SELECT 
          lms_employee.emp_name, 
          lms_employee.id,
          lms_employee.status, 
          'TNA' AS licenseType, 
          DATE_FORMAT(DATE_ADD(TNA_licensing.end_date, INTERVAL 1 DAY), '%y-%m-%d') AS formattedEndDate
        FROM lms_companyDetails
        LEFT JOIN lms_employee ON lms_companyDetails.id = lms_employee.comp_id
        LEFT JOIN TNA_licensing ON lms_companyDetails.id = TNA_licensing.comp_id
        WHERE lms_companyDetails.id = ?`;

        connection.query(sql, [comp_id], (err, resp) => {
            if (err) {
                return res.json({ message: "Fatal error", success: false, error: err });
            }
            return res.json({ message: "Success", data: resp, success: true });
        });
    } catch (error) {
        console.log("error", error);
        return res.json({ message: "Internal Server Error", error: error });
    }
};

const createTnaLicensing = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        // Check if comp_id already has a tna_license_code
        const checkLicenseCodeQuery = 'SELECT tna_license_code, no_of_tna FROM lms_companyDetails WHERE id = ?';
        connection.query(checkLicenseCodeQuery, [comp_id], (checkErr, checkResult) => {
            if (checkErr) {
                console.log(checkErr);
                return res.status(500).json({ status: 500, success: false, message: 'Error checking tna_license_code existence' });
            }

            let tna_license_code;
            let no_of_tna;
            let end_date;
            if (checkResult?.length > 0 && checkResult[0].tna_license_code) {
                // Use the existing tna_license_code
                tna_license_code = checkResult[0].tna_license_code;
                no_of_tna = checkResult[0].no_of_tna;
            }
            const searchEndDate = 'SELECT end_date FROM TNA_licensing WHERE comp_id = ?';
            connection.query(searchEndDate, [comp_id], (err, resp) => {
                if (err) {
                    return res.json({ message: 'Fatal error', success: false, error: err });
                }
                if (resp?.length > 0) {
                    end_date = resp[0].end_date;
                }
            });
            const searchEmployeeQuery = 'SELECT emp_email from lms_employee WHERE comp_id = ?';
            connection.query(searchEmployeeQuery, [comp_id], async (err, resp) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ status: 500, success: false, message: 'Error retrieving employee data' });
                }

                const updateTokenPromises = resp.map(async (value, index) => {
                    try {
                        if (index < no_of_tna) {
                            const uniqueToken = uuid.v4();
                            const mcqLink = `http://172.20.1.203:3000/TnaMcq/${tna_license_code}/${comp_id}/${uniqueToken}`; // Replace with your domain

                            const expirationTime = end_date; // Replace with your logic

                            const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
                            const sender = { email: senderMail, name: 'Nihal' }; // Replace with your sender details
                            const receivers = [{ email: value.emp_email }];
                            await apiInstance.sendTransacEmail({
                                sender,
                                to: receivers,
                                subject: 'Tna Link',
                                textContent: `Hello, this is server side. Your TNA License Code is: ${mcqLink}`,
                                htmlContent: `Hello, this is server side. Your TNA License Code is: ${mcqLink}`,
                            });

                            const updateTokenQuery = 'UPDATE lms_employee SET unique_token = ?, tna_link = ?, token_expiration = ? WHERE emp_email = ? AND comp_id = ?';
                            await new Promise((resolve, reject) => {
                                connection.query(updateTokenQuery, [uniqueToken, mcqLink, expirationTime, value.emp_email, comp_id], (updateErr, updateResult) => {
                                    if (updateErr) {
                                        reject(updateErr);
                                    } else {
                                        resolve();
                                    }
                                });
                            });
                        } else {
                            console.log(`No more emails will be sent to ${value.emp_email}`);
                        }
                    } catch (emailError) {
                        console.error('Email sending error:', emailError);
                        throw emailError;
                    }
                });

                Promise.all(updateTokenPromises)
                    .then((result) => {
                        return res.status(200).json({
                            status: 200,
                            message: 'tna license created',
                            success: true,
                            data: result,
                        });

                    }).catch((error) => {
                        console.log("Error occurred in Promise.all", error);
                        return res.status(500).json({ status: 500, success: false, message: 'Internal Server Error' });
                    });
            });
        });
    } catch (error) {
        console.log("Error occurred in generating license API", error);
        return res.status(500).json({ status: 500, success: false, message: 'Internal Server Error' });
    }
};

const getTnaLicenseCount = async (req, res) => {
    try {
        const comp_id = req.params.comp_id
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = 'SELECT total_no_of_attendies FROM TNA_licensing WHERE comp_id = ?'
        const result = await queryPromiseWithAsync(sql, comp_id)
        if (result?.length === 0) {
            return res.json({ message: "Not found", success: false })
        }
        const tnaLimit = result[0].total_no_of_attendies
        const alreadyEmployee = 'SELECT COUNT(*) as count FROM lms_employee WHERE comp_id = ?'
        const alreadyEmployeeResult = await queryPromiseWithAsync(alreadyEmployee, comp_id)
        let employeeCount
        if (alreadyEmployeeResult?.length === 0) {
            employeeCount = 0
        }
        else {
            employeeCount = alreadyEmployeeResult[0].count
        }
        if (employeeCount >= tnaLimit) {

            return res.json({ message: "Limit exceed", success: false,data:tnaLimit })
        }

        const limit = tnaLimit - employeeCount

        return res.status(200).json({
            status: 200,
            message: 'success',
            success: true,
            data: limit,
        });
    } catch (error) {
        console.log("Error occurred in generating license API", error);
        return res.status(500).json({ status: 500, success: false, message: 'Internal Server Error' });
    }
}

const courseLicenseDetails = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = `SELECT cc.course_code, ce.emp_id, ce.emp_name, ce.end_date, ce.status
            FROM lms_courseEmployee ce
            LEFT JOIN lms_CourseCompany cc ON ce.comp_id = cc.comp_id
            WHERE ce.comp_id = ?`;

        connection.query(sql, [comp_id], (err, resp) => {
            if (err) {
                return res.json({ message: "Fatal Error", success: false, error: err });
            }
            if (resp?.length <= 0) {
                return res.json({ message: "Data of this company does not exist", success: false });
            }
            return res.json({ message: "Success", data: resp, success: true });
        });
    } catch (error) {
        console.log("Error", error);
        return res.json({ message: "Internal server Error", success: false, error: error });
    }
};

const courseLicenseManagementView = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const licenseType = 'Course'; // Hardcoded value

        const sql = `SELECT emp_name, emp_id,course_code,end_date,status,? AS licenseType
        FROM lms_courseEmployee
        WHERE comp_id = ?`;
     
        connection.query(sql, [licenseType, comp_id], (err, resp) => {
            if (err) {
                return res.json({ message: "Fatal error", success: false, error: err });
            }
            if (resp?.length <= 0) {
                return res.json({ message: 'Course is not purchased by this company', success: false });
            }

            //--- Process the end_date field for each row in the response
            const processedData = resp?.map(row => {
                let endDate = new Date(row.end_date);

                if (endDate.getUTCHours() === 0 && endDate.getUTCMinutes() === 0 && endDate.getUTCSeconds() === 0) {
                    // If time is exactly 00:00:00, just keep the date part
                } else {
                    // Otherwise, subtract one day
                    endDate.setUTCDate(endDate.getUTCDate());
                }

                // Format the date to dd-mm-yy
                const day = String(endDate.getUTCDate()).padStart(2, '0');
                const month = String(endDate.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
                const year = String(endDate.getUTCFullYear()).slice(-2); // Get last two digits of the year

                row.end_date = `${day}-${month}-${year}`;

                return row;
            });

            return res.json({ message: 'Success', success: true, data: processedData });
        });
    } catch (error) {
        return res.json({ message: "Internal Server Error", error: error });
    }
};

const getEmployeeByCompanyId = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = "SELECT id, emp_name, emp_email, contact_no, DATE_FORMAT(dob, '%d-%m-%y') as dob, designation FROM lms_employee WHERE comp_id = ?";

        connection.query(sql, [comp_id], (err, resp) => {
            if (err) {
                return res.json({ message: "Fatal Error", success: false, error: err });
            }

            const responseData = {
                message: resp?.length === 0 ? "No employees found for this company" : "Success",
                data: resp,
                success: true
            };

            return res.json(responseData);
        });

    } catch (error) {
        console.log("Error", error);
        return res.json({ message: "Internal server Error", success: false, error: error });
    }
};

const uploadEmployee = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        let total_no_of_attendies;
        let employeeCount;

        console.log("one");

        // Convert the connection.query into a promise to use async/await
        const getTotalNoOfAttendies = (comp_id) => {
            return new Promise((resolve, reject) => {
                const sql = "SELECT total_no_of_attendies FROM TNA_licensing WHERE comp_id = ?";
                connection.query(sql, [comp_id], (err, resp) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp[0].total_no_of_attendies);
                    }
                });
            });
        };

        total_no_of_attendies = await getTotalNoOfAttendies(comp_id);

        const searchQuery = 'SELECT COUNT(*) as count FROM lms_employee WHERE comp_id =?';
        const result = await queryPromiseWithAsync(searchQuery, comp_id);
        if (result?.length === 0) {
            console.log("errrrr");
        }
        employeeCount = result[0].count;
        if (employeeCount >= total_no_of_attendies) {
            return res.json({ message: "Cannot upload Employees. Limit is over", success: false });
        }
        let newCount = total_no_of_attendies - employeeCount;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const filePath = req.file.path;
        const response = await csv().fromFile(filePath);

        let count = 0;
        const duplicateEmails = [];

        for (const item of response) {
            if (count < newCount) {
                const dateee = item.DOB;
                const convertToDate = (dateString) => {
                    const [dd, mm, yyyy] = dateString.split('-');
                    return new Date(`${yyyy}-${mm}-${dd}`);
                };
                const dob = convertToDate(dateee);
                const formattedDOB = dob.toISOString().slice(0, 19).replace('T', ' ');

                const query = 'INSERT INTO lms_employee (comp_id, emp_name, emp_email, designation, contact_no, dob, gender, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                console.log("4");

                try {
                    await new Promise((resolve, reject) => {
                        connection.query(query, [
                            comp_id,
                            item.Name,
                            item.Email,
                            item.Designation,
                            item.Contact,
                            formattedDOB,
                            item.Gender,
                            item.Department
                        ], (err, results) => {
                            if (err) {
                                if (err.code === 'ER_DUP_ENTRY') {
                                    duplicateEmails.push(item.Email);
                                    resolve(); // resolve the promise without throwing an error
                                } else {
                                    reject(err);
                                }
                            } else {
                                resolve(results);
                            }
                        });
                    });
                    count++;
                } catch (error) {
                    console.log("error", error);
                    if (error.code !== 'ER_DUP_ENTRY') {
                        throw error;
                    }
                }
            } else {
                console.log("break");
                break;
            }
        }
// console.log("duplicateEmailsduplicateEmails",duplicateEmails);
        // let message = ;
        if (duplicateEmails?.length > 0) {
            let message = `The following emails already exist and were not uploaded: ${duplicateEmails.join(', ')}`;
            console.log("message",message);
        return res.status(400).json({ message, success: false, count });

        }

        return res.status(200).json({ message:"uploaded successfully", success: true, count });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "Internal server error", success: false, error });
    }
};

const getCompanyEvent = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = 'SELECT date FROM trialEvents WHERE comp_id = ?';
        const result = await queryPromiseWithAsync(sql, comp_id);
        
        if (result?.length <= 0) {
            return res.json({ message: "No events created yet", success: false });
        }

        const data = JSON.parse(result[0].date);
        
        // Parse dates and convert them to Date objects
        const newDate = data.map(v => new Date(v));
        
        // Sort the dates in ascending order
        const sortedDate = newDate.sort((a, b) => a - b);

        // Format the sorted dates to 'DD/MM/YYYY'
        const formattedDate = sortedDate.map(v => {
            return v.toLocaleDateString('en-GB');
        });

        return res.json({ message: "Success", success: true, data: formattedDate });
    } catch (error) {
        console.log("Internal server error", error);
        return res.status(500).json({ status: 500, success: false, message: 'Internal Server Error' });
    }
};

const checkAuthentication = async(req,res)=>{
    try {
        const token = req.params.token
        const comp_id = req.params.comp_id
        if(!comp_id|| !token ){
            return res.json({message:"Company Id Or token  Not Provided",success:false})
        }
       
        const selectQuery = 'SELECT * FROM lms_companyDetails WHERE token = ? AND id =?'
        const result = await queryPromiseWithAsync(selectQuery,[token,comp_id])
        if(result?.length<=0){
            return res.json({message:"token Error",success:false});
        }
        return res.json({message:"success",success:true});
    } catch (error) {
        console.log("Internal Server Error");
        return res.json({message:"Internal Server Error",success:false,error:error});
    }
}
// checkAuthentication()
module.exports = { tnaAndCourseCount, getCourseLicenseManagement, getTNALicenseManagement, tnaLicenseDetails, courseLicenseDetails, getEmployeeByCompanyId, adminLogin, getLicenseManagement, tnaLicenseManagementView, courseLicenseManagementView, createTnaLicensing, uploadEmployee,getTnaLicenseCount,getCompanyEvent, checkAuthentication}