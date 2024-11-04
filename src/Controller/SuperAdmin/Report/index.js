const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")

const connection = require("../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;


const totalDataGet = async (req, res) => {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    try {
      const sqlCompanyDetails =
        "SELECT no_of_tna, no_of_course FROM lms_companyDetails WHERE id=?";
      connection.query(
        sqlCompanyDetails,
        [comp_id],
        (err, respCompanyDetails) => {
          if (err) {
            console.log("err", err);
            return res.json({
              message: "Error in company details query",
              success: false,
            });
          }
  
          const Total_Number_Of_Tna_Purchased = respCompanyDetails[0].no_of_tna;
          const Total_Number_Of_Course_Purchased =
            respCompanyDetails[0].no_of_course;
  
          const sqlEmployeeAnswers =
            "SELECT COUNT(*) AS Total_tna_given FROM lms_TNA_Employee_Answers WHERE comp_id =?";
          connection.query(
            sqlEmployeeAnswers,
            [comp_id],
            (err, resEmployeeAnswers) => {
              if (err) {
                console.log("Error in Answer query", err);
                return res.json({
                  message: "Error in employee answers query",
                  success: false,
                });
              }
  
              const Total_tna_given = resEmployeeAnswers[0].Total_tna_given;
              const data = {
                Total_Number_Of_Tna_Purchased,
                Total_Number_Of_Course_Purchased,
                Total_tna_given,
              };
  
              // console.log("data", resEmployeeAnswers[0]);
              return res.json({ message: "success", data: data, success: true });
            }
          );
        }
      );
    } catch (error) {
      console.log("Internal Server Error", error);
      return res.json({ message: "Internal Server Error", success: false });
    }
  };
  
  const getComanyEmployeeForResult = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = "SELECT emp_id FROM lms_courseEmployee WHERE comp_id =?";
      const result = await queryPromiseWithAsync(sql,comp_id)
      if(result.length<=0){
        return res.json({ message: "Data Not found", success: false });
      }
     return res.json({ message: "success", data: result, success: true });
    } catch (error) {
      return res.json({message: "Internal Server Error",error: error,success: false});
    }
  };
  
  const getModuleWithNonGradedAttempt = async (req, res) => {
    try {
      const course_id = req.params.course_id;
      const emp_id = req.params.emp_id;
        if(!emp_id||!course_id ){
        return res.json({message:"Employee Id Or Course id is not provided",success:false})
      }
      const searchQuery = 'SELECT * FROM lms_Module WHERE course_id = ? AND isGraded = 1';
      const modules = await queryPromiseWithAsync(searchQuery, course_id);
  
      if (modules?.length <= 0) {
        return res.json({ message: "Unable to find Data", success: false });
      }
      const data = [];
      for (const module of modules) {
        const module_id = module.id;
        const searchAttended = 'SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE module_id = ? AND emp_id = ?';
        const attendedResult = await queryPromiseWithAsync(searchAttended, [module_id, emp_id]);
        module.hasAttempt = attendedResult?.length > 0;
        data.push(
          module
        );
      }
  
      return res.json({ message: "Data fetched successfully", success: true, data: data });
    } catch (error) {
      console.log("Internal Server Error", error);
      return res.status(500).json({ message: "Internal Server Error", success: false });
    }
  };
  
  const getCourseEmployeeBycompanyIdForReport = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = `SELECT emp_id as id,emp_name,emp_email,emp_contact as contact_no FROM lms_courseEmployee WHERE comp_id =?`;
  
      connection.query(sql, [comp_id], (err, resp) => {
        if (err) {
          console.log("err", err);
          return res.json({ message: "Fatal Error", error: err, success: false });
        }
  
        return res.json({ message: "Success", data: resp, success: true });
      });
    } catch (error) {
      return res.json({ message: "Internal server Error", error: error,success: false});
    }
  };
  
  const getAverageMarksByCompanyId = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = `SELECT ga.course_id,c.course_name,COUNT(DISTINCT ga.emp_id) AS total_employees,
                  SUM(ga.total_score) AS total_score, AVG(ga.total_score) AS average_score
              FROM
                  lms_GradedAssesmentAnswersByEmployee ga
              JOIN
              lms_Module c ON ga.course_id = c.id
              WHERE
                  ga.comp_id = ?
              GROUP BY
                  ga.course_id, c.course_name`;
  
      connection.query(sql, [comp_id], (err, result) => {
        if (err) {
          return res.json({ message: "Fatal error", error: err, success: false });
        }
        return res.json({ message: "success", data: result, success: true });
      });
    } catch (error) {
      return res.json({message: "Internal server error",error: error,success: false,});
    }
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

  module.exports = {totalDataGet,getComanyEmployeeForResult,getModuleWithNonGradedAttempt,getCourseEmployeeBycompanyIdForReport,getAverageMarksByCompanyId,getTotalNumberOfEmployeeInCourseAndTna}
  