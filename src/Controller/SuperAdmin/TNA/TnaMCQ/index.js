const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")

const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;

const tnaMcqUpload = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, msg: "No file uploaded" });
      }
  
      const filePath = req.file.path;
      const category_id = 1;
      const category = "MCQ";
      const response = await csv().fromFile(filePath);
  
      // Required fields
      const requiredFields = ["Questions", "Option A", "Option B", "Option C", "Option D", "CorrectAnswer"];
      
      // Validate CSV fields
      for (const item of response) {
        for (const field of requiredFields) {
          if (!item[field]) {
            return res.status(400).json({
              success: false,
              message: `Missing required field: ${field} in one of the rows`,
            });
          }
        }
      }
  
      let count = 0;
      for (const item of response) {
        count++;
        const query = `
          INSERT INTO lms_TNA_MCQ (questions, options, correctAnswer, category_id, category)
          VALUES (?, ?, ?, ?, ?)
        `;
  
        // Trim spaces from the prefix of each option
        const optionsArray = [
          item["Option A"].trim(),
          item["Option B"].trim(),
          item["Option C"].trim(),
          item["Option D"].trim(),
        ];
  
        const correctAnswer = item.CorrectAnswer.trim();
        await queryPromiseWithAsync(query, [
          item.Questions.trim(),
          JSON.stringify(optionsArray), // Assuming you want to store options as JSON string
          correctAnswer,
          category_id,
          category,
        ]);
      }
  
      return res.json({
        status: 202,
        success: true,
        message: "File imported successfully",
        total_no_of_question_upoaded: count,
      });
    } catch (error) {
      console.log("Error in importUser:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };
  
  const mcqAllQuestion = async (req, res) => {
    try {
      const sql = "SELECT * FROM lms_TNA_MCQ";
      connection.query(sql, (err, resp) => {
        if (err) {
          console.log(err);
          return res.json({ msg: "Query Error", success: false, error: err });
        }
        const count = resp?.length;
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
  
  const updateMCQquestionsById = async (req, res) => {
    try {
      const id = req.params.id;
      if(!id){
        return res.json({message:"Id is not provided",success:false})
      }
      const { questions, options, correctAnswer } = req.body;
  
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
  
      const updateSql = `UPDATE lms_TNA_MCQ SET ${updateFields.join(
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
  
  const getMcqforEmployeeSetWise = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      // console.log("comp_id",comp_id);
      if(!comp_id){
        return res.json({message:" Company Id is not provided",success:false})
      }
      const licenseSql = "SELECT * FROM TNA_licensing WHERE comp_id = ?";
  
      connection.query(licenseSql, [comp_id], async (licenseErr, licenseResp) => {
        if (licenseErr) {
          return res.json({
            message: "Fatal error in license query",
            success: false,
          });
        }
  
        if (licenseResp.length <= 0) {
          return res.json({
            message: "Company hasn't purchased the TNA license",
            success: false,
          });
        }
  
        // Fetch 10 random questions from lms_TNA_MCQ
        const mcqSql = "SELECT * FROM lms_TNA_MCQ ORDER BY RAND() LIMIT 10";
        const questionsA = await queryPromise(mcqSql);
        const questionsB = await queryPromise(mcqSql);
        const questionsC = await queryPromise(mcqSql);
        const questionsD = await queryPromise(mcqSql);
  
        // Fetch one random email question from lms_EmailAndTextQuestions
        const randomEmailSql =
          'SELECT * FROM lms_EmailAndTextQuestions WHERE category = "Email" ORDER BY RAND() LIMIT 1';
        const randomEmailResult = await queryPromise(randomEmailSql);
  
        // Fetch one random text question from lms_EmailAndTextQuestions
        const randomTextSql =
          'SELECT * FROM lms_EmailAndTextQuestions WHERE category = "Text" ORDER BY RAND() LIMIT 1';
        const randomTextResult = await queryPromise(randomTextSql);
  
        // Check if all queries were successful
        if (randomEmailResult && randomTextResult) {
          const shuffledQuestionsA = [
            ...questionsA,
            randomEmailResult[0],
            randomTextResult[0],
          ].sort(() => Math.random() - 0.5);
          const shuffledQuestionsB = [
            ...questionsB,
            randomEmailResult[0],
            randomTextResult[0],
          ].sort(() => Math.random() - 0.6);
          const shuffledQuestionsC = [
            ...questionsC,
            randomEmailResult[0],
            randomTextResult[0],
          ].sort(() => Math.random() - 0.7);
          const shuffledQuestionsD = [
            ...questionsD,
            randomEmailResult[0],
            randomTextResult[0],
          ].sort(() => Math.random() - 0.8);
  
          const sets = {
            setA: shuffledQuestionsA,
            setB: shuffledQuestionsB,
            setC: shuffledQuestionsC,
            setD: shuffledQuestionsD,
          };
  
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
  
  const updateTNAMCQquestionsById = async (req, res) => {
    try {
      const id = req.params.question_id;
      const { questions, options, correctAnswer } = req.body;
      if(!id){
        return res.json({message:" Id is not provided",success:false})
      }
      if (!questions && !options && !correctAnswer) {
        return res.json({
          message: "No fields provided for update",
          success: false,
        });
      }
  
         // Parse the options string into a JavaScript array
      const parsedOptions = JSON.parse(options);
  
      const updateFields = [];
      const params = [];
  
      if (questions) {
        updateFields.push("questions = ?");
        params.push(questions);
      }
  
      if (options) {
        updateFields.push("options = ?");
        params.push(JSON.stringify(parsedOptions));
      }
  
      if (correctAnswer) {
        updateFields.push("correctAnswer = ?");
        params.push(correctAnswer);
      }
  
      const updateSql = `UPDATE lms_TNA_MCQ SET ${updateFields.join(
        ","
      )} WHERE id = ?`;
      params.push(id);
  
      connection.query(updateSql, params, (err, result) => {
        if (err) {
          console.error("Error updating MCQ questions:", err);
          return res.json({
            message: "Error updating MCQ questions",
            success: false,
          });
        }
  
        if (result.affectedRows > 0) {
          // console.log("result", result);
          return res.json({
            message: "MCQ questions updated successfully",
            success: true,
          });
        } else {
          return res.json({ message: "MCQ questions not found", success: false });
        }
      });
    } catch (error) {
      console.error("Error in updateMCQquestionsById:", error);
      return res.json({ message: "Internal server error", success: false });
    }
  };
  
  const deleteTnaMcq = async(req,res)=>{
    try {
      const id = req.params.id
      const getMcq = 'SELECT * FROM lms_TNA_MCQ WHERE id = ?'
      const result = await queryPromiseWithAsync(getMcq,id)
      if(result.length<=0){
      return res.json({message:"Deletion unsuccessfull",success:false})
      }
      const deleteQuery = 'DELETE FROM lms_TNA_MCQ WHERE id = ?';
      await queryPromiseWithAsync(deleteQuery, [id]);
      return res.json({message:"Deletion successfull",success:true})
    } catch (error) {
      return res.json({message:"Internal Server error",success:false,error:error})
  
    }
  }

module.exports = {tnaMcqUpload,mcqAllQuestion,updateMCQquestionsById,getMcqforEmployeeSetWise,updateTNAMCQquestionsById,deleteTnaMcq}