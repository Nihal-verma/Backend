const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")

const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;



const checkUniqueToken = async (req, res) => {
    try {
      const uniqueToken = req.params.uniqueToken
      if(!uniqueToken){
        return res.json({message:" uniqueToken is not provided",success:false})
      }
      console.log("uniqueToken", uniqueToken);
      const checkExpireyDate =
        "SELECT token_expiration FROM lms_employee WHERE unique_token=?";
      connection.query(checkExpireyDate, [uniqueToken], (err, resp) => {
        if (err) {
          return res.json({ message: "Fatal error", success: false, error: err });
        }
        // console.log("resp", resp);
        const today = new Date();
        const tokenEndDate = resp[0].token_expiration;
       
        const formattedtokenEndDate = tokenEndDate.toLocaleDateString("en-GB");
        const formattedToday = today.toLocaleDateString("en-GB");
  
        if (formattedtokenEndDate < formattedToday) {
          console.log("Token Expire");
          return res.json({
            message: "Token Expire",
            success: false,
            data: formattedtokenEndDate,
            today: formattedToday,
          });
        }
        console.log("Success");
        return res.json({ data: formattedtokenEndDate, today: formattedToday, success: true })
      });
    } catch (error) {
      console.log("Internal Server Error", error);
    }
  }
  
  const tnaAnswerByEmployee = async (req, res) => {
    try {
      const { mcq, mcq_selectedAnswer, email_answer, text_answer, mcq_score, mcq_score_out_off } = req.body;
      
      const { uniqueToken } = req.params;
      if(!uniqueToken){
        return res.json({message:" uniqueToken is not provided",success:false})
      }
      const textAnswerArray = []
      textAnswerArray.push(text_answer)
      const email_answerArray = []
      email_answerArray.push(email_answer)
      const sanitizedTextAnswer = textAnswerArray || [];
      const sanitizedEmailAnswer = email_answerArray || [];
      console.log(Array.isArray(sanitizedEmailAnswer));
      if (Array.isArray(mcq)) {
        const mcqQuestions = mcq.filter((item) => item.category === "MCQ");
        const textQuestions = mcq.filter((item) => item.category === "Text");
        const emailQuestions = mcq.filter((item) => item.category === "Email");
        const mcqQuestionsArr = mcqQuestions.map((v) => v.questions);
        const optionsArr = mcqQuestions.map((v) => v.options);
        const correctAnswerArr = mcqQuestions.map((v) => v.correctAnswer);
        const emailQuestionArr = emailQuestions.map((v) => v.topic);
        const textQuestionArr = textQuestions.map((v) => v.topic);
        
        const selectEmployeeSql ="SELECT id, comp_id FROM lms_employee WHERE unique_token = ?";
        connection.query(selectEmployeeSql, [uniqueToken], (err, resp) => {
          if (err) {
            console.log("Error in SELECT query:", err);
            return res.json({ message: "Error in SELECT query", success: false });
          }
          if (resp.length === 0) {
            console.log("No user found for uniqueToken:", uniqueToken);
            return res.json({ message: "No user found", success: false });
          }
          const emp_id = resp[0].id;
          const comp_id = resp[0].comp_id;
          const checkEmployeeAnswerSql ="SELECT id FROM lms_TNA_Employee_Answers WHERE emp_id = ?";
          connection.query(checkEmployeeAnswerSql, [emp_id], async(checkErr, checkResults) => {
            if (checkErr) {
              console.log("Error in SELECT query:", checkErr);
              return res.json({ message: "Error in SELECT query", success: false });
            }
            // console.log("checkResults",checkResults);
            if (checkResults?.length > 0) {
              console.log("entered");
              const updateAnswer = 'UPDATE lms_TNA_Employee_Answers SET mcq_questions = ?, mcq_options = ?, mcq_correctAnswer = ? , mcq_selectedAnswer = ? , email_question = ? , email_answer = ?, text_question = ?, text_answer = ?, mcq_score = ?, mcq_score_out_off = ?, attempt = attempt + 1 WHERE emp_id = ? AND comp_id = ?'
              const updatedResult = await queryPromiseWithAsync(updateAnswer, [JSON.stringify(mcqQuestionsArr),
              JSON.stringify(optionsArr),
              JSON.stringify(correctAnswerArr),
              JSON.stringify(mcq_selectedAnswer),
              JSON.stringify(emailQuestionArr),
              JSON.stringify(sanitizedEmailAnswer),
              JSON.stringify(textQuestionArr),
              JSON.stringify(sanitizedTextAnswer),
              mcq_score,
              mcq_score_out_off,
              emp_id,
              comp_id              
              ])
              if(updatedResult.affectedRows>0){
                const today = new Date();
                const formattedDate = today.toISOString().slice(0, 19).replace('T', ' ');
                const updateLinkQuery = 'UPDATE lms_employee SET token_expiration = ? WHERE id = ?';
                await queryPromiseWithAsync(updateLinkQuery, [formattedDate, emp_id]);
                return res.json({message:"Reattempt successful",success:true})
              }
            } else {
              const insertSql = ` INSERT INTO lms_TNA_Employee_Answers 
              (comp_id, emp_id, mcq_questions, mcq_options, mcq_correctAnswer, mcq_selectedAnswer,
              email_question, email_answer, text_question, text_answer, mcq_score,mcq_score_out_off) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
              connection.query(
                insertSql,
                [
                  comp_id,
                  emp_id,
                  JSON.stringify(mcqQuestionsArr),
                  JSON.stringify(optionsArr),
                  JSON.stringify(correctAnswerArr),
                  JSON.stringify(mcq_selectedAnswer),
                  JSON.stringify(emailQuestionArr),
                  JSON.stringify(sanitizedEmailAnswer),
                  JSON.stringify(textQuestionArr),
                  JSON.stringify(sanitizedTextAnswer),
                  mcq_score,
                  mcq_score_out_off,
                ],
                async (insertErr, insertResults) => {
                  if (insertErr) {
                    console.log("err in INSERT query", insertErr);
                    return res.json({
                      message: "error in INSERT query",
                      success: false,
                    });
                  }
                  const today = new Date();
                  const formattedDate = today.toISOString().slice(0, 19).replace('T', ' ');
                  const updateLinkQuery = 'UPDATE lms_employee SET token_expiration = ? WHERE id = ?';
                  await queryPromiseWithAsync(updateLinkQuery, [formattedDate, emp_id]);
                  return res.json({ message: "Your answers are submitted", success: true });
  
                }
              );
            }
            
          });
        });
      } else {
        return res.json({ message: "mcq must be an array", success: false });
      }
    } catch (error) {
      console.log("Error:", error);
      return res.json({ message: "Error", success: false });
    }
  }
  
  // const getDatafromEmployeeAnswer = async (req, res) => {
  //   const emp_id = req.params.emp_id;
  //   const sql = "SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id =? ";
  
  //   connection.query(sql, [emp_id], (err, resp) => {
  //     if (err) {
  //       console.log("err", err);
  //       return res.json({
  //         error: err.message,
  //         message: "error in query",
  //         success: false,
  //       });
  //     }
  
  //     // Parse mcq_options from string to JSON
  //     const parsedResp = resp.map((entry) => {
  //       return {
  //         ...entry,
  //         mcq_options: JSON.parse(entry.mcq_options),
  //         // Add other fields to modify as needed
  //       };
  //     });
  // console.log("parsedResp",parsedResp);
  //     return res.json({ message: "done", success: true, data: parsedResp });
  //   });
  // };
  
  const getDatafromEmployeeAnswer = async (req, res) => {
    const emp_id = req.params.emp_id;
    if(!emp_id){
      return res.json({message:" Employee Id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id =? ";
  
    connection.query(sql, [emp_id], (err, resp) => {
      if (err) {
        console.log("err", err);
        return res.json({
          error: err.message,
          message: "error in query",
          success: false,
        });
      }
  // console.log("resp",resp);
      // Parse mcq_options from string to JSON
      const parsedResp = resp.map((entry) => {
        return {
          ...entry,
          mcq_options: JSON.parse(entry.mcq_options),
          mcq_correctAnswer: JSON.parse(entry.mcq_correctAnswer),
          mcq_selectedAnswer: JSON.parse(entry.mcq_selectedAnswer),
          // Add other fields to modify as needed
        };
      });
      // console.log("parsedResp", parsedResp);
  
      // Function to generate an array of true/false indicating whether each answer matches
      const matchAnswersArray = (correctAnswers, selectedAnswers) => {
        // Check if both arrays have the same length
        if (correctAnswers?.length !== selectedAnswers?.length) {
          return null;
        }
  
        // Initialize an empty array to store the result
        const resultArray = [];
  
        // Iterate through each option
        for (let i = 0; i < correctAnswers?.length; i++) {
          // Trim white spaces from correct and selected answers
          const trimmedCorrectAnswer = correctAnswers[i]?.trim();
          const trimmedSelectedAnswer = selectedAnswers[i]?.trim();
  
          // console.log("trimmedCorrectAnswer",trimmedCorrectAnswer);
          // console.log("trimmedSelectedAnswer",trimmedSelectedAnswer);
          // Compare trimmed correct and selected answers and push the result to the array
          resultArray.push(trimmedCorrectAnswer === trimmedSelectedAnswer);
        }
  // console.log("resultArray",resultArray);
        return resultArray; // Return the array of true/false
      };
  
      // Generate the array of true/false indicating whether answers match
      const matchArray = matchAnswersArray(
        parsedResp[0].mcq_correctAnswer,
        parsedResp[0].mcq_selectedAnswer
      );
  
      // console.log("Match array:", matchArray);
  
      return res.json({ message: "done", success: true, data: parsedResp });
    });
  };
  
  const getScoreFromEmployeeAnswer = async (req, res) => {
    const emp_id = req.params.emp_id;
    const sql =
      "SELECT mcq_score, mcq_score_out_off,email_score,email_score_out_off,text_score_out_off ,text_score, total_score  FROM lms_TNA_Employee_Answers WHERE emp_id =? ";
    connection.query(sql, [emp_id], (err, resp) => {
      if (err) {
        console.log("err", err);
        return res.json({
          error: err.message,
          message: "error in query",
          success: false,
        });
      }
      return res.json({ message: "done", success: true, data: resp });
    });
  };
  
  const updateDataForScore = async (req, res) => {
    const id = req.params.emp_id;
    const mcq_score = req.body.mcq.mcq_score;
    const mcq_score_out_off = req.body.mcq.mcq_score_out_off;
    const email_score = req.body.email.email_score;
    const email_score_out_off = req.body.email.email_score_out_off;
    const text_score = req.body.text.text_score;
    const text_score_out_off = req.body.text.text_score_out_off;
    const out_Off = mcq_score_out_off + email_score_out_off + text_score_out_off;
    const total_score = mcq_score + email_score + text_score;
    if(!id){
      return res.json({message:" Id is not provided",success:false})
    }
    try {
      const updateQuery = `
          UPDATE lms_TNA_Employee_Answers
          SET
          mcq_score = COALESCE(?, mcq_score),
          mcq_score_out_off = COALESCE(?, mcq_score_out_off),
          email_score_out_off = COALESCE(?, email_score_out_off),
          text_score_out_off = COALESCE(?, text_score_out_off),
          out_Off = COALESCE(?, out_Off),
          email_score = COALESCE(?, email_score),
          text_score = COALESCE(?, text_score),
          total_score = COALESCE(?, total_score)
          WHERE
          emp_id = ?;
        `;
  
      // Execute the update query
      await connection.query(
        updateQuery,
        [
          mcq_score,
          mcq_score_out_off,
          email_score_out_off,
          text_score_out_off,
          out_Off,
          email_score,
          text_score,
          total_score,
          id,
        ],
        (err, resp) => {
          if (err) {
            console.log("err", err);
            return res
              .status(500)
              .json({ success: false, message: "Fatal error", error: err });
          }
          return res.json({
            data: resp,
            success: true,
            message: "Data Updated successfully",
          });
        }
      );
    } catch (error) {
      console.error("Error updating data:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error", error: error });
    }
  };
  
  const tnaEvaluation = async (req, res) => {
    const comp_id = req.params.comp_id;
   
    if (!comp_id) {
      return res.json({ message: "Company ID is not given", success: false });
    }
  
    // Check if the company exists
    let q = "SELECT emp_id FROM lms_TNA_Employee_Answers WHERE comp_id = ?";
    const result = await queryPromiseWithAsync(q,comp_id)
    if(result?.length<=0){
      return res.json({ message: "This company's employees haven't submitted tna", success: false });
    }
    let data =[]
    for (const v of result) {
      const sql = "SELECT id, emp_name, emp_email, tna_link FROM lms_employee WHERE id = ?";
      const resultOfSql = await queryPromiseWithAsync(sql, v.emp_id);
      // console.log("resultOfSql", resultOfSql[0]);
      data.push(resultOfSql[0]);
    }
    return res.json({ message: "Success", data: data, success: true });
  
   
  };
  
  const tnaManagementQuestions = async (req, res) => {
    try {
      const mcqResult = await getMCQData();
      const otherResult = await getOtherQuestionsData();
      res.status(200).json({
        message: "Data fetched successfully",
        mcqResult,
        otherResult,
        success: true,
      });
    } catch (error) {
      console.error("Error in tnaManagementQuestions:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error, success: false });
    }
  };
  
  async function getMCQData() {
    try {
      const mcqCategorySQL = "SELECT category FROM lms_TNA_MCQ";
      const mcqCategories = await queryPromise(mcqCategorySQL);
  
      const resultData = await Promise.all(
        mcqCategories.map(async (mcqCategory) => {
          const getCategoryCountSQL = `SELECT COUNT(*) as count FROM lms_TNA_MCQ WHERE category = '${mcqCategory.category}'`;
          const getTopicsSQL = `SELECT topic FROM lms_TNA_MCQ WHERE category = '${mcqCategory.category}'`;
  
          const [countResult, topicsResult] = await Promise.all([
            queryPromise(getCategoryCountSQL),
            queryPromise(getTopicsSQL),
          ]);
  
          const count = countResult[0].count;
          const topics = topicsResult.map((topic) => topic.topic);
  
          const mcqData = {
            category: mcqCategory.category,
            count,
            topics,
          };
          // console.log("mcqData",mcqData);
  
          return mcqData;
        })
      );
      // console.log("resultData",resultData);
  
      return resultData[0];
    } catch (error) {
      console.error("Error in getMCQData:", error);
      throw error;
    }
  }
  
  async function getOtherQuestionsData() {
    try {
      const getCategorySQL = "SELECT category FROM lms_EmailAndTextQuestions";
      const categories = await queryPromise(getCategorySQL);
  
      const result = await Promise.all(
        categories.map(async (category) => {
          const getCategoryCountSQL = `SELECT COUNT(*) as count FROM lms_EmailAndTextQuestions WHERE category = '${category.category}'`;
          const getTopicsSQL = `SELECT topic FROM lms_EmailAndTextQuestions WHERE category = '${category.category}'`;
  
          const [countResult, topicsResult] = await Promise.all([
            queryPromise(getCategoryCountSQL),
            queryPromise(getTopicsSQL),
          ]);
  
          const count = countResult[0].count;
          const topics = topicsResult.map((topic) => topic.topic);
  
          return {
            category: category.category,
            count,
            topics,
          };
        })
      );
  
      // Separate the data for email and text
      const emailData = result.find(
        (item) => item.category.toLowerCase() === "email"
      ) || { count: 0 };
      const textData = result.find(
        (item) => item.category.toLowerCase() === "text"
      ) || { count: 0 };
  
      return {
        emailResult: emailData,
        textResult: textData,
      };
    } catch (error) {
      console.error("Error in getOtherQuestionsData:", error);
      throw error;
    }
  }


module.exports = {checkUniqueToken,tnaAnswerByEmployee,getDatafromEmployeeAnswer,getScoreFromEmployeeAnswer,updateDataForScore,tnaEvaluation,tnaManagementQuestions}