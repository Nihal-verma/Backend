const connection = require("../../../../mysql");
const { queryPromiseWithAsync } = require("../../../Utility/helperFunction")

const randomFinalAssementQuestions = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if (!comp_id) {
      return res.json({ message: "Company Id  Or Course Id is not provided", success: false })
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
      const course_id = licenseResp[0]?.course_id;
      // Fetch 10 random questions from lms_TNA_MCQ
      const mcqSql = `SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE course_id = ${course_id} AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 10`;
      const questions = await queryPromiseWithAsync(mcqSql);

      // Fetch one random email question from lms_EmailAndTextQuestions
      const randomEmailSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Email" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
      const randomEmailResult = await queryPromiseWithAsync(randomEmailSql);

      // Fetch one random text question from lms_EmailAndTextQuestions
      const randomTextSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Text" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
      const randomTextResult = await queryPromiseWithAsync(randomTextSql);

      // Fetch one random audio question from lms_EmailAndTextQuestions
      const randomAudioSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Audio" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
      const randomAudioResult = await queryPromiseWithAsync(randomAudioSql);

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

        return res.json({ message: "data received", data: sets, success: true });
      } else {
        return res.json({ message: "Error in fetching questions", success: false });
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({
      error: error,
      message: "error in getMcq Api",
      success: false,
    });
  }
};




const finalAssesmentAnswerByEmployee = async (req, res) => {
  try {
    if (!req.body) {

      return res.json({ message: "Data not provided", success: false })
    }
    const mcqSet = req.body.mcq;
    const emp_id = req.params.emp_id;
    const comp_id = req.params.comp_id;
    const mcq_selectedAnswer = req.body.mcq_selectedAnswer; // In Array of string
    const email_answer = req.body.email_answer; // In Array of string
    const text_answer = req.body.text_answer; // In Array of string
    const mcq_score = req.body.mcq_score;

    const sql = "SELECT course_id FROM lms_CourseCompany  WHERE comp_id = ?"
    const result = await queryPromiseWithAsync(sql, comp_id)
    if (result.length <= 0) {
      return res.json({ message: "Company not found", success: false })
    }
    const course_id = result[0]?.course_id
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
      const selectSql = "SELECT comp_id FROM lms_courseEmployee WHERE emp_id = ?";
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
        const checkEmployeeSql = "SELECT COUNT(*) AS count FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus = 1";
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
              return res.json({ message: "Your answer has been submitted  before", success: false })
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
    const comp_id = req.params.comp_id;
    const finalAssessmentStatus = 1
    if (!emp_id || !comp_id) {
      return res.json({ message: "Employee Id Or Course Id is not provided", success: false })
    }
    const sql = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id=? '
    const result = await queryPromiseWithAsync(sql, comp_id)
    if (result.length <= 0) {
      return res.json({ message: "Company not found", success: false })
    }
    const course_id = result[0]?.course_id
    // Check if a file is uploaded
    if (!req.file) {
      // If no file is uploaded, set audio_answer to an empty string
      const updateQuery = 'UPDATE lms_GradedAssesmentAnswersByEmployee SET audio_answer = ? WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus  = ?';
      await queryPromiseWithAsync(updateQuery, ["", emp_id, course_id, finalAssessmentStatus]);

      return res.status(200).json({ message: "No file uploaded, audio answer set to empty string", success: true });
    }

    const audio = req.file;

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


const checkFinalAssessmentQuestion = async (req, res) => {
  try {
    const checkMcq = 'SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE finalAssessmentStatus = 1 '
    const checkMcqResult = await queryPromiseWithAsync(checkMcq)
    const checkOther = 'SELECT * FROM lms_GradedAssementOtherQuestions WHERE finalAssessmentStatus = 1 '
    const checkOtherResult = await queryPromiseWithAsync(checkOther)
    console.log("checkOtherResult", checkOtherResult);
    if (checkMcqResult.length <= 0 || checkOtherResult <= 0) {

      return res.json({ message: "No final Assessment is created", success: false })
    }
    return res.json({ message: "final Assessment is created", success: true })
  } catch (error) {
    return res.json({ message: "Internal Server Error", success: false, error: error })

  }
}

module.exports = { randomFinalAssementQuestions, finalAssesmentAnswerByEmployee, finalAssesmentAudioAnswer, checkFinalAssessmentQuestion }
