const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")
const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;

const finalAssessmentReport = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
        if(!comp_id ){
        return res.json({message:"Company Id is not provided",success:false})
      }
      
      const searchCourseId = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?'
      const result = await queryPromiseWithAsync(searchCourseId,comp_id)
      if(result.length<=0){
        return res.json({message:"company haven't purchase course yet",success:false})
      }
  
      const sql = `SELECT t.emp_id, e.emp_name, e.emp_email, t.mcq_score, t.email_score, t.text_score,t.total_score,t.out_Off 
              FROM lms_GradedAssesmentAnswersByEmployee t
              JOIN lms_courseEmployee e ON t.emp_id = e.emp_id
              WHERE t.course_id = ? AND t.finalAssessmentStatus = 1 AND t.comp_id = ?;
          `;
  
      connection.query(sql, [result[0].course_id,comp_id], (err, resp) => {
        if (err) {
          console.log("Error:", err.message);
          return res.json({
            message: "Error occurred in API/query",
            success: false,
          });
        }
        if (resp.length <= 0) {
          return res.json({ message: "Company Data Not found" ,success:false});
        }
        return res.json({ message: "Successful", data: resp, success: true });
      });
    } catch (error) {
      console.log("Error:", error);
      return res.json({ message: "Internal server error", success: false ,error:error});
    }
  };
  
  const finalReportById = async (req, res) => {
    try {
      const emp_id = req.params.emp_id;
      // console.log("emp_idemp_id",emp_id);
      if(!emp_id){
        return res.json({message:"Employee id is not provided",success:false})
      }
      const sql = "SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id =? AND finalAssessmentStatus = 1";
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
          audio_question,
          mcq_score,
          mcq_score_outOff,
          email_score,
          email_score_outOff,
          text_score,
          text_score_outOff,
          audio_score,
          audio_score_outOff,
          total_score,
          out_off,
        } = resp[0];
  
        const result = {
          MCQ: {
            question_count: JSON.parse(mcq_questions)?.length,
            score: mcq_score,
            out_off: mcq_score_outOff,
          },
          Text: {
            question_count: JSON.parse(text_question)?.length,
            score: text_score,
            out_off: text_score_outOff,
          },
          Email: {
            question_count: JSON.parse(email_question)?.length,
            score: email_score,
            out_off: email_score_outOff,
          },
          Oral: {
            question_count: JSON.parse(audio_question).length,
            score: audio_score,
            out_off: audio_score_outOff,
          },
          total_score: total_score,
          out_off: out_off,
        };
      const passedFailed = Math.round(total_score / out_off *100) > 70 ? "Pass" : "Fail"
  
        return res.json({ message: "success", data: result,result:passedFailed, success: true });
      });
    } catch (error) {
      console.log("err", error);
    }
  };
  
  const checkFinalAssessmentQuestion = async(req,res)=>{
    try {
      const checkMcq = 'SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE finalAssessmentStatus = 1 '
      const checkMcqResult = await queryPromiseWithAsync(checkMcq)
      const checkOther= 'SELECT * FROM lms_GradedAssementOtherQuestions WHERE finalAssessmentStatus = 1 '
      const checkOtherResult = await queryPromiseWithAsync(checkOther)
      console.log("checkOtherResult",checkOtherResult);
      if(checkMcqResult.length<=0||checkOtherResult<=0){
    
        return res.json({message:"No final Assessment is created",success:false})
      }
      return res.json({message:"final Assessment is created",success:true})
    } catch (error) {
      return res.json({message:"Internal Server Error",success:false,error:error})
      
    }
  }

module.exports = {finalAssessmentReport,finalReportById,checkFinalAssessmentQuestion}
  
  