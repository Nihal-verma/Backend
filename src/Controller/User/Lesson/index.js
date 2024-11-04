const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")



const getLessonNameFromNonGradedAssesmentByModuleId = async (req, res) => {
    try {
      const { module_id, emp_id } = req.params;
      
      if (!emp_id || !module_id) {
        return res.status(400).json({ message: "Employee Id Or Module Id Not Provided", success: false });
      }
  
      const searchSql = `SELECT c.lesson_id, c.score, c.out_off, c.attempt, l.lesson_name 
        FROM lms_CourseNonGradedAnswerByEmployee AS c
        JOIN lms_lessons AS l 
        ON c.lesson_id = l.id
        WHERE c.module_id = ? AND c.emp_id = ?`;
  
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

module.exports = {getLessonNameFromNonGradedAssesmentByModuleId}
