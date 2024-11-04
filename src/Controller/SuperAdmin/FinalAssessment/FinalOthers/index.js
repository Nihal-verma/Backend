const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")
const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;

const uploadFinalAssesmentOtherQuestion = async (req, res) => {
    try {
      const course_id = req.params.course_id;
      const finalAssessmentStatus =1
      if (!course_id) {
        return res
          .status(400)
          .json({ success: false, message: "Course id doesnot provided" });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }
  
      const filePath = req.file.path;
      let count = 0;
      const response = await csv().fromFile(filePath);
  
      for (const item of response) {
        // Map the category to category_id
        const categoryId =
          item.Category.toLowerCase() === "email"
            ? 3
            : item.Category.toLowerCase() === "text"
              ? 2
              : item.Category.toLowerCase() === "audio"
                ? 4
                : null;
        const category =
          item.Category.toLowerCase() === "email"
            ? "Email"
            : item.Category.toLowerCase() === "text"
              ? "Text"
              : item.Category.toLowerCase() === "audio"
                ? "Audio"
                : null;
  
        // Check if a valid category is found
        if (categoryId !== null || category !== null) {
          count++;
          const query = `
                      INSERT INTO lms_GradedAssementOtherQuestions (course_id,category,category_id, topic,finalAssessmentStatus)
                      VALUES (?,?,?, ?,?)
                  `;
  
          // Assuming you have a MySQL connection object named 'connection'
          await connection.query(query, [
            course_id,
            category,
            categoryId,
            item.Topics,
            finalAssessmentStatus
          ]);
        }
      }
      return res.json({
        status: 202,
        success: true,
        message: "File imported successfully",
        total_question: count,
      });
    } catch (error) {
      console.log("Error in emailAndTextQuestionUpload:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };
  
  
  const getAllFinalAssesmentEmailQuestions = async (req, res) => {
    try {
      const course_id = req.params.course_id
       if(!course_id){
        return res.json({message:"course Id is not provided",success:false})
      }
      const getCategorySQL =
        "SELECT * FROM lms_GradedAssementOtherQuestions WHERE category=? AND course_id = ? AND finalAssessmentStatus = 1";
      const category = "Email";
  
      connection.query(getCategorySQL, [category,course_id], async (err, resp) => {
        if (err) {
          console.log(err.message);
          return res.json({ msg: "error", error: err, success: false });
        }
        const count = resp?.length;
        return res.json({
          msg: "done",
          count: count,
          questions: resp,
          success: true,
        });
      });
    } catch (error) {
      console.log("error", error);
      return res.json({ msg: "error", error, success: false });
    }
  };
  
  const getAllFinalAssesmentTextQuestions = async (req, res) => {
    try {
      const course_id = req.params.course_id
       if(!course_id){
        return res.json({message:"course Id is not provided",success:false})
      }
      const getCategorySQL =
        "SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = ? AND course_id = ? AND finalAssessmentStatus = 1";
      const category = "Text";
  
      connection.query(getCategorySQL, [category,course_id], async (err, resp) => {
        if (err) {
          console.log(err.message);
          return res.json({ msg: "error", error: err });
        }
        const count = resp?.length;
        return res.json({ msg: "done", count: count, questions: resp });
      });
    } catch (error) {
      console.log("error", error);
      return res.json({ msg: "error", error });
    }
  };
  
  const getAllFinalAssesmentAudioQuestions = async (req, res) => {
    try {
      const course_id = req.params.course_id
       if(!course_id){
        return res.json({message:"course Id is not provided",success:false})
      }
      const getCategorySQL =
        "SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = ? AND course_id = ? AND finalAssessmentStatus = 1";
      const category = "Audio";
  
      connection.query(getCategorySQL, [category,course_id], async (err, resp) => {
        if (err) {
          console.log(err.message);
          return res.json({ msg: "error", error: err });
        }
        const count = resp?.length;
        return res.json({ msg: "done", count: count, questions: resp });
      });
    } catch (error) {
      console.log("error", error);
      return res.json({ msg: "error", error });
    }
  };
  
  const getFinalAssesmentOtherQuestionByQuestionId = async (req, res) => {
    try {
      const question_id = req.params.question_id;
          if(!question_id){
        return res.json({message:"Question Id is not provided",success:false})
      }
      console.log("question_id", question_id);
      const sql = "SELECT * FROM lms_GradedAssementOtherQuestions WHERE id =?";
      connection.query(sql, [question_id], (err, resp) => {
        if (err) {
          return res.json({ message: "Fatal error", success: false, error: err });
        }
        // console.log(resp);
        return res.json({ message: "Success", success: true, data: resp });
      });
    } catch (error) {
      return res.json({
        message: "Internal server Error",
        success: false,
        error: error,
      });
    }
  };
  
  
  const updateFinalAssesmentEmailQuestionById = async (req, res) => {
    const id = req.params.question_id;
        if(!id){
        return res.json({message:"Question Id is not provided",success:false})
      }
    const questions = req.body;
    const sql = "UPDATE lms_FinalAssessmentOtherQuestions SET topic = ? WHERE id =?";
    connection.query(sql, [questions.topic, id], (err, resp) => {
      if (err) {
        return res.json({message: "Error In Querry",success: false, error: err});
      }
  
      return res.json({ message: "Successfully updated", success: true });
    });
  };
  
  const updateFinalAssesmentTextQuestionById = async (req, res) => {
    const id = req.params.question_id;
        if(!id){
        return res.json({message:"Question Id is not provided",success:false})
      }
    const questions = req.body;
  
    const sql = "UPDATE lms_GradedAssementOtherQuestions SET topic = ? WHERE id =?";
  
    connection.query(sql, [questions.topic, id], (err, resp) => {
      if (err) {
        return res.json({
          message: "Error In Querry",
          success: false,
          error: err,
        });
      }
  
      return res.json({ message: "Successfully updated", success: true });
    });
  };
  
  const updateFinalAssesmentAudioQuestionById = async (req, res) => {
    const id = req.params.question_id;
    const questions = req.body;
        if(!id){
        return res.json({message:"Question Id is not provided",success:false})
      }
  
    const sql = "UPDATE lms_GradedAssementOtherQuestions SET topic = ? WHERE id =?";
  
    connection.query(sql, [questions.topic, id], (err, resp) => {
      if (err) {
        return res.json({
          message: "Error In Querry",
          success: false,
          error: err,
        });
      }
  
      return res.json({ message: "Successfully updated", success: true });
    });
  };
  
  const updateFinalAssesmentOtherQuestionsById = async (req, res) => {
    try {
      const question_id = req.params.question_id;
      const questions = req.body.question;
          if(!question_id || ! questions){
        return res.json({message:"Question Id Or Questions is not provided",success:false})
      }
     
      const sql = "UPDATE lms_GradedAssementOtherQuestions SET topic = ? WHERE id =?";
  
      connection.query(sql, [questions, question_id], (err, resp) => {
        if (err) {
          return res.json({
            message: "Error In Querry",
            success: false,
            error: err,
          });
        }
  
        return res.json({ message: "Successfully updated", success: true });
      });
    } catch (error) {
      console.log("error", error);
    }
  };
  
  
  const deleteFinalOtherQuestion = async(req,res)=>{
    try {
      const id = req.params.id
      const getQuerry = 'SELECT * FROM lms_GradedAssementOtherQuestions WHERE id = ? AND finalAssessmentStatus = 1 '
      const result = await queryPromiseWithAsync(getQuerry,id)
      if(result.length<=0){
      return res.json({message:"Deletion unsuccessfull",success:false})
      }
      const deleteQuery = 'DELETE FROM lms_GradedAssementOtherQuestions WHERE id = ?';
      await queryPromiseWithAsync(deleteQuery, [id]);
      return res.json({message:"Deletion successfull",success:true})
    } catch (error) {
      return res.json({message:"Internal Server error",success:false,error:error})
  
    }
  }


module.exports = {uploadFinalAssesmentOtherQuestion,getAllFinalAssesmentEmailQuestions,getAllFinalAssesmentTextQuestions,getAllFinalAssesmentAudioQuestions,getFinalAssesmentOtherQuestionByQuestionId,updateFinalAssesmentEmailQuestionById,updateFinalAssesmentTextQuestionById,updateFinalAssesmentAudioQuestionById,updateFinalAssesmentOtherQuestionsById,deleteFinalOtherQuestion}