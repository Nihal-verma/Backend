const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")
const connection = require("../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;


const updateNotify = async(req,res)=>{
    try {
      const emp_id = req.params.emp_id
      const comp_id = req.body.comp_id
      const module_id = req.body.module_id
      if(!emp_id||!module_id ||!comp_id){
        return res.json({message:"Employee Id , Company Id Or Module id is not provided",success:false})
      }
         const searchQuery = 'SELECT attempt FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?'
      const resultSearchQuery = await queryPromiseWithAsync(searchQuery,[emp_id,module_id])
      if(resultSearchQuery?.length<=0){
        console.log("data not found");
        return
      }
      if(resultSearchQuery[0].attempt>1){
         const sql = 'INSERT INTO lms_Notify (emp_id,comp_id,module_id,Reattempt) VALUES(?,?,?,1)'
         const result = await queryPromiseWithAsync(sql,[emp_id,comp_id,module_id])
         if(result?.length<=0){
           return res.json({message:"Unable to insert the data",success:false})
         }
         return res.status(200).json({message:"Insertion with reattempt successfull",success:true})
      }
      // console.log("resultSearchQuery",resultSearchQuery[0].attempt);
      const sql = 'INSERT INTO lms_Notify (emp_id,comp_id,module_id) VALUES(?,?,?)'
      const result = await queryPromiseWithAsync(sql,[emp_id,comp_id,module_id])
      if(result?.length<=0){
        return res.json({message:"Unable to insert the data",success:false})
      }
      return res.status(200).json({message:"Insertion successfull",success:true})
  
    } catch (error) {
      console.log("error", error);
      return res.status(500).json({ message: "An error occurred",error: error, success: false });
    }
  }
  

  const getNotify = async (req, res) => {
    try {
      const sql = 'SELECT * FROM lms_Notify';
      const notifyResults = await queryPromiseWithAsync(sql);
  
      if (notifyResults?.length === 0) {
        return res.status(200).json({ message: "No Data Found", success: false });
      }
  
      const notifications = await Promise.all(notifyResults.map(async (notify) => {
        const [employeeResult, companyResult, moduleResult] = await Promise.all([
          queryPromiseWithAsync('SELECT emp_name FROM lms_courseEmployee WHERE emp_id = ?', notify.emp_id),
          queryPromiseWithAsync('SELECT comp_name FROM lms_companyDetails WHERE id = ?', notify.comp_id),
          queryPromiseWithAsync('SELECT module_name FROM lms_Module WHERE id = ?', notify.module_id),
        ]);
  
        if (employeeResult?.length > 0 && moduleResult?.length > 0 && companyResult?.length > 0) {
          return {
            id: notify.id,
            emp_id: notify.emp_id,
            comp_id: notify.comp_id,
            module_id: notify.module_id,
            comp_name: companyResult[0].comp_name,
            emp_name: employeeResult[0].emp_name,
            module_name: moduleResult[0].module_name,
            status: notify.Reattempt == 1 ? 'Reattempted' : 'Attempted',
          };
        } else {
          return null;
        }
      }));
  
      // Filter out null results
      const filteredNotifications = notifications.filter(notification => notification !== null);
  
      return res.status(200).json({ data: filteredNotifications, success: true });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ message: "Internal Server Error", success: false });
    }
  };
  
  const deleteNotify = async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ message: "ID not provided", success: false });
      }
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format", success: false });
      }
  
      const getQuery = "SELECT * FROM lms_Notify WHERE id = ?";
      const getQueryResult = await queryPromiseWithAsync(getQuery, id);
  
      if (getQueryResult?.length <= 0) {
        return res.status(404).json({ message: "Data not found for the given ID", success: false });
      }
  
      const deleteQuery = 'DELETE FROM lms_Notify WHERE id = ?';
      const deletedResult = await queryPromiseWithAsync(deleteQuery, id);
      if (deletedResult.affectedRows === 0) {
        return res.status(500).json({ message: "Data not deleted", success: false });
      }
      return res.status(200).json({ message: "Data deleted successfully", success: true });
  
    } catch (error) {
      console.error("Error deleting notification data:", error);
      return res.status(500).json({ message: "Internal Server Error", success: false });
    }
  };
  