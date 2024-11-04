const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")

const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;

  const emailAndTextQuestionUpload = async (req, res) => {
    try {
      console.log("req.file", req.file);
      if (!req.file) {
        return res.status(400).json({ success: false, msg: "No file uploaded" });
      }
  
      const filePath = req.file.path;
      let count = 0;
      const response = await csv().fromFile(filePath);
  
      for (const item of response) {
        // Map the category to category_id
        // console.log(item.Category === 'Email');
        const categoryId =
          item.Category === "Email" ? 3 : item.Category === "Text" ? 2 : null;
  
        // Check if a valid category is found
        if (categoryId !== null) {
          count++;
          const query = `
                      INSERT INTO lms_EmailAndTextQuestions (category_id,category, topic)
                      VALUES (?,?, ?)
                  `;
  
          // Assuming you have a MySQL connection object named 'connection'
          await connection.query(query, [categoryId, item.Category, item.Topics]);
        }
      }
      return res.json({
        status: 202,
        success: true,
        msg: "File imported successfully",
        total_question: count,
      });
    } catch (error) {
      console.log("Error in emailAndTextQuestionUpload:", error);
      res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
  };
  
  const getAllTextQuestions = async (req, res) => {
    try {
      const getCategorySQL =
        "SELECT * FROM lms_EmailAndTextQuestions WHERE category = ?";
      const category = "Text";
  
      connection.query(getCategorySQL, [category], async (err, resp) => {
        if (err) {
          console.log(err.message);
          return res.json({ message: "error", error: err,success:false });
        }
        const count = resp?.length;
        return res.json({ message: "done", count: count, questions: resp ,success:true});
      });
    } catch (error) {
      console.log("error", error);
      return res.json({ message: "Internal Server Error ",error: error,success:false });
    }
  };
  
  const getAllEmailQuestions = async (req, res) => {
    try {
      const getCategorySQL =
        "SELECT * FROM lms_EmailAndTextQuestions WHERE category = ?";
      const category = "Email";
  
      connection.query(getCategorySQL, [category], async (err, resp) => {
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
  
  const updateEmailQuestionById = async (req, res) => {
    const id = req.params.id;
    const questions = req.body;
    if(!id||!questions){
      return res.json({message:"Id or question is not provided",success:false})
    }
    const sql = "UPDATE lms_EmailAndTextQuestions SET topic = ? WHERE id =?";
  
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
  
  const updateTextQuestionById = async (req, res) => {
    const id = req.params.id;
    const questions = req.body;
    if(!id||!questions){
      return res.json({message:"Id or question is not provided",success:false})
    }
    const sql = "UPDATE lms_EmailAndTextQuestions SET topic = ? WHERE id =?";
  
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
  
  const getAllTnaTextAndEmailQuestions = async (req, res) => {
    try {
      const getEmailCategorySQL ="SELECT id,topic FROM lms_EmailAndTextQuestions WHERE category = ?";
  
      connection.query(getEmailCategorySQL,["Email"],
        async (errEmail, respEmail) => {
          if (errEmail) {
            console.log(errEmail.message);
            return res.json({ msg: "error", error: errEmail, success: false });
          }
  
          const emailQuestions = {
            count: respEmail?.length,
            questions: respEmail,
          };
  
          const getTextCategorySQL =
            "SELECT id,topic FROM lms_EmailAndTextQuestions WHERE category = ?";
  
          // Get Text category questions
          connection.query(getTextCategorySQL,["Text"],async (errText, respText) => {
              if (errText) {
                console.log(errText.message);
                return res.json({ message: "error", error: errText, success: false });
              }
  
              const textQuestions = {
                count: respText?.length,
                questions: respText,
              };
               // Return the merged response
              return res.json({
                message: "done",
                Email: emailQuestions,
                Text: textQuestions,
                success: true,
              });
            }
          );
        }
      );
    } catch (error) {
      console.log("error", error);
      return res.json({ message: "error", error, success: false });
    }
  };
  
  const updateTNATextAndEmailquestionsById = async (req, res) => {
    try {
      const question_id = req.params.question_id;
      const questions = req.body.question;
      // console.log("questions",questions);
      if(!question_id || !questions){
        return res.json({message:"Question id Or questions are not provided",success:false})
      }
  
      const sql = "UPDATE lms_EmailAndTextQuestions SET topic = ? WHERE id =?";
  
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
  
  const deleteTnaOtherQuestion = async(req,res)=>{
    try {
      const id = req.params.id
      const getQuerry = 'SELECT * FROM lms_EmailAndTextQuestions WHERE id = ?'
      const result = await queryPromiseWithAsync(getQuerry,id)
      if(result.length<=0){
      return res.json({message:"Deletion unsuccessfull",success:false})
      }
      const deleteQuery = 'DELETE FROM lms_EmailAndTextQuestions WHERE id = ?';
      await queryPromiseWithAsync(deleteQuery, [id]);
      return res.json({message:"Deletion successfull",success:true})
    } catch (error) {
      return res.json({message:"Internal Server error",success:false,error:error})
  
    }
  }

  module.exports = {emailAndTextQuestionUpload,getAllTextQuestions,getAllEmailQuestions,updateEmailQuestionById,updateTextQuestionById,getAllTnaTextAndEmailQuestions,updateTNATextAndEmailquestionsById,deleteTnaOtherQuestion}