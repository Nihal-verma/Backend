const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")
const connection = require("../../../../mysql");
const moment = require('moment');
const uuid = require('uuid')
const SibApiV3Sdk = require('sib-api-v3-sdk')
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.EMAIL_API_KEY
const senderMail = process.env.EMAIL

const tnaAndCourseCount = async (req, res) => {
    try {
        const comp_id = req.params.comp_id
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = "SELECT no_of_tna,no_of_course FROM lms_companyDetails WHERE id =?"
        const result = await queryPromiseWithAsync(sql,comp_id)
        if(result.length<=0){
            return res.json({ message: "Data not found", success: false })
        }
        return res.json({ message: "Success", data: result[0], success: true })

    } catch (error) {
        console.log("Internal server error", error);
        return res.json({ message: "Internal Server Error",  success: false })

    }
}

const tnaLicenseDetails = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = `SELECT lms_employee.id as emp_id, lms_companyDetails.tna_license_code, lms_employee.emp_name, TNA_licensing.end_date, TNA_licensing.status
        FROM lms_companyDetails
        LEFT JOIN lms_employee ON lms_companyDetails.id = lms_employee.comp_id
        LEFT JOIN TNA_licensing ON lms_companyDetails.id = TNA_licensing.comp_id
        WHERE lms_companyDetails.id = ?`;

        const result = await queryPromiseWithAsync(sql,comp_id)
            if (result?.length <= 0) {
                return res.json({ message: "Data does not exist for this company", success: true });
            }

            const tna_license_code = [...new Set(result.map(row => row.tna_license_code))];

            const employees = result.filter(row => row.comp_id !== null);

            if (employees?.length <= 0) {
                return res.json({ message: "Data does not exist for this company", tna_license_code, success: true });
            }

            employees.forEach(employee => {
                if (employee.end_date) {
                    employee.end_date = moment(employee.end_date).format('DD-MM-YY');
                }
            });

            return res.json({ message: "Success", data: employees, success: true });

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

        const result = await queryPromiseWithAsync(sql,comp_id)
        if(result.length<=0){
            return res.json({ message: "Failed", success: false });
        }
        return res.json({ message: "Success", data: resp, success: true });
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

        const checkResult = await queryPromiseWithAsync(checkLicenseCodeQuery,comp_id)
        if(checkResult.length<=0){
            return res.status(500).json({  success: false, message: 'Error checking tna_license_code existence' });
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
            const resp = await queryPromiseWithAsync(searchEndDate,comp_id)
            if(resp.length<=0){
            return res.status(500).json({ success: false, message: 'Error Tna licensing data' });
            }
            end_date = resp[0].end_date;
            const searchEmployeeQuery = 'SELECT emp_email from lms_employee WHERE comp_id = ?';
            const result = await queryPromiseWithAsync(searchEmployeeQuery,comp_id)
            if(result.length<=0){
                return res.status(500).json({ status: 500, success: false, message: 'Error retrieving employee data' });

            }
            const updateTokenPromises = result.map(async (value, index) => {
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
            employeeCount = alreadyEmployeeResult[0]?.count
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

module.exports = {tnaAndCourseCount,tnaLicenseDetails,tnaLicenseManagementView,createTnaLicensing,getTnaLicenseCount}