const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")

const createCompany = async (req, res) => {
    try {
      const {comp_name,comp_address,
        id_number,
        comp_phone,
        comp_email,
        comp_city,
        comp_street,
        comp_state,
        comp_zipcode,
        comp_region,
        admin_name,
        admin_email,
        admin_contact_number,
        certification_needed,
      } = req.body;
  
      // Regular expression for email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
      if (!emailRegex.test(comp_email) || !emailRegex.test(admin_email)) {
        console.log("Invalid Company Email Or Admin Email");
        return res.json({message: "Invalid Company Email Or Admin Email",success: false});
      }
  
      if (
        comp_name === "" ||
        comp_address === "" ||
        id_number === "" ||
        comp_phone === "" ||
        comp_email === "" ||
        comp_city === "" ||
        comp_street === "" ||
        comp_state === "" ||
        comp_zipcode === "" ||
        comp_region === "" ||
        admin_name === "" ||
        admin_email === "" ||
        admin_contact_number === "" ||
        certification_needed === "" ||
        comp_email === "" ||
        admin_email === ""
      ) {
        return res.json({ message: "Invalid or empty fields", success: false });
      }
  
      // Check if admin_email already exists in the table
      const CompanyEmailQuery ="SELECT * FROM lms_companyDetails WHERE comp_email = ?";
      const existingCompany = await queryPromiseWithAsync(CompanyEmailQuery, [comp_email]);
      if (existingCompany?.length > 0) {
        return res.json({
          message: "Company email already exists",
          success: false,
        });
      }
      const adminEmailQuery ="SELECT * FROM lms_companyDetails WHERE admin_email = ?";
      const existingAdmin = await queryPromiseWithAsync(adminEmailQuery, [admin_email]);
  
      if (existingAdmin?.length > 0) {
        console.log("Error");
        return res.json({message: "Admin email already exists",success: false});
      }
  
      // Example: Generate a password of length 12
      const admin_password = generatePassword(12);
  
      const hashedPassword = await bcrypt.hash(admin_password, 10);
  
      const result = await queryPromiseWithAsync(
        "INSERT INTO lms_companyDetails (comp_name,comp_address,id_number,comp_phone,comp_email,comp_city,comp_street,comp_state,comp_zipcode,comp_region,admin_name,admin_email,admin_password,admin_contact_number,certification_needed) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          comp_name,
          comp_address,
          id_number,
          comp_phone,
          comp_email,
          comp_city,
          comp_street,
          comp_state,
          comp_zipcode,
          comp_region,
          admin_name,
          admin_email,
          hashedPassword,
          admin_contact_number,
          certification_needed,
        ]
      );
  
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const sender = {
        email: senderMail,
        name: "Nihal",
      };
      const receivers = [
        {
          email: admin_email,
        },
      ];
  
      const sendEmail = await apiInstance.sendTransacEmail({
        sender,
        to: receivers,
        subject: "Password",
        textContent: "Hello, this is server side",
        htmlContent: `Admin_Email:- ${admin_email} and Password is ${admin_password}`,
      });
  
      return res.status(200).json({
        status: 200,
        message: "Company registered successfully",
        success: true,
        mail: sendEmail,
      });
    } catch (error) {
      console.log(error);
      return res.json({
        message: "Error occurred",
        success: false,
        error: error.message,
      });
    }
  };
  
const getCompany = async (req, res) => {
    try {
      const sql = "SELECT * FROM lms_companyDetails WHERE Archive_status = 1";
      const result = await queryPromiseWithAsync(sql)
      if (result.length <= 0) {
        return res.json({ message: "No company Found", success: false });
      }
      return res.json({ compData: result, success: true });
    } catch (error) {
      console.log(error);
      return res.json({ message: "error in fetching data",success: false, error: error});
    }
  };
  
const getCompanyById = async (req, res) => {
    try {
      const id = req.params.comp_id;
      if(!id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = "SELECT * FROM lms_companyDetails Where id = ?";
      const result = await queryPromiseWithAsync(sql, [id])
        if (result.length<=0) {
          console.log(err);
          return res.json({message: "error in fetching data",error: err,success: false});
        }
          const comp_id = result.map((value) => {
            return value.id;
          });
          const compName = result.map((value) => {
            return value.comp_name;
          });
          return res.json({id: comp_id,comp_name: compName,compData: result,success: true});
        
      
    } catch (error) {
      console.log(error);
      return res.json({message: "error in fetching data",success: false,error: error});
    }
  };
  
const updateCompany = async (req, res) => {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    try {
      const {comp_name,comp_address,id_number,comp_phone,
        comp_email,
        comp_city,
        comp_street,
        comp_state,
        comp_zipcode,
        comp_region,
        admin_name,
        admin_email,
        admin_contact_number,
        certification_needed,
      } = req.body;
  
      const updateFields = {
        comp_name,
        comp_address,
        id_number,
        comp_phone,
        comp_email,
        comp_city,
        comp_street,
        comp_state,
        comp_zipcode,
        comp_region,
        admin_name,
        admin_email,
        admin_contact_number,
        certification_needed,
      };
  
      const filteredUpdateFields = Object.fromEntries(
        Object.entries(updateFields).filter(
          ([key, value]) => value !== undefined && value !== null
        )
      );
  
      if (Object.keys(filteredUpdateFields)?.length === 0) {
        return res.status(400).json({
          status: 400,
          message: "No fields provided for update",
          success: false,
        });
      }
  
      const updateQuery = "UPDATE lms_companyDetails SET " +
        Object.keys(filteredUpdateFields)
          .map((key) => `${key} = ?`)
          .join(", ") +
        " WHERE id = ?";
  
      const updateValues = [...Object.values(filteredUpdateFields), comp_id];
  
      // Check if admin_email is being updated
      if ("admin_email" in filteredUpdateFields) {
        // Example: Generate a password of length 8
  
        const admin_password = generatePassword(12);
        const hashedPassword = await bcrypt.hash(admin_password, 10);
  
        // Update the admin_password in the database
        const updatePasswordQuery ="UPDATE lms_companyDetails SET admin_password = ? WHERE id = ?";
        const updatePasswordValues = [hashedPassword, comp_id];
  
        // Execute the update password query
        await queryPromiseWithAsync(updatePasswordQuery, updatePasswordValues);
  
        // Send the new password to the updated admin_email
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sender = {
          email: senderMail,
          name: "Nihal",
        };
        const receivers = [
          {
            email: admin_email,
          },
        ];
  
        await apiInstance.sendTransacEmail({
          sender,
          to: receivers,
          subject: "New Password",
          textContent:
            "Your password has been updated. Your new password is: " +
            admin_password,
          htmlContent: `Your password has been updated. Your new password is: <strong>${admin_password}</strong>`,
        });
      }
  
      // Execute the update query for other fields
      await queryPromiseWithAsync(updateQuery, updateValues)
     
          return res.status(200).json({
            status: 200,
            message: "Company updated successfully",
            success: true,
          });
        
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: error,
        status: 500,
        message: "Internal Server Error",
        success: false,
      });
    }
  };
  
  const deleteCompany = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if (!comp_id) {
        return res.json({ message: "Company ID not provided", success: false });
      }
  
      // Check if company exists
      const searchCompId = 'SELECT * FROM lms_companyDetails WHERE id = ?';
      const searchResult = await queryPromiseWithAsync(searchCompId, [comp_id]);
      if (searchResult.length <= 0) {
        return res.json({ message: "Company Not found in DataBase", success: false });
      }
  
      
  
      // Check and delete employees and their related data
      const searchEmployee = 'SELECT * FROM lms_employee WHERE comp_id = ?';
      const searchEmployeeResult = await queryPromiseWithAsync(searchEmployee, [comp_id]);
      if (searchEmployeeResult.length > 0) {
        for (const employee of searchEmployeeResult) {
          const emp_id = employee.id;
  
          // Delete employee answers
          const tnaEmployeeAnswerSql = "SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id = ? "
          const tnaEmployeeAnswerResult = await queryPromiseWithAsync(tnaEmployeeAnswerSql,[emp_id])
          if(tnaEmployeeAnswerResult.length>0){
            const deleteEmployeeAnswers = 'DELETE FROM lms_TNA_Employee_Answers WHERE emp_id = ?';
            await queryPromiseWithAsync(deleteEmployeeAnswers, [emp_id]);
          }
          
          // Delete employee record
  
          const tnaEmployeeSql = "SELECT * FROM lms_employee WHERE id = ? "
          const tnaEmployeeResult = await queryPromiseWithAsync(tnaEmployeeSql,[emp_id])
          if(tnaEmployeeResult.length>0){
            const deleteEmployeeQuery = 'DELETE FROM lms_employee WHERE id = ?';
          await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);
          }
          
        }
      }
  
      // Delete licensing information
      const searchTnaLicensing = 'SELECT * FROM TNA_licensing WHERE comp_id = ?'
      const searchTnaResult = await queryPromiseWithAsync(searchTnaLicensing, [comp_id]);
      if (searchTnaResult.length > 0) {
        const deleteLicensingQuery = 'DELETE FROM TNA_licensing WHERE comp_id = ?';
        await queryPromiseWithAsync(deleteLicensingQuery, [comp_id]);
      }
  
      const searchCourseCompany = 'SELECT * FROM  lms_CourseCompany WHERE comp_id = ?'
      const searchCourseCompanyResult = await queryPromiseWithAsync(searchCourseCompany, [comp_id]);
      if (searchCourseCompanyResult.length > 0) {
  
        const searchCourseEmployee = 'SELECT * FROM lms_courseEmployee WHERE comp_id = ?';
      const searchCourseEmployeeResult = await queryPromiseWithAsync(searchCourseEmployee, [comp_id]);
      if (searchCourseEmployeeResult.length > 0) {
        for (const courseEmployee of searchCourseEmployeeResult) {
          const emp_id = courseEmployee.emp_id;
  
          // Delete graded assessment answers
          const getGradedsql = 'SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?'
          const getGradedData = await queryPromiseWithAsync(getGradedsql, [emp_id])
          if (getGradedData.length > 0) {
            const deleteGradedAnswers = 'DELETE FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?';
            await queryPromiseWithAsync(deleteGradedAnswers, [emp_id]);
          }
          const getNonGradedsql = 'SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?'
          const getNonGradedData = await queryPromiseWithAsync(getNonGradedsql, [emp_id])
  
          if (getNonGradedData.length > 0) {
            const deleteNonGradedAnswers = 'DELETE FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?';
            await queryPromiseWithAsync(deleteNonGradedAnswers, [emp_id]);
          }
  
  
          const getLogoutsql = 'SELECT * FROM lms_EmployeeLogInLogOut WHERE emp_id = ?'
          const getLogOutData = await queryPromiseWithAsync(getLogoutsql, [emp_id])
  
          if (getLogOutData.length > 0) {
            const deleteLoginLogoutRecords = 'DELETE FROM lms_EmployeeLogInLogOut WHERE emp_id = ?';
            await queryPromiseWithAsync(deleteLoginLogoutRecords, [emp_id]);
  
          }
  
          const getVideosql = 'SELECT * FROM lms_EmployeeVideoData WHERE emp_id = ?'
          const getVideoData = await queryPromiseWithAsync(getVideosql, [emp_id])
  
          if (getVideoData.length > 0) {
            const deleteVideoData = 'DELETE FROM lms_EmployeeVideoData WHERE emp_id = ?';
            await queryPromiseWithAsync(deleteVideoData, [emp_id]);
  
          }
  
  
          const getCourseEmployeesql = 'SELECT * FROM lms_courseEmployee WHERE emp_id = ?'
          const getCourseEmployeData = await queryPromiseWithAsync(getCourseEmployeesql, [emp_id])
  
          if (getCourseEmployeData.length > 0) {
            // Delete course employee record
            const deleteCourseEmployeeQuery = 'DELETE FROM lms_courseEmployee WHERE emp_id = ?';
            await queryPromiseWithAsync(deleteCourseEmployeeQuery, [emp_id]);
  
          }
        }
      }
  
      const getVideoSql = "SELECT * FROM lms_EmployeeVideoData WHERE comp_id = ?"
      const getVideoSqlData = await queryPromiseWithAsync(getVideoSql,[comp_id])
      if(getVideoSqlData.length>0){
        const deleteVideosqlDataSql = 'DELETE FROM lms_EmployeeVideoData WHERE comp_id = ?';
        await queryPromiseWithAsync(deleteVideosqlDataSql, [comp_id]);
      }
  
  
      const getCourseAllotments = "SELECT * FROM lms_CourseAllotmentToCompany WHERE comp_id = ?"
      const getCourseAllotmentsData = await queryPromiseWithAsync(getCourseAllotments,[comp_id])
      if(getCourseAllotmentsData.length>0){
        const deleteCourseAllotments = 'DELETE FROM lms_CourseAllotmentToCompany WHERE comp_id = ?';
        await queryPromiseWithAsync(deleteCourseAllotments, [comp_id]);
      }
   
      const getTrialEvents = "SELECT * FROM trialEvents WHERE comp_id = ?"
      const getTrialEventsData = await queryPromiseWithAsync(getTrialEvents,[comp_id])
      if(getTrialEventsData.length>0){
        const deleteEventsQuery = 'DELETE FROM trialEvents WHERE comp_id = ?';
        await queryPromiseWithAsync(deleteEventsQuery, [comp_id]);;
      }
  
      const getLatestEvents = "SELECT * FROM lms_latestEvents WHERE comp_id = ?"
      const getLatestEventsData = await queryPromiseWithAsync(getLatestEvents,[comp_id])
      if(getLatestEventsData.length>0){
        const deleteLatestEventsQuery = 'DELETE FROM lms_latestEvents WHERE comp_id = ?';
        await queryPromiseWithAsync(deleteLatestEventsQuery, [comp_id]);;
      }
  
      const getNotifySql = "SELECT * FROM lms_Notify WHERE comp_id = ?"
      const getNotifyData = await queryPromiseWithAsync(getNotifySql,[comp_id])
      if(getNotifyData.length>0){
        const deleteNotifyQuery = 'DELETE FROM lms_Notify WHERE comp_id = ?';
        await queryPromiseWithAsync(deleteNotifyQuery, [comp_id]);;
      }
        const deleteCourseCompanyQuery = 'DELETE FROM lms_CourseCompany WHERE comp_id = ?';
        await queryPromiseWithAsync(deleteCourseCompanyQuery, [comp_id]);
      }
      // Delete course company associations
  
  
      // Check and delete course employees and their related data
      
  
      // Delete company details
      const deleteCompanyQuery = 'DELETE FROM lms_companyDetails WHERE id = ?';
      await queryPromiseWithAsync(deleteCompanyQuery, [comp_id]);
  
      return res.json({ message: "Deletion successful", success: true });
    } catch (error) {
      console.error("Internal Server Error:", error);
      return res.json({ message: "Internal Server Error", success: false, error: error });
    }
  };
  


module.exports = {createCompany,getCompany,getCompanyById,updateCompany,deleteCompany}