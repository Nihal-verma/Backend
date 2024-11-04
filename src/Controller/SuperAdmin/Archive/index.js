const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")
const connection = require("../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;

const archiveCompany= async(req,res)=>{
    try {
      const comp_id = req.params.comp_id;
      const deleteCompany = "UPDATE lms_companyDetails SET Archive_status = 0 WHERE id=?";
  
      const result = await queryPromiseWithAsync(deleteCompany, comp_id)
      if(result?.length<=0){
        return res.json({message:"data not found",success:false})
      }
        // Check if any rows were affected to determine if the video was deleted successfully
        const deletedRows = result.affectedRows;
        if (deletedRows <= 0) {
     
          return res.status(404).json({
            success: false,
            message: "Video not found or could not be deleted",
          });
        }
        return res.status(404).json({
          success: true,
          message: "Deletion successfull",
        });
    } catch (error) {
      console.error("Error in deleteVideo API:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
      return
    }
  };
  
  const restoreCompany= async(req,res)=>{
    try {
      const comp_id = req.params.comp_id;
      const restoreCompany = "UPDATE lms_companyDetails SET Archive_status = 1 WHERE id=?";
          const result = await queryPromiseWithAsync(restoreCompany,comp_id) 
          if(result?.length<=0){
            return res.json({message:"Data not found",success:false})
          }
        const restoredRows = result.affectedRows;
        if (restoredRows <= 0) {
          console.log("Company not found or could not be Restore");
          return res.status(404).json({
            success: false,
            message: "Company not found or could not be Restore",
          });
        }
        return res.status(202).json({
          success: true,
          message: "Company Restore successfully"
        });
    } catch (error) {
      console.error("Error in delete company:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
  
  const getArchiveCompany = async (req, res) => {
    try {
      const sql = "SELECT * FROM lms_companyDetails Where Archive_status = 0";
      const result = await queryPromiseWithAsync(sql)
      if (result?.length <= 0) {
        return res.json({ message: "Data not found", success: false ,data:[]})
      }
      const id = result.map((value) => {
        return value.id;
      });
      const compName = result.map((value) => {
        return value.comp_name;
      });
      return res.json({id: id,comp_name: compName,compData: result,success: true,});
    }
    catch (error) {
      console.log(error);
      return res.json({message: "error in fetching data",success: false,error: error,});
    }
  };

module.exports = {archiveCompany,restoreCompany,getArchiveCompany}
  