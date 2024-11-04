const {queryPromiseWithAsync} = require("../../../../Utility/helperFunction")
const connection = require("../../../../../mysql");


const getGradedAssessmentAllQuestionModuleId = async (req, res) => {
  try {
    const sql = "SELECT module_id, COUNT(*) AS questionCount FROM lms_CourseGradedAssessmentMCQ GROUP BY module_id";
    const mcqResult = await queryPromiseWithAsync(sql);

    const sqlOtherQuestions = "SELECT module_id, COUNT(*) AS questionCount FROM lms_GradedAssementOtherQuestions GROUP BY module_id";
    const otherQuestionResult = await queryPromiseWithAsync(sqlOtherQuestions);

    if ((!mcqResult || mcqResult.length === 0) && (!otherQuestionResult || otherQuestionResult.length === 0)) {
      return res.status(200).json({
        message: "No MCQ or other questions found",
        data: { mcq: [], other: [] },
        success: true,
      });
    }

    if (!mcqResult || mcqResult.length === 0) {
      return res.status(200).json({
        message: "No MCQ questions found",
        data: { mcq: [], other: otherQuestionResult },
        success: true,
      });
    }

    if (!otherQuestionResult || otherQuestionResult.length === 0) {
      return res.status(200).json({
        message: "No other questions found",
        data: { mcq: mcqResult, other: [] },
        success: true,
      });
    }

    const data = { mcq: mcqResult, other: otherQuestionResult };
    return res.status(200).json({ message: "Success", data: data, success: true });
  } catch (error) {
    console.error("Error fetching graded assessment questions:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message, // Provide the error message for better debugging
      success: false,
    });
  }
};

// const UploadGradedEmailAndTextQuestion = async (req, res) => {
//   try {
//     const module_id = req.params.module_id;
//     if (!module_id) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Course id doesnot provided" });
//     }
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file uploaded" });
//     }

//     const filePath = req.file.path;
//     let count = 0;
//     const response = await csv().fromFile(filePath);

//     for (const item of response) {
//       // Map the category to category_id
//       const categoryId =
//         item.Category.toLowerCase() === "email"
//           ? 3
//           : item.Category.toLowerCase() === "text"
//             ? 2
//             : item.Category.toLowerCase() === "audio"
//               ? 4
//               : null;
//       const category =
//         item.Category.toLowerCase() === "email"
//           ? "Email"
//           : item.Category.toLowerCase() === "text"
//             ? "Text"
//             : item.Category.toLowerCase() === "audio"
//               ? "Audio"
//               : null;

//       // Check if a valid category is found
//       if (categoryId !== null || category !== null) {
//         count++;
//         const query = `
//                     INSERT INTO lms_GradedAssementOtherQuestions (module_id,category,category_id, topic)
//                     VALUES (?,?,?, ?)
//                 `;

//         // Assuming you have a MySQL connection object named 'connection'
//         await connection.query(query, [
//           module_id,
//           category,
//           categoryId,
//           item.Topics,
//         ]);
//       }
//     }
//     const updateSql = `UPDATE lms_Module  SET isGraded = 1 WHERE id = ${module_id}`
// const result = await queryPromiseWithAsync(updateSql)
//     return res.json({
//       status: 202,
//       success: true,
//       message: "File imported successfully",
//       total_question: count,
//     });
//   } catch (error) {
//     console.log("Error in emailAndTextQuestionUpload:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

const UploadGradedEmailAndTextQuestion = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if (!module_id) {
      return res.status(400).json({ success: false, message: "Course id is not provided" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (req.file.mimetype !== 'text/csv') {
      return res.status(400).json({ success: false, message: "File must be in CSV format" });
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
      if (categoryId !== null && category !== null) {
        count++;
        const query = ` INSERT INTO lms_GradedAssementOtherQuestions (module_id, category, category_id, topic) VALUES (?, ?, ?, ?)`;

        // Assuming you have a MySQL connection object named 'connection'
        await queryPromiseWithAsync(query, [
          module_id,
          category,
          categoryId,
          item.Topics,
        ]);
      }
    }

    // Update module status
    const updateSql = `UPDATE lms_Module SET isGraded = 1 WHERE id = ?`;
    await queryPromiseWithAsync(updateSql, [module_id]);

    return res.status(200).json({
      success: true,
      message: "File imported successfully",
      total_question: count,
    });
  } catch (error) {
    console.log("Error in emailAndTextQuestionUpload:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const updateGradedTextAndEmailquestionsById = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    const questions = req.body.question;
    // console.log("questions",questions);
    if(!question_id || !questions){
      return res.json({message:"Question id Or questions are not provided",success:false})
    }
    const sql =
      "UPDATE lms_GradedAssementOtherQuestions SET topic = ? WHERE id =?";

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

const getGradedAssessmentOtherQuestionsByModuleId = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if(!module_id){
      return res.json({message:"Module Id is not provided",success:false})
    }
    const sql ="SELECT id,topic,category  FROM lms_GradedAssementOtherQuestions WHERE module_id = ?";
    const resp = await queryPromiseWithAsync(sql,module_id)
      if (!resp||resp.length<=0) {
        return res.json({ message: "Data not available for thise module",  success: false });
      }
      return res.json({ message: "Success", data: resp, success: true });
  } catch (error) {
    return res.json({message: "Internal server Error",error: error,success: false});
  }
};

const getGradedassesmentOthersByQuestionId = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    if(!question_id){
      return res.json({message:"Question Id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_GradedAssementOtherQuestions WHERE id =?";
    const resp = await queryPromiseWithAsync(sql,question_id)
      if (!resp||resp.length<=0) {
        return res.json({ message: "Data not available for thise module",  success: false });
      }
      return res.json({ message: "Success", data: resp, success: true });
  } catch (error) {
    return res.json({message: "Internal server Error",success: false,error: error});
  }
};


const deleteCourseOtherQuestion = async(req,res)=>{
  try {
    const id = req.params.id
    const getQuerry = 'SELECT * FROM lms_GradedAssementOtherQuestions WHERE id = AND finalAssessmentStatus = 0 ?'
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


module.exports = {getGradedAssessmentAllQuestionModuleId,UploadGradedEmailAndTextQuestion,updateGradedTextAndEmailquestionsById,getGradedAssessmentOtherQuestionsByModuleId,getGradedassesmentOthersByQuestionId,deleteCourseOtherQuestion}