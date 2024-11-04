const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")
const connection = require("../../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;



const uploadGradedAssesmentMCQ = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if (!module_id) {
      return res.status(400).json({ success: false, message: "module_id is not provided" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (req.file.mimetype !== 'text/csv') {
      return res.status(400).json({ success: false, message: "File must be in CSV format" });
    }

    const filePath = req.file.path;
    const category_id = 1;
    const category = "MCQ";
    const response = await csv().fromFile(filePath);

    let count = 0;

    for (const item of response) {
      count++;
      const optionsArray = [];
      if (item["Option A"]) optionsArray.push(item["Option A"].trim());
      if (item["Option B"]) optionsArray.push(item["Option B"].trim());
      if (item["Option C"]) optionsArray.push(item["Option C"].trim());
      if (item["Option D"]) optionsArray.push(item["Option D"].trim());

      const correctAnswer = item.CorrectAnswer.trim();
      
      const query = `
        INSERT INTO lms_CourseGradedAssessmentMCQ (module_id, type, questions, options, correctAnswer, category_id, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      try {
        await queryPromiseWithAsync(query, [
          module_id,
          item.Type,
          item.Questions,
          JSON.stringify(optionsArray), // Assuming you want to store options as JSON string
          correctAnswer,
          category_id,
          category,
        ]);
      } catch (error) {
        console.error("Error inserting data:", error);
        // Log the error and continue with the next item
        continue;
      }
    }

    // Update module status
    const updateSql = `UPDATE lms_Module SET isGraded = 1 WHERE id = ?`;
    await queryPromiseWithAsync(updateSql, [module_id]);

    return res.status(200).json({
      success: true,
      message: "File imported successfully",
      total_no_of_question_uploaded: count,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getGradedMcq = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if(!module_id){
      return res.json({message:"Module id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE module_id";
    connection.query(sql, [module_id], (err, resp) => {
      if (err) {
        console.log(err);
        return res.json({ message: "Query Error", success: false, error: err });
      }
      const count = resp?.length;
      return res.json({
        message: "data",
        count: count,
        questions: resp,
        success: true,
      });
    });
  } catch (error) {
    console.log("errr", error);
    return res.json({
      message: "Internal Server Error",
      success: false,
      error: error,
    });
  }
};

const updateGradedMCQquestionsById = async (req, res) => {
  try {
    const id = req.params.question_id;
    if(!id){
      return res.json({message:" id are not provided",success:false})
    }
    const { questions, options, correctAnswer, type } = req.body;
    // console.log("type",questions);
    // Check if at least one of the fields is provided
    if (!questions && !options && !correctAnswer && !type) {
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
    if (type) {
      updateFields.push("type = ?");
      params.push(type);
    }

    if (options) {
      updateFields.push("options = ?");
      params.push(JSON.stringify(parsedOptions));
    }

    if (correctAnswer) {
      updateFields.push("correctAnswer = ?");
      params.push(correctAnswer);
    }

    const updateSql = `UPDATE lms_CourseGradedAssessmentMCQ SET ${updateFields.join(
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

const getGradedAssessmentByModuleId = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if(!module_id){
      return res.json({message:"Module id is not provided",success:false})
    }
    const sql ="SELECT id,questions  FROM lms_CourseGradedAssessmentMCQ WHERE module_id = ?";
    const result = await queryPromiseWithAsync(sql,module_id)
    if (result.length<=0) {
      return res.json({ message: "Not found", success: false });
    }
    return res.json({ message: "Success", data: result, success: true });
  } catch (error) {
    return res.json({message: "Internal server Error",error: error,success: false});
  }
};

const getGradedassesmentMcqByQuestionId = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    if(!question_id){
      return res.json({message:"question Id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE id =?";
    const result = await queryPromiseWithAsync(sql,question_id)
    if (result.length<=0) {
      return res.json({ message: "Not found", success: false });
    }
    return res.json({ message: "Success", success: true, data: result[0] });
  } catch (error) {
    return res.json({ message: "Internal server Error",success: false,error: error});
  }
};

const deleteCourseMcq = async(req,res)=>{
  try {
    const id = req.params.id
    const getQuerry = 'SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE id = ? AND finalAssessmentStatus = 0 ?'
    const result = await queryPromiseWithAsync(getQuerry,id)
    if(result.length<=0){
    return res.json({message:"Deletion unsuccessfull",success:false})
    }
    const deleteQuery = 'DELETE FROM lms_CourseGradedAssessmentMCQ WHERE id = ?';
    await queryPromiseWithAsync(deleteQuery, [id]);
    return res.json({message:"Deletion successfull",success:true})
  } catch (error) {
    return res.json({message:"Internal Server error",success:false,error:error})

  }
}

module.exports = {uploadGradedAssesmentMCQ,getGradedMcq,updateGradedMCQquestionsById,getGradedAssessmentByModuleId,getGradedassesmentMcqByQuestionId,deleteCourseMcq}
