const connection = require("../../../../mysql");
const { queryPromiseWithAsync } = require("../../../Utility/helperFunction")


const getNonGraded = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    const lesson_id = req.params.lesson_id;
    if (!module_id || !lesson_id) {
      return res.json({ message: "Module Id or Lesson Id is not Provided", success: false });
    }
    const sql = "SELECT * FROM lms_CourseNonGradedAssessment WHERE module_id = ? AND lesson_id = ?";
    const result = await queryPromiseWithAsync(sql, [module_id, lesson_id]);
    if (result?.length <= 0) {
      return res.json({ success: false, });
    }
    return res.json({ success: true, data: result });
  } catch (error) {
    console.log("Internal Server error", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getNongradedDataByEmployee = async (req, res) => {
  try {
    const emp_id = req.params.emp_id; // Assuming you have a fixed emp_id for testing purposes
    if (!emp_id) {
      return res.json({ message: "Employee Id Not Provided", success: false })
    }
    const getModuleIdSql = 'SELECT DISTINCT module_id FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?';
    const getModuleIdResult = await queryPromiseWithAsync(getModuleIdSql, [emp_id]);
    if (getModuleIdResult?.length <= 0) {
      return res.json({ message: "Data not found for this Employee id", success: false })
    }
    const moduleInfo = [];
    await Promise.all(getModuleIdResult.map(async (v) => {
      const selectQuery = "SELECT id, module_name FROM lms_Module WHERE id = ?";
      const result = await queryPromiseWithAsync(selectQuery, [v.module_id]);
      moduleInfo.push(result[0]);
    }));

    return res.json({ message: "success", data: moduleInfo, success: true });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

const getDatafromNonGradedEmployeeAnswer = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    const lesson_id = req.params.lesson_id;
    if (!emp_id || !lesson_id) {
      return res.json({ message: "Employee Id Or Lesson Id Not Provided", success: false })
    }
    const sql = "SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id =? AND lesson_id =?  ";

    const resp = await queryPromiseWithAsync(sql, [emp_id, lesson_id])
    if (resp?.length <= 0) {
      return res.json({ message: "Haven't submitted the graded assement of this course", success: false });
    }

    const parsedResp = resp?.map((entry) => {
      return { ...entry, mcq_options: JSON.parse(entry.mcq_options) };
    });

    return res.json({ message: "done", success: true, data: parsedResp });
  } catch (error) {
    return res.json({ message: "Internal serrver error", error: error, success: false });

  }
};

const getNonGradedLessonWise = async (req, res) => {
  try {
    const module_id = req.params.module_id
    if (!module_id) {
      return res.json({ message: "Module Id Not Provided", success: false })
    }
    const lessonIds = []
    const sql = 'SELECT DISTINCT lesson_id FROM lms_CourseNonGradedAssessment WHERE module_id = ?'
    const result = await queryPromiseWithAsync(sql, module_id)
    if (result?.length <= 0) {
      return res.json({ message: "No Non Graded Assessment provided for this module", success: false });
    }
    result?.map((item) => {
      lessonIds.push(item.lesson_id)
    })
    return res.json({ message: "Success", success: true, data: lessonIds });

  } catch (error) {
    return res.json({ message: "Internal serrver error", error: error, success: false });

  }
}

const getNonGradedMcqQuestions = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const module_id = req.params.module_id
    const lesson_id = req.params.lesson_id
    if (!comp_id) {
      return res.json({ message: "Company Id not received from front end", success: false })
    }
    if (!module_id) {
      return res.json({ message: "Module  Id not received from front end", success: false })
    }
    if (!lesson_id) {
      return res.json({ message: "Lesson Id not received from front end", success: false })
    }
    const licenseSql = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";
    connection.query(licenseSql, [comp_id], async (licenseErr, licenseResp) => {
      if (licenseErr) {
        return res.json({ message: "Fatal error in license query", success: false });
      }

      if (licenseResp?.length <= 0) {
        return res.json({ message: "Company hasn't purchased the Course license", success: false });
      }
      const mcqSql = `SELECT * FROM lms_CourseNonGradedAssessment WHERE lesson_id = ${lesson_id} AND module_id = ${module_id} ORDER BY RAND() LIMIT 10`;
      const questions = await queryPromiseWithAsync(mcqSql);
      const shuffledQuestionsA = [...questions].sort(() => Math.random() - 0.5);
      const sets = { setA: shuffledQuestionsA };
      return res.json({ message: "data received", data: sets, success: true });
    });
  } catch (error) {
    console.log(error);
    return res.json({ error: error, message: "error in getMcq Api", success: false });
  }
};

const NonGradedAssesmentAnswerByEmployee = async (req, res) => {
  try {
    const mcqSet = req.body.mcq;
    const emp_id = req.params.emp_id;
    const module_id = req.params.module_id;
    const lesson_id = req.params.lesson_id;

    if (!mcqSet) {
      return res.json({ message: "Question and answer are not provided", success: false })
    }

    if (!emp_id || !module_id || !lesson_id) {
      return res.json({ message: "Employee id, module id Or Lesson id is not provided", success: false })
    }
    
    const mcq_selectedAnswer = req.body.mcq_selectedAnswer; // In Array of string
    const mcq_score = req.body.mcq_score;
    if (Array.isArray(mcqSet)) {
      const mcqQuestions = mcqSet.filter((item) => item.category == "MCQ");
      const mcqIdArray = mcqQuestions.map((v) => v.id);
      const mcqQuestionsArr = mcqQuestions.map((v) => v.questions);
      const optionsArr = mcqQuestions.map((v) => v.options);
      const correctAnswerArr = mcqQuestions.map((v) => v.correctAnswer);
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
        const checkEmployeeSql = "SELECT COUNT(*) AS count FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ? AND lesson_id = ?";
        connection.query(checkEmployeeSql, [emp_id, lesson_id], (checkErr, checkResults) => {
          if (checkErr) {
            console.log("err in checking employee existence", checkErr);
            return res.json({ message: "error in checking employee existence", success: false, });
          }
          if (checkResults[0].count > 0) {
            const updateSql = ` UPDATE lms_CourseNonGradedAnswerByEmployee 
                              SET mcq_id=?, mcq_questions = ?, mcq_options = ?, mcq_correctAnswer = ?, mcq_selectedAnswer = ?,
                              score = ?,out_off=?, attempt = attempt + 1
                              WHERE emp_id = ? AND lesson_id =?
                          `;

            connection.query(
              updateSql,
              [JSON.stringify(mcqIdArray), JSON.stringify(mcqQuestionsArr), JSON.stringify(optionsArr), JSON.stringify(correctAnswerArr), JSON.stringify(mcq_selectedAnswer),
                mcq_score, mcq_score_outOff, emp_id, lesson_id
              ],
              (updateErr, updateResults) => {
                if (updateErr) {
                  console.log("err in UPDATE query", updateErr);
                  return res.json({ message: "error in UPDATE query", success: false });
                }
                return res.json({ message: "done", success: true });
              }
            );
          } else {
            const insertSql = `
                              INSERT INTO lms_CourseNonGradedAnswerByEmployee 
                                  (comp_id, emp_id,module_id,lesson_id,mcq_id, mcq_questions, mcq_options, mcq_correctAnswer, mcq_selectedAnswer,
                                  score, out_off,attempt) 
                              VALUES (?,?, ?, ?,?,?, ?,?,?, ?, ?, 1)
                          `;

            connection.query(
              insertSql,
              [
                comp_id,
                emp_id,
                module_id,
                lesson_id,
                JSON.stringify(mcqIdArray),
                JSON.stringify(mcqQuestionsArr),
                JSON.stringify(optionsArr),
                JSON.stringify(correctAnswerArr),
                JSON.stringify(mcq_selectedAnswer),
                mcq_score,
                mcq_score_outOff,
              ],
              (insertErr, insertResults) => {
                if (insertErr) {
                  console.log("err in INSERT query", insertErr);
                  return res.json({ message: "error in INSERT query", success: false });
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

module.exports = { getNonGraded, getNongradedDataByEmployee, getDatafromNonGradedEmployeeAnswer, getNonGradedLessonWise, getNonGradedMcqQuestions, NonGradedAssesmentAnswerByEmployee }
