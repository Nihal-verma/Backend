
const connection = require("../../../../mysql");
const { generateLoginToken } = require("../../../Middleware/jwt")
const bcrypt = require("bcrypt");
const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")

const signUp = async (req, res) => {
  try {
    const { roleId, email_Id, password } = req.body;
    // Hash the password
    if(!roleId||!email_Id||!password){
      return res.json({message:"Email Or Password is  not Provided ",success:false})
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const token = await generateToken(email_Id, roleId);
    const sql = "INSERT INTO Users (email_Id, password, roleId, token) VALUES (?, ?, ?, ?)";

    await queryPromiseWithAsync(sql,[email_Id,hashedPassword,roleId,token])
 
    return res.status(200).json({status: 200,message: "User registered successfully",token: token,
      success: true});
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

const superAdminUpdatePassword = async (req, res) => {
  try {
    const { email_Id, password } = req.body;
    if(!email_Id||!password){
      return res.json({message:"Email Or Password is  not Provided ",success:false})
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const checkUserSql = "SELECT roleId from Users WHERE email_Id = ?";
    const response = await queryPromiseWithAsync(checkUserSql,email_Id)

      if(response.length<=0){
        return res.json({message:"Not found",success:false})
      }
    if (response[0]?.roleId === 1) {
      const updatePasswordSql = "UPDATE Users SET password = ? WHERE email_Id = ?";
      const result = await queryPromiseWithAsync(updatePasswordSql, [hashedPassword, email_Id])

      if (result.affectedRows > 0) {
        return res.status(200).json({
          status: 200,
          message: "Password updated successfully",
          success: true,
        });
      } else {
        return res.status(404).json({
          status: 404,
          message: "User not found",
          success: false,
        });
      }

    } else {
      return res.status(404).json({
        status: 404,
        message: "User password cannot be update",
        success: false,
      });
    }
      
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      success: false,
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { email_Id, oldPassword, newPassword } = req.body;
    if(!email_Id || ! oldPassword || ! newPassword){
      return res.json({message:"Not Sufficient Data Provided",success:false})
    }
    // Check if a user with the provided email exists
    const userResult = await queryPromiseWithAsync("SELECT * FROM Users WHERE email_Id = ?",[email_Id]);
    if (userResult?.length === 0) {
      return res.status(404).json({message:"User not found",success: false});
    }

    const isPasswordValid = await bcrypt.compare(oldPassword,userResult[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password",success:false });
    }

    const roleResult = await queryPromiseWithAsync("SELECT roleId from Users WHERE email_Id = ?",[email_Id]);
    if (roleResult[0].roleId !== 1) {
      // Update the password in the database
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateResult = await queryPromiseWithAsync("UPDATE Users SET password = ? WHERE email_Id = ?",[hashedPassword, email_Id]);
      if (updateResult.affectedRows > 0) {
      return res.status(200).json({message:"Password updated successfully", success: true});
      }
    }

    return res.status(404).json({message:"User password cannot be updated",success: false});
  } catch (error) {
    console.error(error);
    return res.status(500).json({message:"Internal Server Error",success: false});
  }
};


const login = async (req, res) => {
  try {
    const { email_Id, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email_Id || !password) {
      return res.json({ msg: "Can't set empty fields", success: false });
    }

    if (!emailRegex.test(email_Id)) {
      return res.json({ message: "Invalid Email", success: false });
    }

    const userSql = "SELECT * FROM Users WHERE email_Id = ?";
    const companyDetailsSql = "SELECT * FROM lms_companyDetails WHERE admin_email = ?";
    const userResult = await queryPromiseWithAsync(userSql,email_Id)

    
      if (userResult?.length === 0) {
        return res.json({ message: "User Doesn't Exist", success: false });
      }

      const isPasswordValid = await bcrypt.compare(password,userResult[0].password);

      if (!isPasswordValid) {
        return res.status(401).json({ msg: "Incorrect password", success: false });
      }

      const userObj = {
        roleId: userResult[0].roleId,
        email: userResult[0].email_Id,
        password: userResult[0].password,
      };

      const userToken = await generateLoginToken(userObj);

      // Update the user's token and last_login_time in the Users table
      const updateSql =
        "UPDATE Users SET token = ?, last_login_time = CURRENT_TIMESTAMP WHERE email_Id = ?";
      await queryPromiseWithAsync(updateSql, [userToken, email_Id])
     
          return res.status(200).json({
            status: 200,
            message: "Login successful",
            token: userToken,
            roleId: userObj.roleId,
            success: true,
          });
        
      
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error", success: false });
  }
};

const checkAuthentication = async(req,res)=>{
  try {
      const token = req.params.token
      if(!token){
        return res.json({message:"Token is not Provided ",success:false})
      }
  
      const selectQuery = 'SELECT * FROM Users WHERE token = ?'
      const result = await queryPromiseWithAsync(selectQuery,token)
      if(result?.length<=0){
          return res.json({message:"token Error",success:false});
      }
      return res.json({message:"success",success:true});
  } catch (error) {
      console.log("Internal Server Error");
      return res.json({message:"Internal Server Error",success:false,error:error});
  }
}

const mcqTokenVerify = async(req, res) => {
  const userToken = req.params.token;
  // console.log("userToken",userToken);
  if(!userToken){
    return res.json({message:"User Token is not Provided ",success:false})
  }
  const searchTokenQuery =
    "SELECT emp_email, token_expiration FROM lms_employee WHERE unique_token = ?";

  const result = await queryPromiseWithAsync(searchTokenQuery, [userToken])

    if (result?.length > 0) {
      const { emp_email, token_expiration } = result[0];

      const currentTime = new Date();
      if (currentTime < new Date(token_expiration)) {
        res.status(200).json({
          status: 200,
          success: true,
          message: "Token is valid. User can access the MCQ page.",
        });
      } else {
        res.status(401).json({
          status: 401,
          success: false,
          message: "Token has expired. Access denied.",
        });
      }
    } else {
      res.status(401).json({
        status: 401,
        success: false,
        message: "Token is invalid. Access denied.",
        data: false
      });
    }
};

const reActivationLink = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    const comp_id = req.params.comp_id;
    if(!emp_id||!comp_id){
      return res.json({message:"Employee id or Company Id  not Provided ",success:false})
    }
    const searchEmployeeQuery =
      "SELECT emp_email from lms_employee WHERE id = ? AND comp_id = ?";

    const [resp] = await queryPromiseWithAsync(searchEmployeeQuery, [emp_id, comp_id])

    if (!resp || resp?.length === 0) {
      return res.status(404).json({ status: 404, success: false, msg: "Employee not found" });
    }
    const searchLicenseCode = ' SELECT  tna_license_code FROM lms_companyDetails WHERE id = ?'
    const result = await queryPromiseWithAsync(searchLicenseCode,comp_id)
    const tna_license_code =result[0].tna_license_code

      const uniqueToken = uuid.v4();
      const mcqLink = `http://172.20.1.203:3000/TnaMcq/${tna_license_code}/${comp_id}/${uniqueToken}`;

      // Set expiration time to 1 minute from now
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 5);

      try {
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sender = { email: senderMail, name: "Nihal" };
        const receivers = [{ email: resp.emp_email }];

        await apiInstance.sendTransacEmail({
          sender,
          to: receivers,
          subject: "Reactivation link",
          textContent: `Hello, this is your reactivation link. Click the following link to access the TNA: ${mcqLink}`,
          htmlContent: `Hello, this is your reactivation link. Click the following link to access the TNA: <a href="${mcqLink}">${mcqLink}</a>`,
        });

        const updateTokenQuery =
          "UPDATE lms_employee SET unique_token = ?, tna_link = ?, token_expiration = ? WHERE emp_email = ? AND comp_id = ?";
        await new Promise((resolve, reject) => {
          connection.query(
            updateTokenQuery,
            [uniqueToken, mcqLink, expirationTime, resp.emp_email, comp_id],
            (updateErr, updateResult) => {
              if (updateErr) {
                reject(updateErr);
              } else {
                resolve(updateResult);
              }
            }
          );
        });
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        return res
          .status(500)
          .json({ status: 500, success: false, msg: "Error sending email" });
      }
    

    return res.json({ msg: "Link sent successfully", success: true });
  } catch (error) {
    console.error("Error in reActivationLink API:", error);
    return res
      .status(500)
      .json({ status: 500, success: false, msg: "Internal server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const sql = "SELECT * FROM Users WHERE email_Id =?";
    if(!email){
      return res.json({message:"Email not Provided ",success:false})
    }
    const resp = await queryPromiseWithAsync(sql,email)
      if (resp.length<=0) {
        return res.json({ message: "User not found",success:false  });
      }
        const receiverEmail = resp[0].email_Id;
        const token = resp[0].token;

        const reset_Password_Link = `http://172.20.1.157:3000/${token}`;
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sender = { email: senderMail, name: "Nihal" };

        const receivers = [{ email: receiverEmail }];

        const sendEmail = apiInstance.sendTransacEmail({
          sender,
          to: receivers,
          subject: "Your Subject Here",
          textContent: `Hello, this is server side. Click the following link to access the MCQ page: ${reset_Password_Link}`,
          htmlContent: `Hello, this is server side. Click the following link to access the MCQ page: <a href="${reset_Password_Link}">${reset_Password_Link}</a>`,
        });

        sendEmail
          .then((response) => {
            return res.json({
              msg: `link sent to ${email}`,
              reset_Password_Link: reset_Password_Link,
            });
          })
          .catch((error) => {
            console.log("Catch", error);
            return res.json({
              message: `email error`,
              success: false,
              msg: "sendEmail fail",
            });
          });
      
  } catch (error) {
    console.log("Error occurred in forgotPassword API", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

const verifyPasswordLink = async (req, res) => {
  try {
    const paramsToken = req.params.token;
    if(!paramsToken){
      return res.json({message:"Token not Provided ",success:false})
    }
    const sql = "SELECT * FROM Users WHERE token = ?";
    const resp = await queryPromiseWithAsync(sql, [paramsToken])
    if (resp?.length > 0) {
      return res.json({ message: "user authenticated", success: true });
    } else {
      return res.json({message: "Unauthenticated user or link expire ",success: true});
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal server error",eror:error });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if(!email||!password||!confirmPassword){
      return res.json({message:"Sufficient data not Provided ",success:false})
    }
    if (password !== confirmPassword) {
      return res.json({message: "password and confirm password not match",success: false,});
    }
    const token = await generateToken(email);
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "UPDATE Users SET password = ?,token=? WHERE email_Id = ?";
    const resp = await queryPromiseWithAsync(sql, [hashedPassword, token, email])
      if (resp.length<=0) {
        return res.json({ message: "Data not found",  success: false });
      }
        return res.json({message: "password successfully updated",success: true,data: resp});
  } catch (error) {
    console.log(error);
    return res.json({ message: "Internal server error", error:error, success: false });
  }
};


module.exports = {signUp,superAdminUpdatePassword,updatePassword,login,checkAuthentication,mcqTokenVerify,reActivationLink,forgotPassword,verifyPasswordLink,resetPassword}