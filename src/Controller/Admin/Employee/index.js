const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")
const connection = require("../../../../mysql");
const csv = require("csvtojson");


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
            return res.json({ message: "Not found", success: false });
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
        if (duplicateEmails?.length > 0) {
            let message = `The following emails already exist and were not uploaded: ${duplicateEmails.join(', ')}`;
        return res.status(400).json({ message, success: false, count });
        }

        return res.status(200).json({ message:"uploaded successfully", success: true, count });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "Internal server error", success: false, error });
    }
};

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

const getTotalNumberOfEmployeeInCourseAndTna = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = `SELECT (SELECT COUNT(*) FROM lms_courseEmployee WHERE comp_id = ?) AS course_Employee_Count,(SELECT COUNT(*) FROM lms_employee WHERE comp_id = ?) AS total_employee,
      (SELECT COUNT(*) FROM lms_TNA_Employee_Answers WHERE comp_id = ?) AS total_tna_attendees`;
  
      const resp = await queryPromiseWithAsync(sql,[comp_id, comp_id, comp_id])
      if(resp.length<=0){
        return res.json({message:"No Data Found",success:false})
      }
      const result = {
        course_Employee_Count: resp[0]?.course_Employee_Count || 0,
        total_employee: resp[0]?.total_employee || 0,
        total_tna_attendees: resp[0]?.total_tna_attendees || 0,
      };
      return res.json({ message: "Success", data: result, success: true });
  
     
    } catch (error) {
      console.log(error);
    return res.json({message:"Internal Server Error",error:error,success:false})
  
    }
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
//   ----------------------------------course----------------------
 
module.exports = {getEmployeeByCompanyId,uploadEmployee,getEmployeeById,getTotalNumberOfEmployeeInCourseAndTna,getTnaEmployeeByCompanyId}
