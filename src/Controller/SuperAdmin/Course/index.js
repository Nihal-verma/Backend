const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")
const connection = require("../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;


const createCourse = async (req, res) => {
  try {
    const course_name = req.body.course_name;
    if (!course_name) {
      return res.json({message: "fields Cannot be null or Empty",success: false});
    }
    const sql ="INSERT INTO lms_Course (course_name) VALUES (?)";
    connection.query(sql, [course_name], (err, resp) => {
      if (err) {
        console.log("Fatal error", err);
        return res.json({ message: "Fatal Error", error: err, success: false });
      }
      return res.json({ message: "Successfully Added Course", success: true });
    });
  } catch (error) {
    return res.json({ message: "Internal Server Error", error: error });
  }
};

const getCourseManagement = async (req, res) => {
  try {
    const course_id = req.params.course_id
    if(!course_id){
      return res.json({message:"Course id is not provided",success:false})
    }
    const sql = "SELECT id, module_name FROM lms_Module WHERE course_id = ?";
    connection.query(sql, [course_id],async (err, categories) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }

      const moduleData = [];

      // Use Promise.all to wait for all module queries to complete
      await Promise.all(
        categories.map(async (category) => {
          const lessonQuery =
            "SELECT id, lesson_name, number_of_videos FROM lms_lessons WHERE module_id = ?";
          const lessons = await new Promise((resolve, reject) => {
            connection.query(
              lessonQuery,
              [category.id],
              (lessonErr, lessonResp) => {
                if (lessonErr) {
                  console.log("err in module query", lessonErr);
                  reject(lessonErr);
                } else {
                  resolve(lessonResp);
                }
              }
            );
          });

          // Create an array of modules for the current course
          const lessonsData = lessons.map((lesson) => ({
            lessonId: lesson.id,
            lessonName: lesson.lesson_name,
            numberOfVideos: lesson.number_of_videos,
          }));

          // Add courseId, courseName, and modulesData to the result array
          moduleData.push({
            moduleId: category.id,
            moduleName: category.module_name,
            lessonsData: lessonsData,
          });
        })
      );

      return res.status(200).json({ success: true, data: moduleData });
    });
  } catch (error) {
    console.log("err", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getCourse = async(req,res)=>{
  try {
    const searchQuery = 'SELECT * FROM lms_Course'
    const result = await queryPromiseWithAsync(searchQuery)
    if(result.length<=0){
      return res.json({message:"Unable to find Data ",success:false})
    }
    return res.json({message:"success",success:true,data:result})
    
  } catch (error) {
    console.log("Internal Server Error");
  }
}

const courseEvaluation = async (req, res) => {
  const comp_id = req.params.comp_id;
  if (!comp_id) {
    return res.json({ message: "Company ID is not given", success: false });
  }

  let q = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";
  connection.query(q, [comp_id], (err, resp) => {
    if (err) {
      return res.json({
        message: "Error getting company data",
        success: false,
      });
    } else {
      if (resp?.length <= 0) {
        return res.json({
          message: "Haven't purchase the Course Yet",
          success: false,
        });
      } else {
        // If the company exists, proceed to query employee data
        const sql =
          "SELECT emp_id, emp_name, emp_email,course_code FROM lms_courseEmployee WHERE comp_id = ?";
        connection.query(sql, [comp_id], (err, resp) => {
          if (err) {
            console.log(err);
            return res.json({
              message: "Failed",
              message: err,
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

const getCourseIdByCompanyId = async(req,res)=>{
  try {
    const comp_id = req.params.comp_id
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const searchQuery = "SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?"
    const result = await queryPromiseWithAsync(searchQuery,comp_id)
    if(result.length<=0){
      return res.json({message:"company havent perchased the course yet",success:false})
    }
    const course_id = result[0].course_id
    return res.json({message:"successful",success:true,data:course_id})
    
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", success: false ,error:error})
  }
}

// const createM = async (req, res) => {
//   try {
//     const course_id = req.params.course_id
//     console.log("course_id",course_id);
//     const module_name = req.body.module_name;
//     const module_description = req.body.module_description;
//     if (!module_name || !module_description) {
//       return res.json({
//         message: "fields Cannot be null or Empty",
//         success: false,
//       });
//     }
//     const sql =
//       "INSERT INTO lms_Module (course_id,module_name, module_description) VALUES (?, ?,?)";

//     connection.query(sql, [course_id,module_name, module_description], (err, resp) => {
//       if (err) {
//         console.log("Fatal error", err);
//         return res.json({ message: "Fatal Error", error: err, success: false });
//       }
//       return res.json({ message: "Successfully Added Course", success: true });
//     });
//   } catch (error) {
//     return res.json({ message: "Internal Server Error", error: error });
//   }
// };
// --------------------------------Working----------------

const updateCourse = async (req, res) => {
  try {
    const id = req.params.id;
    const { course_name } = req.body;
    if(!id){
      return res.json({message:"Id is not provided",success:false})
    }
    if (!course_name) {
      return res.json({message: "Nothing is provided for update",success: false});
    }
    const sql = `UPDATE lms_Course SET course_name=? WHERE id = ?`;
    const result = await queryPromiseWithAsync(sql,[course_name,id])
    if(result?.length<=0){
      return res.json({message: "Update Failed",success: false});
    }
    return res.json({ message: "Update is Successful",data: result,success: true});
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

module.exports = {createCourse,getCourseManagement,getCourse,courseEvaluation,getCourseIdByCompanyId,updateCourse}