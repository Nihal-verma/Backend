const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")
const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;

const tnaReport = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = `
              SELECT t.emp_id, e.emp_name, e.emp_email, t.mcq_score, t.email_score, t.text_score,t.total_score,t.out_Off
              FROM lms_TNA_Employee_Answers t
              JOIN lms_employee e ON t.emp_id = e.id
              WHERE t.comp_id = ?
          `;
      connection.query(sql, [comp_id], (err, resp) => {
        if (err) {
          console.log("Error:", err.message);
          return res.json({
            message: "Error occurred in API/query",
            success: false,
          });
        }
  
        if (resp.length <= 0) {
          return res.json({ message: "Company data doesn't exist" });
        }
        return res.json({ message: "Successful", data: resp, success: true });
      });
    } catch (error) {
      console.log("Error:", error);
      return res.json({ message: "Internal server error", success: false });
    }
  };
  
  const tnaPassedEmployee = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = `
        SELECT t.emp_id, e.emp_name, e.emp_email, t.mcq_score, t.email_score, t.text_score, t.total_score, t.out_Off
        FROM lms_TNA_Employee_Answers t
        JOIN lms_employee e ON t.emp_id = e.id
        WHERE t.comp_id = ?
      `;
  
      connection.query(sql, [comp_id], (err, resp) => {
        if (err) {
          console.log("Error:", err.message);
          return res.json({
            message: "Error occurred in API/query",
            success: false,
          });
        }
  
        if (resp?.length <= 0) {
          return res.json({ message: "Company data doesn't exist" });
        }
  
        const employees = resp.map((employee) => {
          const percentage = Math.round((employee.total_score / employee.out_Off) * 100);
          const status = percentage > 70 ? "Pass" : "Fail";
  
          return {
            Name: employee.emp_name,
            Email: employee.emp_email,
            Percentage: percentage,
            Status: status,
          };
        });
  
        return res.json({ message: "Successful", data:employees, success: true });
      });
    } catch (error) {
      console.log("Error:", error);
      return res.json({ message: "Internal server error", success: false });
    }
  };
  
  const tnaReportById = async (req, res) => {
    try {
      const emp_id = req.params.emp_id;
      // console.log("emp_idemp_id",emp_id);
      if(!emp_id){
        return res.json({message:"Employee id is not provided",success:false})
      }
      const sql = "SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id =?";
      connection.query(sql, [emp_id], (err, resp) => {
        if (err) {
          return res.json({ message: "Fatal Error", success: false, error: err });
        }
        if (resp?.length <= 0) {
          return res.json({ message: "No data found", success: false, notFound: true });
        }
        // console.log("resp", resp[0]);
        const {
          mcq_questions,
          text_question,
          email_question,
          mcq_score,
          mcq_score_out_off,
          email_score,
          email_score_out_off,
          text_score,
          text_score_out_off,
          total_score,
          out_Off,
        } = resp[0];
  
        const result = {
          MCQ: {
            question_count: JSON.parse(mcq_questions)?.length,
            score: mcq_score,
            out_off: mcq_score_out_off,
          },
          TEXT: {
            question_count: JSON.parse(text_question)?.length,
            score: text_score,
            out_off: text_score_out_off,
          },
          EMAIL: {
            question_count: JSON.parse(email_question)?.length,
            score: email_score,
            out_off: email_score_out_off,
          },
          total_score: total_score,
          out_off: out_Off,
        };
      const passedFailed = Math.round(total_score / out_Off *100) > 70 ? "Pass" : "Fail"
  
        // console.log("result", result);
  
        return res.json({ message: "success", data: result,result:passedFailed, success: true });
      });
    } catch (error) {
      console.log("err", error);
    }
  };

  
  const getPercentageOfTnaEmployee = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql ="SELECT emp_id, total_score, out_Off FROM lms_TNA_Employee_Answers WHERE comp_id = ?";
      connection.query(sql, [comp_id], async (err, resp) => {
        if (err) {
          return res.json({ message: "Fatal Error", error: err, success: false });
        }
  
        let aboveSixty = [];
        let remaining = [];
  
        for (let i = 0; i < resp?.length; i++) {
          let percent = (resp[i].total_score / resp[i].out_Off) * 100;
  
          if (percent >= 60) {
            aboveSixty.push(resp[i].emp_id);
          } else {
            remaining.push(resp[i].emp_id);
          }
        }
  
        let aboveSixtyValue = [];
  
        for (let j = 0; j < aboveSixty?.length; j++) {
          const emp_query =
            "SELECT emp_name, emp_email FROM lms_employee WHERE id = ?";
          const [employee] = await queryPromise(emp_query, [aboveSixty[j]]);
  
          aboveSixtyValue.push({
            name: employee.emp_name,
            email: employee.emp_email,
          });
        }
  
        return res.json({
          message: "Success", data: resp,aboveSixty: aboveSixty,remaining: remaining,aboveSixtyValue: aboveSixtyValue,success: true});
      });
    } catch (error) {
      return res.json({
        message: "Internal server Error",
        error: error,
        success: false,
      });
    }
  };


module.exports = {tnaReport,tnaPassedEmployee,tnaReportById,getPercentageOfTnaEmployee}