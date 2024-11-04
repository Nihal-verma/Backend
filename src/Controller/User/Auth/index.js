
const connection = require("../../../../mysql");
const { generateLoginToken } = require("../../../Middleware/jwt")
const bcrypt = require("bcrypt");
const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")

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
      const sqlForEmployee =
        "SELECT * FROM lms_courseEmployee WHERE emp_email = ?";
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
          const InsertQuery =
            "INSERT INTO lms_EmployeeLogInLogOut (comp_id, emp_id, logInTime) VALUES (?, ?, ?)";
          const result = await queryPromiseWithAsync(InsertQuery, [
            comp_id,
            emp_id,
            dateTimeObject,
          ]);
        
          return res.json({
            message: "success",
            success: true,
            data: resultgetEmployee[0],
            insertedId: result.insertId,
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

  module.exports = {userLogin,logOutUser,checkAuthentication}