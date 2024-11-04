const connection = require("../../../../mysql");
const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")

const getMcqforEmployeeSetWise = async (req, res) => {
    try {
      const comp_id = req.params.comp_id
      if (!comp_id) {
        return res.json({ message: "Company Id is not provided", success: false });
      }
      const licenseSql = "SELECT * FROM TNA_licensing WHERE comp_id = ?";
      const licenseResp = await queryPromiseWithAsync(licenseSql, [comp_id]);
  
      if (licenseResp.length <= 0) {
        return res.json({ message: "Company hasn't purchased the TNA license",success: false});
      }
  
      const mcqSql = "SELECT * FROM lms_TNA_MCQ ORDER BY RAND() LIMIT 10";
      const questionsA = await queryPromiseWithAsync(mcqSql);
      const questionsB = await queryPromiseWithAsync(mcqSql);
      const questionsC = await queryPromiseWithAsync(mcqSql);
      const questionsD = await queryPromiseWithAsync(mcqSql);

      const randomEmailSql ='SELECT * FROM lms_EmailAndTextQuestions WHERE category = "Email" ORDER BY RAND() LIMIT 1';
      const randomEmailResult = await queryPromiseWithAsync(randomEmailSql);
  
      const randomTextSql ='SELECT * FROM lms_EmailAndTextQuestions WHERE category = "Text" ORDER BY RAND() LIMIT 1';
      const randomTextResult = await queryPromiseWithAsync(randomTextSql);
  
      if (questionsA && questionsB && questionsC && questionsD) {
        const shuffledQuestionsA = [
          ...questionsA,
          ...(randomEmailResult?.length > 0 ? [randomEmailResult[0]] : []),
          ...(randomTextResult?.length > 0 ? [randomTextResult[0]] : []),
        ].sort(() => Math.random() - 0.5);
  
        // console.log("shuffledQuestionsA",shuffledQuestionsA);
        const shuffledQuestionsB = [
          ...questionsB,
          ...(randomEmailResult?.length > 0 ? [randomEmailResult[0]] : []),
          ...(randomTextResult?.length > 0 ? [randomTextResult[0]] : []),
        ].sort(() => Math.random() - 0.5);
  
        const shuffledQuestionsC = [
          ...questionsC,
          ...(randomEmailResult?.length > 0 ? [randomEmailResult[0]] : []),
          ...(randomTextResult?.length > 0 ? [randomTextResult[0]] : []),
        ].sort(() => Math.random() - 0.5);
  
        const shuffledQuestionsD = [
          ...questionsD,
          ...(randomEmailResult?.length > 0 ? [randomEmailResult[0]] : []),
          ...(randomTextResult?.length > 0 ? [randomTextResult[0]] : []),
        ].sort(() => Math.random() - 0.5);
  
        const sets = {
          setA: shuffledQuestionsA,
          setB: shuffledQuestionsB,
          setC: shuffledQuestionsC,
          setD: shuffledQuestionsD,
        };
  
        // console.log("sets",sets);
        return res.json({ messsage: "data received", data: sets, success: true });
      } else {
        return res.json({ messsage: "Error in fetching questions", success: false });
      }
    } catch (error) {
      console.log(error);
      return res.json({error: error.message,message: "Internal server error",success: false});
    }
};
  
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
          if (resp?.length === 0) {
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
                    return res.json({message: "error in INSERT query",success: false});
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

module.exports = {getMcqforEmployeeSetWise,tnaAnswerByEmployee}

  