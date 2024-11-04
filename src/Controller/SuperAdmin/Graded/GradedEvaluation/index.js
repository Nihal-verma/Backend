const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")
const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;



const randomAssessmentQuestions = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      const module_id = req.params.module_id;
       if(!module_id || !comp_id){
        return res.json({message:"Module id,company id is not provided",success:false})
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
        const mcqSql = `SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE module_id = ${module_id} ORDER BY RAND() LIMIT 10`;
        const questions = await queryPromiseWithAsync(mcqSql);
        // console.log("questions", questions);
  
        // Fetch one random email question from lms_EmailAndTextQuestions
        const randomEmailSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Email" AND module_id = ${module_id} ORDER BY RAND() LIMIT 1`;
        const randomEmailResult = await queryPromiseWithAsync(randomEmailSql);
        // console.log("randomEmailResult", randomEmailResult);
  
        // Fetch one random text question from lms_EmailAndTextQuestions
        const randomTextSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Text" AND module_id = ${module_id} ORDER BY RAND() LIMIT 1`;
        const randomTextResult = await queryPromiseWithAsync(randomTextSql);
        // console.log("randomTextResult", randomTextResulte);
  
        // Fetch one random audio question from lms_EmailAndTextQuestions
        const randomAudioSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Audio" AND module_id = ${module_id} ORDER BY RAND() LIMIT 1`;
        const randomAudioResult = await queryPromiseWithAsync(randomAudioSql);
        // console.log("randomAudioResult", randomAudioResult);
  
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
  
  const GradedAssesmentAnswerByEmployee = async (req, res) => {
    try {
      const mcqSet = req.body.mcq;
      const emp_id = req.params.emp_id;
      const module_id = req.params.module_id;
      const mcq_selectedAnswer = req.body.mcq_selectedAnswer; // In Array of string
      const email_answer = req.body.email_answer; // In Array of string
      const text_answer = req.body.text_answer; // In Array of string
      const mcq_score = req.body.mcq_score;
      if(!emp_id||!module_id ){
        return res.json({message:"Employee Id Or Module id is not provided",success:false})
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
        const selectSql ="SELECT comp_id FROM lms_courseEmployee WHERE emp_id = ?";
        connection.query(selectSql, [emp_id], (err, resp) => {
          if (err) {
            console.log("err in SELECT query", err);
            return res.json({ message: "error in SELECT query", success: false });
          }
  
          if (resp?.length === 0) {
            return res.json({ message: "No user found", success: false });
          }
  
          const comp_id = resp[0].comp_id;
  
          const checkEmployeeSql ="SELECT COUNT(*) AS count FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?";
  
          connection.query(
            checkEmployeeSql,
            [emp_id, module_id],
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
                const updateSql = `
                              UPDATE lms_GradedAssesmentAnswersByEmployee 
                              SET mcq_id=?,text_id = ?,email_id=?,audio_id = ?, mcq_questions = ?, mcq_options = ?, mcq_correctAnswer = ?, mcq_selectedAnswer = ?,
                                  email_question = ?, email_answer = ?, text_question = ?, text_answer = ?,audio_question = ? , mcq_score = ?,mcq_score_outOff=?,text_score =0,text_score_outOff=0,email_score=0,email_score_outOff=0,audio_score=0,audio_score_outOff=0,total_score=0,out_off=0, attempt = attempt + 1
                              WHERE emp_id = ? AND module_id =? 
                          `;
                connection.query(
                  updateSql,
                  [
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
                    emp_id,
                    module_id
                  ],
                  (updateErr, updateResults) => {
                    if (updateErr) {
                      console.log("err in UPDATE query", updateErr);
                      return res.json({
                        message: "error in UPDATE query",
                        success: false,
                      });
                    }
                    // console.log("updateResults", updateResults);
                    return res.json({ message: "done", success: true });
                  }
                );
              } else {
                // console.log("Insert");
                const insertSql = `
                              INSERT INTO lms_GradedAssesmentAnswersByEmployee 
                                  (comp_id, emp_id,module_id,mcq_id,text_id,email_id,audio_id, mcq_questions, mcq_options, mcq_correctAnswer, mcq_selectedAnswer,
                                  email_question, email_answer, text_question, text_answer,audio_question, mcq_score, mcq_score_outOff,attempt) 
                              VALUES (?,?, ?, ?,?,?, ?,?, ?, ?,?,?, ?, ?, ?, ?, ?,?, 1)
                          `;
  
                connection.query(
                  insertSql,
                  [
                    comp_id,
                    emp_id,
                    module_id,
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
                    // console.log("insertResults", insertResults);
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
  
  const audioAnswer = async (req, res) => {
    try {
      const emp_id = req.params.emp_id;
      const module_id = req.params.module_id;
  
      if(!emp_id || !module_id){
        return res.json({message:"Employee Id Or Module_id is not provided ",success:false})
      }
      if (!req.file) {
        console.log("No Audio file uploaded");
        const updateQuery = 'UPDATE lms_GradedAssesmentAnswersByEmployee SET audio_answer = ? WHERE emp_id = ? AND module_id = ?';
        await queryPromiseWithAsync(updateQuery, ["", emp_id, module_id]);
        return res.status(200).json({ message: "No file uploaded, audio answer set to empty string", success: true });
      }
  
      const audio = req.file;
      const searchEmpAnswer = 'SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?';
      const searchResult = await queryPromiseWithAsync(searchEmpAnswer, [emp_id, module_id]);
  
      if (searchResult?.length <= 0) {
        return res.status(404).json({ message: "Employee's answer not found", success: false });
      }
  
      const updateQuery = 'UPDATE lms_GradedAssesmentAnswersByEmployee SET audio_answer = ? WHERE emp_id = ? AND module_id = ?';
      const updateResult = await queryPromiseWithAsync(updateQuery, [audio.filename, emp_id, module_id]);
  
      return res.json({ message: "Audio file uploaded successfully", success: true });
  
    } catch (error) {
      console.error("Internal server error:", error);
      return res.status(500).json({ message: "Internal server error", success: false });
    }
  };
  
  const courseEvaluationByCompIdAndCourseId = async (req, res) => {
    const comp_id = req.params.comp_id;
    const course_id = req.params.course_id;
  
    if (!comp_id) {
      return res.json({ message: "Company ID is not given", success: false });
    }
    if (!course_id) {
      return res.json({ message: "Course ID is not given", success: false });
    }
  
    // Check if the company exists
    let q = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";
    connection.query(q, [comp_id], (err, resp) => {
      if (err) {
        return res.json({
          message: "Error getting company data",
          success: false,
        });
      } else {
        if (resp.length <= 0) {
          return res.json({
            message: "Haven't purchased the Course Yet",
            success: false,
          });
        } else {
          // If the company exists, proceed to query employee data
          const sql =
            "SELECT lms_GradedAssesmentAnswersByEmployee.emp_id, lms_courseEmployee.emp_name, lms_courseEmployee.emp_email, lms_courseEmployee.course_code " +
            "FROM lms_GradedAssesmentAnswersByEmployee " +
            "JOIN lms_courseEmployee ON lms_GradedAssesmentAnswersByEmployee.emp_id = lms_courseEmployee.emp_id " +
            "WHERE lms_GradedAssesmentAnswersByEmployee.comp_id = ? AND lms_GradedAssesmentAnswersByEmployee.course_id = ?";
          connection.query(sql, [comp_id, course_id], (err, resp) => {
            if (err) {
              console.log(err);
              return res.json({
                message: "Failed",
                error: err,
                success: false,
              });
            } else {
              return res.json({ message: "Success", data: resp, success: true });
            }
          });
        }
      }
    });
  };
  
  const getDatafromCourseEmployeeAnswer = async (req, res) => {
    const emp_id = req.params.emp_id;
    const module_id = req.params.module_id;
    if(!emp_id || !module_id){
      return res.json({message:"Employee Id Or Module Id is not provided",success:false})
    }
    const sql ="SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id =? AND module_id =?  ";
    const result = await queryPromiseWithAsync(sql,[emp_id, module_id])
  
      if (result.length <= 0) {
        console.log("Haven't submitted the graded assement of this Module");
        return res.json({message: "Haven't submitted the graded assement of this Module",success: false});
      }
      const parsedResp = result.map((entry) => {
        return {
          ...entry,
          mcq_options: JSON.parse(entry.mcq_options),
        };
      });
      return res.json({ message: "done", success: true, data: parsedResp });
    
  };
  

  const updateCourseScore = async (req, res) => {
    const id = req.params.emp_id;
    const module_id = req.params.module_id
    const mcq_score = req.body.mcq.mcq_score|| null;
    const mcq_score_outOff = req.body.mcq.mcq_score_out_off;
    const email_score = req.body.email.email_score;
    const email_score_outOff = req.body.email.email_score_out_off;
    const text_score = req.body.text.text_score;
    const text_score_outOff = req.body.text.text_score_out_off;
    const audio_score = req.body.audio.audio_score
    const audio_score_outOff = req.body.audio.audio_score_out_off
    const out_off = mcq_score_outOff + email_score_outOff + text_score_outOff + audio_score_outOff;
    const total_score = mcq_score + email_score + text_score + audio_score;
    if(!id||!module_id){
      return res.json({message:"Id or Module Id  is not provided",success:false})
    }
    try {
      const updateQuery = `UPDATE lms_GradedAssesmentAnswersByEmployee
          SET
          mcq_score = COALESCE(?, mcq_score),
          mcq_score_outOff = COALESCE(?, mcq_score_outOff),
          email_score_outOff = COALESCE(?, email_score_outOff),
          text_score_outOff = COALESCE(?, text_score_outOff),
          out_off = COALESCE(?, out_off),
          email_score = COALESCE(?, email_score),
          text_score = COALESCE(?, text_score),
          total_score = COALESCE(?, total_score),
          audio_score = COALESCE(?, audio_score),
          audio_score_outOff = COALESCE(?, audio_score_outOff)
          WHERE
          emp_id = ? AND module_id = ?
        `;
      await connection.query(updateQuery,[mcq_score,mcq_score_outOff,email_score_outOff,text_score_outOff,out_off,email_score,text_score,total_score,audio_score,audio_score_outOff,id,module_id],(err, resp) => {
          if (err) {
            console.log("err", err);
            return res.status(500).json({ success: false, message: "Fatal error", error: err });
          }
          return res.json({data: resp,success: true, message: "Data Updated successfully",});
        }
      );
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
  };
  
module.exports = {randomAssessmentQuestions,GradedAssesmentAnswerByEmployee,audioAnswer,courseEvaluationByCompIdAndCourseId,getDatafromCourseEmployeeAnswer,updateCourseScore}