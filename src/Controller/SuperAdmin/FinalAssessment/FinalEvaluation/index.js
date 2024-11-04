const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")
const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;

const finalAssesmentAnswerByEmployee = async (req, res) => {
    try {
    if(!req.body){
     
        return res.json({message:"Data not provided",success:false})
      }
       const mcqSet = req.body.mcq;
      const emp_id = req.params.emp_id;
      const course_id = req.params.course_id;
      const mcq_selectedAnswer = req.body.mcq_selectedAnswer; // In Array of string
      const email_answer = req.body.email_answer; // In Array of string
      const text_answer = req.body.text_answer; // In Array of string
      const mcq_score = req.body.mcq_score;
       if(!course_id || ! emp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = "select comp_id FROM lms_courseEmployee WHERE emp_id = ?";
      connection.query(sql, [emp_id], (err, resp) => {
        if (err) {
          return res.json({ message: "Fatal Error", error: err, success: false });
        }
      });
      if (Array.isArray(mcqSet)) {
        const mcqQuestions = mcqSet.filter((item) => item.category === "MCQ");
        const textQuestions = mcqSet.filter((item) => item.category === "Text");
        const emailQuestions = mcqSet.filter((item) => item.category === "Email");
        const audioQuestions = mcqSet.filter((item) => item.category === "Audio");
        const mcqIdArray = mcqQuestions.map((v) => v.id);
        const textIdArray = textQuestions.map((v) => v.id)
        const emailIdArray = emailQuestions.map((v) => v.id)
        const audioIdArray = audioQuestions.map((v) => v.id)
        const mcqQuestionsArr = mcqQuestions.map((v) => v.questions);
        const optionsArr = mcqQuestions.map((v) => v.options);
        const correctAnswerArr = mcqQuestions.map((v) => v.correctAnswer);
        const emailQuestionArr = emailQuestions.map((v) => v.topic);
        const textQuestionArr = textQuestions.map((v) => v.topic);
        const audioQuestionArr = audioQuestions.map((v) => v.topic);
        const mcq_score_outOff = mcqIdArray?.length * 2;
        const selectSql =
          "SELECT comp_id FROM lms_courseEmployee WHERE emp_id = ?";
        connection.query(selectSql, [emp_id], (err, resp) => {
          if (err) {
            console.log("err in SELECT query", err);
            return res.json({ message: "error in SELECT query", success: false });
          }
          if (resp?.length === 0) {
            console.log("No user found for emp_id:", emp_id);
            return res.json({ message: "No user found", success: false });
          }
          const comp_id = resp[0].comp_id;
          const finalAssessmentStatus=1
          const checkEmployeeSql =
            "SELECT COUNT(*) AS count FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus = 1";
          connection.query(
            checkEmployeeSql,
            [emp_id, course_id],
            (checkErr, checkResults) => {
              if (checkErr) {
                console.log("err in checking employee existence", checkErr);
                return res.json({
                  message: "error in checking employee existence",
                  success: false,
                });
              }
              // console.log("checkResults", checkResults);
              if (checkResults[0].count > 0) {
                return res.json({message:"Your answer has been submitted  before",success:false})
                // // const updateSql = `
                // //               UPDATE lms_GradedAssesmentAnswersByEmployee 
                // //               SET mcq_id=?,text_id = ?,email_id=?,audio_id = ?, mcq_questions = ?, mcq_options = ?, mcq_correctAnswer = ?, mcq_selectedAnswer = ?,
                // //                   email_question = ?, email_answer = ?, text_question = ?, text_answer = ?,audio_question = ? , mcq_score = ?,mcq_score_outOff=?,text_score =0,text_score_outOff=0,email_score=0,email_score_outOff=0,audio_score=0,audio_score_outOff=0,total_score=0,out_off=0, attempt = attempt + 1
                // //               WHERE emp_id = ? AND course_id =? AND finalAssessmentStatus = ?
                // //           `;
                // // console.log("audioQuestionArr", audioQuestionArr);
                // connection.query(
                //   updateSql,
                //   [
                //     JSON.stringify(mcqIdArray),
                //     JSON.stringify(textIdArray),
                //     JSON.stringify(emailIdArray),
                //     JSON.stringify(audioIdArray),
                //     JSON.stringify(mcqQuestionsArr),
                //     JSON.stringify(optionsArr),
                //     JSON.stringify(correctAnswerArr),
                //     JSON.stringify(mcq_selectedAnswer),
                //     JSON.stringify(emailQuestionArr),
                //     JSON.stringify(email_answer),
                //     JSON.stringify(textQuestionArr),
                //     JSON.stringify(text_answer),
                //     JSON.stringify(audioQuestionArr),
                //     mcq_score,
                //     mcq_score_outOff,
                //     emp_id,
                //     course_id,
                //     finalAssessmentStatus
                //   ],
                //   (updateErr, updateResults) => {
                //     if (updateErr) {
                //       console.log("err in UPDATE query", updateErr);
                //       return res.json({
                //         message: "error in UPDATE query",
                //         success: false,
                //       });
                //     }
                //     console.log("updateResults", updateResults);
                //     return res.json({ message: "done", success: true });
                //   }
                // );
              } else {
                console.log("Insert");
                const insertSql = `
                              INSERT INTO lms_GradedAssesmentAnswersByEmployee 
                                  (comp_id, emp_id,course_id,mcq_id,text_id,email_id,audio_id, mcq_questions, mcq_options, mcq_correctAnswer, mcq_selectedAnswer,
                                  email_question, email_answer, text_question, text_answer,audio_question, mcq_score, mcq_score_outOff,attempt,finalAssessmentStatus) 
                              VALUES (?,?, ?, ?,?,?, ?,?, ?, ?,?,?, ?, ?, ?, ?, ?,?,1, 1)
                          `;
  
                connection.query(
                  insertSql,
                  [
                    comp_id,
                    emp_id,
                    course_id,
                    JSON.stringify(mcqIdArray),
                    JSON.stringify(textIdArray),
                    JSON.stringify(emailIdArray),
                    JSON.stringify(audioIdArray),
                    JSON.stringify(mcqQuestionsArr),
                    JSON.stringify(optionsArr),
                    JSON.stringify(correctAnswerArr),
                    JSON.stringify(mcq_selectedAnswer),
                    JSON.stringify(emailQuestionArr),
                    JSON.stringify(email_answer),
                    JSON.stringify(textQuestionArr),
                    JSON.stringify(text_answer),
                    JSON.stringify(audioQuestionArr),
                    mcq_score,
                    mcq_score_outOff,
                  ],
                  (insertErr, insertResults) => {
                    if (insertErr) {
                      console.log("err in INSERT query", insertErr);
                      return res.json({
                        message: "error in INSERT query",
                        success: false,
                      });
                    }
                    console.log("insertResults", insertResults);
                    return res.json({ message: "done", success: true });
                  }
                );
              }
            }
          );
        });
      }
    } catch (error) {
      console.log("Error:", error);
      return res.json({ message: "Error", success: false });
    }
};
  
const finalAssesmentAudioAnswer = async (req, res) => {
    try {
      const emp_id = req.params.emp_id;
      const course_id = req.params.course_id;
      const finalAssessmentStatus = 1
       if(!emp_id || !course_id){
        return res.json({message:"Employee Id Or Course Id is not provided",success:false})
      }
  
      // Check if a file is uploaded
      if (!req.file) {
        // If no file is uploaded, set audio_answer to an empty string
        const updateQuery = 'UPDATE lms_GradedAssesmentAnswersByEmployee SET audio_answer = ? WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus  = ?';
        await queryPromiseWithAsync(updateQuery, ["", emp_id, course_id,finalAssessmentStatus]);
        
        return res.status(200).json({ message: "No file uploaded, audio answer set to empty string", success: true });
      }
  
      const audio = req.file;
      console.log("Audio file:", audio);
      console.log("Employee ID:", emp_id);
      console.log("Course ID:", course_id);
      console.log("Body:", req.body);
  
      // Assuming you have a function `queryPromiseWithAsync` to handle database queries asynchronously
      const searchEmpAnswer = 'SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus = 1';
      const searchResult = await queryPromiseWithAsync(searchEmpAnswer, [emp_id, course_id]);
  
      if (searchResult?.length <= 0) {
        return res.status(404).json({ message: "Employee's answer not found", success: false });
      }
  
      const updateQuery = 'UPDATE lms_GradedAssesmentAnswersByEmployee SET audio_answer = ? WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus = 1';
      const updateResult = await queryPromiseWithAsync(updateQuery, [audio.filename, emp_id, course_id]);
  
      return res.json({ message: "Audio file uploaded successfully", success: true });
  
    } catch (error) {
      console.error("Internal server error:", error);
      return res.status(500).json({ message: "Internal server error", success: false });
    }
  };
  
  const randomFinalAssementQuestions = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      const course_id = req.params.course_id;
       if(!comp_id || !course_id){
        return res.json({message:"Company Id  Or Course Id is not provided",success:false})
      }
      const licenseSql = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";
      connection.query(licenseSql, [comp_id], async (licenseErr, licenseResp) => {
        if (licenseErr) {
          return res.json({
            message: "Fatal error in license query",
            success: false,
          });
        }
  
        if (licenseResp?.length <= 0) {
          return res.json({
            message: "Company hasn't purchased the Course license",
            success: false,
          });
        }
  
        // Fetch 10 random questions from lms_TNA_MCQ
        const mcqSql = `SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE course_id = ${course_id} AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 10`;
        const questions = await queryPromise(mcqSql);
        console.log("questions", questions);
  
        // Fetch one random email question from lms_EmailAndTextQuestions
        const randomEmailSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Email" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
        const randomEmailResult = await queryPromise(randomEmailSql);
        console.log("randomEmailResult", randomEmailResult);
  
        // Fetch one random text question from lms_EmailAndTextQuestions
        const randomTextSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Text" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
        const randomTextResult = await queryPromise(randomTextSql);
        console.log("randomTextResult", randomTextResult);
  
        // Fetch one random audio question from lms_EmailAndTextQuestions
        const randomAudioSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Audio" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
        const randomAudioResult = await queryPromise(randomAudioSql);
        console.log("randomAudioResult", randomAudioResult);
  
        // Check if all queries were successful
        if (randomEmailResult && randomTextResult && randomAudioResult) {
          const shuffledQuestionsA = [...questions].sort(() => Math.random() - 0.5);
  
          // Check if any of the result arrays are empty
          if (randomEmailResult?.length === 0) {
            shuffledQuestionsA.push([]);
          } else {
            shuffledQuestionsA.push(randomEmailResult[0]);
          }
  
          if (randomTextResult?.length === 0) {
            shuffledQuestionsA.push([]);
          } else {
            shuffledQuestionsA.push(randomTextResult[0]);
          }
  
          if (randomAudioResult?.length === 0) {
            shuffledQuestionsA.push([]);
          } else {
            shuffledQuestionsA.push(randomAudioResult[0]);
          }
  
          const sets = {
            setA: shuffledQuestionsA,
          };
  
          // console.log("sets", sets.setA);
          return res.json({ msg: "data received", data: sets, success: true });
        } else {
          return res.json({ msg: "Error in fetching questions", success: false });
        }
      });
    } catch (error) {
      console.log(error);
      return res.json({
        msg: error,
        message: "error in getMcq Api",
        success: false,
      });
    }
  };
  
  const finalAssesmentManagementQuestions = async (req, res) => {
    try {
      const course_id = req.params.course_id
      const finalAssessmentStatus =1
       if(!course_id){
        return res.json({message:"Course Id is not provided",success:false})
      }
      const mcqResult = await getFinalAssesmentMCQData(course_id,finalAssessmentStatus);
      // Fetch Other Questions Management Data
      const otherResult = await getFinalAssesmentOtherQuestionsData(course_id,finalAssessmentStatus);
     return res.status(200).json({
        message: "Data fetched successfully",
        mcqResult,
        otherResult,
        success: true,
      });
    } catch (error) {
      console.error("Error in finalAssesmentManagementQuestions:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error, success: false });
    }
  };
  
  async function getFinalAssesmentMCQData(course_id, finalAssessmentStatus) {
    try {
      const mcqCategorySQL = "SELECT category FROM lms_CourseGradedAssessmentMCQ WHERE course_id = ? AND finalAssessmentStatus = ?";
      const mcqCategories = await queryPromise(mcqCategorySQL, [course_id, finalAssessmentStatus]);
      if (mcqCategories?.length <= 0) {
        return 0
      }
      const resultData = await Promise.all(
        mcqCategories.map(async (mcqCategory) => {
          const getCategoryCountSQL = `SELECT COUNT(*) as count FROM lms_CourseGradedAssessmentMCQ WHERE category = '${mcqCategory.category}' AND course_id = ${course_id} AND finalAssessmentStatus = ${finalAssessmentStatus} `;
          const getTopicsSQL = `SELECT topic FROM lms_CourseGradedAssessmentMCQ WHERE category = '${mcqCategory.category}'AND course_id = ${course_id} AND finalAssessmentStatus = ${finalAssessmentStatus} `;
  
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
  
  async function getFinalAssesmentOtherQuestionsData(course_id, finalAssessmentStatus) {
    try {
      const getCategorySQL = "SELECT category FROM lms_GradedAssementOtherQuestions WHERE course_id =? AND finalAssessmentStatus = ?";
      const categories = await queryPromise(getCategorySQL, [course_id, finalAssessmentStatus]);
      const result = await Promise.all(
        categories.map(async (category) => {
          const getCategoryCountSQL = `SELECT COUNT(*) as count FROM lms_GradedAssementOtherQuestions WHERE category = '${category.category}'AND course_id = ${course_id} AND finalAssessmentStatus = ${finalAssessmentStatus} `;
          const getTopicsSQL = `SELECT topic FROM lms_GradedAssementOtherQuestions WHERE category = '${category.category}'AND course_id = ${course_id} AND finalAssessmentStatus = ${finalAssessmentStatus} `;
  
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
      const audioData = result.find(
        (item) => item.category.toLowerCase() === "audio"
      ) || { count: 0 };
  
      return {
        emailResult: emailData,
        textResult: textData,
        audioResult: audioData
      };
    } catch (error) {
      console.error("Error in getOtherQuestionsData:", error);
      throw error;
    }
  }
  
  
module.exports = {finalAssesmentAnswerByEmployee,finalAssesmentAudioAnswer,randomFinalAssementQuestions,finalAssesmentManagementQuestions}