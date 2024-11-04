const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")
const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;


const uploadFinalAssessmentMcq = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, msg: "No file uploaded" });
      }
      const course_id = req.params.course_id
      if(!course_id){
        return res.json({message:"Course Id is not provided",success:false})
      }
      
      const filePath = req.file.path;
      let count = 0;
      const finalAssessmentStatus = 1;
      const category_id = 1;
      const category = "MCQ";
      const response = await csv().fromFile(filePath);
  
      for (const item of response) {
        count++;
        const query = `
              INSERT INTO lms_CourseGradedAssessmentMCQ (course_id ,questions, options, correctAnswer,category_id,category,finalAssessmentStatus)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
  
            const optionsArray = [];
            if (item["Option A"]) optionsArray.push(item["Option A"].trim());
            if (item["Option B"]) optionsArray.push(item["Option B"].trim());
            if (item["Option C"]) optionsArray.push(item["Option C"].trim());
            if (item["Option D"]) optionsArray.push(item["Option D"].trim());
      
            const correctAnswer = item.CorrectAnswer.trim();
        connection.query(query, [
          course_id,
          item.Questions,
          JSON.stringify(optionsArray), // Assuming you want to store options as JSON string
          correctAnswer,
          category_id,
          category,
          finalAssessmentStatus
        ]);
      }
      return res.json({
        status: 202,
        success: true,
        msg: "File imported successfully",
        total_no_of_question_upoaded: count,
      });
    } catch (error) {
      console.log("Error in importUser:", error);
      res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
  };
  
  const getAllFinalAssesmentMcqQuestion = async (req, res) => {
    try {
      const course_id = req.params.course_id
       if(!course_id){
        return res.json({message:"course Id is not provided",success:false})
      }
      const sql = "SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE course_id = ? AND finalAssessmentStatus = 1";
      connection.query(sql,[course_id], (err, resp) => {
        if (err) {
          console.log(err);
          return res.json({ msg: "Query Error", success: false, error: err });
        }
        const count = resp?.length;
        // if(resp?.length<=0){
        //   return res.json({})
        // }
        return res.json({
          msg: "data",
          count: count,
          questions: resp,
          success: true,
        });
      });
    } catch (error) {
      console.log("errr", error);
      return res.json({
        msg: "Internal Server Error",
        success: false,
        error: error,
      });
    }
  };
  
  const updateFinalAssesmentMCQquestionsById = async (req, res) => {
    try {
      const id = req.params.id;
      // console.log("question_idquestion_id",id);
          if(!id){
        return res.json({message:" Id is not provided",success:false})
      }
      const { questions, options, correctAnswer } = req.body;
      // console.log("questions, options, correctAnswer ",questions, options, correctAnswer );
  
      // Check if at least one of the fields is provided
      if (!questions && !options && !correctAnswer) {
        return res.json({ msg: "No fields provided for update", success: false });
      }
  
      const updateFields = [];
  
      if (questions) {
        updateFields.push(`questions = '${questions}'`);
      }
  
      if (options) {
        updateFields.push(`options = '${options}'`);
      }
  
      if (correctAnswer) {
        updateFields.push(`correctAnswer = '${correctAnswer}'`);
      }
  
      const updateSql = `UPDATE lms_CourseGradedAssessmentMCQ SET ${updateFields.join(
        ","
      )} WHERE id = ?`;
  
      connection.query(updateSql, [id], (err, result) => {
        if (err) {
          console.error("Error updating MCQ questions:", err);
          return res.json({
            msg: "Error updating MCQ questions",
            success: false,
          });
        }
        // console.log("resultresultresult",result);
  
        if (result.affectedRows > 0) {
          return res.json({
            msg: "MCQ questions updated successfully",
            success: true,
          });
        } else {
          return res.json({ msg: "MCQ questions not found", success: false });
        }
      });
    } catch (error) {
      console.error("Error in updateMCQquestionsById:", error);
      return res.json({ msg: "Internal server error", success: false });
    }
  };
  
  const deleteFinalMcq = async(req,res)=>{
    try {
      const id = req.params.id
      const getMcq = 'SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE id = ? AND finalAssessmentStatus = 1'
      const result = await queryPromiseWithAsync(getMcq,id)
      if(result.length<=0){
      return res.json({message:"Deletion unsuccessfull",success:false})
      }
      const deleteQuery = 'DELETE FROM lms_TNA_MCQ WHERE id = ?';
      await queryPromiseWithAsync(deleteQuery, [mcq_id]);
      return res.json({message:"Deletion successfull",success:true})
    } catch (error) {
      return res.json({message:"Internal Server error",success:false,error:error})
  
    }
  }

  const getFinalAssesmentMcqByQuestionId = async (req, res) => {
    try {
      const question_id = req.params.question_id;
       if(!question_id){
        return res.json({message:"Question Id is not provided",success:false})
      }
      console.log("question_idquestion_id",question_id);
      const sql = "SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE id =?";
      connection.query(sql, [question_id], (err, resp) => {
        if (err) {
          return res.json({ message: "Fatal error", success: false, error: err });
        }
        // console.log("resp", resp);
        return res.json({ message: "Success", success: true, data: resp[0] });
      });
    } catch (error) {
      return res.json({
        message: "Internal server Error",
        success: false,
        error: error,
      });
    }
  };
module.exports = {uploadFinalAssessmentMcq,getAllFinalAssesmentMcqQuestion,updateFinalAssesmentMCQquestionsById,getFinalAssesmentMcqByQuestionId,deleteFinalMcq}
  