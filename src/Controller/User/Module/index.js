const connection = require("../../../../mysql");
const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")


const getModuleNameById = async (req, res) => {
    try {
      const module_id = req.params.module_id;
      if (!module_id) {
        return res.status(400).json({ message: "Module Id is not provided", success: false });
      }
      const sql ="SELECT module_name,module_description,isGraded FROM lms_Module WHERE id = ?";
      const moduleResult = await queryPromiseWithAsync(sql, [module_id]);
      if (moduleResult?.length <= 0) {
        return res.json({ message: "Not found", success: false })
      }
      return res.json({message: "success",success: true,data: moduleResult?.[0],isGraded: moduleResult[0].isGraded === 1 ? "true" : "false"});
    } catch (error) {
      console.log("Internal server erorr", error);
      return res.json({message: "Internal Server Error",success: false,error: error});
    }
  };
  
module.exports = {getModuleNameById}