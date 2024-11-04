const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")
const connection = require("../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;



const createModule = async (req, res) => {
    try {
      const course_id = req.params.course_id;
      const module_name = req.body.module_name;
      const module_description = req.body.module_description;
      if(!course_id){
        return res.json({message:"Course Id is not provided",success:false})
      }
      if (!module_name || !module_description) {
        return res.json({message: "fields Cannot be null or Empty",success: false,});
      }
      const sql = "INSERT INTO lms_Module (course_id, module_name, module_description) VALUES (?, ?, ?)";
      connection.query(sql, [course_id, module_name, module_description], async (err, resp) => {
        if (err) {
          console.log("Fatal error", err);
          return res.json({ message: "Fatal Error", error: err, success: false });
        }
      const module_id = resp.insertId;
      const getCompanySql = 'SELECT comp_id FROM lms_CourseCompany WHERE course_id = ? AND status = 1';
      const companyResults = await queryPromiseWithAsync(getCompanySql, [course_id]);
  
        if (companyResults?.length <= 0) {
          console.log("No company found to add a lesson");
          return res.json({message:"Data not found",success:false})
        } else {
          for (const company of companyResults) {
            const insertSql = 'INSERT INTO lms_CourseAllotmentToCompany (course_id, module_id, comp_id, status) VALUES (?, ?, ?, 0)';
            await queryPromiseWithAsync(insertSql, [course_id, module_id, company.comp_id]);
          }
        }
  
        return res.json({ message: "Successfully Added Course", success: true });
      });
    } catch (error) {
      return res.json({ message: "Internal Server Error", error: error });
    }
  };
  
 
  const getAllModuleData = async (req, res) => {
    try {
      const sql = "SELECT * FROM lms_Module";
      connection.query(sql, (err, resp) => {
        if (err) {
          console.log("err", err);
          return res.json({
            message: "Error in query",
            error: err,
            success: false,
          });
        }
        // console.log("resp",resp[0]);
        return res.json({ message: "done", data: resp, success: true });
      });
    } catch (error) {
      console.log("error", error);
    }
  };
  
  const updateModule = async (req, res) => {
    try {
      const id = req.params.id;
      const { module_name, module_description } = req.body;
      if(!id){
        return res.json({message:"Id is not provided",success:false})
      }
      if (!module_name && !module_description) {
        return res.json({
          message: "Nothing is provided for update",
          success: false,
        });
      }
  
      // Build the SET part of the SQL query dynamically based on provided values
      let setClause = "";
      const values = [];
  
      if (module_name) {
        setClause += "module_name = ?, ";
        values.push(module_name);
      }
  
      if (module_description) {
        setClause += "module_description = ?, ";
        values.push(module_description);
      }
  
      // Remove the trailing comma and space from setClause
      setClause = setClause.replace(/, $/, "");
  
      const sql = `UPDATE lms_Module SET ${setClause} WHERE id = ?`;
  
      // Add id to values array
      values.push(id);
  
      connection.query(sql, values, (err, resp) => {
        if (err) {
          return res.json({ message: "Fatal error", success: false });
        }
  
        return res.json({
          message: "Update is Successful",
          data: resp,
          success: true,
        });
      });
    } catch (error) {
      console.log("Internal Server Error", error);
      return res
        .status(500)
        .json({ message: "Internal Server Error", success: false });
    }
  };
  
  const getModuleByCourseId = async(req,res)=>{
    try {
      const course_id = req.params.course_id
      if(!course_id){
        return res.json({message:"Course Id is not provided",success:false})
      }
      const searchQuery = 'SELECT * FROM lms_Module WHERE course_id =?'
      const result = await queryPromiseWithAsync(searchQuery,course_id)
      if(result.length<=0){
        return res.json({message:"Unable to find Data ",success:false})
      }
      return res.json({message:"success",success:true,data:result})
      
    } catch (error) {
      console.log("Internal Server Error");
    }
  }
  
  const getModuleWithAttempt = async (req, res) => {
    try {
      const course_id = req.params.course_id;
      const emp_id = req.params.emp_id;
  
      if(!course_id ||!emp_id){
        return res.json({message:"Course Id Or Employee Id is not provided",success:false})
      }
      const searchQuery = 'SELECT * FROM lms_Module WHERE course_id = ? AND isGraded = 1';
      const modules = await queryPromiseWithAsync(searchQuery, course_id);
  
      if (modules.length <= 0) {
        return res.json({ message: "Unable to find Data", success: false });
      }
      const data = [];
      for (const module of modules) {
        const module_id = module.id;
        const searchAttended = 'SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE module_id = ? AND emp_id = ?';
        const attendedResult = await queryPromiseWithAsync(searchAttended, [module_id, emp_id]);
        module.hasAttempt = attendedResult.length > 0;
        data.push(module);
      }
  
      return res.json({ message: "Data fetched successfully", success: true, data: data });
    } catch (error) {
      console.log("Internal Server Error", error);
      return res.status(500).json({ message: "Internal Server Error", success: false });
    }
  };

module.exports = {createModule,getAllModuleData,updateModule,getModuleByCourseId,getModuleWithAttempt}