const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")
const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;




const uploadEmployee = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not Provided ",success:false})
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
        return res.status(400).json({ success: false, message: "Uploaded file must be in CSV format" });
      }
  
      const filePath = req.file.path;
      const response = await csv().fromFile(filePath);
  
      const requiredFields = ["Name", "Email", "Designation", "Contact", "DOB", "Gender", "Department"];
      let missingFields = [];
      let emailsProcessed = new Set();
      let count = 0;
  
      // Check for missing fields
      for (const item of response) {
        missingFields = requiredFields.filter(field => !item.hasOwnProperty(field) || item[field] === "");
        if (missingFields?.length > 0) {
          return res.status(400).json({
            success: false,
            missing:`${missingFields.join(", ")}`,
            message: `Missing fields: ${missingFields.join(", ")}`,
          });
        }
  
        if (emailsProcessed.has(item.Email)) {
          console.log(`Duplicate email ${item.Email} found in CSV. Skipping...`);
          continue;
        }
  
        const dateee = item.DOB;
        const convertToDate = (dateString) => {
          const [dd, mm, yyyy] = dateString.split("-");
          return new Date(`${yyyy}-${mm}-${dd}`);
        };
        const dob = convertToDate(dateee);
        const formattedDOB = dob.toISOString().slice(0, 19).replace("T", " ");
  
        const checkQuery = "SELECT id FROM lms_employee WHERE comp_id = ? AND emp_email = ?";
        const checkResult = await queryPromiseWithAsync(checkQuery, [comp_id, item.Email]);
  
        if (checkResult?.length > 0) {
          console.log(`Employee with email ${item.Email} already exists for company ${comp_id}. Skipping...`);
          continue;
        }
  
        const query = "INSERT INTO lms_employee (comp_id, emp_name, emp_email, designation, contact_no, dob, gender, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        await queryPromiseWithAsync(query, [
          comp_id,
          item.Name,
          item.Email,
          item.Designation,
          item.Contact,
          formattedDOB,
          item.Gender,
          item.Department,
        ]);
  
        emailsProcessed.add(item.Email);
        count++;
      }
  
      return res.status(200).json({ msg: "Uploaded successfully", success: true, count: count });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ msg: error.message, success: false, message: "Internal server error" });
    }
 };
  
const generateTnaLicensing = async (req, res) => {
    try {
      const {tna_duration,start_date,end_date,sub_total,free_evaluation,discount,
        grand_total,
        total_no_of_attendies,
      } = req.body;
      const comp_id = req.params.comp_id;
      let previousSubTotal
      let previoiusFree_evaluation
      let previousDiscount
      let previousGrand_total
      let previousTotal_no_of_attendies
      if(!tna_duration||!start_date||!end_date||!sub_total||!free_evaluation||!discount||!grand_total||!total_no_of_attendies){
        return res.json({message:"Insuffecient data ",success:false})
      }
      // Check if comp_id already has a tna_license_code
      const checkLicenseCodeQuery ="SELECT tna_license_code,sub_total,free_evaluation ,discount,grand_total,total_no_of_attendies FROM TNA_licensing WHERE comp_id = ?";
      connection.query(checkLicenseCodeQuery, [comp_id], (checkErr, checkResult) => {
        if (checkErr) {
          console.log(checkErr);
          return res.status(500).json({
            status: 500,
            success: false,
            message: "Error checking tna_license_code existence",
          });
        }
  
        let tna_license_code;
        if (checkResult?.length > 0 && checkResult[0].tna_license_code) {
          // Use the existing tna_license_code
          tna_license_code = checkResult[0].tna_license_code;
          previousSubTotal = checkResult[0].sub_total
          previoiusFree_evaluation = checkResult[0].free_evaluation
          previousDiscount = checkResult[0].discount
  
          previousGrand_total = checkResult[0].grand_total
          previousTotal_no_of_attendies = checkResult[0].total_no_of_attendies
  
  
          // Fetch employee emails and update tokens
          const searchEmployeeQuery =
            "SELECT emp_email FROM lms_employee WHERE comp_id = 1 AND tna_link IS NULL ";
          connection.query(searchEmployeeQuery, [comp_id], (err, resp) => {
            if (err) {
              console.log(err);
              return res.status(500).json({
                status: 500,
                success: false,
                msg: "Error retrieving employee data",
              });
            }
            // console.log("resp",resp);
            const updateTokenPromises = resp?.map(async (value) => {
              try {
                const uniqueToken = uuid.v4();
                const mcqLink = `http://172.20.1.203:3000/TnaMcq/${tna_license_code}/${comp_id}/${uniqueToken}`;
  
                // Calculate expiration time as the difference between end_date and start_date
                const expirationTime = end_date;
  
                // Set your sender email address
                const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
                const sender = { email: senderMail, name: "Nihal" };
                const receivers = [{ email: value.emp_email }];
  
                await apiInstance.sendTransacEmail({
                  sender,
                  to: receivers,
                  subject: "Tna Link",
                  textContent: `Hello, this is server side. Your TNA License Code is: ${mcqLink}`,
                  htmlContent: `Hello, this is server side. Your TNA License Code is:<a href="${mcqLink}">${mcqLink}</a>`,
                });
  
                // Update employee's unique_token and tna_link
                const updateTokenQuery =
                  "UPDATE lms_employee SET unique_token = ?, tna_link = ?, token_expiration = ? WHERE emp_email = ? AND comp_id = ?";
                await new Promise((resolve, reject) => {
                  connection.query(
                    updateTokenQuery,
                    [uniqueToken,mcqLink,expirationTime,value.emp_email,comp_id,],
                    (updateErr, updateResult) => {
                      if (updateErr) {
                        reject(updateErr);
                      } else {
                        resolve();
                      }
                    }
                  );
                });
              } catch (emailError) {
                console.error("Email sending error:", emailError);
                throw emailError;
              }
            });
  
            // Wait for all promises to resolve
            Promise.all(updateTokenPromises)
              .then(() => {
                // Update existing entry in TNA_licensing table with additional data
                const updateTnaLicensingQuery =
                  "UPDATE TNA_licensing SET tna_duration =?, start_date=?,end_date=?, sub_total = ?, free_evaluation = ?, discount = ?, grand_total = ?, total_no_of_attendies = ? WHERE comp_id = ?";
                connection.query(
                  updateTnaLicensingQuery,
                  [tna_duration,
                    start_date,end_date,
                    parseInt(sub_total),
                    parseInt(free_evaluation) ,
                    parseInt(discount) ,
                    parseInt(grand_total) ,
                    parseInt(total_no_of_attendies),
                    comp_id,
                  ],
                  (updateErr, updateResult) => {
                    if (updateErr) {
                      console.log(updateErr);
                      return res.status(500).json({
                        status: 500,
                        success: false,
                        msg: "Error updating TNA_licensing table",
                      });
                    }
                    const sqlUpdateCompany =
                      "UPDATE lms_companyDetails SET no_of_tna = ? ,tna_license_code = ? WHERE id = ?";
                    connection.query(
                      sqlUpdateCompany,
                      [parseInt(total_no_of_attendies) , tna_license_code, comp_id],
                      (errUpdateCompany, respUpdateCompany) => {
                        if (errUpdateCompany) {
                          console.log(errUpdateCompany);
                          return res.status(500).json({
                            status: 500,
                            success: false,
                            msg: "Error updating company details",
                          });
                        }
  
  
                      }
                    );
                    return res.status(200).json({
                      status: 200,
                      message: "tna license updated",
                      success: true,
                      result: updateResult,
                    });
                  }
                );
              })
              .catch((error) => {
                console.log("Error occurred in Promise.all", error);
                return res.status(500).json({
                  status: 500,
                  success: false,
                  msg: "Internal Server Error",
                });
              });
          });
        } else {
          // Generate a new tna_license_code
          const code = generateRandomCode(16);
          tna_license_code = code + comp_id;
  
          // Fetch employee emails and update tokens
          const searchEmployeeQuery =
            "SELECT emp_email from lms_employee WHERE comp_id = ?";
          connection.query(searchEmployeeQuery, [comp_id], (err, resp) => {
            if (err) {
              console.log(err);
              return res.status(500).json({
                status: 500,
                success: false,
                msg: "Error retrieving employee data",
              });
            }
  
            const updateTokenPromises = resp.map(async (value) => {
              try {
                const uniqueToken = uuid.v4();
                const mcqLink = `http://172.20.1.203:3000/TnaMcq/${tna_license_code}/${comp_id}/${uniqueToken}`;
  
                // Calculate expiration time as the difference between end_date and start_date
                const expirationTime = end_date;
  
                // Set your sender email address
                const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
                const sender = { email: senderMail, name: "Nihal" };
                const receivers = [{ email: value.emp_email }];
  
                await apiInstance.sendTransacEmail({
                  sender,
                  to: receivers,
                  subject: "Tna Link",
                  textContent: `Hello, this is server side. Your TNA License Code is: ${mcqLink}`,
                  htmlContent: `Hello, this is server side. Your TNA License Code is: <a href="${mcqLink}">${mcqLink}</a>`,
                });
  
                // Update employee's unique_token and tna_link
                const updateTokenQuery =
                  "UPDATE lms_employee SET unique_token = ?, tna_link = ?, token_expiration = ? WHERE emp_email = ? AND comp_id = ?";
                await new Promise((resolve, reject) => {
                  connection.query(
                    updateTokenQuery,
                    [
                      uniqueToken,
                      mcqLink,
                      expirationTime,
                      value.emp_email,
                      comp_id,
                    ],
                    (updateErr, updateResult) => {
                      if (updateErr) {
                        reject(updateErr);
                      } else {
                        resolve();
                      }
                    }
                  );
                });
              } catch (emailError) {
                console.error("Email sending error:", emailError);
                throw emailError;
              }
            });
  
            // Wait for all promises to resolve
            Promise.all(updateTokenPromises)
              .then(() => {
                // Insert into TNA_licensing table
                const insertTnaLicensingQuery =
                  "INSERT INTO TNA_licensing (comp_id, tna_license_code, tna_duration, start_date, end_date, sub_total, free_evaluation, discount, grand_total, total_no_of_attendies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                connection.query(
                  insertTnaLicensingQuery,
                  [
                    comp_id,
                    tna_license_code,
                    tna_duration,
                    start_date,
                    end_date,
                    sub_total,
                    free_evaluation,
                    discount,
                    grand_total,
                    total_no_of_attendies,
                  ],
                  (insertErr, insertResult) => {
                    if (insertErr) {
                      console.log(insertErr);
                      return res.status(500).json({
                        status: 500,
                        success: false,
                        msg: "Error inserting data into TNA_licensing table",
                      });
                    }
  
                    const sqlUpdateCompany =
                      "UPDATE lms_companyDetails SET no_of_tna = ? ,tna_license_code = ? WHERE id = ?";
                    connection.query(
                      sqlUpdateCompany,
                      [total_no_of_attendies, tna_license_code, comp_id],
                      (errUpdateCompany, respUpdateCompany) => {
                        if (errUpdateCompany) {
                          console.log(errUpdateCompany);
                          return res.status(500).json({
                            status: 500,
                            success: false,
                            msg: "Error updating company details",
                          });
                        }
  
                        return res.status(200).json({
                          status: 200,
                          message: "tna license created",
                          success: true,
                          result: respUpdateCompany,
                        });
                      }
                    );
                  }
                );
              })
              .catch((error) => {
                console.log("Error occurred in Promise.all", error);
                return res.status(500).json({
                  status: 500,
                  success: false,
                  msg: "Internal Server Error",
                });
              });
          });
        }
      });
    } catch (error) {
      console.log("Error occurred in generating license API", error);
      return res
        .status(500)
        .json({ status: 500, success: false, msg: "Internal Server Error" });
    }
};
  
const generateTnaCodeWithoutEmployee = async (req, res) => {
    try {
      // console.log("req.body;",req.body);
      const {
        tna_duration,
        start_date,
        end_date,
        sub_total,
        free_evaluation,
        discount,
        grand_total,
        total_no_of_attendies,
      } = req.body;
      const comp_id = req.params.comp_id;
      let previousSubTotal
      let previoiusFree_evaluation
      let previousDiscount
      let previousGrand_total
      if(!tna_duration||!start_date||!end_date||!sub_total||!free_evaluation||!discount||!grand_total||!total_no_of_attendies){
        return res.json({message:"Insuffecient data ",success:false})
      }
      // Check if comp_id already has a tna_license_code
      const checkLicenseCodeQuery =
        "SELECT tna_license_code,total_no_of_attendies FROM TNA_licensing WHERE comp_id = ?";
      connection.query(checkLicenseCodeQuery,[comp_id],(checkErr, checkResult) => {
          if (checkErr) {
            console.log(checkErr);
            return res.status(500).json({success: false,msg: "Error checking tna_license_code existence",
            });
          }
  
          let tna_license_code;
          let attendies;
          if (checkResult?.length > 0 && checkResult[0].tna_license_code) {
            tna_license_code = checkResult[0].tna_license_code;
            attendies = checkResult[0].total_no_of_attendies;
            updateTnaLicenseRecord();
          } else {
            // Generate a new tna_license_code
            const code = generateRandomCode(16);
            tna_license_code = code + comp_id;
            insertTnaLicenseRecord();
          }
  
          console.log("tna_license_code", tna_license_code);
  
          function updateTnaLicenseRecord() {
            // Update TNA_licensing table
            const updateSql =
              "UPDATE TNA_licensing SET tna_duration = ?, start_date = ?, end_date = ?, sub_total = ?, free_evaluation = ?, discount = ?, grand_total = ?, total_no_of_attendies = ? WHERE comp_id = ?";
            connection.query(
              updateSql,
              [
                parseInt(tna_duration),
                start_date,
                end_date,
                parseInt(sub_total),
                parseInt(free_evaluation),
                parseInt(discount),
                parseInt(grand_total),
                parseInt(total_no_of_attendies), // Add new attendies to existing attendies
                comp_id,
              ],
              (err, result) => {
                if (err) {
                  console.log(err);
                  return res.status(500).json({
                    status: 500,
                    success: false,
                    msg: "Error updating data in TNA_licensing table",
                  });
                }
                updateCompanyDetails(result); // Pass the result to the next function
              }
            );
          }
  
          function insertTnaLicenseRecord() {
            console.log("attendies in insertTnaLicenseRecord ",total_no_of_attendies , "type insertTnaLicenseRecord",typeof total_no_of_attendies);
            // Insert into TNA_licensing table
            const insertSql =
              "INSERT INTO TNA_licensing (comp_id, tna_license_code, tna_duration, start_date, end_date, sub_total, free_evaluation, discount, grand_total, total_no_of_attendies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            connection.query(
              insertSql,
              [
                comp_id,
                tna_license_code,
                parseInt(tna_duration),
                start_date,
                end_date,
                parseInt(sub_total),
                parseInt(free_evaluation),
                parseInt(discount),
                parseInt(grand_total),
                parseInt(total_no_of_attendies)
              ],
              (err, result) => {
                if (err) {
                  console.log(err);
                  return res.status(500).json({
                    status: 500,
                    success: false,
                    msg: "Error inserting data into TNA_licensing table",
                  });
                }
                // console.log("result",result);
                updateCompanyDetails(result); // Pass the result to the next function
              }
            );
          }
  
          function updateCompanyDetails(result) {
            console.log("attendies in updateCompanyDetails ",total_no_of_attendies , "type",typeof total_no_of_attendies);
            const sqlUpdateCompany =
              "UPDATE lms_companyDetails SET no_of_tna = ? ,tna_license_code = ? WHERE id = ?";
            connection.query(
              sqlUpdateCompany,
              [parseInt(total_no_of_attendies), tna_license_code, comp_id], // Add new attendies to existing attendies
              (errUpdateCompany, respUpdateCompany) => {
                if (errUpdateCompany) {
                  console.log(errUpdateCompany);
                  return res.status(500).json({
                    status: 500,
                    success: false,
                    msg: "Error updating company details",
                  });
                }
  
                return res.status(200).json({
                  status: 200,
                  message: "tna license created",
                  success: true,
                  result: result, // Pass the result to the response
                });
              }
            );
          }
        }
      );
    } catch (error) {
      console.log("Error occurred in generating license API", error);
      return res
        .status(500)
        .json({ status: 500, success: false, msg: "Internal Server Error" });
    }
};
  
// const uploadCourseEmployee = async (req, res) => {
  //   try {
  //     const comp_id = req.params.comp_id;
  //     const course_id = req.params.course_id
  //     if (!req.file) {
  //       return res.status(400).json({ success: false, message: "No file uploaded" });
  //     }
  //     if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
  //       return res.status(400).json({ success: false, message: "Uploaded file must be in CSV format" });
  //     }
  //     const filePath = req.file.path;
  
  //     const response = await csv().fromFile(filePath);
  
  //     let count = 0;
  //     for (const item of response) {
  //       count++;
  //       const dateee = item.DOB;
  //       const convertToDate = (dateString) => {
  //         const [dd, mm, yyyy] = dateString.split("-");
  //         const dat = new Date(`${yyyy}-${mm}-${dd}`);
  //         return dat;
  //       };
  //       const dob = convertToDate(dateee);
  //       const formattedDOB = dob.toISOString().slice(0, 19).replace("T", " ");
  
  //       const searchEmployeeQuery = "SELECT id, tna_score FROM lms_employee WHERE emp_email = ? AND comp_id = ?";
  //       const employeeRows = await queryPromiseWithAsync(searchEmployeeQuery, [item.Email, comp_id]);
  //       console.log("employeeRows", employeeRows?.length);
  //       if (employeeRows?.length <= 0) {
  //         return res.json({ message: "Employee is new and not found in database", success: false });
  //       }
  
  //       const empId = employeeRows[0].id;
  //       const tnaScore = employeeRows[0].tna_score;
  
  //       const checkEmployeeQuery = "SELECT emp_id FROM lms_courseEmployee WHERE emp_id = ? AND comp_id = ?";
  //       const checkResp = await queryPromiseWithAsync(checkEmployeeQuery, [empId, comp_id]);
  
  //       if (checkResp?.length > 0) {
  //         const updateQuery = "UPDATE lms_courseEmployee SET emp_name = ?, designation = ?, emp_contact = ?, dob = ?, department = ?, gender = ?, tna_score = ? WHERE emp_id = ? AND course_id = ?";
  //         await queryPromiseWithAsync(updateQuery, [
  //           item.Name,
  //           item.Designation,
  //           item.Contact,
  //           formattedDOB,
  //           item.Department,
  //           item.Gender,
  //           tnaScore,
  //           empId,
  //           course_id,
  //         ]);
  //       } else {
  //         const insertQuery = "INSERT INTO lms_courseEmployee (comp_id, emp_id, emp_name, emp_email, designation, emp_contact, dob, department, gender, tna_score,course_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)";
  //         await queryPromiseWithAsync(insertQuery, [
  //           comp_id,
  //           empId,
  //           item.Name,
  //           item.Email,
  //           item.Designation,
  //           item.Contact,
  //           formattedDOB,
  //           item.Department,
  //           item.Gender,
  //           tnaScore,
  //           course_id
  //         ]);
  //       }
  //     }
  
  //     console.log("Uploaded employee API");
  //     return res.status(200).json({ msg: "Uploaded successfully", success: true, count: count });
  //   } catch (error) {
  //     console.log(error);
  //     return res.status(500).json({ msg: "Internal server error", success: false });
  //   }
  // };
  

const getEmployeeById = async (req, res) => {
    const employeeId = req.params.emp_id;
    if(!employeeId){
      return res.json({message:"Employee Id is not provided",success:false})
    }
    // Execute the query
    connection.query(
      "SELECT * FROM lms_employee WHERE  id = ?",
      [employeeId],
      (err, rows) => {
        if (err) {
          console.error("Error executing query:", err);
          res.status(500).json({ success: false, message: "Internal server error" });
          return;
        }
  
        if (rows.length > 0) {
          if (rows[0].dob) {
            const dob = new Date(rows[0].dob).toLocaleDateString('en-GB');
            rows[0].dob = dob;
          }
  
          res.json({ success: true, data: rows[0] });
          return;
        } else {
          res.json({ success: false, message: "Employee not found" });
        }
      }
    );
};
  
const getEmployeeByCompanyId = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id  is not provided",success:false})
      }
      const sql = "SELECT id, emp_name, emp_email, contact_no, tna_link FROM lms_employee WHERE comp_id = ?";
  
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
  
const getCompanyByEmployeeById = async (req, res) => {
  try {
    const employeeId = req.params.emp_id;
    if(!employeeId){
      return res.json({message:"Employee Id is not provided",success:false})
    }
    // Execute the query
    connection.query(
      "SELECT comp_id FROM lms_employee WHERE  id = ?",
      [employeeId],
      async (err, rows) => {
        if (err) {
          console.error("Error executing query:", err);
          res
            .status(500)
            .json({ success: false, message: "Internal server error" });
          return;
        }
  
        if (rows?.length > 0) {
          const comp_id = rows[0].comp_id;
          const getCourseId = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id =?'
          const result = await queryPromiseWithAsync(getCourseId,comp_id)
          if(result?.length<=0){
            const sql = "SELECT * FROM lms_companyDetails WHERE id = ?";
            connection.query(sql, [comp_id], (err, companyDetails) => {
              if (err) {
                res.json({ message: "error", error: err, success: false });
              }
              return res.json({
                message: "success",
                success: true,
                data: companyDetails[0],
              
              });
            });
          }else{
            const course_id = result[0].course_id
            const sql = "SELECT * FROM lms_companyDetails WHERE id = ?";
            connection.query(sql, [comp_id], (err, companyDetails) => {
              if (err) {
                res.json({ message: "error", error: err, success: false });
              }
              return res.json({
                message: "success",
                success: true,
                data: companyDetails[0],
                course_id:course_id
              });
            });
          }
         
        } else {
          return res.json({ success: false, message: "Employee not found" });
        }
      }
    );
    
  } catch (error) {
    return res.json({ message: "Internal server error", success: false,error:error });
  }
};
  
const getEmployeeTnaDetailsById = async (req, res) => {
    const employeeId = req.params.emp_id;
    if(!employeeId){
      return res.json({message:"Employee Id is not provided",success:false})
    }
    // Execute the query
    connection.query(
      "SELECT * FROM lms_TNA_Employee_Answers WHERE  emp_id = ?",
      [employeeId],
      (err, rows) => {
        if (err) {
          console.error("Error executing query:", err);
          res
            .status(500)
            .json({ success: false, message: "Internal server error" });
          return;
        }
  
        if (rows?.length > 0) {
          res.json({ success: true, data: rows[0] });
          return;
        } else {
          res.json({ success: false, message: "Employee not found" });
        }
      }
    );
};
  
const getTnaEmployeeByCompanyId = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = "SELECT id, emp_name, emp_email, contact_no FROM lms_employee WHERE comp_id = ?";
      const tnaSql = "SELECT emp_id FROM lms_TNA_Employee_Answers WHERE emp_id = ?";
  
      connection.query(sql, [comp_id], async (err, resp) => {
        if (err) {
          return res.json({ message: "Fatal Error", success: false, error: err });
        }
  
        // Iterate through each employee and check if they attended TNA
        for (const employee of resp) {
          await new Promise((resolve, reject) => {
            connection.query(tnaSql, [employee.id], (err, tnaResp) => {
              if (err) {
                return reject(err);
              }
              // Set a flag to indicate if the employee attended TNA
              employee.attendedTNA = tnaResp?.length > 0;
              resolve();
            });
          });
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
  

// const deleteTnaEmployee = async (req, res) => {
//   try {
//     const emp_id = req.params.emp_id;

//     const searchSql = 'SELECT * FROM lms_employee WHERE id = ?';
//     const searchSqlResult = await queryPromiseWithAsync(searchSql, [emp_id]);
//     if (searchSqlResult.length <= 0) {
//       return res.status(404).json({ message: "Employee not found", success: false });
//     }

//     // Check if TNA answers exist for the employee
//     const searchTnaAnswer = 'SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id = ?';
//     const searchTnaAnswerResult = await queryPromiseWithAsync(searchTnaAnswer, [emp_id]);
//     if (searchTnaAnswerResult.length > 0) {
//       const deleteTnaEmployeeAnswerQuery = 'DELETE FROM lms_TNA_Employee_Answers WHERE emp_id = ?';
//       await queryPromiseWithAsync(deleteTnaEmployeeAnswerQuery, [emp_id]);
//     }

//     // Update company details if employees exist

//     const checkCourseSql = "SELECT * FROM lms_courseEmployee WHERE emp_id = ?"
//     const courseResult = await queryPromiseWithAsync(checkCourseSql, [emp_id])

//     if (courseResult.length > 0) {

//       const checkNonGradedSql = "SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?"
//       const nonGradedResult = await queryPromiseWithAsync(checkNonGradedSql, [emp_id])

//       if (nonGradedResult.length > 0) {
//         const deleteEmployeeQuery = 'DELETE FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?';
//         await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);
//       }
//       const checkLogineSql = "SELECT * FROM lms_EmployeeLogInLogOut WHERE emp_id = ?"
//       const loginResult = await queryPromiseWithAsync(checkLogineSql, [emp_id])

//       if (loginResult.length > 0) {
//         const deleteEmployeeQuery = 'DELETE FROM lms_EmployeeLogInLogOut WHERE emp_id = ?';
//         await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);
//       }
//       const checkVideoSql = "SELECT * FROM lms_EmployeeVideoData WHERE emp_id = ?"
//       const videoResult = await queryPromiseWithAsync(checkVideoSql, [emp_id])

//       if (videoResult.length > 0) {
//         const deleteEmployeeQuery = 'DELETE FROM lms_EmployeeVideoData WHERE emp_id = ?';
//         await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);
//       }
//       const checkGradedSql = "SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?"
//       const gradedResult = await queryPromiseWithAsync(checkGradedSql, [emp_id])

//       if (gradedResult.length > 0) {
//         const deleteEmployeeQuery = 'DELETE FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?';
//         await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);
//       }
//       const searchEmployeeNotify = 'SELECT * FROM lms_Notify WHERE emp_id = ?';
//       const searchEmployeeNotifyResult = await queryPromiseWithAsync(searchEmployeeNotify, [emp_id]);
//       if (searchEmployeeNotifyResult.length > 0) {
//         const deleteEmployeeNotify = 'DELETE FROM lms_Notify WHERE emp_id = ?';
//         await queryPromiseWithAsync(deleteEmployeeNotify, [emp_id]);
//       }

//       const deleteEmployeeQuery = 'DELETE FROM lms_courseEmployee WHERE emp_id = ?';
//       await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);
//       const comp_id = searchSqlResult[0].comp_id;
//       const searchCount = "SELECT * FROM lms_courseEmployee WHERE comp_id = ?";
//       const result = await queryPromiseWithAsync(searchCount, [comp_id]);
//       if (result.length > 0) {
//         const count = result.length;
//         const updateCompanyQuery = 'UPDATE lms_companyDetails SET no_of_course = ? WHERE id = ?';
//         await queryPromiseWithAsync(updateCompanyQuery, [count, comp_id]);

//         const updateCourseLicensingQuery = 'UPDATE lms_CourseCompany SET total_no_of_attendies = ? WHERE comp_id = ?';
//         await queryPromiseWithAsync(updateCourseLicensingQuery, [count, comp_id]);
//       }
//     }


//     const deleteEmployeeQuery = 'DELETE FROM lms_employee WHERE id = ?';
//     await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);

//     const comp_id = searchSqlResult[0].comp_id;
//     const searchCount = "SELECT * FROM lms_employee WHERE comp_id = ?";
//     const result = await queryPromiseWithAsync(searchCount, [comp_id]);
//     if (result.length > 0) {
//       const count = result.length;
//       const updateCompanyQuery = 'UPDATE lms_companyDetails SET no_of_tna = ? WHERE id = ?';
//       await queryPromiseWithAsync(updateCompanyQuery, [count, comp_id]);

//       const updateTnaLicensingQuery = 'UPDATE TNA_licensing SET total_no_of_attendies = ? WHERE comp_id = ?';
//       await queryPromiseWithAsync(updateTnaLicensingQuery, [count, comp_id]);
//     }

//     return res.status(200).json({ message: "Deletion successful", success: true });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal Server Error", success: false, error: error.message });
//   }
// };


const deleteTnaEmployee = async (req, res) => {
  const emp_id = req.params.emp_id;

  connection.beginTransaction(async (transactionError) => {
    if (transactionError) {
      return res.status(500).json({ message: "Transaction error", success: false, error: transactionError.message });
    }

    try {
      const searchSql = 'SELECT * FROM lms_employee WHERE id = ?';
      const searchSqlResult = await queryPromiseWithAsync(searchSql, [emp_id]);

      if (searchSqlResult.length <= 0) {
        connection.rollback(); // rollback the transaction if employee not found
        return res.status(404).json({ message: "Employee not found", success: false });
      }

      // Check if TNA answers exist for the employee
      const searchTnaAnswer = 'SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id = ?';
      const searchTnaAnswerResult = await queryPromiseWithAsync(searchTnaAnswer, [emp_id]);

      if (searchTnaAnswerResult.length > 0) {
        const deleteTnaEmployeeAnswerQuery = 'DELETE FROM lms_TNA_Employee_Answers WHERE emp_id = ?';
        await queryPromiseWithAsync(deleteTnaEmployeeAnswerQuery, [emp_id]);
      }

      // Check and delete course data
      const checkCourseSql = "SELECT * FROM lms_courseEmployee WHERE emp_id = ?";
      const courseResult = await queryPromiseWithAsync(checkCourseSql, [emp_id]);

      if (courseResult.length > 0) {
        const deleteRelatedDataQueries = [
          { query: "DELETE FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_EmployeeLogInLogOut WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_EmployeeVideoData WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_Notify WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_courseEmployee WHERE emp_id = ?", data: [emp_id] }
        ];

        for (const { query, data } of deleteRelatedDataQueries) {
          await queryPromiseWithAsync(query, data);
        }

        const comp_id = searchSqlResult[0].comp_id;
        const searchCount = "SELECT * FROM lms_courseEmployee WHERE comp_id = ?";
        const result = await queryPromiseWithAsync(searchCount, [comp_id]);

        if (result.length > 0) {
          const count = result.length;
          const updateCompanyQuery = 'UPDATE lms_companyDetails SET no_of_course = ? WHERE id = ?';
          const updateCourseLicensingQuery = 'UPDATE lms_CourseCompany SET total_no_of_attendies = ? WHERE comp_id = ?';

          await queryPromiseWithAsync(updateCompanyQuery, [count, comp_id]);
          await queryPromiseWithAsync(updateCourseLicensingQuery, [count, comp_id]);
        }
      }

      // Delete employee data
      const deleteEmployeeQuery = 'DELETE FROM lms_employee WHERE id = ?';
      await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);

      // Update company details
      const comp_id = searchSqlResult[0].comp_id;
      const searchCount = "SELECT * FROM lms_employee WHERE comp_id = ?";
      const result = await queryPromiseWithAsync(searchCount, [comp_id]);

      if (result.length > 0) {
        const count = result.length;
        const updateCompanyQuery = 'UPDATE lms_companyDetails SET no_of_tna = ? WHERE id = ?';
        const updateTnaLicensingQuery = 'UPDATE TNA_licensing SET total_no_of_attendies = ? WHERE comp_id = ?';

        await queryPromiseWithAsync(updateCompanyQuery, [count, comp_id]);
        await queryPromiseWithAsync(updateTnaLicensingQuery, [count, comp_id]);
      }

      // Commit the transaction after all operations are successful
      connection.commit((commitError) => {
        if (commitError) {
          connection.rollback(() => {
            return res.status(500).json({ message: "Transaction commit error", success: false, error: commitError.message });
          });
        }

        return res.status(200).json({ message: "Deletion successful", success: true });
      });

    } catch (error) {
      connection.rollback(() => {
        return res.status(500).json({ message: "Internal Server Error", success: false, error: error.message });
      });
    }
  });
};

module.exports = {uploadEmployee,generateTnaLicensing,generateTnaCodeWithoutEmployee,getEmployeeById,getEmployeeByCompanyId,getCompanyByEmployeeById,getEmployeeTnaDetailsById,getTnaEmployeeByCompanyId,deleteTnaEmployee}
  