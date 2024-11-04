
const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")


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
      res.status(500).json({ message: "Internal Server Error",error:error });
    }
};
  

  module.exports = {getNameApi,checkTotalScore}