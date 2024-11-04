
const connection = require("../../../../mysql");
const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")



const getCourseName = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if (!comp_id) {
      return res.status(400).json({ message: "Company Id is not provided", success: false });
    }

    const getCourseFromCompany = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?';
    const result = await queryPromiseWithAsync(getCourseFromCompany, comp_id);

    if (result?.length <= 0) {
      return res.status(404).json({ message: "Data not found", success: false });
    }

    const course_id = result[0]?.course_id;
    const getNameSql = "SELECT course_name FROM lms_Course WHERE id = ?";
    const getNameResult = await queryPromiseWithAsync(getNameSql, course_id);

    if (getNameResult?.length <= 0) {
      return res.status(404).json({ message: "Course not found", success: false });
    }

    const course_name = getNameResult[0].course_name;
    const sqlModule = "SELECT id, module_name FROM lms_Module WHERE course_id = ?";
    const moduleResult = await queryPromiseWithAsync(sqlModule, course_id);

    if (moduleResult?.length <= 0) {
      return res.status(404).json({ message: "No Module Exist", success: false });
    }

    const sqlCourseCompany = "SELECT course_id ,start_date, end_date FROM lms_CourseCompany WHERE comp_id = ?";
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
          console.log("employeeResult for module", id, ":", employeeResult);
  
          if (employeeResult?.length <= 0) {
            console.log("No result found for module", id);
            if (i > 0) {
              const prevGraded = await isModuleGraded(prevId);
              if (!prevGraded) {
                passedIds.push(id);
                break;
              }
  
              const prevModuleResult = await queryPromiseWithAsync(checkEmployeeResult, [emp_id, prevId]);
              console.log("Previous module result for", prevId, ":", prevModuleResult);
  
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

module.exports = {getCourseName,accessForCourse,getUserData,employeeCanAccessCourse}