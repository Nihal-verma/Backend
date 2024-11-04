const connection = require("../../mysql.js");
const { generateLoginToken } = require("../Middleware/jwt");

const bcrypt = require("bcrypt");
const path = "http://172.20.1.203:4000/VideoUpload/";
const {asyncHandler} = require("../Middleware/asyncHandler.js")

  async function queryPromiseWithAsync(sql, values) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error in queryPromise:", err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// -----------------------------------Auth------------------------
// const userLogin = async(req,res)=>{
//     try {
//         const {email,password} = req.body

//         if(!email){
//             return res.json({message:"email field cannot be empty",success:false})
//         }
//         if(!password){
//             return res.json({message:"password field cannot be empty",success:false})
//         }
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(email)) {
//             return res.json({ message: "Invalid Email", success: false });
//         }
//         const sqlForEmployee = 'SELECT * FROM lms_courseEmployee WHERE emp_email = ?'
//         connection.query(sqlForEmployee,[email], async(err,resp)=>{
//             if(err){
//                 return res.json({message:"Fatal error",error:err,success:false})
//             }
//             if(resp?.length>0){
//                   // Compare hashed password for lms_companyDetails table
//                   const isPasswordValid = await bcrypt.compare(password, resp[0].password);

//                   if (!isPasswordValid) {
//                       return res.status(401).json({ message: "Incorrect password" });
//                   }
//                   const comp_id = resp[0].comp_id
//                   const emp_id = resp[0].emp_id
//                   const dateTimeObject = new Date();
//         console.log("A date-time object is created");

//         const combinedDateTime = dateTimeObject.toISOString().replace('T', ' ').replace(/\.\d+/, '');
//         console.log(`Combined Date-Time: ${combinedDateTime}`);
//                   const InsertQuery = 'INSERT INTO lms_EmployeeLogInLogOut (comp_id, emp_id, logInTime) VALUES (?, ?, ?)'
//                   const result = await queryPromiseWithAsync(InsertQuery,[comp_id,emp_id,dateTimeObject])
//                   console.log("result,",result);
//                   return res.json({message:"success",success:true,data:resp[0]})
//             }
//         })
//     } catch (error) {
//         console.log("error",error);
//         return res.json({message:"Internal Server Error",success:false,error:error})
//     }
// }

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.json({
        message: "email field cannot be empty",
        success: false,
      });
    }
    if (!password) {
      return res.json({
        message: "password field cannot be empty",
        success: false,
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ message: "Invalid Email", success: false });
    }
    const sqlForEmployee ="SELECT * FROM lms_courseEmployee WHERE emp_email = ?";
    connection.query(sqlForEmployee, [email], async (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal error", error: err, success: false });
      }
      if (resp.length > 0) {
        const isPasswordValid = await bcrypt.compare(password,resp[0].password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Incorrect password",success:false });
        }
        const userObj = {
          id:resp[0].emp_id,
          email: resp[0].emp_email,
          password: resp[0].password,
        };
        const userToken = await generateLoginToken(userObj);
        const comp_id = resp[0].comp_Id;
        const emp_id = resp[0].emp_id;
        const dateTimeObject = new Date();
        const searchCourseValidation = "SELECT end_date FROM lms_CourseCompany WHERE comp_id = ?"
        const response = await queryPromiseWithAsync(searchCourseValidation, comp_id)
        if (response?.length <= 0) {
          return res.json({ message: "Unable to get the data", success: false });
        }
        const end_date = response[0].end_date
        const today = new Date()
        if (end_date < today) {
          return res.json({ message: "course access expires", success: false })
        }
        const updateSql = 'UPDATE lms_courseEmployee SET token = ? WHERE emp_id = ?'
        const resultUpdateSql  = await queryPromiseWithAsync(updateSql,[userToken,resp[0].emp_id])
        if(resultUpdateSql.affectedRows <=0){
          return res.json({message:"Unable to login ",success:false})
        }
        const getEmployee = "SELECT * FROM lms_courseEmployee WHERE emp_id=?"
        const resultgetEmployee = await queryPromiseWithAsync(getEmployee,emp_id)
        if(resultgetEmployee?.length<=0){
          return res.json({message:"Something went wrong try to login after few minutes",success:false})
        }
        const InsertQuery ="INSERT INTO lms_EmployeeLogInLogOut (comp_id, emp_id, logInTime) VALUES (?, ?, ?)";
        const result = await queryPromiseWithAsync(InsertQuery, [
          comp_id,
          emp_id,
          dateTimeObject,
        ]);
      
        return res.json({message: "success", success: true,data: resultgetEmployee[0], insertedId: result.insertId,
        });
      }
    });
  } catch (error) {
    console.log("error", error);
    return res.json({
      message: "Internal Server Error",
      success: false,
      error: error,
    });
  }
};

const logOutUser = async (req, res) => {
  try {
    const Loginid = req.params.loginId;
    if (!Loginid) {
      return res.status(400).json({ message: "Login Id is not provided", success: false });
    }
    const dateTimeObject = new Date();
    const hours = dateTimeObject.getHours().toString().padStart(2, "0");
    const minutes = dateTimeObject.getMinutes().toString().padStart(2, "0");
    const seconds = dateTimeObject.getSeconds().toString().padStart(2, "0");

    const combinedDateTime =
      dateTimeObject.toISOString().slice(0, 10) +
      " " +
      hours +
      ":" +
      minutes +
      ":" +
      seconds;

    const sql = `UPDATE lms_EmployeeLogInLogOut SET logOutTime = ? WHERE id = ${Loginid}`;
    const result = await queryPromiseWithAsync(sql, combinedDateTime);
    if (result.affectedRows <= 0) {
      return res.status(400).json({ success: false, message: "Failed to logout" });
    }
    return res.status(200).json({ success: true, message: "LogOutSuccessfull" });
  } catch (error) {
    console.log("Internal Server error", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

 const checkAuthentication = async (req, res) => {
  try {
    const token = req.body.token
    // console.log("token", typeof token);
    if (!req.body) {
      return res.json({ message: "token Not Provided", success: false })
    }
    const selectQuery = 'SELECT * FROM lms_courseEmployee WHERE token = ?'
    const result = await queryPromiseWithAsync(selectQuery, token)
    if (result?.length <= 0) {
      return res.json({ message: "token Error", success: false });
    }
    return res.json({ message: "success", success: true });
  } catch (error) {
    console.log("Internal Server Error");
    return res.json({ message: "Internal Server Error", success: false, error: error });
  }
}


// -----------------------------------Course------------------------


// const getCourseName = async (req, res) => {
//   try {
//     const comp_id = req.params.comp_id;
//     if(!comp_id){
//       return res.status(404).json({message:"Company Id is not provided",success:false})
//     }
//     const getCourseFromCompany = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?'
//     const result = await queryPromiseWithAsync(getCourseFromCompany,comp_id)
//     if(result?.length<=0){
//       return res.json({message:"Data not found",success:false})
//     }
//     const course_id = result[0].course_id;

//     const getNameSql = "SELECT course_name FROM lms_Course WHERE id = ? ";
//     const getNameResult = await queryPromiseWithAsync(getNameSql, course_id);
//     if(getNameResult?.length<=0){
//       return res.json({
//         message: "Course not found",
//         success: false,

//       });
//     }
//     const course_name = getNameResult[0].course_name;

//     // Execute the first query to get module names and IDs
//     const sqlModule = "SELECT id, module_name FROM lms_Module WHERE course_id = ?";
//     const moduleResult = await queryPromiseWithAsync(sqlModule, course_id);

//     // Execute the second query to get start_date and end_date
//     const sqlCourseCompany =
//       "SELECT start_date, end_date FROM lms_CourseCompany WHERE comp_id = ?";
//     const courseCompanyResult = await queryPromiseWithAsync(sqlCourseCompany, [
//       comp_id,
//     ]);
// // console.log("courseCompanyResult",courseCompanyResult);
//     // Execute the third query to get the count of lessons and number of videos for each module
//     if(moduleResult?.length<=0){
//       return res.json({message:"No Module Exist",success:false})
//     }


//     const lessonCounts = await Promise.all(
//       moduleResult.map(async (module) => {
//         const sqlLessonCount =
//           "SELECT COUNT(*) AS lesson_count, SUM(number_of_videos) AS total_videos FROM lms_lessons WHERE module_id = ?";
//         const lessonCountResult = await queryPromiseWithAsync(sqlLessonCount, [
//           module.id,
//         ]);
//         return {
//           module_id: module.id,
//           lesson_count: lessonCountResult[0].lesson_count,
//           total_videos: lessonCountResult[0].total_videos,
//         };
//       })
//     );

//     // Add lessonCounts to moduleResult
//     const moduleResultWithCounts = moduleResult.map((module, index) => ({
//       ...module,
//       lesson_count: lessonCounts[index].lesson_count,
//       total_videos: lessonCounts[index].total_videos,
//     }));

//     // Format end_date and add one day if it has time component
//     const formattedCourseCompanyResult = courseCompanyResult.map((row) => {
//       // console.log("row",row);
//       let endDate = new Date(row.end_date);
//       // console.log("endDate",endDate);

//       // Check if end_date has time component (ending with 'Z')
//       if (row.end_date.endsWith("Z")) {
//         // Extract the time components
//         const hours = endDate.getUTCHours();
//         const minutes = endDate.getUTCMinutes();
//         const seconds = endDate.getUTCSeconds();

//         // Check if the time part is not midnight (00:00:00)
//         if (!(hours === 0 && minutes === 0 && seconds === 0)) {
//           endDate.setDate(endDate.getDate() + 1); // Add one day
//         }
//       }

//       const formattedEndDate = endDate.toLocaleDateString("en-GB"); // Format to DD-MM-YYYY
//       return { ...row, end_date: formattedEndDate, course_name: course_name };
//     });


//     // console.log("formattedCourseCompanyResult",formattedCourseCompanyResult);
//     // Combine the results into one object
//     const combinedResult = {
//       moduleResult: moduleResultWithCounts,
//       courseDetails: formattedCourseCompanyResult,
//     };
//     // console.log("combinedResultcombinedResultcombinedResult",combinedResult);

//     return res.json({
//       message: "success",
//       success: true,
//       data: combinedResult,
//     });
//   } catch (error) {
//     console.log("Internal Server Error", error);
//     throw error;
//   }
// };

// Function to execute a SQL query


// getCourseName()
// -------------------------changes

const getCourseName = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;

    if (!comp_id) {
      return res.status(400).json({ message: "Company Id is not provided", success: false });
    }

    const getCourseFromCompany = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?';
    const result = await queryPromiseWithAsync(getCourseFromCompany, comp_id);

    if (result.length <= 0) {
      return res.status(404).json({ message: "Data not found", success: false });
    }

    const course_id = result[0].course_id;

    const getNameSql = "SELECT course_name FROM lms_Course WHERE id = ?";
    const getNameResult = await queryPromiseWithAsync(getNameSql, course_id);

    if (getNameResult?.length <= 0) {
      return res.status(404).json({ message: "Course not found", success: false });
    }

    const course_name = getNameResult[0].course_name;

    // Execute the first query to get module names and IDs
    const sqlModule = "SELECT id, module_name FROM lms_Module WHERE course_id = ?";
    const moduleResult = await queryPromiseWithAsync(sqlModule, course_id);

    if (moduleResult?.length <= 0) {
      return res.status(404).json({ message: "No Module Exist", success: false });
    }

    // Execute the second query to get start_date and end_date
    const sqlCourseCompany = "SELECT start_date, end_date FROM lms_CourseCompany WHERE comp_id = ?";
    const courseCompanyResult = await queryPromiseWithAsync(sqlCourseCompany, [comp_id]);

    // Execute the third query to get the count of lessons and number of videos for each module
    const lessonCounts = await Promise.all(
      moduleResult.map(async (module) => {
        const sqlLessonCount = "SELECT COUNT(*) AS lesson_count, SUM(number_of_videos) AS total_videos FROM lms_lessons WHERE module_id = ?";
        const lessonCountResult = await queryPromiseWithAsync(sqlLessonCount, [module.id]);
        return {
          module_id: module.id,
          lesson_count: lessonCountResult[0]?.lesson_count || 0,
          total_videos: lessonCountResult[0]?.total_videos || 0,
        };
      })
    );
    // Add lessonCounts to moduleResult
    const moduleResultWithCounts = moduleResult.map((module, index) => ({
      ...module,
      lesson_count: lessonCounts[index].lesson_count,
      total_videos: lessonCounts[index].total_videos,
    }));

    // Format end_date and add one day if it has time component
    const formattedCourseCompanyResult = courseCompanyResult.map((row) => {
      let endDate = new Date(row.end_date);

      // Check if end_date has time component (ending with 'Z')
      if (row.end_date.endsWith("Z")) {
        const hours = endDate.getUTCHours();
        const minutes = endDate.getUTCMinutes();
        const seconds = endDate.getUTCSeconds();

        // Check if the time part is not midnight (00:00:00)
        if (!(hours === 0 && minutes === 0 && seconds === 0)) {
          endDate.setDate(endDate.getDate() + 1); // Add one day
        }
      }

      const formattedEndDate = endDate.toLocaleDateString("en-GB"); // Format to DD-MM-YYYY
      return { ...row, end_date: formattedEndDate, course_name: course_name };
    });

    // Combine the results into one object
    const combinedResult = {
      moduleResult: moduleResultWithCounts,
      courseDetails: formattedCourseCompanyResult,
    };
// console.log("combinedResult",combinedResult);
    return res.status(200).json({
      message: "Success",
      success: true,
      data: combinedResult,
    });

  } catch (error) {
    console.error("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false, error: error.message });
  }
};

const accessForCourse = async (req, res) => {
  try {
    const comp_id = req.params.comp_id
    if (!comp_id) {
      return res.status(400).json({ message: "Company Id is not provided", success: false });
    }

    const getCourseFromCompany = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?';
    const resultGetCourseFromCompany = await queryPromiseWithAsync(getCourseFromCompany, comp_id);

    if (resultGetCourseFromCompany?.length <= 0) {
      return res.status(404).json({ message: "Data not found", success: false });
    }

    const course_id = resultGetCourseFromCompany[0].course_id;
    const checkSql = 'SELECT module_id FROM lms_CourseAllotmentToCompany WHERE status=1 AND comp_id = ? AND course_id = ?'
    const result = await queryPromiseWithAsync(checkSql, [comp_id, course_id])
    const moduleIds = result.map(row => row.module_id)
    return res.status(200).json({ success: true, message: "Success", data: moduleIds });
  } catch (error) {
    console.log("Internal Server error", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const getUserData = async (req, res) => {
  try {
    const emp_id = req.params.emp_id
    const passedIds = req.body.passedIds
    if (!emp_id || !passedIds) {
      return res.json({ message: "Employee Id or passed id not provided", success: false })
    }
    const completedIds = [];
    const incompleteIds = [];
    // console.log("passedIds",passedIds);
    for (let i of passedIds) {
      try {
        const sql = 'SELECT * FROM lms_Module WHERE id = ?';
        const result = await queryPromiseWithAsync(sql, i);
        // console.log("result", result[0]);

        if (result[0] && result[0].isGraded == 1) {
          // console.log("entered", i);
          const sqlForGraded = 'SELECT total_score, out_off FROM lms_GradedAssesmentAnswersByEmployee WHERE module_id = ? AND emp_id = ?';
          const resultForGraded = await queryPromiseWithAsync(sqlForGraded, [i, emp_id]);
          // console.log("resultForGraded",resultForGraded);
          if (resultForGraded?.length > 0) {
            if (resultForGraded[0].total_score == 0 || resultForGraded[0].out_off == 0) {
              incompleteIds.push(i);

            } else {
              const percentage = resultForGraded[0].total_score / parseInt(resultForGraded[0].out_off) * 100
              if (percentage >= 70) {
                completedIds.push(i)
              } else {
                incompleteIds.push(i);
              }
            }
          } else {
            incompleteIds.push(i);
          }
        }
        else {
          const sqlForCompletingVideo = 'SELECT id FROM lms_CourseVideo WHERE module_id = ?'
          const resultForCompletingVideo = await queryPromiseWithAsync(sqlForCompletingVideo, i);
          for (let j of resultForCompletingVideo) {
            try {
              const searchInEmployeeData = 'SELECT * FROM lms_EmployeeVideoData WHERE video_id = ? AND emp_id = ?'
              const result = await queryPromiseWithAsync(searchInEmployeeData, [j.id, emp_id])
              if (result?.length > 0) {
                completedIds.push(i);
              } else {
                incompleteIds.push(i);
              }
            } catch (error) {
              console.error(`Error processing video ${j}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing module ${i}:`, error);
      }
    }

    // console.log("completedIds", completedIds);
    // console.log("incompleteIds", incompleteIds);

    return res.json({ completedIds, incompleteIds, success: true });
  } catch (error) {
    console.error("An error occurred:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};

const employeeCanAccessCourse = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    if (!emp_id) {
      return res.status(400).json({ message: "Employee Id is not provided", success: false });
    }

    const moduleIds = req.body.moduleIds;
    let notAttemptedForThisCourseIds = []
    let passedIds = [];

    const isModuleGraded = async (moduleId) => {
      const checkGradedQuery = 'SELECT isGraded FROM lms_Module WHERE id = ?';
      const gradedResult = await queryPromiseWithAsync(checkGradedQuery, [moduleId]);
      return gradedResult?.length > 0 && gradedResult[0].isGraded === 1;
    };

    for (let i = 0; i < moduleIds?.length; i++) {
      const id = moduleIds[i];
      const prevId = moduleIds[i - 1];
      const graded = await isModuleGraded(id);

      if (graded) {
        const checkEmployeeResult = 'SELECT total_score, out_off FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?';
        const employeeResult = await queryPromiseWithAsync(checkEmployeeResult, [emp_id, id]);
        // console.log("employeeResult for module", id, ":", employeeResult);

        if (employeeResult?.length <= 0) {
          console.log("No result found for module", id);
          if (i > 0) {
            const prevGraded = await isModuleGraded(prevId);
            if (!prevGraded) {
              passedIds.push(id);
              break;
            }

            const prevModuleResult = await queryPromiseWithAsync(checkEmployeeResult, [emp_id, prevId]);
            // console.log("Previous module result for", prevId, ":", prevModuleResult);

            if (prevModuleResult?.length > 0 && prevModuleResult[0].total_score !== null && prevModuleResult[0].out_off !== null) {
              const percentage = Math.round((prevModuleResult[0].total_score / prevModuleResult[0].out_off) * 100);
              if (percentage >= 70) {
                console.log("Percentage is above 70% for previous module", prevId);
                passedIds.push(id);
                break;
              } else {
                console.log("Percentage is less than 70% for previous module", prevId);
                break;
              }
            } else {
              notAttemptedForThisCourseIds.push(id);
            }
          }
        } else {
          if (employeeResult[0].total_score === 0 || employeeResult[0].out_off === 0) {
            passedIds.push(id);
            break;
          }
          const percentage = Math.round((employeeResult[0].total_score / employeeResult[0].out_off) * 100);
          console.log("Percentage for module", id, ":", percentage);

          if (percentage < 70) {
            console.log("Percentage is less than 70% for module", id);
            passedIds.push(id);
            break;
          } else {
            console.log("Percentage is 70% or more for module", id);
            passedIds.push(id);
          }
        }
      } else {
        // console.log("Module is not graded:", id);
        passedIds.push(id);
      }
    }

    // console.log("Passed IDs:", passedIds);
    return res.status(200).json({ success: true, message: "Success", data: passedIds, });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// ------------------------------------Video------------------------

// const getSessionWithVideo = async (req, res) => {
//   try {
//     const module_id = req.params.module_id;

//     if (!module_id) {
//       return res.status(400).json({ message: "Module Id is not provided", success: false });
//     }

//     const sql = "SELECT id, lesson_name, lesson_description FROM lms_lessons WHERE module_id = ?";
//     const result = await queryPromiseWithAsync(sql, [module_id]);

//     if (result?.length <= 0) {
//       return res.status(404).json({ message: "No lesson found for this module Id", success: false });
//     }

//     const lesson_ids = result.map(({ id }) => id); // Extract lesson IDs from the result

//     const videoResult = await Promise.all(
//       lesson_ids.map(async (lesson_id) => {
//         const searchVideoSql = "SELECT id, video FROM lms_CourseVideo WHERE module_id = ? AND lesson_id = ?";
//         const videos = await queryPromiseWithAsync(searchVideoSql, [module_id, lesson_id]);

//         if (videos?.length <= 0) {
//           return null;
//         }

//         return {
//           lesson_id,
//           videoId: videos.map((row) => row.id),
//           videos: videos.map((row) => row.video),
//         };
//       })
//     );

//     const filteredVideoResult = videoResult.filter(video => video !== null);

//     const combinedResult = {
//       lessons: result,
//       videoResult: filteredVideoResult,
//     };
// console.log("combinedResult",combinedResult);
//     return res.status(200).json({ success: true, data: combinedResult });
//   } catch (error) {
//     console.error("Internal Server Error", error);
//     return res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

const getSessionWithVideo = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if (!module_id) {
      return res.status(400).json({ message: "Module Id is not provided", success: false });
    }
    const sql ="SELECT id, lesson_name, lesson_description FROM lms_lessons WHERE module_id = ?";
    const result = await queryPromiseWithAsync(sql, [module_id]);
    // console.log("result", result);
    if (result?.length <= 0) {
      return res.status(400).json({ message: "No lesson Found for this module Id", success: false });
    }
    const lesson_ids = result.map(({ id }) => id); // Extract module IDs from the result
    const videoResult = await Promise.all(
      lesson_ids.map(async (lesson_id) => {
        const searchVideoSql ="SELECT * FROM lms_CourseVideo WHERE module_id = ? AND lesson_id = ?";
        const videos = await queryPromiseWithAsync(searchVideoSql, [module_id, lesson_id]);
        if (videos?.length <= 0) {
          return null
        }
        return {
          lesson_id,
          videoId: videos.map((row) => row.id),
          videos: videos.map((row) => row.video),
        }; // Adjust 'video_column_name' with the actual column name containing video data
      })
    );

    const combinedResult = {
      result,
      videoResult,
    };

    return res.json({ success: true, path: path, data: combinedResult });
  } catch (error) {
    console.log("Internal Server error", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const videoTime = async (req, res) => {
  try {
    const module_id = req.params.id;
    const comp_id = req.params.comp_id;
    const emp_id = req.params.emp_id;
    // console.log("course_id", course_id);
    if (!module_id || !comp_id || !emp_id) {
      return res.status(400).json({ message: "Module Id Or Company Id Or Emp_id is not provided", success: false });
    }

    const { lesson_id, video_id, video_duration, video_watched } = req.body;

    const searchSql = 'SELECT * FROM lms_EmployeeVideoData WHERE emp_id = ? AND video_id = ?';
    const searchResult = await queryPromiseWithAsync(searchSql, [emp_id, video_id]);

    if (searchResult?.length > 0) {
      // Assuming `video_watched_value` is the value you want to update in the `video_watched` column
      const video_watched_value = video_watched /* provide the value */

      // Construct the update query
      const updateTimeQuery = "UPDATE lms_EmployeeVideoData SET video_watched = ?, attempt = attempt + 1 WHERE emp_id = ? AND video_id = ?";

      const UpdatedResult = await queryPromiseWithAsync(updateTimeQuery, [video_watched_value, emp_id, video_id]);

      return res.status(200).json({ message: 'Video time updated successfully', success: true, data: UpdatedResult });
    }

    const InserQuery = 'INSERT INTO lms_EmployeeVideoData (module_id, comp_id, emp_id,lesson_id, video_id, video_duration, video_watched ) VALUE(?,?,?,?,?,?,?)'
    const InsertResult = await queryPromiseWithAsync(InserQuery, [module_id, comp_id, emp_id, lesson_id, video_id, video_duration, video_watched])
    return res.status(200).json({ message: 'Video time added successfully', data: { lesson_id: lesson_id, video_id: video_id, video_duration: video_duration, video_watched: video_watched }, success: true });
  } catch (error) {
    console.log("Internal Server error", error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getVideoTime = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    if (!emp_id) {
      return res.status(400).json({ message: "Employee Id is not provided", success: false });
    }
    // Construct the SQL query to retrieve video time data based on employee ID
    const searchSql = 'SELECT lesson_id, video_id, video_watched FROM lms_EmployeeVideoData WHERE emp_id = ?';
    const searchResult = await queryPromiseWithAsync(searchSql, [emp_id]);

    if (searchResult?.length <= 0) {
      return res.status(200).json({ message: "No data found", success: false });
    }

    // Convert the search result to the desired format
    const formattedData = searchResult.reduce((acc, { lesson_id, video_id, video_watched }) => {
      if (!acc[lesson_id]) {
        acc[lesson_id] = {};
      }
      acc[lesson_id][video_id] = video_watched;
      return acc;
    }, {});
    // console.log("formattedData", formattedData);
    // Send response with the formatted video data
    return res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.log("Internal Server error", error);
    // Send response indicating server error
    return res.status(500).json({ message: 'Internal Server Error',success:false });
  }
};
// --------------------------------------Module-------------------------


const getModuleNameById = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    // console.log("course_id", course_id);
    if (!module_id) {
      return res.status(400).json({ message: "Module Id is not provided", success: false });
    }
    const sql =
      "SELECT module_name,module_description,isGraded FROM lms_Module WHERE id = ?";
    const moduleResult = await queryPromiseWithAsync(sql, [module_id]);
    if (moduleResult?.length <= 0) {
      return res.json({ message: "Not found", success: false })
    }
    return res.json({
      message: "success",
      success: true,
      data: moduleResult[0],
      isGraded: moduleResult[0].isGraded === 1 ? "true" : "false"
    });
  } catch (error) {
    console.log("Internal server errrorrr", error);
    return res.json({
      message: "Internal Server Error",
      success: false,
      error: error,
    });
  }
};

// --------------------------------------Non Graded-----------------------
const getNonGraded = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    const lesson_id = req.params.lesson_id;
    if (!module_id || !lesson_id) {
      return res.json({ message: "Module Id or Lesson Id is not Provided", success: false });
    }
    const sql =
      "SELECT * FROM lms_CourseNonGradedAssessment WHERE module_id = ? AND lesson_id = ?";
    const result = await queryPromiseWithAsync(sql, [module_id, lesson_id]);
    if (result?.length <= 0) {
      return res.json({ success: false, data: result });
    }
    return res.json({ success: true });
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
    // Using Promise.all to wait for all asynchronous operations to complete
    await Promise.all(getModuleIdResult.map(async (v) => {
      const selectQuery = "SELECT id, module_name FROM lms_Module WHERE id = ?";
      const result = await queryPromiseWithAsync(selectQuery, [v.module_id]);
      moduleInfo.push(result[0]);
    }));

    // console.log("moduleInfo", moduleInfo);
    return res.json({ message: "success", data: moduleInfo, success: true });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

const getDatafromNonGradedEmployeeAnswer = async (req, res) => {
  const emp_id = req.params.emp_id;
  const lesson_id = req.params.lesson_id;
  if (!emp_id || !lesson_id) {
    return res.json({ message: "Employee Id Or Lesson Id Not Provided", success: false })
  }
  const sql = "SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id =? AND lesson_id =?  ";
  connection.query(sql, [emp_id, lesson_id], (err, resp) => {
    if (err) {
      return res.json({
        error: err.message,
        message: "error in query",
        success: false,
      });
    }
    if (resp?.length <= 0) {
      return res.json({
        message: "Haven't submitted the graded assement of this course",
        success: false,
      });
    }

    const parsedResp = resp?.map((entry) => {
      return {
        ...entry,
        mcq_options: JSON.parse(entry.mcq_options),
      };
    });

    return res.json({ message: "done", success: true, data: parsedResp });
  });
};

const getNonGradedLessonWise = async (req, res) => {
  try {
    const module_id = req.params.module_id
    if (!module_id) {
      return res.json({ message: "Module Id Not Provided", success: false })
    }
    const lessonIds = []
    // const 
    const sql = 'SELECT DISTINCT lesson_id FROM lms_CourseNonGradedAssessment WHERE module_id = ?'
    // const searchGradedMCQ = ' SELECT '
    const result = await queryPromiseWithAsync(sql, module_id)
    // console.log("result",result);
    if (result?.length <= 0) {
      return res.json({ message: "No Non Graded Assessment provided for this module", success: false });
    }
    result.map((item) => {
      lessonIds.push(item.lesson_id)
    })
    // console.log("lessonIds",lessonIds);
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
    if(!comp_id){
      return res.json({message:"Company Id not received from front end",success:false})
    }
    if(!module_id){
      return res.json({message:"Module  Id not received from front end",success:false})
    }
    if(!lesson_id){
      return res.json({message:"Lesson Id not received from front end",success:false})
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

      const mcqSql = `SELECT * FROM lms_CourseNonGradedAssessment WHERE lesson_id = ${lesson_id} AND module_id = ${module_id} ORDER BY RAND() LIMIT 10`;
      const questions = await queryPromiseWithAsync(mcqSql);
      const shuffledQuestionsA = [...questions].sort(() => Math.random() - 0.5);
      const sets = {
        setA: shuffledQuestionsA,
      };

      return res.json({ message: "data received", data: sets, success: true });

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

const NonGradedAssesmentAnswerByEmployee = async (req, res) => {
  try {
    const mcqSet = req.body.mcq;
    const emp_id = req.params.emp_id;
    const module_id = req.params.module_id;
    const lesson_id = req.params.lesson_id;

    if(!mcqSet ){
      return res.json({message:"Question and answer are not provided",success:false})
    }

    if(!emp_id || !module_id ||!lesson_id ){
      return res.json({message:"Employee id, module id Or Lesson id is not provided",success:false})
    }
    const mcq_selectedAnswer = req.body.mcq_selectedAnswer; // In Array of string
    // In Array of string
    const mcq_score = req.body.mcq_score;
    if (Array.isArray(mcqSet)) {
      const mcqQuestions = mcqSet.filter((item) => item.category === "MCQ");

      const mcqIdArray = mcqQuestions.map((v) => v.id);

      const mcqQuestionsArr = mcqQuestions.map((v) => v.questions);
      const optionsArr = mcqQuestions.map((v) => v.options);
      const correctAnswerArr = mcqQuestions.map((v) => v.correctAnswer);


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
        // console.log("comp_id", comp_id);

        const checkEmployeeSql =
          "SELECT COUNT(*) AS count FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ? AND lesson_id = ?";

        connection.query(
          checkEmployeeSql,
          [emp_id, lesson_id],
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
                            UPDATE lms_CourseNonGradedAnswerByEmployee 
                            SET mcq_id=?, mcq_questions = ?, mcq_options = ?, mcq_correctAnswer = ?, mcq_selectedAnswer = ?,
                            score = ?,out_off=?, attempt = attempt + 1
                            WHERE emp_id = ? AND lesson_id =?
                        `;

              connection.query(
                updateSql,
                [
                  JSON.stringify(mcqIdArray),
                  JSON.stringify(mcqQuestionsArr),
                  JSON.stringify(optionsArr),
                  JSON.stringify(correctAnswerArr),
                  JSON.stringify(mcq_selectedAnswer),
                  mcq_score,
                  mcq_score_outOff,
                  emp_id,
                  lesson_id
                ],
                (updateErr, updateResults) => {
                  if (updateErr) {
                    console.log("err in UPDATE query", updateErr);
                    return res.json({
                      message: "error in UPDATE query",
                      success: false,
                    });
                  }
                  console.log("updateResults", updateResults);
                  return res.json({ message: "done", success: true });
                }
              );
            } else {
              console.log("Insert");
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

// --------------------------------------Graded-------------------------------

const getGraded = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if (!module_id) {
      return res.status(400).json({ message: "Module Id is not provided", success: false });
    }
    const sql ="SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE module_id = ? ";
    const McqResult = await queryPromiseWithAsync(sql, [module_id]);
    // console.log("result", McqResult);
    const OtherQuestionSql =
      "SELECT * FROM lms_GradedAssementOtherQuestions WHERE module_id = ? ";
    const OtherResult = await queryPromiseWithAsync(OtherQuestionSql, [module_id]);
    // console.log("OtherResult", OtherResult);
    if (OtherResult?.length <= 0 && McqResult?.length <= 0) {
      return res.json({ success: false, });
    }
    return res.json({message:"Successful", success: true });
  } catch (error) {
    console.log("Internal Server error", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const randomGradedAssementQuestions = async (req, res) => {
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

// --------------------------------------Lesson-------------------------------

const getLessonNameFromNonGradedAssesmentByModuleId = async (req, res) => {
  try {
    const { module_id, emp_id } = req.params;

    if (!emp_id || !module_id) {
      return res.status(400).json({ message: "Employee Id Or Module Id Not Provided", success: false });
    }

    const searchSql = `
      SELECT c.lesson_id, c.score, c.out_off, c.attempt, l.lesson_name 
      FROM lms_CourseNonGradedAnswerByEmployee AS c
      JOIN lms_lessons AS l 
      ON c.lesson_id = l.id
      WHERE c.module_id = ? AND c.emp_id = ?
    `;

    const result = await queryPromiseWithAsync(searchSql, [module_id, emp_id]);

    if (result?.length === 0) {
      return res.status(404).json({ message: "No data found for the provided Module ID and Employee ID", success: false });
    }

    return res.status(200).json({ message: "Success", success: true, data: result });
  } catch (error) {
    console.error("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

// ---------------------------------------Employe-------------------------

const getNameApi = async (req, res) => {
  try {
    const id = req.params.emp_id;
    // console.log("id",id);
    if (!id) {
      return res.json({ message: "Id Not provided", success: false })
    }
    const sql = 'SELECT emp_name FROM lms_courseEmployee WHERE emp_id = ?';
    const result = await queryPromiseWithAsync(sql, id);

    if (result?.length <= 0) {
      return res.status(404).json({ message: "Data Not Found", success: false });
    }

    return res.status(200).json({ message: "Data Found", success: true, data: result[0].emp_name });
  } catch (error) {
    console.error("Error retrieving employee name:", error);
    return res.status(500).json({ message: "Internal Server Error", success: false, error: error.message });
  }
}

const checkTotalScore = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    const moduleId = req.params.module_id;
    console.log("moduleId",moduleId);
    if(!emp_id||!moduleId){
      return res.json({message:"Insuffecient Data ",success:false})
    }
    let allowed = true; 
    const sql = 'SELECT total_score, out_off FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?';
    const result = await queryPromiseWithAsync(sql, [emp_id, moduleId]);
    if (result.length <= 0) {
      return res.json({ message: "Data not found for this user in this module", success: true ,data:true});
    }
    const { total_score, out_off } = result[0];
    if (total_score !== 0 && out_off !== 0) {
      const percentage = Math.round((total_score / out_off) * 100);
      allowed = percentage < 70;
      // console.log(percentage < 70 ? "Less than 70%" : "70% or more");
    }
    return res.json({ message: "Successful", data: allowed, success: true });
  } catch (error) {
    console.log("Internal Server Error", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// -------- SuperAdmin api that is only use by user remove them from super admin-----------------

// ---------------------------------------------Events------------------------------
const getCompanyEvent = async (req, res) => {
  try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
          return res.json({message:"Company Id Not Provided",success:false})
      }
      const sql = 'SELECT date FROM trialEvents WHERE comp_id = ?';
      const result = await queryPromiseWithAsync(sql, comp_id);
      
      if (result?.length <= 0) {
          return res.json({ message: "No events created yet", success: false });
      }

      const data = JSON.parse(result[0].date);
      
      // Parse dates and convert them to Date objects
      const newDate = data.map(v => new Date(v));
      
      // Sort the dates in ascending order
      const sortedDate = newDate.sort((a, b) => a - b);

      // Format the sorted dates to 'DD/MM/YYYY'
      const formattedDate = sortedDate.map(v => {
          return v.toLocaleDateString('en-GB');
      });

      return res.json({ message: "Success", success: true, data: formattedDate });
  } catch (error) {
      console.log("Internal server error", error);
      return res.status(500).json({ status: 500, success: false, message: 'Internal Server Error' });
  }
};

// -----------------------------------------FinalAssessment---------------------------
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
      const questions = await queryPromiseWithAsync(mcqSql);
      console.log("questions", questions);

      // Fetch one random email question from lms_EmailAndTextQuestions
      const randomEmailSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Email" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
      const randomEmailResult = await queryPromiseWithAsync(randomEmailSql);
      console.log("randomEmailResult", randomEmailResult);

      // Fetch one random text question from lms_EmailAndTextQuestions
      const randomTextSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Text" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
      const randomTextResult = await queryPromiseWithAsync(randomTextSql);
      console.log("randomTextResult", randomTextResult);

      // Fetch one random audio question from lms_EmailAndTextQuestions
      const randomAudioSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Audio" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
      const randomAudioResult = await queryPromiseWithAsync(randomAudioSql);
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
      console.log("audioIdArray", audioIdArray);
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

const checkFinalAssessmentQuestion = async(req,res)=>{
  try {
    const checkMcq = 'SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE finalAssessmentStatus = 1 '
    const checkMcqResult = await queryPromiseWithAsync(checkMcq)
    const checkOther= 'SELECT * FROM lms_GradedAssementOtherQuestions WHERE finalAssessmentStatus = 1 '
    const checkOtherResult = await queryPromiseWithAsync(checkOther)
    // console.log("checkOtherResult",checkOtherResult);
    if(checkMcqResult.length<=0||checkOtherResult<=0){
  
      return res.json({message:"No final Assessment is created",success:false})
    }
    return res.json({message:"final Assessment is created",success:true})
  } catch (error) {
    return res.json({message:"Internal Server Error",success:false,error:error})
    
  }
}

// -----------------------------------------TNA -------------------------------

const getMcqforEmployeeSetWise = async (req, res) => {
  try {
    const comp_id = req.params.comp_id
    if (!comp_id) {
      return res.json({ message: "Company Id is not provided", success: false });
    }

    const licenseSql = "SELECT * FROM TNA_licensing WHERE comp_id = ?";
    const licenseResp = await queryPromiseWithAsync(licenseSql, [comp_id]);

    if (licenseResp.length <= 0) {
      return res.json({
        message: "Company hasn't purchased the TNA license",
        success: false,
      });
    }

    // Fetch 10 random questions from lms_TNA_MCQ
    const mcqSql = "SELECT * FROM lms_TNA_MCQ ORDER BY RAND() LIMIT 10";
    const questionsA = await queryPromiseWithAsync(mcqSql);
    const questionsB = await queryPromiseWithAsync(mcqSql);
    const questionsC = await queryPromiseWithAsync(mcqSql);
    const questionsD = await queryPromiseWithAsync(mcqSql);

    // Fetch one random email question from lms_EmailAndTextQuestions
    const randomEmailSql =
      'SELECT * FROM lms_EmailAndTextQuestions WHERE category = "Email" ORDER BY RAND() LIMIT 1';
    const randomEmailResult = await queryPromiseWithAsync(randomEmailSql);

    // Fetch one random text question from lms_EmailAndTextQuestions
    const randomTextSql =
      'SELECT * FROM lms_EmailAndTextQuestions WHERE category = "Text" ORDER BY RAND() LIMIT 1';
    const randomTextResult = await queryPromiseWithAsync(randomTextSql);

    // Check if all queries were successful
    if (questionsA && questionsB && questionsC && questionsD) {
      const shuffledQuestionsA = [
        ...questionsA,
        ...(randomEmailResult?.length > 0 ? [randomEmailResult[0]] : []),
        ...(randomTextResult?.length > 0 ? [randomTextResult[0]] : []),
      ].sort(() => Math.random() - 0.5);

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

      // console.log("sets", sets);
      return res.json({ message : "data received", data: sets, success: true });
    } else {
      return res.json({ message: "Error in fetching questions", success: false });
    }
  } catch (error) {
    console.log(error);
    return res.json({
      error: error.message,
      message: "error in getMcq Api",
      success: false,
    });
  }
};


const tnaAnswerByEmployee = async (req, res) => {
  try {
    // Extract the values from the request body
    // console.log("req.body;", req.body);
    const { mcq, mcq_selectedAnswer, email_answer, text_answer, mcq_score, mcq_score_out_off } = req.body;
    
    const { uniqueToken } = req.params;
    if(!uniqueToken){
      return res.json({message:" uniqueToken is not provided",success:false})
    }
    const textAnswerArray = []
    textAnswerArray?.push(text_answer)
    const email_answerArray = []
    email_answerArray?.push(email_answer)
    const sanitizedTextAnswer = textAnswerArray || [];
    const sanitizedEmailAnswer = email_answerArray || [];
    console.log(Array.isArray(sanitizedEmailAnswer));
    if (Array.isArray(mcq)) {
      const mcqQuestions = mcq?.filter((item) => item?.category === "MCQ");
      const textQuestions = mcq?.filter((item) => item?.category === "Text");
      const emailQuestions = mcq?.filter((item) => item?.category === "Email");
      const mcqQuestionsArr = mcqQuestions?.map((v) => v?.questions);
      const optionsArr = mcqQuestions?.map((v) => v?.options);
      const correctAnswerArr = mcqQuestions?.map((v) => v?.correctAnswer);
      const emailQuestionArr = emailQuestions?.map((v) => v?.topic);
      const textQuestionArr = textQuestions?.map((v) => v?.topic);
 
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
        const emp_id = resp[0]?.id;
        const comp_id = resp[0]?.comp_id;
        const checkEmployeeAnswerSql ="SELECT id FROM lms_TNA_Employee_Answers WHERE emp_id = ?";
        connection.query(checkEmployeeAnswerSql, [emp_id], async(checkErr, checkResults) => {
          if (checkErr) {
            console.log("Error in SELECT query:", checkErr);
            return res.json({ message: "Error in SELECT query", success: false });
          }
          // console.log("checkResults",checkResults);
          if (checkResults?.length > 0) {
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

// checkFinalAssessmentQuestion()
module.exports = {
  userLogin,
  getCourseName,
  getSessionWithVideo,
  getModuleNameById,
  getNonGraded,
  getGraded,
  logOutUser,
  videoTime,
  accessForCourse,
  getVideoTime,
  employeeCanAccessCourse,
  getNongradedDataByEmployee,
  getLessonNameFromNonGradedAssesmentByModuleId,
  getDatafromNonGradedEmployeeAnswer,
  checkAuthentication,
  getNonGradedLessonWise,
  getUserData,
  checkTotalScore,
  getNameApi,
  getCompanyEvent,
  getNonGradedMcqQuestions,
  NonGradedAssesmentAnswerByEmployee,
  checkFinalAssessmentQuestion,
  randomFinalAssementQuestions,
  finalAssesmentAnswerByEmployee,
  finalAssesmentAudioAnswer,
  randomGradedAssementQuestions,
  getMcqforEmployeeSetWise,
  GradedAssesmentAnswerByEmployee,
  audioAnswer,
  tnaAnswerByEmployee

};

// const employeeCanAccessCourse = async (req, res) => {
//   try {
//     const emp_id = req.params.emp_id;
//     const moduleIds = req.body.moduleIds;
//     const alreadyAccessibleIds = [1, 2]; // Assuming 1 is already accessible
//     let notAttemptedForThisCourseIds = [];
//     let noGradedForThisCourseId = [];
//     let failedIds = [];
//     let passedIds = [1, 2];

//     for (let i = 1; i < moduleIds?.length; i++) {
//       const id = moduleIds[i];
//       const prevId = moduleIds[i - 1];
//       console.log("id", id);
//       // const checkGraded = 'SELECT isGraded FROM lms_Module WHERE id = ?'
//       // const checkGradedResult = await queryPromiseWithAsync(checkGraded,id)
//       // if(checkGradedResult?.length>0 && checkGradedResult[0].isGraded ===0){
//       //   passedIds.push(id)
//       //   continue
//       // }
//       const checkEmployeeResult = 'SELECT total_score, out_off FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?';
//       const employeeResult = await queryPromiseWithAsync(checkEmployeeResult, [emp_id, id]);

//       if (employeeResult?.length <= 0) {
//         // Check if the previous module has been attempted and its percentage is above 70
//         const prevModuleResult = await queryPromiseWithAsync(checkEmployeeResult, [emp_id, prevId]);
//         if (prevModuleResult?.length > 0 && prevModuleResult[0].total_score !== null && prevModuleResult[0].out_off !== null) {
//           const percentage = Math.round((prevModuleResult[0].total_score / prevModuleResult[0].out_off) * 100);
//           if (percentage >= 70) {
//             passedIds.push(id);
//           }
//         } else {
//           notAttemptedForThisCourseIds.push(id);
//         }
//       } else {
//         if (employeeResult[0].total_score === null || employeeResult[0].out_off === null) {
//           console.log("here");
//           failedIds.push(id);
//         } else {
//           const percentage = Math.round((employeeResult[0].total_score / employeeResult[0].out_off) * 100);
//           console.log("percentage",percentage,"id",id);
//           if (percentage < 70) {
//             console.log("percentage",percentage,"id",id);
//             // Check if the ID is already in passedIds array before pushing
//             if (!passedIds.includes(id)) {
//               passedIds.push(id);
//             }
//             break; // Stop the loop if the score is less than 70%
//           } else {
//             // Check if the ID is already in passedIds array before pushing
//             if (!passedIds.includes(id)) {
//               passedIds.push(id);
//             }
//           }
//         }
//       }
//     }

//     console.log("notAttemptedForThisCourseIds", notAttemptedForThisCourseIds);
//     console.log("noGradedForThisCourseId", noGradedForThisCourseId);
//     console.log("failedIds", failedIds);
//     console.log("passedIds", passedIds);

//     return res.status(200).json({
//       success: true,
//       message: "Success",
//       data: passedIds,
//     });
//   } catch (error) {
//     console.log("Internal Server error", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error"
//     });
//   }
// }



// const employeeCanAccessCourse = async (req, res) => {
//   try {
//     const emp_id = req.params.emp_id;
//     const moduleIds = req.body.moduleIds;
//     console.log("moduleIds", moduleIds);
//     let notAttemptedForThisCourseIds = []
//     let passedIds = [];
//     const isModuleGraded = async (moduleId) => {
//       const checkGradedQuery = 'SELECT isGraded FROM lms_Module WHERE id = ?';
//       const gradedResult = await queryPromiseWithAsync(checkGradedQuery, [moduleId]);
//       return gradedResult?.length > 0 && gradedResult[0].isGraded === 1;
//     };

//     for (let i = 0; i < moduleIds?.length; i++) {
//       const id = moduleIds[i];
//       const prevId = moduleIds[i - 1];
//       const graded = await isModuleGraded(id);

//       if (graded) {
//         const checkEmployeeResult = 'SELECT total_score, out_off FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?';
//         const employeeResult = await queryPromiseWithAsync(checkEmployeeResult, [emp_id, id]);
//         console.log("employeeResultemployeeResult", employeeResult);
//         if (employeeResult?.length <= 0) {
//           console.log("result not found", id);
//           const prevGraded = await isModuleGraded(prevId);
//           console.log("prevId",prevId);
//           if (!prevGraded) {
//              passedIds.push(id)
//             break
//           }
//           // console.log("id",id);e
//           const prevModuleResult = await queryPromiseWithAsync(checkEmployeeResult, [emp_id, prevId]);
//           console.log("prevModuleResult",prevModuleResult);
//           if (prevModuleResult?.length > 0 && prevModuleResult[0].total_score !== null && prevModuleResult[0].out_off !== null) {
//             const percentage = Math.round((prevModuleResult[0].total_score / prevModuleResult[0].out_off) * 100);
//             if (percentage >= 70) {
//               console.log("percentpercentage is above 70% in  previous", prevId);
//               passedIds.push(id);
//               return
//             } else {
//               console.log("percentpercentage is less 70% in  previous", prevId);
//               return 
//             }
//           } else {
//             notAttemptedForThisCourseIds.push(id);
//           }
//         } else {
//           console.log("employee result found id", id);
//           if (employeeResult[0].total_score === 0 || employeeResult[0].out_off === 0) {
//             passedIds.push(id);
//             break
//           }
//           const percentage = Math.round((employeeResult[0].total_score / employeeResult[0].out_off) * 100);
//           console.log("percentage",percentage,"id",id);
//           if (percentage < 70) {
//             console.log("less than 70 % id",id);
//             passedIds.push(id);
//             break
//           } else {
//             console.log("more than 70 % id",id);
//             passedIds.push(id);
//           }
//         }
//       } else {
//         // Module is not graded, directly add to passedIds
//         passedIds.push(id);
//       }
//     }
//     // console.log("notAttemptedForThisCourseIds", notAttemptedForThisCourseIds);
//     // console.log("noGradedForThisCourseId", noGradedForThisCourseId);
//     // console.log("failedIds", failedIds);
//     console.log("passedIds", passedIds);
//     return res.status(200).json({
//       success: true,
//       message: "Success",
//       data: passedIds,
//     });
//   } catch (error) {
//     console.log("Internal Server error", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error"
//     });
//   }
// }
// const getNameApi = async(req,res)=>{
//   try {
//     const id = req.params.emp_id
//     const sql = 'SELECT emp_name FROM lms_courseEmployee WHERE emp_id = ?'
//     const result = await queryPromiseWithAsync(sql,id)
//     if(result?.length<=0){
//       return res.status(404).json({message:"Data Not Found",success:false})
//     }
//     return res.status(202).json({message:"Data Found",success:true,data:result[0].emp_name})

//   } catch (error) {
//     return res.status(404).json({message:"Internal server Error",success:false,error:error})

//   }
// }


// -------------------------------------Stop user for reattempt -------------------------
// const checkTotalScore = asyncHandler(async (req, res) => {
//   try {
//     const emp_id = req.params.emp_id;
//     const moduleId = req.params.module_id;

//     // Check if emp_id and moduleId are provided
//     if (!emp_id || !moduleId) {
//       return res.status(400).json({ message: "Insufficient Data", success: false });
//     }
//     const searchGraded = "SELECT * FROM lms_Module Where id = ? AND isGraded = 1"
//     const  searchGradedResult = await queryPromiseWithAsync(searchGraded,moduleId)
//     if(searchGradedResult.length<=0){
//       return res.status(404).json({ message: "No Graded for it", success: false,data:true });
//     }
//     // SQL query to get total_score and out_off from the database
//     const sql = 'SELECT total_score, out_off FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?';
//     const result = await queryPromiseWithAsync(sql, [emp_id, moduleId]);

//     // Check if any data is found for the given emp_id and module_id
//     if (result.length <= 0) {
//       return res.status(404).json({ message: "Data not found for this user in this module", success: false,data:true });
//     }
//     console.log("checkTotalScorecheckTotalScore", result);
//     // Destructure total_score and out_off from the result
//     const { total_score, out_off } = result[0];
//     let allowed = true;

//     // Check if total_score and out_off are not zero
//     if (total_score !== 0 && out_off !== 0) {
//       const percentage = Math.round((total_score / out_off) * 100);
//       console.log("percentage", percentage);
//       allowed = percentage < 70;
//     }

//     // Respond with the result
//     return res.status(200).json({ message: "Successful", data: allowed, success: true });

//   } catch (error) {
//     // Log the error and respond with a 500 status code
//     console.error("Internal Server Error", error);
//     return res.status(500).json({ message: "Internal Server Error", success: false, error: error.message });
//   }
// })




