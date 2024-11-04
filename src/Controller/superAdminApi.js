
const csv = require("csvtojson");
const bcrypt = require("bcrypt");
const moment = require('moment');
const cron = require('node-cron');
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;
const uuid = require("uuid"); // for creating unique code158974
const crypto = require("crypto");
const connection = require("../../mysql.js");
const { generateToken, generateLoginToken } = require("../Middleware/jwt");



// --------------------------------helper functions----------------------------

function generatePassword(length = 10) {
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const numberChars = "0123456789";

  const allChars = uppercaseChars + lowercaseChars + numberChars;

  if (length < 8 || length > 16) {
    throw new Error("Password length must be between 8 and 16 characters.");
  }
  const getRandomChar = (charSet) => {
    const randomIndex = Math.floor(Math.random() * charSet?.length);
    return charSet.charAt(randomIndex);
  };
  let password = "";
  password += getRandomChar(uppercaseChars);
  password += getRandomChar(lowercaseChars);
  password += getRandomChar(numberChars);
  for (let i = password?.length; i < length; i++) {
    password += getRandomChar(allChars);
  }
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return password;
}

function isEmail(email) {
  var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (email !== "" && email.match(emailFormat)) {
    return true;
  }

  return false;
}

function generateRandomCode(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomCode = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters?.length);
    randomCode += characters.charAt(randomIndex);
  }

  return randomCode;
}

function queryPromise(sql, values) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error in queryPromise:", err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

async function queryPromiseWithAsync(sql, values) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error in queryPromise:", err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}


// ---------------------------------Create a transporter --------------------------------------//

const sendEmailBySendInBlue = async (req, res) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  // Sender information
  const sender = {
    email: senderMail, // email should be the same as you registered with on SendInBlue
    name: "nihal",
  };

  // SQL query to retrieve emails from the User table
  const sql = "SELECT email FROM User";

  connection.query(sql, async function (err, result) {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Internal server error", error: err, success: false });
    }

    // Extract emails from the result
    const receivers = result.map((row) => ({ email: row.email }));

    try {
      // Send email using SendInBlue API
      const sendEmail = await apiInstance.sendTransacEmail({
        sender,
        to: receivers,
        subject: "Trying to send mails",
        textContent: "Hello, this is server side",
        htmlContent: "Hello, this is server side.",
      });

      return res.json({ message: "Mail sent", mail: sendEmail, success: true });
    } catch (error) {
      console.error("Error:", error.message);
      return res
        .status(500)
        .json({ message: "Error occurred", error: error, success: false });
    }
  });
};

const signUp = async (req, res) => {
  try {
    const { roleId, email_Id, password } = req.body;
    // Hash the password
    if(!roleId||!email_Id||!password){
      return res.json({message:"Email Or Password is  not Provided ",success:false})
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate JWT token
    const token = await generateToken(email_Id, roleId);
    const sql =
      "INSERT INTO Users (email_Id, password, roleId, token) VALUES (?, ?, ?, ?)";
    // Insert user into the database
    const result = await connection.query(sql, [email_Id,
      hashedPassword,
      roleId,
      token,
    ]);

    return res.status(200).json({
      status: 200,
      message: "User registered successfully",
      token: token,
      // userId: userId,
      success: true,
      // mail: sendEmail,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};

const superAdminUpdatePassword = async (req, res) => {
  try {
    const { email_Id, password } = req.body;
    if(!email_Id||!password){
      return res.json({message:"Email Or Password is  not Provided ",success:false})
    }
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the user with the provided email exists
    const checkUserSql = "SELECT roleId from Users WHERE email_Id = ?";
    connection.query(checkUserSql, [email_Id], async (err, response) => {
      if (err) {
        throw err;
      } else {
        if (response[0].roleId === 1) {
          // Update the password in the database

          const updatePasswordSql = "UPDATE Users SET password = ? WHERE email_Id = ?";
          connection.query(
            updatePasswordSql,
            [hashedPassword, email_Id],
            (updateError, result) => {
              if (updateError) {
                throw updateError;
              } else {
                // Check if the update was successful
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
              }
            }
          );
        } else {
          return res.status(404).json({
            status: 404,
            message: "User password cannot be update",
            success: false,
          });
        }
      }
    });
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
      return res.json({message:"Not Sufficient Data Provided ",success:false})
    }
    // Check if a user with the provided email exists
    const userResult = await query("SELECT * FROM Users WHERE email_Id = ?", [
      email_Id,
    ]);
    if (userResult?.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
        success: false,
      });
    }

    // Compare hashed password
    const isPasswordValid = await bcrypt.compare(oldPassword,userResult[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Check user role
    const roleResult = await query(
      "SELECT roleId from Users WHERE email_Id = ?",
      [email_Id]
    );
    if (roleResult[0].roleId !== 1) {
      // Update the password in the database
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateResult = await query(
        "UPDATE Users SET password = ? WHERE email_Id = ?",
        [hashedPassword, email_Id]
      );

      if (updateResult.affectedRows > 0) {
        return res.status(200).json({
          status: 200,
          message: "Password updated successfully",
          success: true,
        });
      }
    }

    return res.status(404).json({
      status: 404,
      message: "User password cannot be updated",
      success: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      success: false,
    });
  }
};

function query(sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

const login = async (req, res) => {
  try {
    const { email_Id, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email_Id || !password) {
      return res.json({ message: "Can't set empty fields", success: false });
    }

    if (!emailRegex.test(email_Id)) {
      return res.json({ message: "Invalid Email", success: false });
    }

    const userSql = "SELECT * FROM Users WHERE email_Id = ?";
    const companyDetailsSql = "SELECT * FROM lms_companyDetails WHERE admin_email = ?";

    connection.query(userSql, [email_Id], async (userErr, userResult) => {
      if (userErr) {
        console.error("User query error:", userErr);
        return res
          .status(500)
          .json({ message: "Internal server error", success: false });
      }

      if (userResult?.length === 0) {
        return res.json({ message: "User Doesn't Exist", success: false });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        userResult[0].password
      );

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Incorrect password", success: false });
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
      connection.query(
        updateSql,
        [userToken, email_Id],
        (updateErr, updateResult) => {
          if (updateErr) {
            console.error("Update error:", updateErr);
            return res
              .status(500)
              .json({ message: "Internal server error", success: false });
          }

          return res.status(200).json({
            status: 200,
            message: "Login successful",
            token: userToken,
            roleId: userObj.roleId,
            success: true,
          });
        }
      );
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
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

const mcqTokenVerify = (req, res) => {
  const userToken = req.params.token;
  // console.log("userToken",userToken);
  if(!userToken){
    return res.json({message:"User Token is not Provided ",success:false})
  }
  const searchTokenQuery =
    "SELECT emp_email, token_expiration FROM lms_employee WHERE unique_token = ?";

  connection.query(searchTokenQuery, [userToken], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .json({ status: 500, success: false, message: "Error verifying token" });
    }

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
  });
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

    const [resp] = await new Promise((resolve, reject) => {
      connection.query(searchEmployeeQuery, [emp_id, comp_id], async (err, resp) => {
        if (err) {
          reject(err);
        } else {
          resolve(resp);
        }
      });
    });

    if (!resp || resp?.length === 0) {
      return res
        .status(404)
        .json({ status: 404, success: false, message: "Employee not found" });
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
        return res.status(500).json({ status: 500, success: false, message: "Error sending email" });
      }
    

    return res.json({ message: "Link sent successfully", success: true });
  } catch (error) {
    console.error("Error in reActivationLink API:", error);
    return res.status(500).json({ status: 500, success: false, message: "Internal server error",error:error });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const sql = "SELECT * FROM Users WHERE email_Id =?";
    if(!email){
      return res.json({message:"Email not Provided ",success:false})
    }
    connection.query(sql, [email], (err, resp) => {
      if (err) {
        console.log(err.message);
        return res.json({ message: "error in query", error: err.message });
      } else {
        const receiverEmail = resp[0].email_Id;
        const token = resp[0].token;

        const reset_Password_Link = `http://172.20.1.203:3000/${token}`;
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sender = { email: senderMail, name: "Nihal" };

        // Use an array to represent the receiver(s)
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
              message: `link sent to ${email}`,
              reset_Password_Link: reset_Password_Link,
            });
          })
          .catch((error) => {
            console.log("Catch", error);
            return res.json({
              message: `email error`,
              success: false,
              error:error,
            
            });
          });
      }
    });
  } catch (error) {
    console.log("Error occurred in forgotPassword API", error);
    return res.status(500).json({ message: "Internal Server Error",error:error });
  }
};

const verifyPasswordLink = async (req, res) => {
  try {
    const paramsToken = req.params.token;
    if (!paramsToken) {
      return res.json({ message: "Token not Provided ", success: false })
    }
    const sql = "SELECT * FROM Users WHERE token = ?";
    const resp = await queryPromiseWithAsync(sql)

    if (resp?.length <= 0) {
      return res.json({
        message: "Unauthenticated user or link expire ",
        success: true,
      });
    }
    return res.json({ message: "user authenticated", success: true });

  }

  catch (error) {
    console.log(error);
    return res.json({ message: "Internal server Error", success: false, error: error })
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if(!email||!password||!confirmedPassword){
      return res.json({message:"Sufficient data not Provided ",success:false})
    }
    if (password !== confirmPassword) {
      return res.json({
        message: "password and confirm password not match",
        success: false,
      });
    }
    const token = await generateToken(email);
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "UPDATE Users SET password = ?,token=? WHERE email_Id = ?";
    await queryPromiseWithAsync(sql, [hashedPassword, token, email])
   
        return res.json({
          message: "password successfully updated",
          success: true,
          data: resp,
        });
      
  } catch (error) {
    console.log(error);
    return res.json({ message: "error in query", error: error, success: false });
  }
};

// ----------------------------------------Company Management--------------------------
const createCompany = async (req, res) => {
  try {
    const {
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
    } = req.body;
    // Regular expression for email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(comp_email) || !emailRegex.test(admin_email)) {
      console.log("Invalid Company Email Or Admin Email");
      return res.json({
        message: "Invalid Company Email Or Admin Email",
        success: false,
      });
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
    const existingCompany = await queryPromiseWithAsync(CompanyEmailQuery, [
      comp_email,
    ]);
    // console.log("existingCompany",existingCompany);
    if (existingCompany?.length > 0) {
      return res.json({
        message: "Company email already exists",
        success: false,
      });
    }
    const adminEmailQuery =
      "SELECT * FROM lms_companyDetails WHERE admin_email = ?";
    const existingAdmin = await queryPromiseWithAsync(adminEmailQuery, [
      admin_email,
    ]);
// console.log("existingAdmin",existingAdmin);
    if (existingAdmin?.length > 0) {
      console.log("Error");
      return res.json({
        message: "Admin email already exists",
        success: false,
      });
    }

    // Example: Generate a password of length 12
    const admin_password = generatePassword(12);

    const hashedPassword = await bcrypt.hash(admin_password, 10);

    const result = await connection.query(
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
    if (result?.length <= 0) {
      return res.json({
        message: "error in fetching data",
        error: err,
        success: false,
      });
    }
    return res.json({ compData: result, success: true });
  } catch (error) {
    console.log(error);
    return res.json({
      message: "error in fetching data",
      success: false,
      error: error,
    });
  }
};

const getCompanyById = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if (!comp_id) {
      return res.json({ message: "Company Id is not provided or Invalid", success: false })
    }
    const sql = "SELECT * FROM lms_companyDetails Where id = ?";
    const result = await queryPromiseWithAsync(sql, comp_id)
    if (result.length <= 0) {
      return res.json({ message: "Data not found", success: false })
    }

    const id = result.map((value) => {
      return value.id;
    });
    const compName = result.map((value) => {
      return value.comp_name;
    });
    return res.json({ message: "Success", id: id, comp_name: compName, compData: result, success: true });

  } catch (error) {
    console.log(error);
    return res.json({
      message: "error in fetching data",
      success: false,
      error: error,
    });
  }
};

const updateCompany = async (req, res) => {
  const comp_id = req.params.comp_id;
  if(!comp_id){
    return res.json({message:"Company Id is not provided",success:false})
  }
  try {
    const {comp_name,comp_address,id_number,comp_phone,comp_email,comp_city,comp_street,
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

    const updateQuery =
      "UPDATE lms_companyDetails SET " +
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
      const updatePasswordQuery =
        "UPDATE lms_companyDetails SET admin_password = ? WHERE id = ?";
      const updatePasswordValues = [hashedPassword, comp_id];

      // Execute the update password query
      await connection.query(updatePasswordQuery, updatePasswordValues);

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
    connection.query(updateQuery, updateValues, (err, result) => {
      if (err) {
        return res.status(404).json({
          status: 404,
          message: "Company not found",
          success: false,
        });
      } else {
        return res.status(200).json({
          status: 200,
          message: "Company updated successfully",
          success: true,
        });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error,
      status: 500,
      message: "Internal Server Error",
      success: false,
    });
  }
};


const getCourseCompany = async (req, res) => {
  try {
    const sql = "SELECT * FROM lms_CourseCompany";
    connection.query(sql, async (err, result) => {
      if (err) {
        console.log(err);
        return res.json({
          message: "Error in fetching data",
          error: err,
          success: false,
        });
       
      } else {
       
        if(result.length<=0){
          return res.json({message:"No Company has been registered for course",sucess:false})
        }
        const ids = result.map((value) => value.comp_id);
        const compDetailsQuery =
          "SELECT id, comp_name, comp_city FROM lms_companyDetails WHERE id IN (?)";
        connection.query(
          compDetailsQuery,
          [ids],
          (compDetailsErr, compDetailsResult) => {
            if (compDetailsErr) {
              console.log(compDetailsErr);
              return res.json({
                message: "Error in fetching company details",
                error: compDetailsErr,
                success: false,
              });
            } else {
              const compData = result.map((value) => {
                const companyDetails = compDetailsResult.find(
                  (details) => details.id === value.comp_id
                );
                return {
                  id: value.comp_id,
                  comp_name: companyDetails ? companyDetails.comp_name : "N/A",
                  city: companyDetails ? companyDetails.comp_city : "N/A",
                };
              });
              return res.json({ message:"success",compData: compData, success: true });
            }
          }
        );
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({message: "Internal Server Error",success: false, error: error});
  }
};



const getCourseCompanyById = async(req,res)=>{

  try {

    const comp_id = req.params.comp_id
      if(!comp_id ){
      return res.json({message:"Company Id is not provided",success:false})
    }

    const sql = 'SELECT * FROM lms_CourseCompany WHERE comp_id =?'
    const result = await queryPromiseWithAsync(sql,comp_id)

    if(result?.length<=0){
      return res.json({message:"Company haven't purchased the course yet",success:false})
    }

    return res.json({message:"Success",success:true,data:result[0]})

  } catch (error) {
    return res.json({message:"Internal server Error",success:false,error:error})
    
  }
}

const deleteCompany = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;

    if (!comp_id) {
      return res.json({ message: "Company ID not provided", success: false });
    }

    const searchCompId = 'SELECT * FROM lms_companyDetails WHERE id = ?';
    const searchResult = await queryPromiseWithAsync(searchCompId, [comp_id]);

    if (searchResult.length <= 0) {
      return res.json({ message: "Company Not found in DataBase", success: false });
    }

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
    
    const deleteCompanyQuery = 'DELETE FROM lms_companyDetails WHERE id = ?';
    await queryPromiseWithAsync(deleteCompanyQuery, [comp_id]);

    return res.json({ message: "Deletion successful", success: true });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.json({ message: "Internal Server Error", success: false, error: error });
  }
};


// const deleteCompanys = async (req, res) => {
//   try {
//     const comp_id = req.params.comp_id;
//     if (!comp_id) {
//       return res.json({ message: "Company ID not provided", success: false });
//     }

//     // Check if the company exists
//     const searchCompId = 'SELECT * FROM lms_companyDetails WHERE id = ?';
//     const searchResult = await queryPromiseWithAsync(searchCompId, [comp_id]);
//     if (searchResult.length <= 0) {
//       return res.json({ message: "Company Not found in DataBase", success: false });
//     }

//     // Check and delete employees and their related data
//     const searchEmployee = 'SELECT * FROM lms_employee WHERE comp_id = ?';
//     const searchEmployeeResult = await queryPromiseWithAsync(searchEmployee, [comp_id]);
//     if (searchEmployeeResult.length > 0) {
//       for (const employee of searchEmployeeResult) {
//         const emp_id = employee.id;

//         // Delete employee answers
//         const tnaEmployeeAnswerSql = "SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id = ?";
//         const tnaEmployeeAnswerResult = await queryPromiseWithAsync(tnaEmployeeAnswerSql, [emp_id]);
//         if (tnaEmployeeAnswerResult.length > 0) {
//           const deleteEmployeeAnswers = 'DELETE FROM lms_TNA_Employee_Answers WHERE emp_id = ?';
//           await queryPromiseWithAsync(deleteEmployeeAnswers, [emp_id]);
//         }

//         // Delete employee record
//         const deleteEmployeeQuery = 'DELETE FROM lms_employee WHERE id = ?';
//         await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);
//       }
//     }

//     // Delete licensing information
//     const searchTnaLicensing = 'SELECT * FROM TNA_licensing WHERE comp_id = ?';
//     const searchTnaResult = await queryPromiseWithAsync(searchTnaLicensing, [comp_id]);
//     if (searchTnaResult.length > 0) {
//       const deleteLicensingQuery = 'DELETE FROM TNA_licensing WHERE comp_id = ?';
//       await queryPromiseWithAsync(deleteLicensingQuery, [comp_id]);
//     }

//     // Delete course company associations and related data
//     const searchCourseCompany = 'SELECT * FROM lms_CourseCompany WHERE comp_id = ?';
//     const searchCourseCompanyResult = await queryPromiseWithAsync(searchCourseCompany, [comp_id]);
//     if (searchCourseCompanyResult.length > 0) {
//       const searchCourseEmployee = 'SELECT * FROM lms_courseEmployee WHERE comp_id = ?';
//       const searchCourseEmployeeResult = await queryPromiseWithAsync(searchCourseEmployee, [comp_id]);
//       if (searchCourseEmployeeResult.length > 0) {
//         for (const courseEmployee of searchCourseEmployeeResult) {
//           const emp_id = courseEmployee.emp_id;

//           // Delete graded assessment answers
//           const getGradedSql = 'SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?';
//           const getGradedData = await queryPromiseWithAsync(getGradedSql, [emp_id]);
//           if (getGradedData.length > 0) {
//             const deleteGradedAnswers = 'DELETE FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?';
//             await queryPromiseWithAsync(deleteGradedAnswers, [emp_id]);
//           }

//           // Delete non-graded assessment answers
//           const getNonGradedSql = 'SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?';
//           const getNonGradedData = await queryPromiseWithAsync(getNonGradedSql, [emp_id]);
//           if (getNonGradedData.length > 0) {
//             const deleteNonGradedAnswers = 'DELETE FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?';
//             await queryPromiseWithAsync(deleteNonGradedAnswers, [emp_id]);
//           }

//           // Delete login/logout records
//           const getLogoutSql = 'SELECT * FROM lms_EmployeeLogInLogOut WHERE emp_id = ?';
//           const getLogoutData = await queryPromiseWithAsync(getLogoutSql, [emp_id]);
//           if (getLogoutData.length > 0) {
//             const deleteLoginLogoutRecords = 'DELETE FROM lms_EmployeeLogInLogOut WHERE emp_id = ?';
//             await queryPromiseWithAsync(deleteLoginLogoutRecords, [emp_id]);
//           }

//           // Delete employee video data
//           const getVideoSql = 'SELECT * FROM lms_EmployeeVideoData WHERE emp_id = ?';
//           const getVideoData = await queryPromiseWithAsync(getVideoSql, [emp_id]);
//           if (getVideoData.length > 0) {
//             const deleteVideoData = 'DELETE FROM lms_EmployeeVideoData WHERE emp_id = ?';
//             await queryPromiseWithAsync(deleteVideoData, [emp_id]);
//           }

//           // Delete course employee record
//           const deleteCourseEmployeeQuery = 'DELETE FROM lms_courseEmployee WHERE emp_id = ?';
//           await queryPromiseWithAsync(deleteCourseEmployeeQuery, [emp_id]);
//         }
//       }

//       // Delete course company record
//       const deleteCourseCompanyQuery = 'DELETE FROM lms_CourseCompany WHERE comp_id = ?';
//       await queryPromiseWithAsync(deleteCourseCompanyQuery, [comp_id]);
//     }

//     // Delete company video data
//     const getVideoSql = "SELECT * FROM lms_EmployeeVideoData WHERE comp_id = ?";
//     const getVideoSqlData = await queryPromiseWithAsync(getVideoSql, [comp_id]);
//     if (getVideoSqlData.length > 0) {
//       const deleteVideoSqlData = 'DELETE FROM lms_EmployeeVideoData WHERE comp_id = ?';
//       await queryPromiseWithAsync(deleteVideoSqlData, [comp_id]);
//     }

//     // Delete course allotments
//     const getCourseAllotments = "SELECT * FROM lms_CourseAllotmentToCompany WHERE comp_id = ?";
//     const getCourseAllotmentsData = await queryPromiseWithAsync(getCourseAllotments, [comp_id]);
//     if (getCourseAllotmentsData.length > 0) {
//       const deleteCourseAllotments = 'DELETE FROM lms_CourseAllotmentToCompany WHERE comp_id = ?';
//       await queryPromiseWithAsync(deleteCourseAllotments, [comp_id]);
//     }

//     // Delete trial events
//     const getTrialEvents = "SELECT * FROM trialEvents WHERE comp_id = ?";
//     const getTrialEventsData = await queryPromiseWithAsync(getTrialEvents, [comp_id]);
//     if (getTrialEventsData.length > 0) {
//       const deleteEventsQuery = 'DELETE FROM trialEvents WHERE comp_id = ?';
//       await queryPromiseWithAsync(deleteEventsQuery, [comp_id]);
//     }

//     // Delete latest events
//     const getLatestEvents = "SELECT * FROM lms_latestEvents WHERE comp_id = ?";
//     const getLatestEventsData = await queryPromiseWithAsync(getLatestEvents, [comp_id]);
//     if (getLatestEventsData.length > 0) {
//       const deleteLatestEventsQuery = 'DELETE FROM lms_latestEvents WHERE comp_id = ?';
//       await queryPromiseWithAsync(deleteLatestEventsQuery, [comp_id]);
//     }

//     // Delete notifications
//     const getNotifySql = "SELECT * FROM lms_Notify WHERE comp_id = ?";
//     const getNotifyData = await queryPromiseWithAsync(getNotifySql, [comp_id]);
//     if (getNotifyData.length > 0) {
//       const deleteNotifyQuery = 'DELETE FROM lms_Notify WHERE comp_id = ?';
//       await queryPromiseWithAsync(deleteNotifyQuery, [comp_id]);
//     }

//     // Delete company details
//     const deleteCompanyQuery = 'DELETE FROM lms_companyDetails WHERE id = ?';
//     await queryPromiseWithAsync(deleteCompanyQuery, [comp_id]);

//     return res.json({ message: "Deletion successful", success: true });
//   } catch (error) {
//     console.error("Internal Server Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", success: false, error: error.message });
//   }
// };


// ----------------------------------Company Admin-----------------------------------

const updateCompanyAdminDetails = async (req, res) => {
  const comp_id = req.params.comp_id;
  if(!comp_id){
    return res.json({message:"Company Id is not provided",success:false})
  }
  try {
    const { comp_name, admin_name, admin_email, admin_contact_number, status } = req.body;

    const updateFields = {comp_name,admin_name,admin_email,admin_contact_number,status};

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

    const updateQuery ="UPDATE lms_companyDetails SET " +
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
      const updatePasswordQuery =
        "UPDATE lms_companyDetails SET admin_password = ? WHERE id = ?";
      const updatePasswordValues = [hashedPassword, comp_id];

      // Execute the update password query
      await connection.query(updatePasswordQuery, updatePasswordValues);

      // Send the new password to the updated admin_email
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const sender = { email: senderMail,name: "Nihal" };
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
    connection.query(updateQuery, updateValues, (err, result) => {
      if (err) {
        return res.status(404).json({
          status: 404,
          message: "Error Occured check the credentials",
          error: err,
          success: false,
        });
      } else {
        return res.status(200).json({
          status: 200,
          message: "Company Admin updated successfully",
          success: true,
        });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error,
      status: 500,
      message: "Internal Server Error",
      success: false,
    });
  }
};

// -------------------------------TNA Employee---------------------------
// const uploadEmployee = async (req, res) => {
//   try {
//     const comp_id = req.params.comp_id;
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file uploaded" });
//     }
//     if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
//       return res.status(400).json({
//         success: false,
//         message: "Uploaded file must be in CSV format",
//       });
//     }

//     const filePath = req.file.path;

//     const response = await csv().fromFile(filePath);

//     let count = 0;
//     for (const item of response) {
//       // Check if the count is within the allowed limit
//       count++;
//       // Convert DOB to a JavaScript Date object
//       const dateee = item.DOB;
//       const convertToDate = (dateString) => {
//         // Convert a "dd/MM/yyyy" string into a Date object
//         const [dd, mm, yyyy] = dateString.split("-");
//         console.log("dd", dd);
//         console.log("MM", mm);
//         console.log("yyyy", yyyy);
//         const dat = new Date(`${yyyy}-${mm}-${dd}`);
//         console.log("dat", dat);
//         return dat;
//       };
//       const dob = convertToDate(dateee);

//       console.log("dob", dob);

//       // Format DOB as YYYY-MM-DD HH:MM:SS (SQL DATETIME format)
//       const formattedDOB = dob.toISOString().slice(0, 19).replace("T", " ");
//       console.log("formattedDOB", formattedDOB);
      
//       // Check if emp_email already exists for the given comp_id
//       const checkQuery = "SELECT id FROM lms_employee WHERE comp_id = ? AND emp_email = ?";
//       const checkResult =await queryPromiseWithAsync(checkQuery,[comp_id, item.Email])
//       // const checkResult = await connection.query(checkQuery, );
//       console.log("checkResult ",checkResult );
//       if (checkResult?.length  > 0) {
//         // If emp_email already exists, skip this record
//         console.log(`Employee with email ${item.Email} already exists for company ${comp_id}. Skipping...`);
//         continue;
//       }

//       // If emp_email doesn't exist, insert the record
//       const query =
//         "INSERT INTO lms_employee (comp_id, emp_name, emp_email, designation, contact_no, dob, gender, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
//       await connection.query(query, [
//         comp_id,
//         item.Name,
//         item.Email,
//         item.Designation,
//         item.Contact,
//         formattedDOB, // Use formattedDOB instead of item.DOB
//         item.Gender,
//         item.Department,
//       ]);
//     }

//     return res
//       .status(200)
//       .json({ msg: "Uploaded successfully", success: true, count: count });
//   } catch (error) {
//     console.log(error);
//     return res
//       .status(400)
//       .json({ msg: error, success: false, message: "Internal server error" });
//   }
// };


const uploadEmployee = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not Provided ",success:false})
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
      return res.status(400).json({ success: false, message: "Uploaded file must be in CSV format" });
    }
    const filePath = req.file.path;
    const response = await csv().fromFile(filePath);
    const requiredFields = ["Name", "Email", "Designation", "Contact", "DOB", "Gender", "Department"];
    let missingFields = [];
    let emailsProcessed = new Set();
    let count = 0;

    for (const item of response) {
      missingFields = requiredFields.filter(field => !item.hasOwnProperty(field) || item[field] === "");
      if (missingFields?.length > 0) {
        return res.status(400).json({
          success: false,
          missing:`${missingFields.join(", ")}`,
          message: `Missing fields: ${missingFields.join(", ")}`,
        });
      }

      if (emailsProcessed.has(item.Email)) {
        console.log(`Duplicate email ${item.Email} found in CSV. Skipping...`);
        continue;
      }

      const dateee = item.DOB;
      const convertToDate = (dateString) => {
        const [dd, mm, yyyy] = dateString.split("-");
        return new Date(`${yyyy}-${mm}-${dd}`);
      };
      const dob = convertToDate(dateee);
      const formattedDOB = dob.toISOString().slice(0, 19).replace("T", " ");

      const checkQuery = "SELECT id FROM lms_employee WHERE comp_id = ? AND emp_email = ?";
      const checkResult = await queryPromiseWithAsync(checkQuery, [comp_id, item.Email]);

      if (checkResult?.length > 0) {
        console.log(`Employee with email ${item.Email} already exists for company ${comp_id}. Skipping...`);
        continue;
      }

      const query = "INSERT INTO lms_employee (comp_id, emp_name, emp_email, designation, contact_no, dob, gender, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      await queryPromiseWithAsync(query, [
        comp_id,
        item.Name,
        item.Email,
        item.Designation,
        item.Contact,
        formattedDOB,
        item.Gender,
        item.Department,
      ]);

      emailsProcessed.add(item.Email);
      count++;
    }

    return res.status(200).json({ message: "Uploaded successfully", success: true, count: count });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message, success: false, message: "Internal server error" });
  }
};

// const generateTnaLicensing = async (req, res) => {
//   try {
//     const {tna_duration,start_date,end_date,sub_total,free_evaluation,discount,
//       grand_total,
//       total_no_of_attendies,
//     } = req.body;
//     const comp_id = req.params.comp_id;
    
//     if(!tna_duration||!start_date||!end_date||!sub_total||!free_evaluation||!discount||!grand_total||!total_no_of_attendies){
//       return res.json({message:"Insuffecient data ",success:false})
//     }
//     // Check if comp_id already has a tna_license_code
//     const checkLicenseCodeQuery =
//       "SELECT tna_license_code,sub_total,free_evaluation ,discount,grand_total,total_no_of_attendies FROM TNA_licensing WHERE comp_id = ?";
//     connection.query(checkLicenseCodeQuery, [comp_id], (checkErr, checkResult) => {
//       if (checkErr) {
//         console.log(checkErr);
//         return res.status(500).json({
//           status: 500,
//           success: false,
//           message: "Error checking tna_license_code existence",
//         });
//       }

//       let tna_license_code;
//       if (checkResult?.length > 0 && checkResult[0].tna_license_code) {
//         // Use the existing tna_license_code
//         tna_license_code = checkResult[0].tna_license_code;
//         previousSubTotal = checkResult[0].sub_total
//         previoiusFree_evaluation = checkResult[0].free_evaluation
//         previousDiscount = checkResult[0].discount

//         previousGrand_total = checkResult[0].grand_total
//         previousTotal_no_of_attendies = checkResult[0].total_no_of_attendies


//         // Fetch employee emails and update tokens
//         const searchEmployeeQuery =
//           "SELECT emp_email FROM lms_employee WHERE comp_id = 1 AND tna_link IS NULL ";
//         connection.query(searchEmployeeQuery, [comp_id], (err, resp) => {
//           if (err) {
//             console.log(err);
//             return res.status(500).json({
//               status: 500,
//               success: false,
//               message: "Error retrieving employee data",
//             });
//           }
//           // console.log("resp",resp);
//           const updateTokenPromises = resp.map(async (value) => {
//             try {
//               const uniqueToken = uuid.v4();
//               const mcqLink = `http://172.20.1.203:3000/TnaMcq/${tna_license_code}/${comp_id}/${uniqueToken}`;

//               // Calculate expiration time as the difference between end_date and start_date
//               const expirationTime = end_date;

//               // Set your sender email address
//               const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
//               const sender = { email: senderMail, name: "Nihal" };
//               const receivers = [{ email: value.emp_email }];

//               await apiInstance.sendTransacEmail({
//                 sender,
//                 to: receivers,
//                 subject: "Tna Link",
//                 textContent: `Hello, this is server side. Your TNA License Code is: ${mcqLink}`,
//                 htmlContent: `Hello, this is server side. Your TNA License Code is:<a href="${mcqLink}">${mcqLink}</a>`,
//               });

//               // Update employee's unique_token and tna_link
//               const updateTokenQuery =
//                 "UPDATE lms_employee SET unique_token = ?, tna_link = ?, token_expiration = ? WHERE emp_email = ? AND comp_id = ?";
//               await new Promise((resolve, reject) => {
//                 connection.query(
//                   updateTokenQuery,
//                   [
//                     uniqueToken,
//                     mcqLink,
//                     expirationTime,
//                     value.emp_email,
//                     comp_id,
//                   ],
//                   (updateErr, updateResult) => {
//                     if (updateErr) {
//                       reject(updateErr);
//                     } else {
//                       resolve();
//                     }
//                   }
//                 );
//               });
//             } catch (emailError) {
//               console.error("Email sending error:", emailError);
//               throw emailError;
//             }
//           });

//           // Wait for all promises to resolve
//           Promise.all(updateTokenPromises)
//             .then(() => {
//               // Update existing entry in TNA_licensing table with additional data
//               const updateTnaLicensingQuery =
//                 "UPDATE TNA_licensing SET tna_duration =?, start_date=?,end_date=?, sub_total = ?, free_evaluation = ?, discount = ?, grand_total = ?, total_no_of_attendies = ? WHERE comp_id = ?";
//               connection.query(
//                 updateTnaLicensingQuery,
//                 [tna_duration,
//                   start_date,end_date,
//                   parseInt(sub_total),
//                   parseInt(free_evaluation) ,
//                   parseInt(discount) ,
//                   parseInt(grand_total) ,
//                   parseInt(total_no_of_attendies),
//                   comp_id,
//                 ],
//                 (updateErr, updateResult) => {
//                   if (updateErr) {
//                     console.log(updateErr);
//                     return res.status(500).json({
//                       status: 500,
//                       success: false,
//                       message: "Error updating TNA_licensing table",
//                     });
//                   }
//                   const sqlUpdateCompany =
//                     "UPDATE lms_companyDetails SET no_of_tna = ? ,tna_license_code = ? WHERE id = ?";
//                   connection.query(
//                     sqlUpdateCompany,
//                     [parseInt(total_no_of_attendies) , tna_license_code, comp_id],
//                     (errUpdateCompany, respUpdateCompany) => {
//                       if (errUpdateCompany) {
//                         console.log(errUpdateCompany);
//                         return res.status(500).json({
//                           status: 500,
//                           success: false,
//                           message: "Error updating company details",
//                         });
//                       }


//                     }
//                   );
//                   return res.status(200).json({
//                     status: 200,
//                     message: "tna license updated",
//                     success: true,
//                     result: updateResult,
//                   });
//                 }
//               );
//             })
//             .catch((error) => {
//               console.log("Error occurred in Promise.all", error);
//               return res.status(500).json({
//                 status: 500,
//                 success: false,
//                 message: "Internal Server Error",
//               });
//             });
//         });
//       } else {
//         // Generate a new tna_license_code
//         const code = generateRandomCode(16);
//         tna_license_code = code + comp_id;

//         // Fetch employee emails and update tokens
//         const searchEmployeeQuery =
//           "SELECT emp_email from lms_employee WHERE comp_id = ?";
//         connection.query(searchEmployeeQuery, [comp_id], (err, resp) => {
//           if (err) {
//             console.log(err);
//             return res.status(500).json({
//               status: 500,
//               success: false,
//               message: "Error retrieving employee data",
//             });
//           }

//           const updateTokenPromises = resp.map(async (value) => {
//             try {
//               const uniqueToken = uuid.v4();
//               const mcqLink = `http://172.20.1.203:3000/TnaMcq/${tna_license_code}/${comp_id}/${uniqueToken}`;

//               // Calculate expiration time as the difference between end_date and start_date
//               const expirationTime = end_date;

//               // Set your sender email address
//               const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
//               const sender = { email: senderMail, name: "Nihal" };
//               const receivers = [{ email: value.emp_email }];

//               await apiInstance.sendTransacEmail({
//                 sender,
//                 to: receivers,
//                 subject: "Tna Link",
//                 textContent: `Hello, this is server side. Your TNA License Code is: ${mcqLink}`,
//                 htmlContent: `Hello, this is server side. Your TNA License Code is: <a href="${mcqLink}">${mcqLink}</a>`,
//               });

//               // Update employee's unique_token and tna_link
//               const updateTokenQuery =
//                 "UPDATE lms_employee SET unique_token = ?, tna_link = ?, token_expiration = ? WHERE emp_email = ? AND comp_id = ?";
//               await new Promise((resolve, reject) => {
//                 connection.query(
//                   updateTokenQuery,
//                   [
//                     uniqueToken,
//                     mcqLink,
//                     expirationTime,
//                     value.emp_email,
//                     comp_id,
//                   ],
//                   (updateErr, updateResult) => {
//                     if (updateErr) {
//                       reject(updateErr);
//                     } else {
//                       resolve();
//                     }
//                   }
//                 );
//               });
//             } catch (emailError) {
//               console.error("Email sending error:", emailError);
//               throw emailError;
//             }
//           });

//           // Wait for all promises to resolve
//           Promise.all(updateTokenPromises)
//             .then(() => {
//               // Insert into TNA_licensing table
//               const insertTnaLicensingQuery =
//                 "INSERT INTO TNA_licensing (comp_id, tna_license_code, tna_duration, start_date, end_date, sub_total, free_evaluation, discount, grand_total, total_no_of_attendies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
//               connection.query(
//                 insertTnaLicensingQuery,
//                 [
//                   comp_id,
//                   tna_license_code,
//                   tna_duration,
//                   start_date,
//                   end_date,
//                   sub_total,
//                   free_evaluation,
//                   discount,
//                   grand_total,
//                   total_no_of_attendies,
//                 ],
//                 (insertErr, insertResult) => {
//                   if (insertErr) {
//                     console.log(insertErr);
//                     return res.status(500).json({
//                       status: 500,
//                       success: false,
//                       message: "Error inserting data into TNA_licensing table",
//                     });
//                   }

//                   const sqlUpdateCompany =
//                     "UPDATE lms_companyDetails SET no_of_tna = ? ,tna_license_code = ? WHERE id = ?";
//                   connection.query(
//                     sqlUpdateCompany,
//                     [total_no_of_attendies, tna_license_code, comp_id],
//                     (errUpdateCompany, respUpdateCompany) => {
//                       if (errUpdateCompany) {
//                         console.log(errUpdateCompany);
//                         return res.status(500).json({
//                           status: 500,
//                           success: false,
//                           message: "Error updating company details",
//                         });
//                       }

//                       return res.status(200).json({
//                         status: 200,
//                         message: "tna license created",
//                         success: true,
//                         result: respUpdateCompany,
//                       });
//                     }
//                   );
//                 }
//               );
//             })
//             .catch((error) => {
//               console.log("Error occurred in Promise.all", error);
//               return res.status(500).json({
//                 status: 500,
//                 success: false,
//                 message: "Internal Server Error",
//               });
//             });
//         });
//       }
//     });
//   } catch (error) {
//     console.log("Error occurred in generating license API", error);
//     return res
//       .status(500)
//       .json({ status: 500, success: false, message: "Internal Server Error" });
//   }
// };


const generateTnaLicensing = async (req, res) => {
  try {
    const {tna_duration, start_date, end_date, sub_total, free_evaluation, discount,
      grand_total, total_no_of_attendies,
    } = req.body;
    const comp_id = req.params.comp_id;

    if (!tna_duration || !start_date || !end_date || !sub_total || !free_evaluation || !discount || !grand_total || !total_no_of_attendies) {
      return res.json({ message: "Insufficient data", success: false });
    }

    const checkLicenseCodeQuery ="SELECT tna_license_code, sub_total, free_evaluation, discount, grand_total, total_no_of_attendies FROM TNA_licensing WHERE comp_id = ?";
    connection.query(checkLicenseCodeQuery, [comp_id], (checkErr, checkResult) => {
      if (checkErr) {
        console.log(checkErr);
        return res.status(500).json({
          status: 500,
          success: false,
          message: "Error checking tna_license_code existence",
        });
      }

      let tna_license_code;
      let failedEmailCount = 0; 

      if (checkResult?.length > 0 && checkResult[0].tna_license_code) {
        tna_license_code = checkResult[0].tna_license_code;
        previousSubTotal = checkResult[0].sub_total;
        previousFree_evaluation = checkResult[0].free_evaluation;
        previousDiscount = checkResult[0].discount;
        previousGrand_total = checkResult[0].grand_total;
        previousTotal_no_of_attendies = checkResult[0].total_no_of_attendies;

        const searchEmployeeQuery =
          "SELECT emp_email FROM lms_employee WHERE comp_id = ? AND tna_link IS NULL";
        connection.query(searchEmployeeQuery, [comp_id], (err, resp) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              status: 500,
              success: false,
              message: "Error retrieving employee data",
            });
          }

          const updateTokenPromises = resp?.map(async (value) => {
            try {
              const uniqueToken = uuid.v4();
              const mcqLink = `http://172.20.1.203:3000/TnaMcq/${tna_license_code}/${comp_id}/${uniqueToken}`;
              const expirationTime = end_date;

              const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
              const sender = { email: senderMail, name: "Nihal" };
              const receivers = [{ email: value.emp_email }];

              await apiInstance.sendTransacEmail({
                sender,
                to: receivers,
                subject: "Tna Link",
                textContent: `Hello, this is server side. Your TNA Link is: ${mcqLink}`,
                htmlContent: `Hello, this is server side. Your TNA License Code is: <a href="${mcqLink}">${mcqLink}</a>`,
              });

              const updateTokenQuery =
                "UPDATE lms_employee SET unique_token = ?, tna_link = ?, token_expiration = ? WHERE emp_email = ? AND comp_id = ?";
              await new Promise((resolve, reject) => {
                connection.query(
                  updateTokenQuery,
                  [
                    uniqueToken,
                    mcqLink,
                    expirationTime,
                    value.emp_email,
                    comp_id,
                  ],
                  (updateErr, updateResult) => {
                    if (updateErr) {
                      reject(updateErr);
                    } else {
                      resolve();
                    }
                  }
                );
              });
            } catch (emailError) {
              console.error("Email sending error:", emailError);
              failedEmailCount++; // Increment the failed email count
              throw emailError;
            }
          });

          Promise.all(updateTokenPromises)
            .then(() => {
              const updateTnaLicensingQuery =
                "UPDATE TNA_licensing SET tna_duration = ?, start_date = ?, end_date = ?, sub_total = ?, free_evaluation = ?, discount = ?, grand_total = ?, total_no_of_attendies = ? WHERE comp_id = ?";
              connection.query(
                updateTnaLicensingQuery,
                [
                  tna_duration, start_date, end_date, parseInt(sub_total),
                  parseInt(free_evaluation), parseInt(discount), parseInt(grand_total),
                  parseInt(total_no_of_attendies), comp_id
                ],
                (updateErr, updateResult) => {
                  if (updateErr) {
                    console.log(updateErr);
                    return res.status(500).json({
                      status: 500,
                      success: false,
                      message: "Error updating TNA_licensing table",
                    });
                  }

                  const sqlUpdateCompany =
                    "UPDATE lms_companyDetails SET no_of_tna = ?, tna_license_code = ? WHERE id = ?";
                  connection.query(
                    sqlUpdateCompany,
                    [parseInt(total_no_of_attendies), tna_license_code, comp_id],
                    (errUpdateCompany, respUpdateCompany) => {
                      if (errUpdateCompany) {
                        console.log(errUpdateCompany);
                        return res.status(500).json({
                          status: 500,
                          success: false,
                          message: "Error updating company details",
                        });
                      }

                      return res.status(200).json({
                        status: 200,
                        message: `TNA license updated. Failed to send emails to ${failedEmailCount} recipients.`,
                        success: true,
                        result: updateResult,
                      });
                    }
                  );
                }
              );
            })
            .catch((error) => {
              console.log("Error occurred in Promise.all", error);
              return res.status(500).json({
                status: 500,
                success: false,
                message: `Internal Server Error. Failed to send emails to ${failedEmailCount} recipients.`,
              });
            });
        });
      } else {
        const code = generateRandomCode(16);
        tna_license_code = code + comp_id;

        const searchEmployeeQuery =
          "SELECT emp_email from lms_employee WHERE comp_id = ?";
        connection.query(searchEmployeeQuery, [comp_id], (err, resp) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              status: 500,
              success: false,
              message: "Error retrieving employee data",
            });
          }

          const updateTokenPromises = resp?.map(async (value) => {
            try {
              const uniqueToken = uuid.v4();
              const mcqLink = `http://172.20.1.203:3000/TnaMcq/${tna_license_code}/${comp_id}/${uniqueToken}`;
              const expirationTime = end_date;

              const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
              const sender = { email: senderMail, name: "Nihal" };
              const receivers = [{ email: value.emp_email }];

              await apiInstance.sendTransacEmail({
                sender,
                to: receivers,
                subject: "Tna Link",
                textContent: `Hello, this is server side. Your TNA License Code is: ${mcqLink}`,
                htmlContent: `Hello, this is server side. Your TNA License Code is: <a href="${mcqLink}">${mcqLink}</a>`,
              });

              const updateTokenQuery =
                "UPDATE lms_employee SET unique_token = ?, tna_link = ?, token_expiration = ? WHERE emp_email = ? AND comp_id = ?";
              await new Promise((resolve, reject) => {
                connection.query(
                  updateTokenQuery,
                  [
                    uniqueToken,
                    mcqLink,
                    expirationTime,
                    value.emp_email,
                    comp_id,
                  ],
                  (updateErr, updateResult) => {
                    if (updateErr) {
                      reject(updateErr);
                    } else {
                      resolve();
                    }
                  }
                );
              });
            } catch (emailError) {
              console.error("Email sending error:", emailError);
              failedEmailCount++; // Increment the failed email count
              throw emailError;
            }
          });

          Promise.all(updateTokenPromises)
            .then(() => {
              const insertTnaLicensingQuery =
                "INSERT INTO TNA_licensing (comp_id, tna_license_code, tna_duration, start_date, end_date, sub_total, free_evaluation, discount, grand_total, total_no_of_attendies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
              connection.query(
                insertTnaLicensingQuery,
                [
                  comp_id, tna_license_code, tna_duration, start_date,
                  end_date, sub_total, free_evaluation, discount, grand_total,
                  total_no_of_attendies
                ],
                (insertErr, insertResult) => {
                  if (insertErr) {
                    console.log(insertErr);
                    return res.status(500).json({
                      status: 500,
                      success: false,
                      message: "Error inserting data into TNA_licensing table",
                    });
                  }

                  const sqlUpdateCompany =
                    "UPDATE lms_companyDetails SET no_of_tna = ?, tna_license_code = ? WHERE id = ?";
                  connection.query(
                    sqlUpdateCompany,
                    [parseInt(total_no_of_attendies), tna_license_code, comp_id],
                    (errUpdateCompany, respUpdateCompany) => {
                      if (errUpdateCompany) {
                        console.log(errUpdateCompany);
                        return res.status(500).json({
                          status: 500,
                          success: false,
                          message: "Error updating company details",
                        });
                      }

                      return res.status(200).json({
                        status: 200,
                        message: `TNA license created. Failed to send emails to ${failedEmailCount} recipients.`,
                        success: true,
                        result: insertResult,
                      });
                    }
                  );
                }
              );
            })
            .catch((error) => {
              console.log("Error occurred in Promise.all", error);
              return res.status(500).json({
                status: 500,
                success: false,
                message: `Internal Server Error. Failed to send emails to ${failedEmailCount} recipients.`,
              });
            });
        });
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};


const generateTnaCodeWithoutEmployee = async (req, res) => {
  try {
    // console.log("req.body;",req.body);
    const {tna_duration,start_date,end_date,sub_total,free_evaluation,discount,grand_total,total_no_of_attendies} = req.body;
    const comp_id = req.params.comp_id;
    let previousSubTotal
    let previoiusFree_evaluation
    let previousDiscount
    let previousGrand_total
    
    if(!tna_duration||!start_date||!end_date||!sub_total||!free_evaluation||!discount||!grand_total||!total_no_of_attendies){
      return res.json({message:"Insuffecient data ",success:false})
    }
    // Check if comp_id already has a tna_license_code
    const checkLicenseCodeQuery = "SELECT tna_license_code,total_no_of_attendies FROM TNA_licensing WHERE comp_id = ?";
    connection.query(checkLicenseCodeQuery,[comp_id],(checkErr, checkResult) => {
        if (checkErr) {
          console.log(checkErr);
          return res.status(500).json({success: false,message: "Error checking tna_license_code existence",
          });
        }

        let tna_license_code;
        let attendies;
        if (checkResult?.length > 0 && checkResult[0].tna_license_code) {
          tna_license_code = checkResult[0].tna_license_code;
          attendies = checkResult[0].total_no_of_attendies;
          updateTnaLicenseRecord();
        } else {
          // Generate a new tna_license_code
          const code = generateRandomCode(16);
          tna_license_code = code + comp_id;
          insertTnaLicenseRecord();
        }

        // console.log("tna_license_code", tna_license_code);

        function updateTnaLicenseRecord() {
          // Update TNA_licensing table
          const updateSql =
            "UPDATE TNA_licensing SET tna_duration = ?, start_date = ?, end_date = ?, sub_total = ?, free_evaluation = ?, discount = ?, grand_total = ?, total_no_of_attendies = ? WHERE comp_id = ?";
          connection.query(
            updateSql,
            [
              parseInt(tna_duration),
              start_date,
              end_date,
              parseInt(sub_total),
              parseInt(free_evaluation),
              parseInt(discount),
              parseInt(grand_total),
              parseInt(total_no_of_attendies), // Add new attendies to existing attendies
              comp_id,
            ],
            (err, result) => {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  status: 500,
                  success: false,
                  message: "Error updating data in TNA_licensing table",
                });
              }
              updateCompanyDetails(result); // Pass the result to the next function
            }
          );
        }

        function insertTnaLicenseRecord() {
          console.log("attendies in insertTnaLicenseRecord ",total_no_of_attendies , "type insertTnaLicenseRecord",typeof total_no_of_attendies);
          // Insert into TNA_licensing table
          const insertSql =
            "INSERT INTO TNA_licensing (comp_id, tna_license_code, tna_duration, start_date, end_date, sub_total, free_evaluation, discount, grand_total, total_no_of_attendies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
          connection.query(
            insertSql,
            [
              comp_id,
              tna_license_code,
              parseInt(tna_duration),
              start_date,
              end_date,
              parseInt(sub_total),
              parseInt(free_evaluation),
              parseInt(discount),
              parseInt(grand_total),
              parseInt(total_no_of_attendies)
            ],
            (err, result) => {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  status: 500,
                  success: false,
                  message: "Error inserting data into TNA_licensing table",
                });
              }
              // console.log("result",result);
              updateCompanyDetails(result); // Pass the result to the next function
            }
          );
        }

        function updateCompanyDetails(result) {
          console.log("attendies in updateCompanyDetails ",total_no_of_attendies , "type",typeof total_no_of_attendies);
          const sqlUpdateCompany =
            "UPDATE lms_companyDetails SET no_of_tna = ? ,tna_license_code = ? WHERE id = ?";
          connection.query(
            sqlUpdateCompany,
            [parseInt(total_no_of_attendies), tna_license_code, comp_id], // Add new attendies to existing attendies
            (errUpdateCompany, respUpdateCompany) => {
              if (errUpdateCompany) {
                console.log(errUpdateCompany);
                return res.status(500).json({
                  status: 500,
                  success: false,
                  message: "Error updating company details",
                });
              }

              return res.status(200).json({
                status: 200,
                message: "tna license created",
                success: true,
                result: result, // Pass the result to the response
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.log("Error occurred in generating license API", error);
    return res
      .status(500)
      .json({ status: 500, success: false, message: "Internal Server Error" });
  }
};

// const uploadCourseEmployee = async (req, res) => {
//   try {
//     const comp_id = req.params.comp_id;
//     const course_id = req.params.course_id
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }
//     if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
//       return res.status(400).json({ success: false, message: "Uploaded file must be in CSV format" });
//     }
//     const filePath = req.file.path;

//     const response = await csv().fromFile(filePath);

//     let count = 0;
//     for (const item of response) {
//       count++;
//       const dateee = item.DOB;
//       const convertToDate = (dateString) => {
//         const [dd, mm, yyyy] = dateString.split("-");
//         const dat = new Date(`${yyyy}-${mm}-${dd}`);
//         return dat;
//       };
//       const dob = convertToDate(dateee);
//       const formattedDOB = dob.toISOString().slice(0, 19).replace("T", " ");

//       const searchEmployeeQuery = "SELECT id, tna_score FROM lms_employee WHERE emp_email = ? AND comp_id = ?";
//       const employeeRows = await queryPromiseWithAsync(searchEmployeeQuery, [item.Email, comp_id]);
//       console.log("employeeRows", employeeRows?.length);
//       if (employeeRows?.length <= 0) {
//         return res.json({ message: "Employee is new and not found in database", success: false });
//       }

//       const empId = employeeRows[0].id;
//       const tnaScore = employeeRows[0].tna_score;

//       const checkEmployeeQuery = "SELECT emp_id FROM lms_courseEmployee WHERE emp_id = ? AND comp_id = ?";
//       const checkResp = await queryPromiseWithAsync(checkEmployeeQuery, [empId, comp_id]);

//       if (checkResp?.length > 0) {
//         const updateQuery = "UPDATE lms_courseEmployee SET emp_name = ?, designation = ?, emp_contact = ?, dob = ?, department = ?, gender = ?, tna_score = ? WHERE emp_id = ? AND course_id = ?";
//         await queryPromiseWithAsync(updateQuery, [
//           item.Name,
//           item.Designation,
//           item.Contact,
//           formattedDOB,
//           item.Department,
//           item.Gender,
//           tnaScore,
//           empId,
//           course_id,
//         ]);
//       } else {
//         const insertQuery = "INSERT INTO lms_courseEmployee (comp_id, emp_id, emp_name, emp_email, designation, emp_contact, dob, department, gender, tna_score,course_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)";
//         await queryPromiseWithAsync(insertQuery, [
//           comp_id,
//           empId,
//           item.Name,
//           item.Email,
//           item.Designation,
//           item.Contact,
//           formattedDOB,
//           item.Department,
//           item.Gender,
//           tnaScore,
//           course_id
//         ]);
//       }
//     }

//     console.log("Uploaded employee API");
//     return res.status(200).json({ msg: "Uploaded successfully", success: true, count: count });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ msg: "Internal server error", success: false });
//   }
// };


const getEmployee = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
  const sql = "SELECT * FROM lms_employee WHERE comp_id = ?";
  connection.query(sql, [comp_id], (err, resp) => {
    if (err) {
      console.log(err);
      return res.json({ message: "employee not get",success:false,error:err });
    } else {
      return res.json({ message: "employee list", data: resp ,success:true});
    }
  });
  } catch (error) {
    return res.json({ message: "Internal server error",success:false ,error:error});
    
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const employeeId = req.params.emp_id;
    if (!employeeId) {
      return res.json({ message: "Employee Id is not provided", success: false })
    }
    // Execute the query
    connection.query(
      "SELECT * FROM lms_employee WHERE  id = ?",
      [employeeId],
      (err, rows) => {
        if (err) {
          console.error("Error executing query:", err);
          res.status(500).json({ success: false, message: "Internal server error" });
          return;
        }

        if (rows.length > 0) {
           if (rows[0].dob) {
            const dob = new Date(rows[0].dob).toLocaleDateString('en-GB');
            rows[0].dob = dob;
          }

          res.json({ success: true, data: rows[0] });
          return;
        } else {
          res.json({ success: false, message: "Employee not found" });
        }
      }
    );
  } catch (error) {
    return res.json({ message: "Internal server error", success: false, error: error });

  }
};

const getEmployeeByCompanyId = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id  is not provided",success:false})
    }
    const sql = "SELECT id, emp_name, emp_email, contact_no, tna_link FROM lms_employee WHERE comp_id = ?";

    connection.query(sql, [comp_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal Error", success: false, error: err });
      }

      const responseData = {
        message: resp?.length === 0 ? "No employees found for this company" : "Success",
        data: resp,
        success: true
      };

      return res.json(responseData);
    });

  } catch (error) {
    console.log("Error", error);
    return res.json({ message: "Internal server Error", success: false, error: error });
  }
};

const getCompanyByEmployeeById = async (req, res) => {
  try {
    const employeeId = req.params.emp_id;
    if (!employeeId) {
      return res.json({ message: "Employee Id is not provided", success: false })
    }
    // Execute the query
    connection.query("SELECT comp_id FROM lms_employee WHERE  id = ?",
      [employeeId],
      async (err, rows) => {
        if (err) {
          console.error("Error executing query:", err);
          res.status(500).json({ success: false, message: "Internal server error" });
          return;
        }

        if (rows?.length > 0) {
          const comp_id = rows[0].comp_id;
          const getCourseId = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id =?'
          const result = await queryPromiseWithAsync(getCourseId, comp_id)
          if (result?.length <= 0) {
            const sql = "SELECT * FROM lms_companyDetails WHERE id = ?";
            connection.query(sql, [comp_id], (err, companyDetails) => {
              if (err) {
                res.json({ message: "error", error: err, success: false });
              }
              return res.json({ message: "success", success: true, data: companyDetails[0] });
            });
          } else {
            const course_id = result[0].course_id
            console.log("course_id", course_id);
            const sql = "SELECT * FROM lms_companyDetails WHERE id = ?";
            connection.query(sql, [comp_id], (err, companyDetails) => {
              if (err) {
                res.json({ message: "error", error: err, success: false });
              }
              return res.json({
                message: "success",
                success: true,
                data: companyDetails[0],
                course_id: course_id
              });
            });
          }

        } else {
          return res.json({ success: false, message: "Employee not found" });
        }
      }
    );

  } catch (error) {
    return res.json({ message: "Internal server error", success: false, error: error });
  }
};

const getEmployeeTnaDetailsById = async (req, res) => {
  try {
    const employeeId = req.params.emp_id;
  if(!employeeId){
    return res.json({message:"Employee Id is not provided",success:false})
  }
  // Execute the query
  connection.query(
    "SELECT * FROM lms_TNA_Employee_Answers WHERE  emp_id = ?",
    [employeeId],
    (err, rows) => {
      if (err) {
        console.error("Error executing query:", err);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
        return;
      }

      if (rows?.length > 0) {
        res.json({ success: true, data: rows[0] });
        return;
      } else {
        res.json({ success: false, message: "Employee not found" });
      }
    }
  );
  } catch (error) {
  return res.json({ message: "Internal server error", success: false,error:error });
    
  }
};

const getTnaEmployeeByCompanyId = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = "SELECT id, emp_name, emp_email, contact_no FROM lms_employee WHERE comp_id = ?";
    const tnaSql = "SELECT emp_id FROM lms_TNA_Employee_Answers WHERE emp_id = ?";

    connection.query(sql, [comp_id], async (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal Error", success: false, error: err });
      }

      // Iterate through each employee and check if they attended TNA
      for (const employee of resp) {
        await new Promise((resolve, reject) => {
          connection.query(tnaSql, [employee.id], (err, tnaResp) => {
            if (err) {
              return reject(err);
            }
            // Set a flag to indicate if the employee attended TNA
            employee.attendedTNA = tnaResp?.length > 0;
            resolve();
          });
        });
      }

      const responseData = {
        message: resp?.length === 0 ? "No employees found for this company" : "Success",
        data: resp,
        success: true
      };

      return res.json(responseData);
    });

  } catch (error) {
    console.log("Error", error);
    return res.json({ message: "Internal server Error", success: false, error: error });
  }
};

// const deleteTnaEmployee = async (req, res) => {
//   try {
//     const emp_id = req.params.emp_id;

//     // Check if the employee exists
//     const searchSql = 'SELECT * FROM lms_employee WHERE id = ?';
//     const searchSqlResult = await queryPromiseWithAsync(searchSql, [emp_id]);

//     if (searchSqlResult.length === 0) {
//       return res.status(404).json({ message: "Employee not found", success: false });
//     }

//     // Delete TNA employee answers if they exist
//     const deleteTnaEmployeeAnswerQuery = ` DELETE FROM lms_TNA_Employee_Answers 
//       WHERE emp_id IN (SELECT id FROM lms_TNA_Employee_Answers WHERE emp_id = ?)`;
//     await queryPromiseWithAsync(deleteTnaEmployeeAnswerQuery, [emp_id]);

//     // Check and delete course-related data if they exist
//     const deleteCourseData = async (tableName) => {
//       const checkSql = `SELECT * FROM ${tableName} WHERE emp_id = ?`;
//       const result = await queryPromiseWithAsync(checkSql, [emp_id]);

//       if (result.length > 0) {
//         const deleteSql = `DELETE FROM ${tableName} WHERE emp_id = ?`;
//         await queryPromiseWithAsync(deleteSql, [emp_id]);
//       }
//     };

//     // List of tables to delete related data from
//     const tablesToDeleteFrom = [
//       "lms_CourseNonGradedAnswerByEmployee",
//       "lms_EmployeeLogInLogOut",
//       "lms_EmployeeVideoData",
//       "lms_GradedAssesmentAnswersByEmployee",
//       "lms_Notify",
//       "lms_courseEmployee"
//     ];

//     for (const table of tablesToDeleteFrom) {
//       await deleteCourseData(table);
//     }

//     // Update company details if any course employees remain
//     const comp_id = searchSqlResult[0].comp_id;
//     const updateCompanyDetails = async (count, field, table) => {
//       const updateQuery = `UPDATE ${table} SET ${field} = ? WHERE comp_id = ?`;
//       await queryPromiseWithAsync(updateQuery, [count, comp_id]);
//     };

//     // Update no_of_course and total_no_of_attendies in company details
//     const searchCourseEmployeeCount = 'SELECT COUNT(*) as count FROM lms_courseEmployee WHERE comp_id = ?';
//     const courseEmployeeCountResult = await queryPromiseWithAsync(searchCourseEmployeeCount, [comp_id]);

//     if (courseEmployeeCountResult[0].count > 0) {
//       await updateCompanyDetails(courseEmployeeCountResult[0].count, 'no_of_course', 'lms_companyDetails');
//       await updateCompanyDetails(courseEmployeeCountResult[0].count, 'total_no_of_attendies', 'lms_CourseCompany');
//     }

//     // Delete the employee from the main employee table
//     const deleteEmployeeQuery = 'DELETE FROM lms_employee WHERE id = ?';
//     await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);

//     // Update no_of_tna and total_no_of_attendies in TNA licensing if any employees remain
//     const searchEmployeeCount = 'SELECT COUNT(*) as count FROM lms_employee WHERE comp_id = ?';
//     const employeeCountResult = await queryPromiseWithAsync(searchEmployeeCount, [comp_id]);

//     if (employeeCountResult[0].count > 0) {
//       await updateCompanyDetails(employeeCountResult[0].count, 'no_of_tna', 'lms_companyDetails');
//       await updateCompanyDetails(employeeCountResult[0].count, 'total_no_of_attendies', 'TNA_licensing');
//     }

//     return res.status(200).json({ message: "Deletion successful", success: true });
//   } catch (error) {
//     console.error("Internal Server Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", success: false, error: error.message });
//   }
// };


const deleteTnaEmployee = async (req, res) => {
  const emp_id = req.params.emp_id;

  connection.beginTransaction(async (transactionError) => {
    if (transactionError) {
      return res.status(500).json({ message: "Transaction error", success: false, error: transactionError.message });
    }

    try {
      const searchSql = 'SELECT * FROM lms_employee WHERE id = ?';
      const searchSqlResult = await queryPromiseWithAsync(searchSql, [emp_id]);

      if (searchSqlResult.length <= 0) {
        connection.rollback(); // rollback the transaction if employee not found
        return res.status(404).json({ message: "Employee not found", success: false });
      }

      // Check if TNA answers exist for the employee
      const searchTnaAnswer = 'SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id = ?';
      const searchTnaAnswerResult = await queryPromiseWithAsync(searchTnaAnswer, [emp_id]);

      if (searchTnaAnswerResult.length > 0) {
        const deleteTnaEmployeeAnswerQuery = 'DELETE FROM lms_TNA_Employee_Answers WHERE emp_id = ?';
        await queryPromiseWithAsync(deleteTnaEmployeeAnswerQuery, [emp_id]);
      }

      // Check and delete course data
      const checkCourseSql = "SELECT * FROM lms_courseEmployee WHERE emp_id = ?";
      const courseResult = await queryPromiseWithAsync(checkCourseSql, [emp_id]);

      if (courseResult.length > 0) {
        const deleteRelatedDataQueries = [
          { query: "DELETE FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_EmployeeLogInLogOut WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_EmployeeVideoData WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_Notify WHERE emp_id = ?", data: [emp_id] },
          { query: "DELETE FROM lms_courseEmployee WHERE emp_id = ?", data: [emp_id] }
        ];

        for (const { query, data } of deleteRelatedDataQueries) {
          await queryPromiseWithAsync(query, data);
        }

        const comp_id = searchSqlResult[0].comp_id;
        const searchCount = "SELECT * FROM lms_courseEmployee WHERE comp_id = ?";
        const result = await queryPromiseWithAsync(searchCount, [comp_id]);

        if (result.length > 0) {
          const count = result.length;
          const updateCompanyQuery = 'UPDATE lms_companyDetails SET no_of_course = ? WHERE id = ?';
          const updateCourseLicensingQuery = 'UPDATE lms_CourseCompany SET total_no_of_attendies = ? WHERE comp_id = ?';

          await queryPromiseWithAsync(updateCompanyQuery, [count, comp_id]);
          await queryPromiseWithAsync(updateCourseLicensingQuery, [count, comp_id]);
        }
      }

      // Delete employee data
      const deleteEmployeeQuery = 'DELETE FROM lms_employee WHERE id = ?';
      await queryPromiseWithAsync(deleteEmployeeQuery, [emp_id]);

      // Update company details
      const comp_id = searchSqlResult[0].comp_id;
      const searchCount = "SELECT * FROM lms_employee WHERE comp_id = ?";
      const result = await queryPromiseWithAsync(searchCount, [comp_id]);

      if (result.length > 0) {
        const count = result.length;
        const updateCompanyQuery = 'UPDATE lms_companyDetails SET no_of_tna = ? WHERE id = ?';
        const updateTnaLicensingQuery = 'UPDATE TNA_licensing SET total_no_of_attendies = ? WHERE comp_id = ?';

        await queryPromiseWithAsync(updateCompanyQuery, [count, comp_id]);
        await queryPromiseWithAsync(updateTnaLicensingQuery, [count, comp_id]);
      }

      // Commit the transaction after all operations are successful
      connection.commit((commitError) => {
        if (commitError) {
          connection.rollback(() => {
            return res.status(500).json({ message: "Transaction commit error", success: false, error: commitError.message });
          });
        }

        return res.status(200).json({ message: "Deletion successful", success: true });
      });

    } catch (error) {
      connection.rollback(() => {
        return res.status(500).json({ message: "Internal Server Error", success: false, error: error.message });
      });
    }
  });
};


// -------------------------------------Course Employee-----------------------


const uploadCourseEmployee = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const course_id = req.params.course_id
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
      return res.status(400).json({ success: false, message: "Uploaded file must be in CSV format" });
    }
    const filePath = req.file.path;

    const response = await csv().fromFile(filePath);

    const requiredFields = ['Name', 'Email', 'Designation', 'Contact', 'DOB', 'Department', 'Gender'];

    // Check if all required fields are present
    const csvFields = Object.keys(response[0]);
    const missingFields = requiredFields.filter(field => !csvFields.includes(field));
    if (missingFields?.length > 0) {
      return res.status(400).json({ success: false, message: `Missing fields in CSV: ${missingFields.join(', ')}` });
    }

    let count = 0;
    const processedEmails = new Set(); // Track processed emails

    for (const item of response) {
      const email = item.Email.toLowerCase(); // Normalize email to lowercase
      if (processedEmails.has(email)) {
        // If email is already processed, skip this item
        continue;
      }

      processedEmails.add(email); // Add email to processed set
      count++;

      const dateee = item.DOB;
      const convertToDate = (dateString) => {
        const [dd, mm, yyyy] = dateString.split("-");
        const dat = new Date(`${yyyy}-${mm}-${dd}`);
        return dat;
      };
      const dob = convertToDate(dateee);
      const formattedDOB = dob.toISOString().slice(0, 19).replace("T", " ");

      const searchEmployeeQuery = "SELECT id, tna_score FROM lms_employee WHERE emp_email = ? AND comp_id = ?";
      const employeeRows = await queryPromiseWithAsync(searchEmployeeQuery, [email, comp_id]);
      console.log("employeeRows", employeeRows?.length);
      if (employeeRows?.length <= 0) {
        return res.json({ message: "Employee is new and not found in database", success: false });
      }

      const empId = employeeRows[0].id;
      const tnaScore = employeeRows[0].tna_score;

      const checkEmployeeQuery = "SELECT emp_id FROM lms_courseEmployee WHERE emp_id = ? AND comp_id = ?";
      const checkResp = await queryPromiseWithAsync(checkEmployeeQuery, [empId, comp_id]);

      if (checkResp?.length > 0) {
        const updateQuery = "UPDATE lms_courseEmployee SET emp_name = ?, designation = ?, emp_contact = ?, dob = ?, department = ?, gender = ?, tna_score = ? WHERE emp_id = ? AND course_id = ?";
        await queryPromiseWithAsync(updateQuery, [
          item.Name,
          item.Designation,
          item.Contact,
          formattedDOB,
          item.Department,
          item.Gender,
          tnaScore,
          empId,
          course_id,
        ]);
      } else {
        const insertQuery = "INSERT INTO lms_courseEmployee (comp_id, emp_id, emp_name, emp_email, designation, emp_contact, dob, department, gender, tna_score,course_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)";
        await queryPromiseWithAsync(insertQuery, [
          comp_id,
          empId,
          item.Name,
          item.Email,
          item.Designation,
          item.Contact,
          formattedDOB,
          item.Department,
          item.Gender,
          tnaScore,
          course_id
        ]);
      }
    }

    // console.log("Uploaded employee API");
    return res.status(200).json({ message: "Uploaded successfully", success: true, count: count });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

// const generateCourseLicensing = async (req, res) => {
//   try {
//     const { total_no_of_attendies,start_date,end_date,sub_total,discount,grand_total,
//     } = req.body;
//     const comp_id = req.params.comp_id;
//     const course_id = req.params.course_id
//     if(!comp_id||!course_id){
//       return res.json({message:"Company Id or Course Id is not provided",success:false})
//     }
//    let course_code

//     if (!comp_id || !total_no_of_attendies) {
//       return res.json({
//         msg: "company or total no of attendies is not define",
//         message: "company or total no of attendies is not define",
//       });
//     }
//     const searchCompany = 'SELECT course_code FROM lms_CourseCompany WHERE comp_id = ?'
//     const searchResult = await queryPromiseWithAsync(searchCompany,comp_id)
//     if(searchResult?.length<=0){
//        let code = generateRandomCode(16);
//        course_code = code + comp_id;
//     }else{
//       course_code=searchResult[0].course_code
//     }
//     // const course_code = code + comp_id;
//     const searchEmployeeQuery ="SELECT emp_email from lms_courseEmployee WHERE comp_id = ? AND course_code IS NULL";
    
//     connection.query(searchEmployeeQuery, [comp_id], async (err, resp) => {
//       if (err) {
//         console.log(err);
//         return res.status(500).json({
//           status: 500,
//           message: err.message,
//           success: false,
//           msg: "Error retrieving employee data",
//         });
//       } else {
//         if (resp?.length <= 0) {
//           return res.json({
//             messsage: "Trying to enter same employee",
//             success:false
//           });
//         }

//         const updateTokenPromises = resp.map(async (value) => {
//           const user_password = generatePassword(12);
//           const hashedPassword = await bcrypt.hash(user_password, 10);

//           return new Promise((resolve, reject) => {
//             const courseToken = uuid.v4()
//             const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
//             const sender = { email: senderMail, name: "Hybrid LMS" };
//             const receivers = [{ email: value.emp_email }];

//             const sendEmail = apiInstance.sendTransacEmail({
//               sender,
//               to: receivers,
//               subject: "Your Subject Here",
//               textContent: `Hello, this is server side.Here is your password :${user_password}`,
//               htmlContent: `Hello, this is server side.Here is your password :${user_password}`,
//             });

//             sendEmail
//               .then((response) => {
//                 // Update in lms_employee table
//                 const updateTokenQuery =
//                   "UPDATE lms_employee SET courseToken = ? WHERE emp_email = ? AND comp_id = ?";
//                 connection.query(
//                   updateTokenQuery,
//                   [courseToken, value.emp_email, comp_id],
//                   async (updateErr, updateResult) => {
//                     if (updateErr) {
//                       console.log(
//                         "Update token error in lms_employee:",
//                         updateErr
//                       );
//                       reject(updateErr);
//                     } else {
//                       // Update in lms_courseEmployee table
//                       console.log("course_code",course_code);
//                       const updateCourseEmployeeQuery =
//                         "UPDATE lms_courseEmployee SET courseToken = ?, course_code = ?, start_date =?,end_date=?, password = ? WHERE emp_email = ? AND comp_id = ?";

//                       connection.query(
//                         updateCourseEmployeeQuery,
//                         [
//                           courseToken,
//                           course_code,
//                           start_date,
//                           end_date,
//                           hashedPassword,
//                           value.emp_email,
//                           comp_id,
//                         ],
//                         async (
//                           updateCourseEmployeeErr,
//                           updateCourseEmployeeResult
//                         ) => {
//                           if (updateCourseEmployeeErr) {
//                             console.log(
//                               "Update token error in lms_courseEmployee:",
//                               updateCourseEmployeeErr
//                             );
//                             reject(updateCourseEmployeeErr);
//                           } else {
//                             resolve();
//                           }
//                         }
//                       );
//                     }
//                   }
//                 );
//               })
//               .catch((error) => {
//                 console.log(error);
//                 reject(error);
//               });
//           });
//         });

//         Promise.all(updateTokenPromises)
//           .then(() => {
//             // Check if comp_id already exists in lms_CourseCompany
//             const checkIfExistsSql =
//               "SELECT COUNT(*) AS count FROM lms_CourseCompany WHERE comp_id = ? AND course_id = ?";

//             connection.query(
//               checkIfExistsSql,
//               [comp_id,course_id],
//               async (checkError, checkResults) => {
//                 if (checkError) {
//                   console.log(checkError);
//                   return res.status(500).json({
//                     status: 500,
//                     success: false,
//                     msg: "Error checking if comp_id exists",
//                   });
//                 }

//                 const compExists = checkResults[0].count > 0;
//                 // console.log("endDate Above update", end_date)
//                 // If comp_id exists, update the record
//                 if (compExists) {
//                   const updateSql =
//                     "UPDATE lms_CourseCompany SET total_no_of_attendies = ?, start_date = ?,end_date=?, sub_total = ?,  discount = ?, grand_total = ? WHERE comp_id = ? AND course_id=?";

//                   connection.query(
//                     updateSql,
//                     [
//                       total_no_of_attendies,
//                       start_date,
//                       end_date,
//                       sub_total,                      
//                       discount,
//                       grand_total,                    
//                       comp_id,
//                       course_id
//                     ],
//                     async (updateError, updateResults) => {
//                       if (updateError) {
//                         console.log(updateError);
//                         return res.status(500).json({
//                           status: 500,
//                           success: false,
//                           msg: "Error updating data in lms_CourseCompany table",
//                         });
//                       }

//                       const updateCompanySql =
//                         "UPDATE lms_companyDetails SET no_of_course = ?, course_code = ? WHERE id = ?";

//                       connection.query(
//                         updateCompanySql,
//                         [total_no_of_attendies, course_code, comp_id],
//                         async (updateCompanyError, respUpdateCompany) => {
//                           if (updateCompanyError) {
//                             console.log(updateCompanyError);
//                             return res.status(500).json({
//                               status: 500,
//                               success: false,
//                               msg: "Error updating company details",
//                             });
//                           }

//                           return res.status(200).json({
//                             status: 200,
//                             message: "Course license updated",
//                             success: true,
//                             result: updateResults,
//                           });
//                         }
//                       );
//                     }
//                   );
//                 } else {
//                   // If comp_id doesn't exist, insert a new record
//                   console.log("endDate below update", end_date)
                

//                   const insertSql =
//                     "INSERT INTO lms_CourseCompany (comp_id,course_id, total_no_of_attendies, start_date,end_date, sub_total,  discount, grand_total, course_code) VALUES (?,?, ?, ?, ?,?, ?, ?,  ?)";

//                   connection.query(
//                     insertSql,
//                     [
//                       comp_id,
//                       course_id,
//                       total_no_of_attendies,
//                       start_date,
//                       end_date,
//                       sub_total,                      
//                       discount,
//                       grand_total,
//                       course_code,
//                     ],
//                     async(insertError, insertResults) => {
//                       if (insertError) {
//                         console.log(insertError);
//                         return res.status(500).json({
//                           status: 500,
//                           success: false,
//                           msg: "Error inserting data into lms_CourseCompany table",
//                         });
//                       }
//                       // console.log("insertResults", insertResults);
//                       const searchAllotment = 'SELECT * FROM lms_CourseAllotmentToCompany WHERE comp_id = ? '
//                       const resultSeacrhAllotment = await queryPromiseWithAsync(searchAllotment,comp_id)
//                       if(resultSeacrhAllotment?.length<=0){                     
                     
//                       const getModuleIdQuery = 'SELECT id FROM lms_Module WHERE course_id=?'
//                       const getModuleIdQueryResult = await queryPromiseWithAsync(getModuleIdQuery,course_id);
//                       console.log("getCourseIdQueryResult",getModuleIdQueryResult);
//                       const moduleIds = getModuleIdQueryResult.map((row) => row.id);
//                       console.log("moduleIds",moduleIds);
//                       const insertIntoCourseAccess = "INSERT INTO lms_CourseAllotmentToCompany (comp_id, course_id,module_id) VALUES (?, ?,?)";
//                       console.log("insertIntoCourseAccess",insertIntoCourseAccess)
//                       for (const moduleId of moduleIds) {
//                         await queryPromiseWithAsync(insertIntoCourseAccess, [comp_id,course_id, moduleId]);
//                       }
//                     }
//                       const sqlUpdateCompany =
//                         "UPDATE lms_companyDetails SET no_of_course = ?, course_code = ? WHERE id = ?";
//                       connection.query(
//                         sqlUpdateCompany,
//                         [total_no_of_attendies, course_code, comp_id],
//                         (updateCompanyError, respUpdateCompany) => {
//                           if (updateCompanyError) {
//                             console.log(updateCompanyError);
//                             return res.status(500).json({
//                               status: 500,
//                               success: false,
//                               msg: "Error updating company details",
//                             });
//                           }
//                           // console.log("respUpdateCompany",respUpdateCompany);
//                           return res.status(200).json({
//                             status: 200,
//                             message: "Course license created",
//                             success: true,
//                             result: insertResults,
//                           });
//                         }
//                       );
//                     }
//                   );
//                 }
//               }
//             );
//           })
//           .catch((error) => {
//             console.log("Error occurred in Promise.all", error);
//             return res.status(500).json({
//               status: 500,
//               success: false,
//               msg: "Internal Server Error",
//             });
//           });
//       }
//     });
//   } catch (error) {
//     console.log("Error occurred in generating license API", error);
//     return res
//       .status(500)
//       .json({ status: 500, success: false, msg: "Internal Server Error" });
//   }
// };


const generateCourseLicensing = async (req, res) => {
  try {
    const { 
      total_no_of_attendies, start_date, end_date, sub_total, discount, grand_total 
    } = req.body;
    const comp_id = req.params.comp_id;
    const course_id = req.params.course_id;

    if (!comp_id || !course_id) {
      return res.json({ message: "Company Id or Course Id is not provided", success: false });
    }
   
    let course_code;
    if (!comp_id || !total_no_of_attendies) {
      return res.json({ message: "Company or total number of attendees is not defined", success: false });
    }

    const searchCompany = 'SELECT course_code FROM lms_CourseCompany WHERE comp_id = ?';
    const searchResult = await queryPromiseWithAsync(searchCompany, comp_id);
    
    if (searchResult?.length <= 0) {
      let code = generateRandomCode(16);
      course_code = code + comp_id;
    } else {
      course_code = searchResult[0].course_code;
    }

    const searchEmployeeQuery = "SELECT emp_email from lms_courseEmployee WHERE comp_id = ? AND course_code IS NULL";
    connection.query(searchEmployeeQuery, [comp_id], async (err, resp) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          status: 500,
          error: err.message,
          success: false,
          message: "Error retrieving employee data",
        });
      } else {
        if (resp?.length <= 0) {
          return res.json({
            message: "Trying to enter same employee",
            success: false
          });
        }

        let failedEmailCount = 0;

        const updateTokenPromises = resp.map(async (value) => {
          const user_password = generatePassword(12);
          const hashedPassword = await bcrypt.hash(user_password, 10);

          return new Promise((resolve, reject) => {
            const courseToken = uuid.v4();
            const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
            const sender = { email: senderMail, name: "Hybrid LMS" };
            const receivers = [{ email: value.emp_email }];

            const sendEmail = apiInstance.sendTransacEmail({
              sender,
              to: receivers,
              subject: "Your Subject Here",
              textContent: `Hello, this is server side. Here is your password: ${user_password}`,
              htmlContent: `Hello, this is server side. Here is your password: ${user_password}`,
            });

            sendEmail
              .then((response) => {
                const updateTokenQuery = "UPDATE lms_employee SET courseToken = ? WHERE emp_email = ? AND comp_id = ?";
                connection.query(
                  updateTokenQuery,
                  [courseToken, value.emp_email, comp_id],
                  (updateErr, updateResult) => {
                    if (updateErr) {
                      console.log("Update token error in lms_employee:", updateErr);
                      reject(updateErr);
                    } else {
                      const updateCourseEmployeeQuery =
                        "UPDATE lms_courseEmployee SET courseToken = ?, course_code = ?, start_date =?, end_date=?, password = ? WHERE emp_email = ? AND comp_id = ?";
                      connection.query(
                        updateCourseEmployeeQuery,
                        [courseToken, course_code, start_date, end_date, hashedPassword, value.emp_email, comp_id],
                        (updateCourseEmployeeErr) => {
                          if (updateCourseEmployeeErr) {
                            console.log("Update token error in lms_courseEmployee:", updateCourseEmployeeErr);
                            reject(updateCourseEmployeeErr);
                          } else {
                            resolve();
                          }
                        }
                      );
                    }
                  }
                );
              })
              .catch((error) => {
                console.log(error);
                failedEmailCount++;
                reject(error);
              });
          });
        });

        Promise.all(updateTokenPromises)
          .then(() => {
            const checkIfExistsSql = "SELECT COUNT(*) AS count FROM lms_CourseCompany WHERE comp_id = ? AND course_id = ?";
            connection.query(checkIfExistsSql, [comp_id, course_id], async (checkError, checkResults) => {
              if (checkError) {
                console.log(checkError);
                return res.status(500).json({
                  status: 500,
                  success: false,
                  message: "Error checking if comp_id exists",
                });
              }

              const compExists = checkResults[0].count > 0;
              if (compExists) {
                const updateSql =
                  "UPDATE lms_CourseCompany SET total_no_of_attendies = ?, start_date = ?, end_date=?, sub_total = ?, discount = ?, grand_total = ? WHERE comp_id = ? AND course_id=?";
                connection.query(
                  updateSql,
                  [total_no_of_attendies, start_date, end_date, sub_total, discount, grand_total, comp_id, course_id],
                  async (updateError, updateResults) => {
                    if (updateError) {
                      console.log(updateError);
                      return res.status(500).json({
                        status: 500,
                        success: false,
                        message: "Error updating data in lms_CourseCompany table",
                      });
                    }

                    const updateCompanySql = "UPDATE lms_companyDetails SET no_of_course = ?, course_code = ? WHERE id = ?";
                    connection.query(updateCompanySql, [total_no_of_attendies, course_code, comp_id], (updateCompanyError) => {
                      if (updateCompanyError) {
                        console.log(updateCompanyError);
                        return res.status(500).json({
                          status: 500,
                          success: false,
                          message: "Error updating company details",
                        });
                      }

                      return res.status(200).json({
                        status: 200,
                        message: `Course license updated. Failed to send emails to ${failedEmailCount} recipients.`,
                        success: true,
                        result: updateResults,
                      });
                    });
                  }
                );
              } else {
                const insertSql = "INSERT INTO lms_CourseCompany (comp_id,course_id, total_no_of_attendies, start_date,end_date, sub_total,  discount, grand_total, course_code) VALUES (?,?, ?, ?, ?,?, ?, ?,  ?)";
                connection.query(
                  insertSql,
                  [comp_id, course_id, total_no_of_attendies, start_date, end_date, sub_total, discount, grand_total, course_code],
                  async (insertError, insertResults) => {
                    if (insertError) {
                      console.log(insertError);
                      return res.status(500).json({
                        status: 500,
                        success: false,
                        message: "Error inserting data into lms_CourseCompany table",
                      });
                    }

                    const searchAllotment = 'SELECT * FROM lms_CourseAllotmentToCompany WHERE comp_id = ? ';
                    const resultSearchAllotment = await queryPromiseWithAsync(searchAllotment, comp_id);
                    if (resultSearchAllotment?.length <= 0) {
                      const getModuleIdQuery = 'SELECT id FROM lms_Module WHERE course_id=?';
                      const getModuleIdQueryResult = await queryPromiseWithAsync(getModuleIdQuery, course_id);
                      const moduleIds = getModuleIdQueryResult.map((row) => row.id);
                      const insertIntoCourseAccess = "INSERT INTO lms_CourseAllotmentToCompany (comp_id, course_id, module_id) VALUES (?, ?, ?)";
                      for (const moduleId of moduleIds) {
                        await queryPromiseWithAsync(insertIntoCourseAccess, [comp_id, course_id, moduleId]);
                      }
                    }

                    const sqlUpdateCompany = "UPDATE lms_companyDetails SET no_of_course = ?, course_code = ? WHERE id = ?";
                    connection.query(sqlUpdateCompany, [total_no_of_attendies, course_code, comp_id], (updateCompanyError) => {
                      if (updateCompanyError) {
                        console.log(updateCompanyError);
                        return res.status(500).json({
                          status: 500,
                          success: false,
                          message: "Error updating company details",
                        });
                      }
                      return res.status(200).json({
                        status: 200,
                        message: `Course license created. Failed to send emails to ${failedEmailCount} recipients.`,
                        success: true,
                        result: insertResults,
                      });
                    });
                  }
                );
              }
            });
          })
          .catch((error) => {
            console.log("Error occurred in Promise.all", error);
            return res.status(500).json({
              status: 500,
              success: false,
              message: `Internal Server Error. Failed to send emails to ${failedEmailCount} recipients.`,
            });
          });
      }
    });
  } catch (error) {
    console.log("Error occurred in generating license API", error);
    return res.status(500).json({ status: 500, success: false, message: "Internal Server Error" });
  }
};

const uploadEmployeeAndGenerateLicense = async (req, res) => {
  try {
    const comp_id = req.params.id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    // Check if a file is uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const filePath = req.file.path;

    // Read CSV file and insert employee data into the database
    const response = await csv().fromFile(filePath);
    let count = 0;

    // Generate TNA license code
    const code = generateRandomCode(16);
    const tna_license_code = code + comp_id;

    // Update company details with the generated TNA license code
    const sqlUpdateCompany =
      "UPDATE lms_companyDetails SET tna_license_code = ? WHERE id = ?";
    connection.query(sqlUpdateCompany,[tna_license_code, comp_id],async (errUpdateCompany, respUpdateCompany) => {
        if (errUpdateCompany) {
          console.log(errUpdateCompany);
          return res.status(500).json({
            status: 500,
            success: false,
            message: "Error updating company details",
          });
        }

        // Retrieve TNA license details from the request body
        const {tna_duration,start_date,end_date,sub_total,free_evaluation,discount,grand_total} = req.body;

        // Insert TNA license details into the TNA_licensing table
        const sqlInsertTnaLicense ="INSERT INTO TNA_licensing (comp_id, total_no_of_attendies, tna_duration, start_date, end_date, sub_total, free_evaluation, discount, grand_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        connection.query(
          sqlInsertTnaLicense,
          [comp_id,count,tna_duration,start_date,end_date,sub_total,
            free_evaluation,
            discount,
            grand_total,
          ],
          async (errInsertTnaLicense, respInsertTnaLicense) => {
            if (errInsertTnaLicense) {
              console.log(errInsertTnaLicense);
              return res.status(500).json({
                status: 500,
                success: false,
                msg: "Error inserting data into TNA_licensing table",
              });
            }

            // Send emails to employees with unique links
            const emailPromises = response.map(async (employee) => {
              count++;
              const uniqueToken = generateRandomCode(32);
              const mcqLink = `http://172.20.1.157:3000/${tna_license_code}/${uniqueToken}`;

              const expirationTime = end_date;

              const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
              const sender = { email: senderMail, name: "Cdn" };
              const receivers = [{ email: employee.emp_email }];

              try {
                const sendEmail = await apiInstance.sendTransacEmail({
                  sender,
                  to: receivers,
                  subject: "Your Subject Here",
                  textContent: `Hello, this is server side. Click the following link to access the MCQ page: ${mcqLink}`,
                  htmlContent: `Hello, this is server side. Click the following link to access the MCQ page: <a href="${mcqLink}">${mcqLink}</a>`,
                });

                // Update employee with unique token and expiration time
                const updateTokenQuery = "UPDATE lms_employee SET unique_token = ?, tna_link = ?, token_expiration = ? WHERE emp_email = ? AND comp_id = ?";
                await connection.query(updateTokenQuery, [
                  uniqueToken,
                  mcqLink,
                  expirationTime,
                  employee.emp_email,
                  comp_id,
                ]);

                return { success: true, message: "Email sent successfully" };
              } catch (error) {
                console.error("Error sending email", error);
                return { success: false, message: "Error sending email" };
              }
            });

            // Wait for all emails to be sent
            const emailResults = await Promise.all(emailPromises);

            // Check if any email failed to send
            const emailFailed = emailResults.some((result) => !result.success);

            if (emailFailed) {
              return res.status(500).json({
                status: 500,
                success: false,
                msg: "Error sending emails",
              });
            }

            return res.status(200).json({
              status: 200,
              message:
                "File uploaded, TNA license code generated, TNA license details inserted, and emails sent successfully",
              success: true,
              count: count,
              tna_license_code: tna_license_code,
              tna_license_details: respInsertTnaLicense,
            });
          }
        );
      }
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: 500, success: false, message: "Internal Server Error" });
  }
};

const getCourseEmployeeBycompanyId = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
  if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = `SELECT e.emp_id,e.emp_name,COALESCE(SUM(g.total_score), 0) AS total,
                COALESCE(SUM(g.out_off), 0) AS outOff
            FROM lms_courseEmployee e
            LEFT JOIN lms_GradedAssesmentAnswersByEmployee g ON e.id = g.emp_id WHERE g.comp_id = ?
            GROUP BY e.id, e.emp_name`

    connection.query(sql, [comp_id], (err, resp) => {
      if (err) {
        console.log("err", err);
        return res.json({ message: "Fatal Error", error: err, success: false });
      }

      return res.json({ message: "Success", data: resp, success: true });
    });
  } catch (error) {
    return res.json({ message: "Internal server Error",error: error,success: false});
  }
};


const getCourseEmployeeById = async (req, res) => {
  const employeeId = req.params.emp_id;
  if(!employeeId){
    return res.json({message:"Employee Id is not provided",success:false})
  }
  const sql = "SELECT * FROM lms_courseEmployee WHERE  emp_id = ?"
  const result = await queryPromiseWithAsync(sql,employeeId)
      if (result.length > 0) {
        return res.json({ success: true, data: result[0] });
      } else {
        return res.json({ success: false, message: "Employee not found" });
      }
};

const deleteCourseEmployee = async (req, res) => {
  try {
    
    const emp_id = req.params.emp_id;
    const searchSql = 'SELECT * FROM lms_courseEmployee WHERE emp_id = ?';
    const searchSqlResult = await queryPromiseWithAsync(searchSql, [emp_id]);
    if (searchSqlResult.length <= 0) {
      return res.status(404).json({ message: "Employee not found", success: false });
    }
    // Check if TNA answers exist for the employee
    const searchCourseAnswer = `SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?`;
    const searchCourseAnswerResult = await queryPromiseWithAsync(searchCourseAnswer, [emp_id]);
    if (searchCourseAnswerResult.length > 0) {
        const deleteCourseEmployeeAnswerQuery = `DELETE FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?`;
        await queryPromiseWithAsync(deleteCourseEmployeeAnswerQuery, [emp_id]);
    }
    // console.log("3");
    const searchNonGradedAnswer = 'SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?';
    const searchNonGradedAnswerResult = await queryPromiseWithAsync(searchNonGradedAnswer, [emp_id]);
    if (searchNonGradedAnswerResult.length > 0) {
        const deleteNongradedQuery = 'DELETE FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?';
        await queryPromiseWithAsync(deleteNongradedQuery, [emp_id]);
    }
    const searchLogin = `SELECT * FROM lms_EmployeeLogInLogOut WHERE emp_id = ?`;
    const searchLoginResult = await queryPromiseWithAsync(searchLogin, [emp_id]);
    if (searchLoginResult.length > 0) {
        const deleteLoginQuery = `DELETE FROM lms_EmployeeLogInLogOut WHERE emp_id = ?`;
        await queryPromiseWithAsync(deleteLoginQuery, [emp_id]);
    }
    const searchEmployeeVideoData = `SELECT * FROM lms_EmployeeVideoData WHERE emp_id = ?`;
    const searchEmployeeVideoDataResult = await queryPromiseWithAsync(searchEmployeeVideoData, [emp_id]);
    if (searchEmployeeVideoDataResult.length > 0) {
        const deleteEmployeeVideoData = `DELETE FROM lms_EmployeeVideoData WHERE emp_id = ?`;
        await queryPromiseWithAsync(deleteEmployeeVideoData, [emp_id]);
    }
    
    //  Delete Notification
    const searchEmployeeNotify = `SELECT * FROM lms_Notify WHERE emp_id = ?`;
    const searchEmployeeNotifyResult = await queryPromiseWithAsync(searchEmployeeNotify, [emp_id]);
    if (searchEmployeeNotifyResult.length > 0) {
        const deleteEmployeeNotify = `DELETE FROM lms_Notify WHERE emp_id = ?`;
        await queryPromiseWithAsync(deleteEmployeeNotify, [emp_id]);
    }
   
    const deleteCourseEmployee = `DELETE FROM lms_courseEmployee WHERE emp_id = ?`;
    await queryPromiseWithAsync(deleteCourseEmployee, [emp_id]);
    const comp_id = searchSqlResult[0].comp_Id;

    // Update company details if employees exist
    const searchCount = `SELECT * FROM lms_courseEmployee WHERE comp_Id = ?`;
    const result = await queryPromiseWithAsync(searchCount, [comp_id]);
    // console.log("4",result);
    if (result.length > 0) {
      const count = result.length;
      const updateCompanyQuery = `UPDATE lms_companyDetails SET no_of_course = ? WHERE id = ?`;
      await queryPromiseWithAsync(updateCompanyQuery, [count, comp_id]);
      const updateCourseLicensingQuery = `UPDATE lms_CourseCompany SET total_no_of_attendies = ? WHERE comp_id = ?`;
      await queryPromiseWithAsync(updateCourseLicensingQuery, [count, comp_id]);
    }
   
    return res.status(200).json({ message: "Deletion successful", success: true });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", success: false, error: error.message });
  }
};
// ----------------------------------TNA MCQ -----------------------------------------

const getTnaCompany = async (req, res) => {
  try {
    const sql = "SELECT * FROM TNA_licensing";
    connection.query(sql, async (err, result) => {
      if (err) {
        console.log(err);
        return res.json({
          message: "Error in fetching data",
          msg: err,
          success: false,
        });
      } else {
        const ids = result.map((value) => value.comp_id);

        const compDetailsQuery ="SELECT id, comp_name,comp_city FROM lms_companyDetails WHERE id IN (?)";
        connection.query(
          compDetailsQuery,
          [ids],
          (compDetailsErr, compDetailsResult) => {
            if (compDetailsErr) {
              console.log(compDetailsErr);
              return res.json({
                message: "Error in fetching company details",
                msg: compDetailsErr,
                success: false,
              });
            } else {
              const compData = result.map((value) => {
                const companyDetails = compDetailsResult.find(
                  (details) => details.id === value.comp_id
                );
                // console.log("companyDetails",companyDetails);
                return {
                  id: value.comp_id,
                  comp_name: companyDetails ? companyDetails.comp_name : "N/A", // Return "N/A" if id not found
                  city: companyDetails ? companyDetails.comp_city : "N/A",
                };
              });
              // console.log("compData",compData);
              return res.json({ compData: compData, success: true });
            }
          }
        );
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({
      message: "Error in fetching data",
      success: false,
      error: error,
    });
  }
};
const tnaMcqUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: "No file uploaded" });
    }

    const filePath = req.file.path;
    const category_id = 1;
    const category = "MCQ";
    const response = await csv().fromFile(filePath);

    // Required fields
    const requiredFields = ["Questions", "Option A", "Option B", "Option C", "Option D", "CorrectAnswer"];
    
    // Validate CSV fields
    for (const item of response) {
      for (const field of requiredFields) {
        if (!item[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field} in one of the rows`,
          });
        }
      }
    }

    let count = 0;
    for (const item of response) {
      count++;
      const query = `
        INSERT INTO lms_TNA_MCQ (questions, options, correctAnswer, category_id, category)
        VALUES (?, ?, ?, ?, ?)
      `;

      // Trim spaces from the prefix of each option
      const optionsArray = [
        item["Option A"].trim(),
        item["Option B"].trim(),
        item["Option C"].trim(),
        item["Option D"].trim(),
      ];

      const correctAnswer = item.CorrectAnswer.trim();
      await queryPromiseWithAsync(query, [
        item.Questions.trim(),
        JSON.stringify(optionsArray), // Assuming you want to store options as JSON string
        correctAnswer,
        category_id,
        category,
      ]);
    }

    return res.json({status: 202,
      success: true,
      message: "File imported successfully",
      total_no_of_question_upoaded: count,
    });
  } catch (error) {
    console.log("Error in importUser:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getTNAMcqByQuestionId = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    if(!question_id){
      return res.json({message:"question Id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_TNA_MCQ WHERE id =?";
    const result = await queryPromiseWithAsync(sql,question_id)
      if (result.length<=0) {
        return res.json({ message: "Not found", success: false });
      }
      return res.json({ message: "Success", success: true, data: result[0] });
  } catch (error) {
    return res.json({message: "Internal server Error",success: false,error: error});
  }
};

const mcqAllQuestion = async (req, res) => {
  try {
    const sql = "SELECT * FROM lms_TNA_MCQ";
    connection.query(sql, (err, resp) => {
      if (err) {
        console.log(err);
        return res.json({ message: "Query Error", success: false, error: err });
      }
      const count = resp?.length;
      return res.json({
        message: "data",
        count: count,
        questions: resp,
        success: true,
      });
    });
  } catch (error) {
    console.log("errr", error);
    return res.json({
      message: "Internal Server Error",
      success: false,
      error: error,
    });
  }
};

const updateMCQquestionsById = async (req, res) => {
  try {
    const id = req.params.id;
    if(!id){
      return res.json({message:"Id is not provided",success:false})
    }
    const { questions, options, correctAnswer } = req.body;

    // Check if at least one of the fields is provided
    if (!questions && !options && !correctAnswer) {
      return res.json({ message: "No fields provided for update", success: false });
    }

    const updateFields = [];

    if (questions) {
      updateFields.push(`questions = '${questions}'`);
    }

    if (options) {
      updateFields.push(`options = '${options}'`);
    }

    if (correctAnswer) {
      updateFields.push(`correctAnswer = '${correctAnswer}'`);
    }

    const updateSql = `UPDATE lms_TNA_MCQ SET ${updateFields.join(
      ","
    )} WHERE id = ?`;

    connection.query(updateSql, [id], (err, result) => {
      if (err) {
        console.error("Error updating MCQ questions:", err);
        return res.json({
          message: "Error updating MCQ questions",
          success: false,
        });
      }

      if (result.affectedRows > 0) {
        return res.json({message: "MCQ questions updated successfully",success: true});
      } else {
        return res.json({ message: "MCQ questions not found", success: false });
      }
    });
  } catch (error) {
    console.error("Error in updateMCQquestionsById:", error);
    return res.json({ message: "Internal server error", success: false });
  }
};

const getMcqforEmployeeSetWise = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    // console.log("comp_id",comp_id);
    if(!comp_id){
      return res.json({message:" Company Id is not provided",success:false})
    }
    const licenseSql = "SELECT * FROM TNA_licensing WHERE comp_id = ?";

    connection.query(licenseSql, [comp_id], async (licenseErr, licenseResp) => {
      if (licenseErr) {
        return res.json({
          message: "Fatal error in license query",
          success: false,
        });
      }

      if (licenseResp.length <= 0) {
        return res.json({
          message: "Company hasn't purchased the TNA license",
          success: false,
        });
      }

      // Fetch 10 random questions from lms_TNA_MCQ
      const mcqSql = "SELECT * FROM lms_TNA_MCQ ORDER BY RAND() LIMIT 10";
      const questionsA = await queryPromise(mcqSql);
      const questionsB = await queryPromise(mcqSql);
      const questionsC = await queryPromise(mcqSql);
      const questionsD = await queryPromise(mcqSql);

      // Fetch one random email question from lms_EmailAndTextQuestions
      const randomEmailSql =
        'SELECT * FROM lms_EmailAndTextQuestions WHERE category = "Email" ORDER BY RAND() LIMIT 1';
      const randomEmailResult = await queryPromise(randomEmailSql);

      // Fetch one random text question from lms_EmailAndTextQuestions
      const randomTextSql ='SELECT * FROM lms_EmailAndTextQuestions WHERE category = "Text" ORDER BY RAND() LIMIT 1';
      const randomTextResult = await queryPromise(randomTextSql);

      // Check if all queries were successful
      if (randomEmailResult && randomTextResult) {
        const shuffledQuestionsA = [
          ...questionsA,
          randomEmailResult[0],
          randomTextResult[0],
        ].sort(() => Math.random() - 0.5);
        const shuffledQuestionsB = [
          ...questionsB,
          randomEmailResult[0],
          randomTextResult[0],
        ].sort(() => Math.random() - 0.6);
        const shuffledQuestionsC = [
          ...questionsC,
          randomEmailResult[0],
          randomTextResult[0],
        ].sort(() => Math.random() - 0.7);
        const shuffledQuestionsD = [
          ...questionsD,
          randomEmailResult[0],
          randomTextResult[0],
        ].sort(() => Math.random() - 0.8);

        const sets = {
          setA: shuffledQuestionsA,
          setB: shuffledQuestionsB,
          setC: shuffledQuestionsC,
          setD: shuffledQuestionsD,
        };

        return res.json({ message: "data received", data: sets, success: true });
      } else {
        return res.json({ message: "Error in fetching questions", success: false });
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({
      error: error,
      message: "error in getMcq Api",
      success: false,
    });
  }
};

const updateTNAMCQquestionsById = async (req, res) => {
  try {
    const id = req.params.question_id;
    const { questions, options, correctAnswer } = req.body;
    if(!id){
      return res.json({message:" Id is not provided",success:false})
    }
    if (!questions && !options && !correctAnswer) {
      return res.json({
        message: "No fields provided for update",
        success: false,
      });
    }

       // Parse the options string into a JavaScript array
    const parsedOptions = JSON.parse(options);

    const updateFields = [];
    const params = [];

    if (questions) {
      updateFields.push("questions = ?");
      params.push(questions);
    }

    if (options) {
      updateFields.push("options = ?");
      params.push(JSON.stringify(parsedOptions));
    }

    if (correctAnswer) {
      updateFields.push("correctAnswer = ?");
      params.push(correctAnswer);
    }

    const updateSql = `UPDATE lms_TNA_MCQ SET ${updateFields.join(
      ","
    )} WHERE id = ?`;
    params.push(id);

    connection.query(updateSql, params, (err, result) => {
      if (err) {
        console.error("Error updating MCQ questions:", err);
        return res.json({
          message: "Error updating MCQ questions",
          success: false,
        });
      }

      if (result.affectedRows > 0) {
        // console.log("result", result);
        return res.json({
          message: "MCQ questions updated successfully",
          success: true,
        });
      } else {
        return res.json({ message: "MCQ questions not found", success: false });
      }
    });
  } catch (error) {
    console.error("Error in updateMCQquestionsById:", error);
    return res.json({ message: "Internal server error", success: false });
  }
};

const deleteTnaMcq = async(req,res)=>{
  try {
    const id = req.params.id
    const getMcq = 'SELECT * FROM lms_TNA_MCQ WHERE id = ?'
    const result = await queryPromiseWithAsync(getMcq,id)
    if(result.length<=0){
    return res.json({message:"Deletion unsuccessfull",success:false})
    }
    const deleteQuery = 'DELETE FROM lms_TNA_MCQ WHERE id = ?';
    await queryPromiseWithAsync(deleteQuery, [id]);
    return res.json({message:"Deletion successfull",success:true})
  } catch (error) {
    return res.json({message:"Internal Server error",success:false,error:error})

  }
}

// ----------------------------------TNA other questions----------------------


const emailAndTextQuestionUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: "No file uploaded" });
    }

    const filePath = req.file.path;
    let count = 0;
    const response = await csv().fromFile(filePath);

    for (const item of response) {
      const categoryId = item.Category === "Email" ? 3 : item.Category === "Text" ? 2 : null;

      if (categoryId !== null) {
        count++;
        const query = `INSERT INTO lms_EmailAndTextQuestions (category_id,category, topic) VALUES (?,?, ?)`;

        await connection.query(query, [categoryId, item.Category, item.Topics]);
      }
    }
    return res.json({status: 202,success: true,message: "File imported successfully",total_question: count,
    });
  } catch (error) {
    console.log("Error in emailAndTextQuestionUpload:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getAllTextQuestions = async (req, res) => {
  try {
    const getCategorySQL =
      "SELECT * FROM lms_EmailAndTextQuestions WHERE category = ?";
    const category = "Text";

    connection.query(getCategorySQL, [category], async (err, resp) => {
      if (err) {
        console.log(err.message);
        return res.json({ message: "error", error: err,success:false });
      }
      const count = resp?.length;
      return res.json({ message: "done", count: count, questions: resp ,success:true});
    });
  } catch (error) {
    console.log("error", error);
    return res.json({ message: "Internal Server Error ",error: error,success:false });
  }
};

const getAllEmailQuestions = async (req, res) => {
  try {
    const getCategorySQL ="SELECT * FROM lms_EmailAndTextQuestions WHERE category = ?";
    const category = "Email";

    connection.query(getCategorySQL, [category], async (err, resp) => {
      if (err) {
        console.log(err.message);
        return res.json({ message: "error", error: err, success: false });
      }
      const count = resp?.length;
      return res.json({
        message: "done",
        count: count,
        questions: resp,
        success: true,
      });
    });
  } catch (error) {
    console.log("error", error);
    return res.json({ message: "error", error, success: false });
  }
};

const updateEmailQuestionById = async (req, res) => {
  const id = req.params.id;
  const questions = req.body;
  if(!id||!questions){
    return res.json({message:"Id or question is not provided",success:false})
  }
  const sql = "UPDATE lms_EmailAndTextQuestions SET topic = ? WHERE id =?";

  connection.query(sql, [questions.topic, id], (err, resp) => {
    if (err) {
      return res.json({
        message: "Error In Querry",
        success: false,
        error: err,
      });
    }

    return res.json({ message: "Successfully updated", success: true });
  });
};

const updateTextQuestionById = async (req, res) => {
  const id = req.params.id;
  const questions = req.body;
  if(!id||!questions){
    return res.json({message:"Id or question is not provided",success:false})
  }
  const sql = "UPDATE lms_EmailAndTextQuestions SET topic = ? WHERE id =?";

  connection.query(sql, [questions.topic, id], (err, resp) => {
    if (err) {
      return res.json({
        message: "Error In Querry",
        success: false,
        error: err,
      });
    }

    return res.json({ message: "Successfully updated", success: true });
  });
};


const getAllTnaTextAndEmailQuestions = async (req, res) => {
  try {
    const getEmailCategorySQL =
      "SELECT id,topic FROM lms_EmailAndTextQuestions WHERE category = ?";

    // Get Email category questions
    connection.query(
      getEmailCategorySQL,
      ["Email"],
      async (errEmail, respEmail) => {
        if (errEmail) {
          console.log(errEmail.message);
          return res.json({ message: "error", error: errEmail, success: false });
        }

        const emailQuestions = {
          count: respEmail?.length,
          questions: respEmail,
        };

        const getTextCategorySQL =
          "SELECT id,topic FROM lms_EmailAndTextQuestions WHERE category = ?";

        // Get Text category questions
        connection.query(
          getTextCategorySQL,
          ["Text"],
          async (errText, respText) => {
            if (errText) {
              console.log(errText.message);
              return res.json({ message: "error", error: errText, success: false });
            }

            const textQuestions = {
              count: respText?.length,
              questions: respText,
            };



            // Return the merged response
            return res.json({
              message: "done",
              Email: emailQuestions,
              Text: textQuestions,
              success: true,
            });
          }
        );
      }
    );
  } catch (error) {
    console.log("error", error);
    return res.json({ message: "error",error: error, success: false });
  }
};

const updateTNATextAndEmailquestionsById = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    const questions = req.body.question;
    // console.log("questions",questions);
    if(!question_id || !questions){
      return res.json({message:"Question id Or questions are not provided",success:false})
    }

    const sql = "UPDATE lms_EmailAndTextQuestions SET topic = ? WHERE id =?";

    connection.query(sql, [questions, question_id], (err, resp) => {
      if (err) {
        return res.json({
          message: "Error In Querry",
          success: false,
          error: err,
        });
      }

      return res.json({ message: "Successfully updated", success: true });
    });
  } catch (error) {
    console.log("error", error);
    return res.json({ message: "Internal server error",error: error, success: false });
  }
};

const deleteTnaOtherQuestion = async(req,res)=>{
  try {
    const id = req.params.id
    const getQuerry = 'SELECT * FROM lms_EmailAndTextQuestions WHERE id = ?'
    const result = await queryPromiseWithAsync(getQuerry,id)
    if(result.length<=0){
    return res.json({message:"Deletion unsuccessfull",success:false})
    }
    const deleteQuery = 'DELETE FROM lms_EmailAndTextQuestions WHERE id = ?';
    await queryPromiseWithAsync(deleteQuery, [id]);
    return res.json({message:"Deletion successfull",success:true})
  } catch (error) {
    return res.json({message:"Internal Server error",success:false,error:error})
  }
}



const getTNAOtherQuestionByQuestionId = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    if(!question_id){
      return res.json({message:"question Id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_EmailAndTextQuestions WHERE id =?";
    const result = await queryPromiseWithAsync(sql,question_id)
      if (result.length<=0) {
        return res.json({ message: "Not found", success: false });
      }
      return res.json({ message: "Success", success: true, data: result });
  } catch (error) {
    return res.json({message: "Internal server Error",success:false,error:error});
  }
};


// -----------------------------------TNA EXAM --------------------------


const checkUniqueToken = async (req, res) => {
  try {
    const uniqueToken = req.params.uniqueToken
    if(!uniqueToken){
      return res.json({message:" uniqueToken is not provided",success:false})
    }
  
    const checkExpireyDate ="SELECT token_expiration FROM lms_employee WHERE unique_token=?";
    connection.query(checkExpireyDate, [uniqueToken], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal error", success: false, error: err });
      }
      // console.log("resp", resp);
      const today = new Date();
      const tokenEndDate = resp[0].token_expiration;
     
      const formattedtokenEndDate = tokenEndDate.toLocaleDateString("en-GB");
      const formattedToday = today.toLocaleDateString("en-GB");

      if (formattedtokenEndDate < formattedToday) {
        return res.json({message: "Token Expire",success: false,data: formattedtokenEndDate,
          today: formattedToday,
        });
      }
      return res.json({ data: formattedtokenEndDate, today: formattedToday, success: true })
    });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
}

const tnaAnswerByEmployee = async (req, res) => {
  try {
    const { mcq, mcq_selectedAnswer, email_answer, text_answer, mcq_score, mcq_score_out_off } = req.body;
    
    const { uniqueToken } = req.params;
    if(!uniqueToken){
      return res.json({message:" uniqueToken is not provided",success:false})
    }
    const textAnswerArray = []
    textAnswerArray.push(text_answer)
    const email_answerArray = []
    email_answerArray.push(email_answer)
    const sanitizedTextAnswer = textAnswerArray || [];
    const sanitizedEmailAnswer = email_answerArray || [];

    // console.log(Array.isArray(sanitizedEmailAnswer));

    if (Array.isArray(mcq)) {
      const mcqQuestions = mcq?.filter((item) => item.category === "MCQ");
      const textQuestions = mcq?.filter((item) => item.category === "Text");
      const emailQuestions = mcq?.filter((item) => item.category === "Email");
      const mcqQuestionsArr = mcqQuestions?.map((v) => v.questions);
      const optionsArr = mcqQuestions?.map((v) => v.options);
      const correctAnswerArr = mcqQuestions?.map((v) => v.correctAnswer);
      const emailQuestionArr = emailQuestions?.map((v) => v.topic);
      const textQuestionArr = textQuestions?.map((v) => v.topic);
      
      const selectEmployeeSql ="SELECT id, comp_id FROM lms_employee WHERE unique_token = ?";
      connection.query(selectEmployeeSql, [uniqueToken], (err, resp) => {
        if (err) {
          console.log("Error in SELECT query:", err);
          return res.json({ message: "Error in SELECT query", success: false });
        }
        if (resp.length === 0) {
          console.log("No user found for uniqueToken:", uniqueToken);
          return res.json({ message: "No user found", success: false });
        }
        const emp_id = resp[0].id;
        const comp_id = resp[0].comp_id;
        const checkEmployeeAnswerSql ="SELECT id FROM lms_TNA_Employee_Answers WHERE emp_id = ?";
        connection.query(checkEmployeeAnswerSql, [emp_id], async(checkErr, checkResults) => {
          if (checkErr) {
            console.log("Error in SELECT query:", checkErr);
            return res.json({ message: "Error in SELECT query", success: false });
          }
          // console.log("checkResults",checkResults);
          if (checkResults?.length > 0) {
            // console.log("entered");
            const updateAnswer = 'UPDATE lms_TNA_Employee_Answers SET mcq_questions = ?, mcq_options = ?, mcq_correctAnswer = ? , mcq_selectedAnswer = ? , email_question = ? , email_answer = ?, text_question = ?, text_answer = ?, mcq_score = ?, mcq_score_out_off = ?, attempt = attempt + 1 WHERE emp_id = ? AND comp_id = ?'
            const updatedResult = await queryPromiseWithAsync(updateAnswer, [JSON.stringify(mcqQuestionsArr),
            JSON.stringify(optionsArr),
            JSON.stringify(correctAnswerArr),
            JSON.stringify(mcq_selectedAnswer),
            JSON.stringify(emailQuestionArr),
            JSON.stringify(sanitizedEmailAnswer),
            JSON.stringify(textQuestionArr),
            JSON.stringify(sanitizedTextAnswer),
            mcq_score,
            mcq_score_out_off,
            emp_id,
            comp_id              
            ])
            if(updatedResult.affectedRows>0){
              const today = new Date();
              const formattedDate = today.toISOString().slice(0, 19).replace('T', ' ');
              const updateLinkQuery = 'UPDATE lms_employee SET token_expiration = ? WHERE id = ?';
              await queryPromiseWithAsync(updateLinkQuery, [formattedDate, emp_id]);
              return res.json({message:"Reattempt successful",success:true})
            }
          } else {
            const insertSql = ` INSERT INTO lms_TNA_Employee_Answers 
            (comp_id, emp_id, mcq_questions, mcq_options, mcq_correctAnswer, mcq_selectedAnswer,
            email_question, email_answer, text_question, text_answer, mcq_score,mcq_score_out_off) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            connection.query(
              insertSql,
              [
                comp_id,
                emp_id,
                JSON.stringify(mcqQuestionsArr),
                JSON.stringify(optionsArr),
                JSON.stringify(correctAnswerArr),
                JSON.stringify(mcq_selectedAnswer),
                JSON.stringify(emailQuestionArr),
                JSON.stringify(sanitizedEmailAnswer),
                JSON.stringify(textQuestionArr),
                JSON.stringify(sanitizedTextAnswer),
                mcq_score,
                mcq_score_out_off,
              ],
              async (insertErr, insertResults) => {
                if (insertErr) {
                  console.log("err in INSERT query", insertErr);
                  return res.json({
                    message: "error in INSERT query",
                    success: false,
                  });
                }
                const today = new Date();
                const formattedDate = today.toISOString().slice(0, 19).replace('T', ' ');
                const updateLinkQuery = 'UPDATE lms_employee SET token_expiration = ? WHERE id = ?';
                await queryPromiseWithAsync(updateLinkQuery, [formattedDate, emp_id]);
                return res.json({ message: "Your answers are submitted", success: true });

              }
            );
          }
          
        });
      });
    } else {
      return res.json({ message: "mcq must be an array", success: false });
    }
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });

  }
}

// const getDatafromEmployeeAnswer = async (req, res) => {
//   const emp_id = req.params.emp_id;
//   const sql = "SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id =? ";

//   connection.query(sql, [emp_id], (err, resp) => {
//     if (err) {
//       console.log("err", err);
//       return res.json({
//         error: err.message,
//         message: "error in query",
//         success: false,
//       });
//     }

//     // Parse mcq_options from string to JSON
//     const parsedResp = resp.map((entry) => {
//       return {
//         ...entry,
//         mcq_options: JSON.parse(entry.mcq_options),
//         // Add other fields to modify as needed
//       };
//     });
// console.log("parsedResp",parsedResp);
//     return res.json({ message: "done", success: true, data: parsedResp });
//   });
// };

const getDatafromEmployeeAnswer = async (req, res) => {
  const emp_id = req.params.emp_id;
  if(!emp_id){
    return res.json({message:" Employee Id is not provided",success:false})
  }
  const sql = "SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id =? ";

  connection.query(sql, [emp_id], (err, resp) => {
    if (err) {
      console.log("err", err);
      return res.json({
        error: err.message,
        message: "error in query",
        success: false,
      });
    }
// console.log("resp",resp);
    // Parse mcq_options from string to JSON
    const parsedResp = resp.map((entry) => {
      return {
        ...entry,
        mcq_options: JSON.parse(entry.mcq_options),
        mcq_correctAnswer: JSON.parse(entry.mcq_correctAnswer),
        mcq_selectedAnswer: JSON.parse(entry.mcq_selectedAnswer),
        // Add other fields to modify as needed
      };
    });
    // console.log("parsedResp", parsedResp);

    // Function to generate an array of true/false indicating whether each answer matches
    const matchAnswersArray = (correctAnswers, selectedAnswers) => {
      // Check if both arrays have the same length
      if (correctAnswers?.length !== selectedAnswers?.length) {
        return null;
      }

      const resultArray = [];

      for (let i = 0; i < correctAnswers?.length; i++) {
        const trimmedCorrectAnswer = correctAnswers[i]?.trim();
        const trimmedSelectedAnswer = selectedAnswers[i]?.trim();
        resultArray.push(trimmedCorrectAnswer === trimmedSelectedAnswer);
      }
      return resultArray; // Return the array of true/false
    };

    const matchArray = matchAnswersArray(
      parsedResp[0].mcq_correctAnswer,
      parsedResp[0].mcq_selectedAnswer
    );

    return res.json({ message: "done", success: true, data: parsedResp });
  });
};

const getScoreFromEmployeeAnswer = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
  const sql ="SELECT mcq_score, mcq_score_out_off,email_score,email_score_out_off,text_score_out_off ,text_score, total_score  FROM lms_TNA_Employee_Answers WHERE emp_id =? ";
  connection.query(sql, [emp_id], (err, resp) => {
    if (err) {
      console.log("err", err);
      return res.json({
        error: err.message,
        message: "error in query",
        success: false,
      });
    }
    return res.json({ message: "done", success: true, data: resp });
  });
  } catch (error) {
    res.json({message:"Internal server error",success:false,error:error})
  }
};

const updateDataForScore = async (req, res) => {
  const id = req.params.emp_id;
  const mcq_score = req.body.mcq.mcq_score;
  const mcq_score_out_off = req.body.mcq.mcq_score_out_off;
  const email_score = req.body.email.email_score;
  const email_score_out_off = req.body.email.email_score_out_off;
  const text_score = req.body.text.text_score;
  const text_score_out_off = req.body.text.text_score_out_off;
  const out_Off = mcq_score_out_off + email_score_out_off + text_score_out_off;
  const total_score = mcq_score + email_score + text_score;
  if(!id){
    return res.json({message:"Id is not provided",success:false})
  }
  try {
    const updateQuery = `UPDATE lms_TNA_Employee_Answers
        SET
        mcq_score = COALESCE(?, mcq_score),
        mcq_score_out_off = COALESCE(?, mcq_score_out_off),
        email_score_out_off = COALESCE(?, email_score_out_off),
        text_score_out_off = COALESCE(?, text_score_out_off),
        out_Off = COALESCE(?, out_Off),
        email_score = COALESCE(?, email_score),
        text_score = COALESCE(?, text_score),
        total_score = COALESCE(?, total_score)
        WHERE
        emp_id = ?;`;

    // Execute the update query
    await connection.query(
      updateQuery,
      [
        mcq_score,
        mcq_score_out_off,
        email_score_out_off,
        text_score_out_off,
        out_Off,
        email_score,
        text_score,
        total_score,
        id,
      ],
      (err, resp) => {
        if (err) {
          console.log("err", err);
          return res
            .status(500)
            .json({ success: false, message: "Fatal error", error: err });
        }
        return res.json({
          data: resp,
          success: true,
          message: "Data Updated successfully",
        });
      }
    );
  } catch (error) {
    console.error("Error updating data:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error });
  }
};

const tnaEvaluation = async (req, res) => {
 try {
  const comp_id = req.params.comp_id;
 
  if (!comp_id) {
    return res.json({ message: "Company ID is not given", success: false });
  }

  // Check if the company exists
  let q = "SELECT emp_id FROM lms_TNA_Employee_Answers WHERE comp_id = ?";
  const result = await queryPromiseWithAsync(q,comp_id)
  if(result?.length<=0){
    return res.json({ message: "This company's employees haven't submitted tna", success: false });
  }
  let data =[]
  for (const v of result) {
    const sql = "SELECT id, emp_name, emp_email, tna_link FROM lms_employee WHERE id = ?";
    const resultOfSql = await queryPromiseWithAsync(sql, v.emp_id);
    // console.log("resultOfSql", resultOfSql[0]);
    data.push(resultOfSql[0]);
  }
  return res.json({ message: "Success", data: data, success: true });

 
 } catch (error) {
  res
  .status(500)
  .json({ message: "Internal server error",error: error, success: false });
 }
};

const tnaManagementQuestions = async (req, res) => {
  try {
    const mcqResult = await getMCQData();
    const otherResult = await getOtherQuestionsData();
    res.status(200).json({
      message: "Data fetched successfully",
      mcqResult,
      otherResult,
      success: true,
    });
  } catch (error) {
    console.error("Error in tnaManagementQuestions:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error, success: false });
  }
};

async function getMCQData() {
  try {
    const mcqCategorySQL = "SELECT category FROM lms_TNA_MCQ";
    const mcqCategories = await queryPromise(mcqCategorySQL);

    const resultData = await Promise.all(
      mcqCategories.map(async (mcqCategory) => {
        const getCategoryCountSQL = `SELECT COUNT(*) as count FROM lms_TNA_MCQ WHERE category = '${mcqCategory.category}'`;
        const getTopicsSQL = `SELECT topic FROM lms_TNA_MCQ WHERE category = '${mcqCategory.category}'`;

        const [countResult, topicsResult] = await Promise.all([
          queryPromise(getCategoryCountSQL),
          queryPromise(getTopicsSQL),
        ]);

        const count = countResult[0].count;
        const topics = topicsResult.map((topic) => topic.topic);

        const mcqData = {
          category: mcqCategory.category,
          count,
          topics,
        };
        // console.log("mcqData",mcqData);

        return mcqData;
      })
    );
    // console.log("resultData",resultData);

    return resultData[0];
  } catch (error) {
    console.error("Error in getMCQData:", error);
    throw error;
  }
}

async function getOtherQuestionsData() {
  try {
    const getCategorySQL = "SELECT category FROM lms_EmailAndTextQuestions";
    const categories = await queryPromise(getCategorySQL);

    const result = await Promise.all(
      categories.map(async (category) => {
        const getCategoryCountSQL = `SELECT COUNT(*) as count FROM lms_EmailAndTextQuestions WHERE category = '${category.category}'`;
        const getTopicsSQL = `SELECT topic FROM lms_EmailAndTextQuestions WHERE category = '${category.category}'`;

        const [countResult, topicsResult] = await Promise.all([
          queryPromise(getCategoryCountSQL),
          queryPromise(getTopicsSQL),
        ]);

        const count = countResult[0].count;
        const topics = topicsResult.map((topic) => topic.topic);

        return {
          category: category.category,
          count,
          topics,
        };
      })
    );

    // Separate the data for email and text
    const emailData = result.find(
      (item) => item.category.toLowerCase() === "email"
    ) || { count: 0 };
    const textData = result.find(
      (item) => item.category.toLowerCase() === "text"
    ) || { count: 0 };

    return {
      emailResult: emailData,
      textResult: textData,
    };
  } catch (error) {
    console.error("Error in getOtherQuestionsData:", error);
    throw error;
  }
}



// -----------------------------------Tna Report-------------------


/*  done*/


const tnaReport = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = `
            SELECT t.emp_id, e.emp_name, e.emp_email, t.mcq_score, t.email_score, t.text_score,t.total_score,t.out_Off
            FROM lms_TNA_Employee_Answers t
            JOIN lms_employee e ON t.emp_id = e.id
            WHERE t.comp_id = ?
        `;

        const resp = await queryPromiseWithAsync(sql,[comp_id])
         if (resp.length <= 0) {
        return res.json({ message: "Company data doesn't exist" });
      }
      return res.json({ message: "Successful", data: resp, success: true });
  } catch (error) {
    console.log("Error:", error);
    return res.json({ message: "Internal server error", success: false });
  }
};

const tnaPassedEmployee = async (req, res) => {

  try {
    const comp_id = req.params.comp_id;
    if (!comp_id) {
      return res.json({ message: "Company Id is not provided", success: false })
    }
    const sql = `SELECT t.emp_id, e.emp_name, e.emp_email, t.mcq_score, t.email_score, t.text_score, t.total_score, t.out_Off
      FROM lms_TNA_Employee_Answers t
      JOIN lms_employee e ON t.emp_id = e.id
      WHERE t.comp_id = ?`;

    connection.query(sql, [comp_id], (err, resp) => {
      if (err) {
        console.log("Error:", err.message);
        return res.json({
          message: "Error occurred in API/query",
          success: false,
        });
      }

      if (resp?.length <= 0) {
        return res.json({ message: "Company data doesn't exist" });
      }

      const employees = resp.map((employee) => {
        const percentage = Math.round((employee.total_score / employee.out_Off) * 100);
        const status = percentage > 70 ? "Pass" : "Fail";

        return {
          Name: employee.emp_name,
          Email: employee.emp_email,
          Percentage: percentage,
          Status: status,
        };
      });

      return res.json({ message: "Successful", data: employees, success: true });
    });
  } catch (error) {
    console.log("Error:", error);
    return res.json({ message: "Internal server error", success: false });
  }
};

const tnaReportById = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    // console.log("emp_idemp_id",emp_id);
    if(!emp_id){
      return res.json({message:"Employee id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id =?";
    connection.query(sql, [emp_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal Error", success: false, error: err });
      }
      if (resp?.length <= 0) {
        return res.json({ message: "No data found", success: false, notFound: true });
      }
      // console.log("resp", resp[0]);
      const {
        mcq_questions,
        text_question,
        email_question,
        mcq_score,
        mcq_score_out_off,
        email_score,
        email_score_out_off,
        text_score,
        text_score_out_off,
        total_score,
        out_Off,
      } = resp[0];

      const result = {
        MCQ: {
          question_count: JSON.parse(mcq_questions)?.length,
          score: mcq_score,
          out_off: mcq_score_out_off,
        },
        TEXT: {
          question_count: JSON.parse(text_question)?.length,
          score: text_score,
          out_off: text_score_out_off,
        },
        EMAIL: {
          question_count: JSON.parse(email_question)?.length,
          score: email_score,
          out_off: email_score_out_off,
        },
        total_score: total_score,
        out_off: out_Off,
      };
    const passedFailed = Math.round(total_score / out_Off *100) > 70 ? "Pass" : "Fail"

      return res.json({ message: "success", data: result,result:passedFailed, success: true });
    });
  } catch (error) {
    console.log("err", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });

  }
};

const getPercentageOfTnaEmployee = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql ="SELECT emp_id, total_score, out_Off FROM lms_TNA_Employee_Answers WHERE comp_id = ?";
    connection.query(sql, [comp_id], async (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal Error", error: err, success: false });
      }
      let aboveSixty = [];
      let remaining = [];

      for (let i = 0; i < resp?.length; i++) {
        let percent = (resp[i].total_score / resp[i].out_Off) * 100;

        if (percent >= 60) {
          aboveSixty.push(resp[i].emp_id);
        } else {
          remaining.push(resp[i].emp_id);
        }
      }

      let aboveSixtyValue = [];

      for (let j = 0; j < aboveSixty?.length; j++) {
        const emp_query =
          "SELECT emp_name, emp_email FROM lms_employee WHERE id = ?";
        const [employee] = await queryPromise(emp_query, [aboveSixty[j]]);

        aboveSixtyValue.push({
          name: employee.emp_name,
          email: employee.emp_email,
        });
      }

      return res.json({
        message: "Success", data: resp,aboveSixty: aboveSixty,remaining: remaining,aboveSixtyValue: aboveSixtyValue,success: true});
    });
  } catch (error) {
    return res.json({
      message: "Internal server Error",
      error: error,
      success: false,
    });
  }
};


const overallCompanyGradedPerformance = async (req, res) => {
  try {
    const comp_id = req.params.comp_id
      if(!comp_id ){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const searchCourseId = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?';
    const courseResult = await queryPromiseWithAsync(searchCourseId, comp_id);
    if(courseResult?.length<=0){
      return res.json({message:"Company heven't purchased course yet or company doesn't exist",success:false})
    }
    const searchAllModuleIDs = 'SELECT id, module_name FROM lms_Module WHERE course_id = ? AND isGraded = 1';
    const moduleResults = await queryPromiseWithAsync(searchAllModuleIDs, courseResult[0].course_id);
    if(moduleResults?.length<=0){
      return res.json({message:"Module doesn't exist on this course Which is perchased by this company which have assessment also",success :false})
    }
    // Step 3: Iterate over each module to calculate total score and out of
    const modulePerformance = [];
    for (const module of moduleResults) {
      const moduleId = module.id;
      const moduleName = module.module_name;

      const searchMarks = 'SELECT total_score, out_off FROM lms_GradedAssesmentAnswersByEmployee WHERE comp_id = ? AND module_id = ?';
      const searchedResults = await queryPromiseWithAsync(searchMarks, [comp_id, moduleId]);

      let totalScore = 0;
      let outOff = 0;

      if (searchedResults?.length > 0) {
        for (const result of searchedResults) {
          totalScore += result.total_score;
          outOff += result.out_off;
        }
      }

      // Calculate average score if there are entries
      const averageScore = searchedResults?.length > 0 ? totalScore / searchedResults?.length : 0;
      const averageOutOff = searchedResults?.length > 0 ? outOff / searchedResults?.length : 0
      const attendedBy = searchedResults?.length > 0 ? searchedResults?.length : 0
      modulePerformance.push({
        moduleName,
        totalScore,
        outOff,
        averageScore,
        averageOutOff,
        attendedBy
      });
    }
    return res.json({message:"success",success:true,data:modulePerformance})
  } catch (error) {
    console.error("Internal Server error:", error);
   return res.status(500).send("Internal Server error");
  }
}


// -----------------------------------Calendar events-------------------------------

const calendarEvents = (req, res) => {
  try {
    const { events } = req.body;
    if (!events || events?.length === 0) {
      return res.json({ message: "No events provided", success: false });
    }

    const eventTitle = [];
    const companyId = [];
    const eventType = [];
    const eventDate = [];
    const company = [];

    for (const event of events) {
      const titleIndex = eventTitle.indexOf(event.title);

      if (titleIndex === -1) {
        eventTitle.push(event.title);
        companyId.push(event.companyId);
        eventType.push(event.eventType);
        eventDate.push([event.date]);
        company.push(event.company);
      } else {
        // If the event title already exists, update the date
        eventDate[titleIndex].push(event.date);
      }
    }

    const latestCompanyId = companyId.slice(-1);

    const selectSql = "SELECT * FROM trialEvents WHERE comp_id = ?";
    const insertSql = "INSERT INTO trialEvents (title, comp_id, company, date, eventType) VALUES (?, ?, ?, ?, ?)";
    const updateSql = "UPDATE trialEvents SET date = ? WHERE comp_id = ? AND title = ?";
    const updateCompanySql = "UPDATE lms_CourseCompany SET end_date = ? WHERE comp_id = ?";
    const updateEmployeeSql = "UPDATE lms_courseEmployee SET end_date = ? WHERE comp_id = ?";

    let promises = [];

    for (let i = 0; i < companyId?.length; i++) {
      promises.push(new Promise((resolve, reject) => {
        connection.query(selectSql, [companyId[i]], (selectErr, results) => {
          if (selectErr) {
            reject(selectErr);
          }

          if (results?.length == 0) {
            const sortedDate = eventDate[i].sort();
            connection.query(insertSql, [eventTitle[i], latestCompanyId[0], company[i], JSON.stringify(sortedDate), eventType[i]], (insertErr) => {
              if (insertErr) {
                reject(insertErr);
              } else {
                resolve();
              }
            });
          } else {
            const sortedDate = eventDate[i].sort();
            connection.query(updateSql, [JSON.stringify(sortedDate), companyId[i], eventTitle[i]], (updateErr) => {
              if (updateErr) {
                reject(updateErr);
              } else {
                resolve();
              }
            });
          }
        });
      }));
    }

    Promise.all(promises)
      .then(() => {
        const largestDates = [];

        for (let i = 0; i < companyId?.length; i++) {
          const currentCompanyId = companyId[i];
          const currentEventDate = eventDate[i];
          const sortedDate = currentEventDate.sort((a, b) => new Date(b) - new Date(a));
          largestDates.push({ id: currentCompanyId, date: sortedDate[0] });
        }

        let companyPromises = [];
        for (let i = 0; i < largestDates?.length; i++) {
          companyPromises.push(new Promise((resolve, reject) => {
            connection.query(updateCompanySql, [largestDates[i].date, largestDates[i].id], (updateErr) => {
              if (updateErr) {
                reject(updateErr);
              } else {
                resolve();
              }
            });
          }));
        }

        let employeePromises = [];
        for (let i = 0; i < largestDates?.length; i++) {
          employeePromises.push(new Promise((resolve, reject) => {
            connection.query(updateEmployeeSql, [largestDates[i].date, largestDates[i].id], (updateErr) => {
              if (updateErr) {
                reject(updateErr);
              } else {
                resolve();
              }
            });
          }));
        }

        Promise.all([...companyPromises, ...employeePromises]).then(() => {
            return res.json({ message: "done", success: true });
          }).catch((updateErr) => {
            console.error(updateErr);
            return res.json({ message: "Error updating lms_CourseCompany or lms_courseEmployee", error: updateErr, success: false });
          });
      })
      .catch((error) => {
        console.error("Error in calendarEvents:", error);
        return res.json({ message: "Error occurred", error: error, success: false });
      });

  } catch (error) {
    console.error("Error in calendarEvents:", error);
    return res.json({ message: "Error occurred", error: error, success: false });
  }
};

// --------------------------working
// const calendarEvents = (req, res) => {
//   try {
//     const { events } = req.body;
//     console.log("events", events);

//     if (!events || events?.length === 0) {
//       return res.json({ message: "No events provided", success: false });
//     }

//     const insertSql = "INSERT INTO trialEvents (title, comp_id, company, date, eventType) VALUES (?, ?, ?, ?, ?)";
//     const updateCompanySql = "UPDATE lms_CourseCompany SET end_date = ? WHERE comp_id = ?";
//     const updateEmployeeSql = "UPDATE lms_courseEmployee SET end_date = ? WHERE comp_id = ?";

//     let promises = [];

//     for (const event of events) {
//       const { title, companyId, company, date, eventType } = event;

     
//         promises.push(new Promise((resolve, reject) => {
//           connection.query(insertSql, [title, companyId, company, date, eventType], (err) => {
//             if (err) {
//               reject(err);
//             } else {
//               resolve();
//             }
//           });
//         }));
      
//     }

//     Promise.all(promises)
//       .then(() => {
//         let companyPromises = [];

//         for (const event of events) {
//           const { companyId, date } = event;
//           const latestDate = date.sort((a, b) => new Date(b) - new Date(a))[0];
//           companyPromises.push(new Promise((resolve, reject) => {
//             connection.query(updateCompanySql, [latestDate, companyId], (updateErr) => {
//               if (updateErr) {
//                 reject(updateErr);
//               } else {
//                 resolve();
//               }
//             });
//           }));
//         }

//         let employeePromises = [];

//         for (const event of events) {
//           const { companyId, date } = event;
//           const latestDate = date.sort((a, b) => new Date(b) - new Date(a))[0];
//           employeePromises.push(new Promise((resolve, reject) => {
//             connection.query(updateEmployeeSql, [latestDate, companyId], (updateErr) => {
//               if (updateErr) {
//                 reject(updateErr);
//               } else {
//                 resolve();
//               }
//             });
//           }));
//         }

//         Promise.all([...companyPromises, ...employeePromises])
//           .then(() => {
//             return res.json({ message: "done", success: true });
//           })
//           .catch((updateErr) => {
//             console.error(updateErr);
//             return res.json({ message: "Error updating lms_CourseCompany or lms_courseEmployee", error: updateErr, success: false });
//           });
//       })
//       .catch((error) => {
//         console.error("Error in calendarEvents:", error);
//         return res.json({ message: "Error occurred", error: error, success: false });
//       });

//   } catch (error) {
//     console.error("Error in calendarEvents:", error);
//     return res.json({ message: "Error occurred", error: error, success: false });
//   }
// };

const getCalendarEvents = async (req, res) => {
  try {
    // Fetch distinct dates from the table
    const distinctDatesQuery =
      "SELECT DISTINCT date, title,company, eventType FROM trialEvents";
    connection.query(
      distinctDatesQuery,
      (distinctDatesErr, distinctDatesResp) => {
        if (distinctDatesErr) {
          // return res.json({ message: "error occurred in distinct dates query", error: distinctDatesErr, success: false });
        }

        // Extract dates from the result
        const events = [];

        distinctDatesResp.forEach((row) => {
          const dates = JSON.parse(row.date);

          if (Array.isArray(dates)) {
            // If dates is an array, create an event for each date
            dates.forEach((date) => {
              const event = {
                id: new Date().getTime(), // Generate a unique ID
                title: row.title,
                company: row.company,
                date: new Date(date), // Format the date to Wed Jan 24 2024
                eventType: row.eventType,
              };
              events.push(event);
            });
          } else {
            // If dates is a single value, create an event with that date
            const event = {
              id: new Date().getTime(), // Generate a unique ID
              title: row.title,
              company: row.company,
              date: new Date(dates), // Format the date to Wed Jan 24 2024
              eventType: row.eventType,
            };
            events.push(event);
          }
        });
        // console.log("event",events);
        return res.json({ message: "success", data: events, success: true });
      }
    );
  } catch (error) {
    console.log("error", error);
    return res.json({
      message: "error occurred",
      error: error,
      success: false,
    });
  }
};

const getCalendarFutureEvents = async (req, res) => {
  try {
    // Fetch distinct dates from the table
    const distinctDatesQuery = "SELECT DISTINCT date, title,comp_id, company, eventType FROM trialEvents";
    connection.query(
      distinctDatesQuery,
      (distinctDatesErr, distinctDatesResp) => {
        if (distinctDatesErr) {
          return res.json({
            message: "error occurred in distinct dates query",
            error: distinctDatesErr,
            success: false,
          });
        }
        // console.log("distinctDatesRespdistinctDatesResp",distinctDatesResp);
        // Extract dates from the result
        const events = [];
        let eventIdCounter = 1;

        distinctDatesResp.forEach((row) => {
          const dates = JSON.parse(row.date);

          if (Array.isArray(dates)) {
            // If dates is an array, create an event for each date
            dates.forEach((date) => {
              const event = {
                id: new Date().getTime() + eventIdCounter++, // Generate a unique ID
                title: row.title,
                companyId: row.comp_id,
                company: row.company,
                date: new Date(date), // Format the date to Wed Jan 24 2024
                eventType: row.eventType,
              };
              // console.log("eventevent",new Date(event.date));
              events.push(event);
              // // Check if the event date is greater than or equal to today
              // if (event.date >= new Date()) {
              //   events.push(event); 
              // }
            });
          } else {
            // If dates is a single value, create an event with that date
            const event = {
              id: new Date().getTime() + eventIdCounter++, // Generate a unique ID
              title: row.title,
              companyId: row.comp_id,
              company: row.company,
              date: new Date(dates), // Format the date to Wed Jan 24 2024
              eventType: row.eventType,
            };

            // Check if the event date is greater than or equal to today
            if (event.date >= new Date()) {
              events.push(event);
            }
          }
        });
        // console.log("events",events);
        return res.json({ message: "success", data: events, success: true });
      }
    );
  } catch (error) {
    console.log("error", error);
    return res.json({
      message: "error occurred",
      error: error,
      success: false,
    });
  }
};

// ------------------------------------Working
// const getCalendarFutureEvents = async (req, res) => {
//   try {
//     // Fetch distinct dates from the table
//     const distinctDatesQuery =
//       "SELECT DISTINCT date, title, comp_id, company, eventType FROM trialEvents";
//     connection.query(
//       distinctDatesQuery,
//       (distinctDatesErr, distinctDatesResp) => {
//         if (distinctDatesErr) {
//           return res.json({
//             message: "error occurred in distinct dates query",
//             error: distinctDatesErr,
//             success: false,
//           });
//         }
        
//         // Extract dates from the result
//         const events = [];

//         distinctDatesResp.forEach((row) => {
//           const date = new Date(row.date);

//           if (isNaN(date.getTime())) {
//             console.error("Invalid date:", row.date);
//             return; // Skip this row if the date is invalid
//           }

//           const event = {
//             id: new Date().getTime() + events?.length + 1, // Generate a unique ID
//             title: row.title,
//             companyId: row.comp_id,
//             company: row.company,
//             date: date, // Format the date to Wed Jan 24 2024
//             eventType: row.eventType,
//           };

//           // Check if the event date is greater than or equal to today
//           if (event.date >= new Date()) {
//             events.push(event);
//           }
//         });

//         console.log("events", events);
//         return res.json({ message: "success", data: events, success: true });
//       }
//     );
//   } catch (error) {
//     console.log("error", error);
//     return res.json({
//       message: "error occurred",
//       error: error,
//       success: false,
//     });
//   }
// };

const updatedDateData = async (req, res) => {
  try {
    const events = req.body.data;
  
    if (!events || events?.length === 0) {
      return res.json({ message: "No events provided", success: false });
    }

    // Create an object to store new date arrays for each companyId
    const updatedDatesMap = {};

    for (let event of events) {
      // If the companyId is not already in the map, initialize it with an empty array
      if (!updatedDatesMap[event.companyId]) {
        updatedDatesMap[event.companyId] = [];
      }

      // Push the new date to the array
      updatedDatesMap[event.companyId].push(event.date);
    }

    // Iterate over the map and update the database
    for (const [companyId, dates] of Object.entries(updatedDatesMap)) {
      // Get the last date from the array
      const lastDate = dates[dates?.length - 1];

// console.log("lastDate",lastDate);
      // Update trialEvents table with the lastDate
     
      const updateEventSql = `UPDATE trialEvents SET date = ? WHERE comp_id = ?`;

      try {
        await new Promise((resolve, reject) => {
          connection.query(
            updateEventSql,
            [JSON.stringify(dates), companyId],
            async (err, updateResults) => {
              if (err) {
                console.log(err);
                reject(err);
              } else {
                resolve(updateResults);

                // Update the lms_CourseCompany table with the companyId and lastDate
              const updateCompanySql = `UPDATE lms_CourseCompany SET end_date = ? WHERE comp_id = ?`;

                try {
                  await new Promise((companyResolve, companyReject) => {
                    connection.query(
                      updateCompanySql,
                      [lastDate, companyId],
                      (companyErr, updateCompanyResults) => {
                        if (companyErr) {
                          console.log(companyErr);
                          companyReject(companyErr);
                        } else {
                          companyResolve(updateCompanyResults);
                        }
                      }
                    );
                  });
                } catch (companyError) {
                  console.error(
                    "Error updating lms_CourseCompany:",
                    companyError
                  );
                  return res.json({
                    message: "Error updating lms_CourseCompany",
                    error: companyError,
                    success: false,
                  });
                }

                // Update the lms_courseEmployee table with the companyId and lastDate
                const updateEmployeeSql = `UPDATE lms_courseEmployee SET end_date = ? WHERE comp_id = ?`;

                try {
                  await new Promise((employeeResolve, employeeReject) => {
                    connection.query(
                      updateEmployeeSql,
                      [lastDate, companyId],
                      (employeeErr, updateEmployeeResults) => {
                        if (employeeErr) {
                          console.log(employeeErr);
                          employeeReject(employeeErr);
                        } else {
                          employeeResolve(updateEmployeeResults);
                        }
                      }
                    );
                  });
                } catch (employeeError) {
                  console.error("Error updating lms_courseEmployee:",employeeError);
                  return res.json({
                    message: "Error updating lms_courseEmployee",
                    error: employeeError,
                    success: false,
                  });
                }
              }
            }
          );
        });
      } catch (error) {
        console.error("Error updating trialEvents:", error);
        return res.json({
          message: "Error updating trialEvents",
          error: error,
          success: false,
        });
      }
    }

    return res.json({ message: "done", success: true });
  } catch (error) {
    console.log("error", error);
    return res.json({
      message: "error occurred",
      error: error,
      success: false,
    });
  }
};

const updatedCompData = async (req, res) => {
  try {
    const events = req.body.data;

    if (!events || events?.length === 0) {
      return res.json({ message: "No events provided", success: false });
    }

    const updatedDatesMap = {}
    
    for (let event of events) {
      // If the companyId is not already in the map, initialize it with an empty array
      if (!updatedDatesMap[event.companyId]) {
        updatedDatesMap[event.companyId] = [];
      }
      updatedDatesMap[event.companyId].push(event.date);
    }
    for (const [companyId, dates] of Object.entries(updatedDatesMap)) {
      const updateSql = `UPDATE trialEvents SET date = ? WHERE comp_id = ?`;
      try {
        await new Promise((resolve, reject) => {
          connection.query(
            updateSql,
            [JSON.stringify(dates), companyId],
            async (err, results) => {
              if (err) {
                console.log(err);
                reject(err);
              } else {
                resolve(results);
                const updateCompanySql = `UPDATE lms_CourseCompany SET end_date = ? WHERE comp_id = ?`;

                try {
                  await new Promise((companyResolve, companyReject) => {
                    connection.query(
                      updateCompanySql,
                      [dates[dates?.length - 1], companyId],
                      (companyErr, updateCompanyResults) => {
                        if (companyErr) {
                          console.log(companyErr);
                          companyReject(companyErr);
                        } else {
                          companyResolve(updateCompanyResults);
                        }
                      }
                    );
                  });
                } catch (companyError) {
                  console.error(
                    "Error updating lms_CourseCompany:",
                    companyError
                  );
                  return res.json({
                    message: "Error updating lms_CourseCompany",
                    error: companyError,
                    success: false,
                  });
                }
              }
            }
          );
        });
      } catch (error) {
        console.error("Error updating event:", error);
        return res.json({
          message: "Error updating events",
          error: error,
          success: false,
        });
      }
    }

    return res.json({ message: "done", success: true });
  } catch (error) {
    console.log("error", error);
    return res.json({
      message: "error occurred",
      error: error,
      success: false,
    });
  }
};

const setEvent = async (req, res) => {
  try {
    const event = req.body.event;
    if (event?.length === 0) {
      return res.status(400).json({ message: "No event data provided" });
    }
    const data = event[0];
    const comp = data.company;
    const comp_id = data.companyId;
    const date = new Date(data.date);

    const currentDate = new Date();
    const oneDayAhead = new Date(currentDate);
    oneDayAhead.setDate(oneDayAhead.getDate() + 1);

    if (date <= currentDate || date > oneDayAhead) {
      return res.status(400).json({ message: "Event date is not valid" });
    }

    const formattedDate = date.toISOString().slice(0, 19).replace("T", " ");

    const checkIfExistsQuery = "SELECT * FROM lms_latestEvents WHERE comp_id = ? AND date = ?";
    connection.query(
      checkIfExistsQuery,
      [comp_id, formattedDate],
      (checkErr, checkResult) => {
        if (checkErr) {
          console.error(checkErr);
          return res.status(500).json({ message: "Fatal Error" });
        }

        if (checkResult?.length > 0) {
          // Row with the same company and date exists, return a message
          return res.status(400).json({
            message: "Event for the same company and date already exists",
          });
        } else {
          // Row does not exist, insert a new row
          const insertQuery =
            "INSERT INTO lms_latestEvents (comp_name, comp_id, date) VALUES (?, ?, ?)";
          connection.query(
            insertQuery,
            [comp, comp_id, formattedDate],
            (insertErr, insertResult) => {
              if (insertErr) {
                console.error(insertErr);
                return res.status(500).json({ message: "Fatal Error" });
              }
              return res.status(200).json({ message: "Event inserted successfully" });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


// ----------------------------------Working Important Api--------


// const startDateAndEndDateOfCourseCompany = async (req, res) => {
//   try {
//     const companies = req.body.comp_names; // Assuming companies is an array of objects with companyId and companyName
//     console.log("companies", companies);
//     if (!companies || companies?.length === 0) {
//       return res.json({ message: "Error", success: false });
//     }
//     // console.log("company",company);
//     const results = [];
//     let date = []
//     // Iterate through each company object
//     // console.log("companies.companyId]", companies.companyId);
//     for (const company of companies) {
//       const sql =
//         "SELECT date FROM trialEvents WHERE comp_id = ?";
//       const resp = await new Promise((resolve, reject) => {
//         connection.query(sql, [company.companyId], (err, resp) => {
//           if (err) {
//             console.log("err", err);
//             reject(err);
//           }
//           console.log("respresp", resp);
//           resolve(resp);
//         });
//       });
//       resp.map((v) => {
//         date.push(v)
//       })

//       let sortedDate = date.sort((a, b) => {
//         return new Date(a) - new Date(b)
//       })
//       console.log("sortedDate", sortedDate);
//       const firstDate = sortedDate[0];
//       const endDate = sortedDate[sortedDate?.length - 1];
//       console.log("firstDate", firstDate.date);
//       console.log("endDate", endDate);
//       const formattedFirstDate = new Date(firstDate.date).toLocaleDateString("en-GB");
//       const formattedEndDate = new Date(endDate.date).toLocaleDateString("en-GB");
//       results.push({
//         companyId: company.companyId,
//         companyName: company.companyName,
//         firstDate: formattedFirstDate,
//         endDate: formattedEndDate,
//       });

//     }





//     res.json({ message: "Success", data: results, success: true });
//   } catch (error) {
//     console.log("error", error);
//     res.json({ message: "Error", error: error.message, success: false });
//   }
// };



// ---------------------------------Course Management-----------------------------------------------





// const tnaEvaluation = async (req, res) => {
//   const comp_id = req.params.comp_id;

//   if (!comp_id) {
//     return res.json({ message: "Company ID is not given", success: false });
//   }

//   // Check if the company exists
//   let q = "SELECT emp_id FROM lms_TNA_Employee_Answers WHERE comp_id = ?";
//   connection.query(q, [comp_id], (err, resp1) => {
//     if (err) {
//       return res.json({
//         message: "Error getting company data",
//         success: false,
//       });
//     } else {
//       if (resp1?.length <= 0) {
//         return res.json({ message: "This company's employees haven't submitted tna", success: false });
//       } else {
//         // If the company exists, proceed to query employee data
//         const employeeDataPromises = resp1.map((row) => {
//           return new Promise((resolve, reject) => {
//             const sql = "SELECT id, emp_name, emp_email, tna_link FROM lms_employee WHERE id = ?";
//             connection.query(sql, [row.emp_id], (err, resp2) => {
//               if (err) {
//                 console.log(err);
//                 reject(err);
//               } else {
//                 resolve(resp2[0]); // Return only the first element of the array
//               }
//             });
//           });
//         });

//         Promise.all(employeeDataPromises)
//           .then((employeeData) => {
//             return res.json({ message: "Success", data: employeeData, success: true });
//           })
//           .catch((error) => {
//             return res.json({ message: "Failed", error: error, success: false });
//           });
//       }
//     }
//   });
// };



const startDateAndEndDateOfCourseCompany = async (req, res) => {
  try {
    const companies = req.body.comp_names;
    
    if (!companies || companies?.length === 0) {
      return res.json({ message: "Not having enough data", success: false });
    }

    const results = [];
    let processedCount = 0;

    for (const company of companies) {
      const sql ="SELECT MIN(date) as startDate, MAX(date) as endDate FROM trialEvents WHERE comp_id = ?";
      connection.query(sql, [company.companyId], (err, resp) => {
        if (err) {
          console.log("err", err);
          return res.json({message: "Fatal error",error: err,success: false,});
        }

        if (resp?.length > 0) {
          const { startDate } = resp[0];
          const nDate = JSON.parse(startDate);

          // Check if nDate is an array
          if (Array.isArray(nDate)) {
            // Sort the event dates in ascending order
            const sortedArray = nDate.sort((a, b) => new Date(a) - new Date(b));
            const firstDate = new Date(sortedArray[0]);
            const endDate = new Date(sortedArray[sortedArray?.length - 1]);

            // Increment the first date by one day
            const increasedFirstDate = new Date(firstDate);
            increasedFirstDate.setDate(increasedFirstDate.getDate());

            // Format the dates as dd-mm-yy
            const formattedFirstDate = increasedFirstDate.toLocaleDateString("en-GB");
            const formattedEndDate = endDate.toLocaleDateString("en-GB");

            results.push({
              companyId: company.companyId,
              companyName: company.companyName,
              firstDate: formattedFirstDate,
              endDate: formattedEndDate,
            });
          } else {
            // Handle the case where startDate is not an array
            results.push({
              companyId: company.companyId,
              companyName: company.companyName,
              firstDate: null,
              endDate: null,
            });
          }
        } else {
          // If no records are found for the company, you can handle it accordingly
          results.push({
            companyId: company.companyId,
            companyName: company.companyName,
            firstDate: null,
            endDate: null,
          });
        }

        // Increment the processedCount
        processedCount++;

        // If all companies are processed, send the results back
        if (processedCount === companies?.length) {
          res.json({ message: "Success", data: results, success: true });
        }
      });
    }
  } catch (error) {
    console.log("error", error);
    res.json({ message: "Error", error: error.message, success: false });
  }
};


// ----------------------------------------Module-----------------------------


const createM = async (req, res) => {
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

const getCourseData = async (req, res) => {
  try {
    const sql = "SELECT * FROM lms_Module";
    connection.query(sql, (err, resp) => {
      if (err) {
        console.log("err", err);
        return res.json({message: "Error in query",error: err,
          success: false,
        });
      }
      // console.log("resp",resp[0]);
      return res.json({ message: "done", data: resp, success: true });
    });
  } catch (error) {
    console.log("error", error);
    return res.json({ message: "Internal Server Error", error: error });
  }
};

const getModuleData = async (req, res) => {
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
    return res.json({ message: "Internal Server Error", error: error });

  }
};


const updateCourseModule = async (req, res) => {
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

      return res.json({message: "Update is Successful",data: resp,success: true});
    });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};

const getModule = async(req,res)=>{
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
    return res.status(500).json({ message: "Internal Server Error", success: false });

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

// --------------------------------------Lesson----------------------

const createModule = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    const { lesson_name } = req.body;
    if(!module_id||!lesson_name){
      return res.json({message:"Module id Or Lesson Name is not provided",success:false})
    }
    const sql ="INSERT INTO lms_lessons (lesson_name, module_id) VALUES (?, ?)";
    connection.query(sql, [lesson_name, module_id], (err, resp) => {
      if (err) {
        console.log("err", err);
        return res.json({
          message: "Error in query",
          error: err,
          success: false,
        });
      }

      return res.json({
        message: "Success",
        success: true,
        data: resp.insertId,
      });
    });
  } catch (error) {
    console.log("Error in server", error);
    return res.json({
      message: "Internal Server Error",
      error: error,
      success: false,
    });
  }
};

const createModuleAndUploadVideos = async (req, res) => {
  
  // ------------------------------Need to change api name ------------------

  try {
    const module_id = req.params.module_id;
    const lessonName = req.body.lessonName;
    const lessonDescription = req.body.lessonDescription;
    const videodescription = req.body.description;
    if(!module_id|| !lessonName||!lessonDescription||! videodescription){
      return res.json({message:" Suffecient data not provided",success:false})
    }
    const createModuleSQL = "INSERT INTO lms_lessons (lesson_name, lesson_description, module_id) VALUES (?, ?, ?)";
    connection.query(
      createModuleSQL,
      [lessonName, lessonDescription, module_id],
      async (errModule, respModule) => {
        if (errModule) {
          console.log("Error in creating module", errModule);
          return res.json({
            message: "Error in creating module",
            error: errModule,
            success: false,
          });
        }

        const lesson_id = respModule.insertId;

        const videos = req.files;

        for (let i = 0; i < videos?.length; i++) {
          const video = videos[i];
          const file = video.originalname;
          const video_description = videodescription[i];

          await connection.query(
            "INSERT INTO lms_CourseVideo (video, video_description, lesson_id, module_id) VALUES (?, ?, ?, ?)",
            [file, video_description, lesson_id, module_id]
          );
        }

        const countVideosSQL = "SELECT COUNT(*) AS count FROM lms_CourseVideo WHERE lesson_id = ?";
        connection.query(
          countVideosSQL,
          [lesson_id],
          async (errCount, respCount) => {
            if (errCount) {
              return res.json({
                message: "Query error while counting videos",
                error: errCount,
              });
            }

            const videoCount = respCount[0].count;

            const updateVideoCountSQL =
              "UPDATE lms_lessons SET number_of_videos = ? WHERE id = ?";
            connection.query(
              updateVideoCountSQL,
              [videoCount, lesson_id],
              (errUpdate, respUpdate) => {
                if (errUpdate) {
                  return res.json({
                    message: "Query error while updating number_of_videos",
                    error: errUpdate,
                  });
                }

                return res.status(200).json({
                  message: "Module and videos uploaded successfully",
                  lesson_id,
                  number_of_videos: videoCount,
                  success: true,
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error("Error in createModuleAndUploadVideos API:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateModuleAndVideo = async (req, res) => {
  try {
    const lesson_id = req.params.lesson_id;
    const video_id = req.params.video_id;
    const { lesson_name, lesson_description, video_name, video_description } = req.body;

    if (!lesson_name && !lesson_description && !video_name && !video_description) {
      return res.json({
        message: "Nothing is provided for update",
        success: false,
      });
    }

    // Build the SET part of the SQL query dynamically based on provided values
    let setClause = "";
    const values = [];

    if (lesson_name) {
      setClause += "v = ?, ";
      values.push(lesson_name);
    }

    if (lesson_description) {
      setClause += "lesson_description = ?, ";
      values.push(lesson_description);
    }

    if (video_name) {
      setClause += "video_name = ?, ";
      values.push(video_name);
    }

    if (video_description) {
      setClause += "video_description = ?, ";
      values.push(video_description);
    }

    // Remove the trailing comma and space from setClause
    setClause = setClause.replace(/, $/, "");

    // Choose the appropriate table based on the presence of video_id
    const tableName = video_id ? "lms_CourseVideo" : "lms_lessons";

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${video_id ? "module_id" : "id"
      } = ?`;

    // Add module_id or video_id to values array based on the table
    values.push(video_id ? lesson_id : video_id);

    connection.query(sql, values, (err, resp) => {
      if (err) {
        console.log("err", err);
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

const getModuleInfo = async (req, res) => {
  try {
    const sql = "SELECT * FROM lms_lessons";
    connection.query(sql, (err, resp) => {
      if (err) {
        console.log("err in query", err);
      }
      // console.log("data",resp);
      return res.json({ message: "Done", data: resp });
    });
  } catch (error) {
    console.log("error", error);
    return res
    .status(500)
    .json({ message: "Internal Server Error", error:error,success: false });
  }
};

const createModuleAndUploadVideosAssesment = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    const lessonName = req.body.lessonName;
    const lessonDescription = req.body.lessonDescription;
    const videodescription = req.body.description;
    if(!module_id || !lessonName||!lessonDescription||! videodescription){
      return res.json({message:"Module id,lesson name ,lesson description or video description is not provided",success:false})
    }

    // console.log("videodescription", videodescription);
    // console.log("req.files.nonGraded[0]", req.files);
    // console.log("body", req.body);

    const createLessonSQL ="INSERT INTO lms_lessons (lesson_name, lesson_description, module_id) VALUES (?, ?, ?)";

    connection.query(
      createLessonSQL,
      [lessonName, lessonDescription, module_id],
      async (errLesson, respLesson) => {
        if (errLesson) {
          console.log("Error in creating module", errLesson);
          return res.json({
            message: "Error in creating module",
            error: errLesson,
            success: false,
          });
        }
        const lesson_id = respLesson.insertId;
        const videos = req.files.file;
        if (videos?.length <= 1) {
          const video = videos[0];
          const file = video.originalname;
          const video_description = videodescription;
        
          await connection.query(
            "INSERT INTO lms_CourseVideo (video, video_description, lesson_id, module_id) VALUES (?, ?, ?, ?)",
            [file, video_description, lesson_id, module_id]
          );
        } else {
          for (let i = 0; i < videos?.length; i++) {
            const video = videos[i];
            // console.log("video", video);
            const file = video.originalname;
            const video_description = videodescription[i];
            // console.log("enterVideo");
            await connection.query(
              "INSERT INTO lms_CourseVideo (video, video_description, lesson_id, module_id) VALUES (?, ?, ?, ?)",
              [file, video_description,lesson_id, module_id]
            );
          }
        }

        const countVideosSQL = "SELECT COUNT(*) AS count FROM lms_CourseVideo WHERE lesson_id = ?";
        connection.query(countVideosSQL,[lesson_id],async (errCount, respCount) => {
            if (errCount) {
              return res.json({
                message: "Query error while counting videos",
                error: errCount,
              });
            }

            const videoCount = respCount[0]?.count;

            const updateVideoCountSQL ="UPDATE lms_lessons SET number_of_videos = ? WHERE id = ?";
            connection.query(updateVideoCountSQL,[videoCount, lesson_id],
              async (errUpdate, respUpdate) => {
                if (errUpdate) {
                  console.log("hello Error in query");
                  return res.json({
                    message: "Query error while updating number_of_videos",
                    error: errUpdate,
                  });
                }
                // console.log("respUpdate", respUpdate);
                if (!req.files.nonGraded) {
                  return res.json({
                    status: 202,
                    success: true,
                    module_id,
                    number_of_videos: videoCount,
                    success: true,
                  });
                }
                const filedata = req.files.nonGraded[0];
                const filepath = filedata.path;

                let count = 0;
                const category_id = 1;
                const category = "MCQ";
                const response = await csv().fromFile(filepath);
                const dataArray = Array.isArray(response)
                  ? response
                  : [response];

                for (const item of dataArray) {
                  // console.log("item",item);
                  count++;
                  const query = `INSERT INTO lms_CourseNonGradedAssessment (lesson_id,module_id,questions, options, correctAnswer,category_id,category) VALUES (?,?,?, ?, ?,?,?)`;

                        const optionsArray = [];
                        if (item["Option A"]) optionsArray.push(item["Option A"].trim());
                        if (item["Option B"]) optionsArray.push(item["Option B"].trim());
                        if (item["Option C"]) optionsArray.push(item["Option C"].trim());
                        if (item["Option D"]) optionsArray.push(item["Option D"].trim());
                  
                        const correctAnswer = item.CorrectAnswer.trim();
                  // console.log(" item.CorrectAnswer", item.CorrectAnswer);
                  // console.log("correctAnswer",correctAnswer);

                  connection.query(query, [
                    lesson_id,
                    module_id,
                    item.Questions,
                    JSON.stringify(optionsArray), // Assuming you want to store options as JSON string
                    correctAnswer,
                    category_id,
                    category,
                  ]);
                }

                return res.json({
                  status: 202,
                  success: true,
                  msg: "File imported successfully",
                  total_no_of_question_upoaded: count,
                  module_id,
                  number_of_videos: videoCount,
                  success: true,
                });
              }
            );
          }
        );
      }
    );

    // Non-graded assessment logic
  } catch (error) {
    console.error("Error in createModuleAndUploadVideosAssesment API:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateModule = async (req, res) => {
  try {
    const lesson_id = req.params.lesson_id;
    const lesson_name = req.body.lesson_name;
    const lesson_description = req.body.lesson_description;
    // console.log("lesson_description", lesson_description);
    if (!lesson_id||!lesson_name || !lesson_description) {
      return res.json({
        message: "Nothing is provided for update",
        success: false,
      });
    }

    let setClause = "";
    const values = [];

    if (lesson_name) {
      setClause += "lesson_name = ?, ";
      values.push(lesson_name);
    }

    if (lesson_description) {
      setClause += "lesson_description = ?, ";
      values.push(lesson_description);
    }

    // Remove the trailing comma and space from setClause
    setClause = setClause.replace(/, $/, "");

    const sql = `UPDATE lms_lessons SET ${setClause} WHERE id = ?`;

    // Add module_id to values array
    values.push(lesson_id);

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

const getModuleById = async (req, res) => {
  try {
    const lesson_id = req.params.lesson_id;
    if(!lesson_id){
      return res.json({message:"Lesson id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_lessons WHERE id = ?";
    connection.query(sql, [lesson_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal error", error: err, success: false });
      }
      return res.json({ message: "success", success: true, data: resp[0] });
    });
  } catch (error) {
    return res.json({ message: "Internal server Error", error: error });
  }
};


// -------------------------------------Videos-----------------------------

const videoUpload = async (req, res) => {
  try {
    const lesson_id = req.params.lesson_id;
    if(!lesson_id){
      return res.json({message:"Lesson id is not provided",success:false})
    }
    const files = Array.isArray(req.files) ? req.files : [req.files];
    if(!files){
      return res.json({message:"File is not provided",success:false})
    }
    // Fetch the course_id for the given module_id
    const cor = "SELECT module_id FROM lms_lessons WHERE id = ?";
    connection.query(cor, [lesson_id], async (err, resp) => {
      if (err) {
        return res.json({
          message: "Fatal Error",
          error: err,
          success: false,
        });
      }
      // console.log("resp", resp);
      const module_id = resp[0].module_id;

      // Use a loop to process each file and its corresponding description
      for (let i = 0; i < files?.length; i++) {
        const file = files[i];
        const video_description = req.body[`description_${i}`];

        // Insert the video data into the lms_CourseVideo table
        await connection.query("INSERT INTO lms_CourseVideo (video, video_description, lesson_id, module_id) VALUES (?, ?, ?, ?)",
          [file.filename, video_description, lesson_id, module_id]
        );
      }

      // Count the number of videos for the given module_id
      const countVideosSQL ="SELECT COUNT(*) AS count FROM lms_CourseVideo WHERE lesson_id = ?";
      connection.query(countVideosSQL, [lesson_id], async (err, respp) => {
        if (err) {
          return res.json({message: "Fatal error",error: err,success: false,});
        }

        const videoCount = respp[0].count;

        // Update number_of_videos in lms_lessons
        const updateVideoCountSQL = "UPDATE lms_lessons SET number_of_videos = ? WHERE id = ?";
        await connection.query(updateVideoCountSQL, [videoCount, lesson_id]);

        return res
          .status(200)
          .json({ message: "Videos uploaded successfully", success: true });
      });
    });
  } catch (error) {
    console.error("Error in videoUpload API:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getVideoByModuleId = async (req, res) => {
  try {
    const lesson_id = req.params.lesson_id;
    if(!lesson_id){
      return res.json({message:"lesson id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_lessons WHERE id=?";
    connection.query(sql, [lesson_id], (err, lessonResp) => {
      if (err) {
        console.log("err", err);
        return res.json({
          message: "Error in module query",
          success: false,
          error: err,
        });
      }

      const videoQuery =
        "SELECT id,video,video_description,lesson_id FROM lms_CourseVideo WHERE lesson_id = ?";
      connection.query(videoQuery, [lesson_id], (err, resp) => {
        if (err) {
          console.log("err in video query", err);
          return res.json({
            message: "Error in video query",
            success: false,
            error: err,
          });
        }

        return res.json({
          message: "success",
          data: { lesson: lessonResp, video: resp },
          success:true
        });
      });
    });
  } catch (error) {
    console.log("Internal server Error ", error);
    return res.json({
      message: "Internal Server error",
      success: false,
      error: error,
    });
  }
};

const updateVideo = async (req, res) => {
  try {
    const video_id = req.params.video_id;
    const { video_name, video_description } = req.body;
    if (!video_id) {
      return res.json({ message: "Invalid video_id provided", success: false });
    }
    if (!video_name && !video_description) {
      return res.json({
        message: "Nothing is provided for update",
        success: false,
      });
    }
    let setClause = "";
    const values = [];
    if (video_name) {
      setClause += "video = ?, ";
      values.push(video_name);
    }
    if (video_description) {
      setClause += "video_description = ?, ";
      values.push(video_description);
    }
    setClause = setClause.replace(/, $/, "");
    const sql = `UPDATE lms_CourseVideo SET ${setClause} WHERE id = ?`;
    values.push(video_id);
    connection.query(sql, values, (err, resp) => {
      if (err) {
        console.log("err", err);
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

const deleteVideo = async (req, res) => {
  try {
    const lesson_id = req.params.lesson_id;
    const id = req.body.id;
    // console.log("id", id);
    // console.log("lesson_id",lesson_id);
    if(!lesson_id){
      return res.json({message:"Lesson id is not provided",success:false})
    }
    // Assuming your table is named lms_CourseVideo
    const deleteVideoSQL = "DELETE FROM lms_CourseVideo WHERE  id = ?";

    await connection.query(deleteVideoSQL, [id], (err, result) => {
      if (err) {
        console.error("Error deleting video:", err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
      // console.log("result", result);
      const deletedRows = result.affectedRows;
      // console.log("deletedRows", deletedRows);
      if (deletedRows > 0) {
        // console.log("Video deleted successfully");
        const countVideosSQL ="SELECT COUNT(*) AS count FROM lms_CourseVideo WHERE lesson_id = ?";
        connection.query(countVideosSQL, [lesson_id], (err, respp) => {
          if (err) {
            return res.json({message: "Fatal error", error: err, success: false,});
          }
          // console.log("respp",respp);
          const videoCount = respp[0].count;
        
          const updateVideoCountSQL ="UPDATE lms_lessons SET number_of_videos = ? WHERE id = ?";
          connection.query(updateVideoCountSQL,[videoCount, lesson_id],(err, resp) => {
              if (err) {
                return res.json({ message: "Fatal Error", error: err });
              }
              return res.status(200).json({ success: true, message: "Video deleted" });
            }
          );
        });
      } else {
        // console.log("Video not found or could not be deleted");
        return res.status(404).json({
          success: false,
          message: "Video not found or could not be deleted",
        });
      }
    });
  } catch (error) {
    console.error("Error in deleteVideo API:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ---------------------------------------Graded MCQ-------------------------------

// const uploadGradedAssesmentMCQ = async (req, res) => {
//   try {
//     const module_id = req.params.module_id;

//     if (!module_id) {
//       return res
//         .status(400)
//         .json({ success: false, message: "module_id is not provided" });
//     }
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file uploaded" });
//     }

//     const filePath = req.file.path;
//     const category_id = 1;
//     const category = "MCQ";
//     const response = await csv().fromFile(filePath);

//     let count = 0;

//     for (const item of response) {
//       // console.log("item",item);
//       count++;
//       const query = `
//             INSERT INTO lms_CourseGradedAssessmentMCQ (module_id,type,questions, options, correctAnswer,category_id,category)
//             VALUES (?,?, ?,?, ?,?,?)
//           `;

//       const optionsArray = item.Options.split(",").map(option => option.trim());
//       connection.query(query, [
//         module_id,
//         item.Type,
//         item.Questions,
//         JSON.stringify(optionsArray), // Assuming you want to store options as JSON string
//         item.CorrectAnswer,
//         category_id,
//         category,
//       ]);
//     }
// const updateSql = `UPDATE  lms_Module SET isGraded = 1 WHERE id = ${module_id}`
// const result = await queryPromiseWithAsync(updateSql)
//     return res.json({
//       status: 202,
//       success: true,
//       message: "File imported successfully",
//       total_no_of_question_upoaded: count,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(400).json({
//       message: error,
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };


const uploadGradedAssesmentMCQ = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if (!module_id) {
      return res.status(400).json({ success: false, message: "module_id is not provided" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (req.file.mimetype !== 'text/csv') {
      return res.status(400).json({ success: false, message: "File must be in CSV format" });
    }

    const filePath = req.file.path;
    const category_id = 1;
    const category = "MCQ";
    const response = await csv().fromFile(filePath);

    let count = 0;

    for (const item of response) {
      count++;
      const optionsArray = [];
      if (item["Option A"]) optionsArray.push(item["Option A"].trim());
      if (item["Option B"]) optionsArray.push(item["Option B"].trim());
      if (item["Option C"]) optionsArray.push(item["Option C"].trim());
      if (item["Option D"]) optionsArray.push(item["Option D"].trim());

      const correctAnswer = item.CorrectAnswer.trim();
      
      const query = `
        INSERT INTO lms_CourseGradedAssessmentMCQ (module_id, type, questions, options, correctAnswer, category_id, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      try {
        await queryPromiseWithAsync(query, [
          module_id,
          item.Type,
          item.Questions,
          JSON.stringify(optionsArray), // Assuming you want to store options as JSON string
          correctAnswer,
          category_id,
          category,
        ]);
      } catch (error) {
        console.error("Error inserting data:", error);
        // Log the error and continue with the next item
        continue;
      }
    }

    // Update module status
    const updateSql = `UPDATE lms_Module SET isGraded = 1 WHERE id = ?`;
    await queryPromiseWithAsync(updateSql, [module_id]);

    return res.status(200).json({
      success: true,
      message: "File imported successfully",
      total_no_of_question_uploaded: count,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getGradedMcq = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if(!module_id){
      return res.json({message:"Module id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE module_id";
    connection.query(sql, [module_id], (err, resp) => {
      if (err) {
        console.log(err);
        return res.json({ message: "Query Error", success: false, error: err });
      }
      const count = resp?.length;
      return res.json({
        message: "data",
        count: count,
        questions: resp,
        success: true,
      });
    });
  } catch (error) {
    console.log("errr", error);
    return res.json({
      message: "Internal Server Error",
      success: false,
      error: error,
    });
  }
};

const updateGradedMCQquestionsById = async (req, res) => {
  try {
    const id = req.params.question_id;
    if(!id){
      return res.json({message:" id are not provided",success:false})
    }
    const { questions, options, correctAnswer, type } = req.body;
    // console.log("type",questions);
    // Check if at least one of the fields is provided
    if (!questions && !options && !correctAnswer && !type) {
      return res.json({
        message: "No fields provided for update",
        success: false,
      });
    }

    // Parse the options string into a JavaScript array
    const parsedOptions = JSON.parse(options);

    const updateFields = [];
    const params = [];

    if (questions) {
      updateFields.push("questions = ?");
      params.push(questions);
    }
    if (type) {
      updateFields.push("type = ?");
      params.push(type);
    }

    if (options) {
      updateFields.push("options = ?");
      params.push(JSON.stringify(parsedOptions));
    }

    if (correctAnswer) {
      updateFields.push("correctAnswer = ?");
      params.push(correctAnswer);
    }

    const updateSql = `UPDATE lms_CourseGradedAssessmentMCQ SET ${updateFields.join(
      ","
    )} WHERE id = ?`;
    params.push(id);

    connection.query(updateSql, params, (err, result) => {
      if (err) {
        console.error("Error updating MCQ questions:", err);
        return res.json({
          message: "Error updating MCQ questions",
          success: false,
        });
      }

      if (result.affectedRows > 0) {
        return res.json({
          message: "MCQ questions updated successfully",
          success: true,
        });
      } else {
        return res.json({ message: "MCQ questions not found", success: false });
      }
    });
  } catch (error) {
    console.error("Error in updateMCQquestionsById:", error);
    return res.json({ message: "Internal server error", success: false });
  }
};

const getGradedAssessmentByModuleId = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if(!module_id){
      return res.json({message:"Module id is not provided",success:false})
    }
    const sql ="SELECT id,questions  FROM lms_CourseGradedAssessmentMCQ WHERE module_id = ?";
    const result = await queryPromiseWithAsync(sql,module_id)
    if (result.length<=0) {
      return res.json({ message: "Not found", success: false });
    }
    return res.json({ message: "Success", data: result, success: true });
  } catch (error) {
    return res.json({message: "Internal server Error",error: error,success: false});
  }
};

const getGradedassesmentMcqByQuestionId = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    if(!question_id){
      return res.json({message:"question Id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE id =?";
    const result = await queryPromiseWithAsync(sql,question_id)
    if (result.length<=0) {
      return res.json({ message: "Not found", success: false });
    }
    return res.json({ message: "Success", success: true, data: result[0] });
  } catch (error) {
    return res.json({ message: "Internal server Error",success: false,error: error});
  }
};

const deleteCourseMcq = async(req,res)=>{
  try {
    const id = req.params.id
    const getQuerry = 'SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE id = ? AND finalAssessmentStatus = 0 ?'
    const result = await queryPromiseWithAsync(getQuerry,id)
    if(result.length<=0){
    return res.json({message:"Deletion unsuccessfull",success:false})
    }
    const deleteQuery = 'DELETE FROM lms_CourseGradedAssessmentMCQ WHERE id = ?';
    await queryPromiseWithAsync(deleteQuery, [id]);
    return res.json({message:"Deletion successfull",success:true})
  } catch (error) {
    return res.json({message:"Internal Server error",success:false,error:error})

  }
}

// ----------------------------------------Graded Other------------------------------
const getGradedAssessmentAllQuestionCourseId = async (req, res) => {
  try {
    const sql ="SELECT module_id, COUNT(*) AS questionCount FROM lms_CourseGradedAssessmentMCQ GROUP BY module_id";

      const mcqResult = await queryPromiseWithAsync(sql)
      const sqlOtherQuestions =  "SELECT module_id, COUNT(*) AS questionCount FROM lms_GradedAssementOtherQuestions GROUP BY module_id";

      const otherQuestionResult = await queryPromiseWithAsync(sqlOtherQuestions)
      const data = {mcq:mcqResult,other:otherQuestionResult}
      return res.json({ message: "Success", data: data, success: true });
  } catch (error) {
    return res.json({message: "Internal server Error",error: error,success: false,
    });
  }
};

// const UploadGradedEmailAndTextQuestion = async (req, res) => {
//   try {
//     const module_id = req.params.module_id;
//     if (!module_id) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Course id doesnot provided" });
//     }
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file uploaded" });
//     }

//     const filePath = req.file.path;
//     let count = 0;
//     const response = await csv().fromFile(filePath);

//     for (const item of response) {
//       // Map the category to category_id
//       const categoryId =
//         item.Category.toLowerCase() === "email"
//           ? 3
//           : item.Category.toLowerCase() === "text"
//             ? 2
//             : item.Category.toLowerCase() === "audio"
//               ? 4
//               : null;
//       const category =
//         item.Category.toLowerCase() === "email"
//           ? "Email"
//           : item.Category.toLowerCase() === "text"
//             ? "Text"
//             : item.Category.toLowerCase() === "audio"
//               ? "Audio"
//               : null;

//       // Check if a valid category is found
//       if (categoryId !== null || category !== null) {
//         count++;
//         const query = `
//                     INSERT INTO lms_GradedAssementOtherQuestions (module_id,category,category_id, topic)
//                     VALUES (?,?,?, ?)
//                 `;

//         // Assuming you have a MySQL connection object named 'connection'
//         await connection.query(query, [
//           module_id,
//           category,
//           categoryId,
//           item.Topics,
//         ]);
//       }
//     }
//     const updateSql = `UPDATE lms_Module  SET isGraded = 1 WHERE id = ${module_id}`
// const result = await queryPromiseWithAsync(updateSql)
//     return res.json({
//       status: 202,
//       success: true,
//       message: "File imported successfully",
//       total_question: count,
//     });
//   } catch (error) {
//     console.log("Error in emailAndTextQuestionUpload:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

const UploadGradedEmailAndTextQuestion = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if (!module_id) {
      return res.status(400).json({ success: false, message: "Course id is not provided" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (req.file.mimetype !== 'text/csv') {
      return res.status(400).json({ success: false, message: "File must be in CSV format" });
    }

    const filePath = req.file.path;
    let count = 0;
    const response = await csv().fromFile(filePath);

    for (const item of response) {
      // Map the category to category_id
      const categoryId =
        item.Category.toLowerCase() === "email"
          ? 3
          : item.Category.toLowerCase() === "text"
            ? 2
            : item.Category.toLowerCase() === "audio"
              ? 4
              : null;
      const category =
        item.Category.toLowerCase() === "email"
          ? "Email"
          : item.Category.toLowerCase() === "text"
            ? "Text"
            : item.Category.toLowerCase() === "audio"
              ? "Audio"
              : null;

      // Check if a valid category is found
      if (categoryId !== null && category !== null) {
        count++;
        const query = ` INSERT INTO lms_GradedAssementOtherQuestions (module_id, category, category_id, topic) VALUES (?, ?, ?, ?)`;

        // Assuming you have a MySQL connection object named 'connection'
        await queryPromiseWithAsync(query, [
          module_id,
          category,
          categoryId,
          item.Topics,
        ]);
      }
    }

    // Update module status
    const updateSql = `UPDATE lms_Module SET isGraded = 1 WHERE id = ?`;
    await queryPromiseWithAsync(updateSql, [module_id]);

    return res.status(200).json({
      success: true,
      message: "File imported successfully",
      total_question: count,
    });
  } catch (error) {
    console.log("Error in emailAndTextQuestionUpload:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const updateGradedTextAndEmailquestionsById = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    const questions = req.body.question;
    // console.log("questions",questions);
    if(!question_id || !questions){
      return res.json({message:"Question id Or questions are not provided",success:false})
    }
    const sql = "UPDATE lms_GradedAssementOtherQuestions SET topic = ? WHERE id =?";

    connection.query(sql, [questions, question_id], (err, resp) => {
      if (err) {
        return res.json({
          message: "Error In Querry",
          success: false,
          error: err,
        });
      }

      return res.json({ message: "Successfully updated", success: true });
    });
  } catch (error) {
    console.log("error", error);
  }
};

const getGradedAssessmentOtherQuestionsByModuleId = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    if(!module_id){
      return res.json({message:"Module Id is not provided",success:false})
    }
    const sql ="SELECT id,topic,category  FROM lms_GradedAssementOtherQuestions WHERE module_id = ?";
    connection.query(sql, [module_id], (err,resp) => {
      if (err) {
        return res.json({ message: "Fatal Error", error: err, success: false });
      }
      return res.json({ message: "Success", data: resp, success: true });
    });
  } catch (error) {
    return res.json({message: "Internal server Error",error: error,success: false});
  }
};

const getGradedassesmentOthersByQuestionId = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    if(!question_id){
      return res.json({message:"Question Id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_GradedAssementOtherQuestions WHERE id =?";
    connection.query(sql, [question_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal error", success: false, error: err });
      }
      return res.json({ message: "Success", success: true, data: resp });
    });
  } catch (error) {
    return res.json({message: "Internal server Error",success: false,error: error});
  }
};

const deleteCourseOtherQuestion = async(req,res)=>{
  try {
    const id = req.params.id
    const getQuerry = 'SELECT * FROM lms_GradedAssementOtherQuestions WHERE id = AND finalAssessmentStatus = 0 ?'
    const result = await queryPromiseWithAsync(getQuerry,id)
    if(result.length<=0){
    return res.json({message:"Deletion unsuccessfull",success:false})
    }
    const deleteQuery = 'DELETE FROM lms_GradedAssementOtherQuestions WHERE id = ?';
    await queryPromiseWithAsync(deleteQuery, [id]);
    return res.json({message:"Deletion successfull",success:true})
  } catch (error) {
    return res.json({message:"Internal Server error",success:false,error:error})

  }
}

// ----------------------------------Graded Assessment ----------------------------

const randomGradedAssementQuestions = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const module_id = req.params.module_id;
     if(!module_id || !comp_id){
      return res.json({message:"Module id,company id is not provided",success:false})
    }
    const licenseSql = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";

    connection.query(licenseSql, [comp_id], async (licenseErr, licenseResp) => {
      if (licenseErr) {
        return res.json({
          message: "Fatal error in license query",
          success: false,
        });
      }

      if (licenseResp?.length <= 0) {
        return res.json({
          message: "Company hasn't purchased the Course license",
          success: false,
        });
      }

      // Fetch 10 random questions from lms_TNA_MCQ
      const mcqSql = `SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE module_id = ${module_id} ORDER BY RAND() LIMIT 10`;
      const questions = await queryPromise(mcqSql);
      // console.log("questions", questions);

      // Fetch one random email question from lms_EmailAndTextQuestions
      const randomEmailSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Email" AND module_id = ${module_id} ORDER BY RAND() LIMIT 1`;
      const randomEmailResult = await queryPromise(randomEmailSql);
      // console.log("randomEmailResult", randomEmailResult);

      // Fetch one random text question from lms_EmailAndTextQuestions
      const randomTextSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Text" AND module_id = ${module_id} ORDER BY RAND() LIMIT 1`;
      const randomTextResult = await queryPromise(randomTextSql);
      // console.log("randomTextResult", randomTextResulte);

      // Fetch one random audio question from lms_EmailAndTextQuestions
      const randomAudioSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Audio" AND module_id = ${module_id} ORDER BY RAND() LIMIT 1`;
      const randomAudioResult = await queryPromise(randomAudioSql);
      // console.log("randomAudioResult", randomAudioResult);

      // Check if all queries were successful
      if (randomEmailResult && randomTextResult && randomAudioResult) {
        const shuffledQuestionsA = [...questions].sort(() => Math.random() - 0.5);

        // Check if any of the result arrays are empty
        if (randomEmailResult?.length === 0) {
          shuffledQuestionsA.push([]);
        } else {
          shuffledQuestionsA.push(randomEmailResult[0]);
        }

        if (randomTextResult?.length === 0) {
          shuffledQuestionsA.push([]);
        } else {
          shuffledQuestionsA.push(randomTextResult[0]);
        }

        if (randomAudioResult?.length === 0) {
          shuffledQuestionsA.push([]);
        } else {
          shuffledQuestionsA.push(randomAudioResult[0]);
        }

        const sets = {
          setA: shuffledQuestionsA,
        };

        // console.log("sets", sets.setA);
        return res.json({ msg: "data received", data: sets, success: true });
      } else {
        return res.json({ msg: "Error in fetching questions", success: false });
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({
      msg: error,
      message: "error in getMcq Api",
      success: false,
    });
  }
};

const GradedAssesmentAnswerByEmployee = async (req, res) => {
  try {
    const mcqSet = req.body.mcq;
    const emp_id = req.params.emp_id;
    const module_id = req.params.module_id;
    const mcq_selectedAnswer = req.body.mcq_selectedAnswer; // In Array of string
    const email_answer = req.body.email_answer; // In Array of string
    const text_answer = req.body.text_answer; // In Array of string
    const mcq_score = req.body.mcq_score;
    if(!emp_id||!module_id ){
      return res.json({message:"Employee Id Or Module id is not provided",success:false})
    }
    const sql = "select comp_id FROM lms_courseEmployee WHERE emp_id = ?";
    connection.query(sql, [emp_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal Error", error: err, success: false });
      }
    });

    if (Array.isArray(mcqSet)) {
      const mcqQuestions = mcqSet.filter((item) => item.category === "MCQ");
      const textQuestions = mcqSet.filter((item) => item.category === "Text");
      const emailQuestions = mcqSet.filter((item) => item.category === "Email");
      const audioQuestions = mcqSet.filter((item) => item.category === "Audio");
      const mcqIdArray = mcqQuestions.map((v) => v.id);
      const textIdArray = textQuestions.map((v) => v.id)
      const emailIdArray = emailQuestions.map((v) => v.id)
      const audioIdArray = audioQuestions.map((v) => v.id)
      const mcqQuestionsArr = mcqQuestions.map((v) => v.questions);
      const optionsArr = mcqQuestions.map((v) => v.options);
      const correctAnswerArr = mcqQuestions.map((v) => v.correctAnswer);
      const emailQuestionArr = emailQuestions.map((v) => v.topic);
      const textQuestionArr = textQuestions.map((v) => v.topic);
      const audioQuestionArr = audioQuestions.map((v) => v.topic);
      const mcq_score_outOff = mcqIdArray?.length * 2;
      const selectSql ="SELECT comp_id FROM lms_courseEmployee WHERE emp_id = ?";
      connection.query(selectSql, [emp_id], (err, resp) => {
        if (err) {
          console.log("err in SELECT query", err);
          return res.json({ message: "error in SELECT query", success: false });
        }

        if (resp?.length === 0) {
          return res.json({ message: "No user found", success: false });
        }

        const comp_id = resp[0].comp_id;

        const checkEmployeeSql ="SELECT COUNT(*) AS count FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?";

        connection.query(
          checkEmployeeSql,
          [emp_id, module_id],
          (checkErr, checkResults) => {
            if (checkErr) {
              console.log("err in checking employee existence", checkErr);
              return res.json({
                message: "error in checking employee existence",
                success: false,
              });
            }
            // console.log("checkResults", checkResults);
            if (checkResults[0].count > 0) {
              const updateSql = `
                            UPDATE lms_GradedAssesmentAnswersByEmployee 
                            SET mcq_id=?,text_id = ?,email_id=?,audio_id = ?, mcq_questions = ?, mcq_options = ?, mcq_correctAnswer = ?, mcq_selectedAnswer = ?,
                                email_question = ?, email_answer = ?, text_question = ?, text_answer = ?,audio_question = ? , mcq_score = ?,mcq_score_outOff=?,text_score =0,text_score_outOff=0,email_score=0,email_score_outOff=0,audio_score=0,audio_score_outOff=0,total_score=0,out_off=0, attempt = attempt + 1
                            WHERE emp_id = ? AND module_id =? 
                        `;
              connection.query(
                updateSql,
                [
                  JSON.stringify(mcqIdArray),
                  JSON.stringify(textIdArray),
                  JSON.stringify(emailIdArray),
                  JSON.stringify(audioIdArray),
                  JSON.stringify(mcqQuestionsArr),
                  JSON.stringify(optionsArr),
                  JSON.stringify(correctAnswerArr),
                  JSON.stringify(mcq_selectedAnswer),
                  JSON.stringify(emailQuestionArr),
                  JSON.stringify(email_answer),
                  JSON.stringify(textQuestionArr),
                  JSON.stringify(text_answer),
                  JSON.stringify(audioQuestionArr),
                  mcq_score,
                  mcq_score_outOff,
                  emp_id,
                  module_id
                ],
                (updateErr, updateResults) => {
                  if (updateErr) {
                    console.log("err in UPDATE query", updateErr);
                    return res.json({
                      message: "error in UPDATE query",
                      success: false,
                    });
                  }
                  // console.log("updateResults", updateResults);
                  return res.json({ message: "done", success: true });
                }
              );
            } else {
              // console.log("Insert");
              const insertSql = `
                            INSERT INTO lms_GradedAssesmentAnswersByEmployee 
                                (comp_id, emp_id,module_id,mcq_id,text_id,email_id,audio_id, mcq_questions, mcq_options, mcq_correctAnswer, mcq_selectedAnswer,
                                email_question, email_answer, text_question, text_answer,audio_question, mcq_score, mcq_score_outOff,attempt) 
                            VALUES (?,?, ?, ?,?,?, ?,?, ?, ?,?,?, ?, ?, ?, ?, ?,?, 1)
                        `;

              connection.query(
                insertSql,
                [
                  comp_id,
                  emp_id,
                  module_id,
                  JSON.stringify(mcqIdArray),
                  JSON.stringify(textIdArray),
                  JSON.stringify(emailIdArray),
                  JSON.stringify(audioIdArray),
                  JSON.stringify(mcqQuestionsArr),
                  JSON.stringify(optionsArr),
                  JSON.stringify(correctAnswerArr),
                  JSON.stringify(mcq_selectedAnswer),
                  JSON.stringify(emailQuestionArr),
                  JSON.stringify(email_answer),
                  JSON.stringify(textQuestionArr),
                  JSON.stringify(text_answer),
                  JSON.stringify(audioQuestionArr),
                  mcq_score,
                  mcq_score_outOff,
                ],
                (insertErr, insertResults) => {
                  if (insertErr) {
                    console.log("err in INSERT query", insertErr);
                    return res.json({
                      message: "error in INSERT query",
                      success: false,
                    });
                  }
                  // console.log("insertResults", insertResults);
                  return res.json({ message: "done", success: true });
                }
              );
            }
          }
        );
      });
    }
  } catch (error) {
    console.log("Error:", error);
    return res.json({ message: "Error", success: false });
  }
};

const audioAnswer = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    const module_id = req.params.module_id;

    if(!emp_id || !module_id){
      return res.json({message:"Employee Id Or Module_id is not provided ",success:false})
    }
    if (!req.file) {
      console.log("No Audio file uploaded");
      const updateQuery = 'UPDATE lms_GradedAssesmentAnswersByEmployee SET audio_answer = ? WHERE emp_id = ? AND module_id = ?';
      await queryPromiseWithAsync(updateQuery, ["", emp_id, module_id]);
      return res.status(200).json({ message: "No file uploaded, audio answer set to empty string", success: true });
    }

    const audio = req.file;
    const searchEmpAnswer = 'SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND module_id = ?';
    const searchResult = await queryPromiseWithAsync(searchEmpAnswer, [emp_id, module_id]);

    if (searchResult?.length <= 0) {
      return res.status(404).json({ message: "Employee's answer not found", success: false });
    }

    const updateQuery = 'UPDATE lms_GradedAssesmentAnswersByEmployee SET audio_answer = ? WHERE emp_id = ? AND module_id = ?';
    const updateResult = await queryPromiseWithAsync(updateQuery, [audio.filename, emp_id, module_id]);

    return res.json({ message: "Audio file uploaded successfully", success: true });

  } catch (error) {
    console.error("Internal server error:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

const courseEvaluationByCompIdAndCourseId = async (req, res) => {
  const comp_id = req.params.comp_id;
  const course_id = req.params.courseId;

  if (!comp_id) {
    return res.json({ message: "Company ID is not given", success: false });
  }
  if (!course_id) {
    return res.json({ message: "Course ID is not given", success: false });
  }

  // Check if the company exists
  let q = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";
  connection.query(q, [comp_id], (err, resp) => {
    if (err) {
      return res.json({
        message: "Error getting company data",
        success: false,
      });
    } else {
      if (resp.length <= 0) {
        return res.json({
          message: "Haven't purchased the Course Yet",
          success: false,
        });
      } else {
        // If the company exists, proceed to query employee data
        const sql =
          "SELECT lms_GradedAssesmentAnswersByEmployee.emp_id, lms_courseEmployee.emp_name, lms_courseEmployee.emp_email, lms_courseEmployee.course_code " +
          "FROM lms_GradedAssesmentAnswersByEmployee " +
          "JOIN lms_courseEmployee ON lms_GradedAssesmentAnswersByEmployee.emp_id = lms_courseEmployee.emp_id " +
          "WHERE lms_GradedAssesmentAnswersByEmployee.comp_id = ? AND lms_GradedAssesmentAnswersByEmployee.course_id = ?";
        connection.query(sql, [comp_id, course_id], (err, resp) => {
          if (err) {
            console.log(err);
            return res.json({
              message: "Failed",
              error: err,
              success: false,
            });
          } else {
            return res.json({ message: "Success", data: resp, success: true });
          }
        });
      }
    }
  });
};

const getDatafromCourseEmployeeAnswer = async (req, res) => {
  const emp_id = req.params.emp_id;
  const module_id = req.params.module_id;
  if(!emp_id || !module_id){
    return res.json({message:"Employee Id Or Module Id is not provided",success:false})
  }
  const sql ="SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id =? AND module_id =?  ";
  const result = await queryPromiseWithAsync(sql,[emp_id, module_id])

    if (result.length <= 0) {
      console.log("Haven't submitted the graded assement of this Module");
      return res.json({message: "Haven't submitted the graded assement of this Module",success: false});
    }
    const parsedResp = result.map((entry) => {
      return {
        ...entry,
        mcq_options: JSON.parse(entry.mcq_options),
      };
    });
    return res.json({ message: "done", success: true, data: parsedResp });
  
};

const updateCourseScore = async (req, res) => {
  const id = req.params.emp_id;
  const module_id = req.params.module_id
  const mcq_score = req.body.mcq.mcq_score|| null;
  const mcq_score_outOff = req.body.mcq.mcq_score_out_off;
  const email_score = req.body.email.email_score;
  const email_score_outOff = req.body.email.email_score_out_off;
  const text_score = req.body.text.text_score;
  const text_score_outOff = req.body.text.text_score_out_off;
  const audio_score = req.body.audio.audio_score
  const audio_score_outOff = req.body.audio.audio_score_out_off
  const out_off = mcq_score_outOff + email_score_outOff + text_score_outOff + audio_score_outOff;
  const total_score = mcq_score + email_score + text_score + audio_score;
  
  if(!id||!module_id){
    return res.json({message:"Id or Module Id  is not provided",success:false})
  }
  try {
    const updateQuery = `UPDATE lms_GradedAssesmentAnswersByEmployee
        SET
        mcq_score = COALESCE(?, mcq_score),
        mcq_score_outOff = COALESCE(?, mcq_score_outOff),
        email_score_outOff = COALESCE(?, email_score_outOff),
        text_score_outOff = COALESCE(?, text_score_outOff),
        out_off = COALESCE(?, out_off),
        email_score = COALESCE(?, email_score),
        text_score = COALESCE(?, text_score),
        total_score = COALESCE(?, total_score),
        audio_score = COALESCE(?, audio_score),
        audio_score_outOff = COALESCE(?, audio_score_outOff)
        WHERE
        emp_id = ? AND module_id = ?
      `;
    await connection.query(updateQuery,[mcq_score,mcq_score_outOff,email_score_outOff,text_score_outOff,out_off,email_score,text_score,total_score,audio_score,audio_score_outOff,id,module_id],(err, resp) => {
        if (err) {
          console.log("err", err);
          return res.status(500).json({ success: false, message: "Fatal error", error: err });
        }
        return res.json({data: resp,success: true, message: "Data Updated successfully",});
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
};

// -------------------------------------Non Graded----------------------------------

const getNonGradedMcqQuestions = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
   
    const module_id = req.params.module_id
    const lesson_id = req.params.lesson_id
    // console.log("course_id", course_id);
    // console.log("module_id", module_id);
    if(!comp_id){
      return res.json({message:"Company Id not received from front end",success:false})
    }
    if(!module_id){
      return res.json({message:"Module  Id not received from front end",success:false})
    }
    if(!lesson_id){
      return res.json({message:"Lesson Id not received from front end",success:false})
    }
    const licenseSql = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";

    connection.query(licenseSql, [comp_id], async (licenseErr, licenseResp) => {
      if (licenseErr) {
        return res.json({
          message: "Fatal error in license query",
          success: false,
        });
      }

      if (licenseResp?.length <= 0) {
        return res.json({
          message: "Company hasn't purchased the Course license",
          success: false,
        });
      }

      // Fetch 10 random questions from lms_TNA_MCQ
      const mcqSql = `SELECT * FROM lms_CourseNonGradedAssessment WHERE lesson_id = ${lesson_id} AND module_id = ${module_id} ORDER BY RAND() LIMIT 10`;
      const questions = await queryPromise(mcqSql);
      // console.log("questions", questions);

      const shuffledQuestionsA = [...questions].sort(() => Math.random() - 0.5);
      const sets = {
        setA: shuffledQuestionsA,
      };

      // console.log("sets", sets.setA);
      return res.json({ msg: "data received", data: sets, success: true });

    });
  } catch (error) {
    console.log(error);
    return res.json({
      msg: error,
      message: "error in getMcq Api",
      success: false,
    });
  }
};

// const uploadNonGradedAssessment = async (req, res) => {
//   try {
    
//     const module_id = req.params.module_id;

//     const lesson_id = req.params.lesson_id;
//     if(!module_id || !lesson_id){
//       return res.json({message:"Module id,lesson id is not provided",success:false})
//     }
//     if (!req.file) {
//       return res.status(400).json({ success: false, msg: "No file uploaded" });
//     }

//     const filePath = req.file.path;
//     let count = 0;
//     const category_id = 1;
//     const category = "MCQ";
//     const response = await csv().fromFile(filePath);

//     for (const item of response) {
//       count++;
//       const query = `
//             INSERT INTO lms_CourseNonGradedAssessment (module_id,lesson_id,questions, options, correctAnswer,category_id,category)
//             VALUES (?,?, ?, ?,?,?)
//           `;

//     const optionsArray = item.Options.split(",").map(option => option.trim());

//       connection.query(query, [
//         module_id,
//         lesson_id,
//         item.Questions,
//         JSON.stringify(optionsArray), // Assuming you want to store options as JSON string
//         item.CorrectAnswer,
//         category_id,
//         category,
//       ]);
//     }

//     return res.json({
//       status: 202,
//       success: true,
//       msg: "File imported successfully",
//       total_no_of_question_upoaded: count,
//     });
//   } catch (error) {
//     console.log("Error in importUser:", error);
//     res.status(500).json({ success: false, msg: "Internal Server Error" });
//   }
// };

const uploadNonGradedAssessment = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    const lesson_id = req.params.lesson_id;

    if (!module_id || !lesson_id) {
      return res.json({ message: "Module id, lesson id is not provided", success: false });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, msg: "No file uploaded" });
    }

    const filePath = req.file.path;
    let count = 0;
    const category_id = 1;
    const category = "MCQ";
    const response = await csv().fromFile(filePath);

    for (const item of response) {
      count++;

      // Combine options from different columns
      const optionsArray = [];
      if (item["Option A"]) optionsArray.push(item["Option A"].trim());
      if (item["Option B"]) optionsArray.push(item["Option B"].trim());
      if (item["Option C"]) optionsArray.push(item["Option C"].trim());
      if (item["Option D"]) optionsArray.push(item["Option D"].trim());

      const correctAnswer = item.CorrectAnswer.trim();

      const query = `
        INSERT INTO lms_CourseNonGradedAssessment (module_id, lesson_id, questions, options, correctAnswer, category_id, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      connection.query(query, [
        module_id,
        lesson_id,
        item.Questions,
        JSON.stringify(optionsArray), // Storing options as a JSON string
        correctAnswer,
        category_id,
        category,
      ], (err) => {
        if (err) {
          console.error('Error inserting data:', err);
        }
      });
    }

    return res.json({
      status: 202,
      success: true,
      msg: "File imported successfully",
      total_no_of_question_upoaded: count,
    });
  } catch (error) {
    console.log("Error in uploadNonGradedAssessment:", error);
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};

const NonGradedAssesmentAnswerByEmployee = async (req, res) => {
  try {
    const mcqSet = req.body.mcq;
    const emp_id = req.params.emp_id;
    const module_id = req.params.module_id;
    const lesson_id = req.params.lesson_id;

    if(!mcqSet ){
      return res.json({message:"Question and answer are not provided",success:false})
    }

    if(!emp_id || !module_id ||!lesson_id ){
      return res.json({message:"Employee id, module id Or Lesson id is not provided",success:false})
    }
    const mcq_selectedAnswer = req.body.mcq_selectedAnswer; // In Array of string
    // In Array of string
    const mcq_score = req.body.mcq_score;
    if (Array.isArray(mcqSet)) {
      const mcqQuestions = mcqSet.filter((item) => item.category === "MCQ");

      const mcqIdArray = mcqQuestions.map((v) => v.id);

      const mcqQuestionsArr = mcqQuestions.map((v) => v.questions);
      const optionsArr = mcqQuestions.map((v) => v.options);
      const correctAnswerArr = mcqQuestions.map((v) => v.correctAnswer);


      const mcq_score_outOff = mcqIdArray?.length * 2;

      const selectSql = "SELECT comp_id FROM lms_courseEmployee WHERE emp_id = ?";

      connection.query(selectSql, [emp_id], (err, resp) => {
        if (err) {
          console.log("err in SELECT query", err);
          return res.json({ message: "error in SELECT query", success: false });
        }

        if (resp?.length === 0) {
          console.log("No user found for emp_id:", emp_id);
          return res.json({ message: "No user found", success: false });
        }

        const comp_id = resp[0].comp_id;
        const checkEmployeeSql = "SELECT COUNT(*) AS count FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ? AND lesson_id = ?";
        connection.query(checkEmployeeSql,[emp_id, lesson_id],(checkErr, checkResults) => {
            if (checkErr) {
              console.log("err in checking employee existence", checkErr);
              return res.json({message: "error in checking employee existence", success: false});
            }
            if (checkResults[0].count > 0) {
              const updateSql = `
                            UPDATE lms_CourseNonGradedAnswerByEmployee 
                            SET mcq_id=?, mcq_questions = ?, mcq_options = ?, mcq_correctAnswer = ?, mcq_selectedAnswer = ?,
                            score = ?,out_off=?, attempt = attempt + 1
                            WHERE emp_id = ? AND lesson_id =?
                        `;

              connection.query(
                updateSql,
                [
                  JSON.stringify(mcqIdArray),
                  JSON.stringify(mcqQuestionsArr),
                  JSON.stringify(optionsArr),
                  JSON.stringify(correctAnswerArr),
                  JSON.stringify(mcq_selectedAnswer),
                  mcq_score,
                  mcq_score_outOff,
                  emp_id,
                  lesson_id
                ],
                (updateErr, updateResults) => {
                  if (updateErr) {
                    console.log("err in UPDATE query", updateErr);
                    return res.json({
                      message: "error in UPDATE query",
                      success: false,
                    });
                  }
                  return res.json({ message: "done", success: true });
                }
              );
            } else {
              console.log("Insert");
              const insertSql = `
                            INSERT INTO lms_CourseNonGradedAnswerByEmployee 
                                (comp_id, emp_id,module_id,lesson_id,mcq_id, mcq_questions, mcq_options, mcq_correctAnswer, mcq_selectedAnswer,
                                score, out_off,attempt) 
                            VALUES (?,?, ?, ?,?,?, ?,?,?, ?, ?, 1)
                        `;

              connection.query(
                insertSql,
                [
                  comp_id,
                  emp_id,
                  module_id,
                  lesson_id,
                  JSON.stringify(mcqIdArray),
                  JSON.stringify(mcqQuestionsArr),
                  JSON.stringify(optionsArr),
                  JSON.stringify(correctAnswerArr),
                  JSON.stringify(mcq_selectedAnswer),
                  mcq_score,
                  mcq_score_outOff,
                ],
                (insertErr, insertResults) => {
                  if (insertErr) {
                    console.log("err in INSERT query", insertErr);
                    return res.json({
                      message: "error in INSERT query",
                      success: false,
                    });
                  }
                  return res.json({ message: "done", success: true });
                }
              );
            }
          }
        );
      });
    }
  } catch (error) {
    console.log("Error:", error);
    return res.json({ message: "Error", success: false });
  }
};

const getDatafromNonGradedEmployeeAnswer = async (req, res) => {
  const emp_id = req.params.emp_id;
  const lesson_id = req.params.lesson_id;
   if(!emp_id || ! lesson_id){
      return res.json({message:"Employee Id  Or Lesson Id is not provided",success:false})
    }

  const sql = "SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id =? AND lesson_id =?  ";

  connection.query(sql, [emp_id, lesson_id], (err, resp) => {
    if (err) {
      console.log("err", err);
      return res.json({
        error: err.message,
        message: "error in query",
        success: false,
      });
    }
    if (resp.length <= 0) {
      console.log("Haven't submitted the graded assement of this course");
      return res.json({
        message: "Haven't submitted the graded assement of this course",
        success: false,
      });
    }

    const parsedResp = resp.map((entry) => {
      return {
        ...entry,
        mcq_options: JSON.parse(entry.mcq_options),
        // Add other fields to modify as needed
      };
    });
    // console.log("parsedResp", parsedResp);

    return res.json({ message: "done", success: true, data: parsedResp });
  });
};

const deleteNonGradedMcq = async(req,res)=>{
  try {
    const id = req.params.id
    const getMcq = 'SELECT * FROM lms_CourseNonGradedAssessment WHERE id = ?'
    const result = await queryPromiseWithAsync(getMcq,id)
    if(result.length<=0){
    return res.json({message:"Deletion unsuccessfull",success:false})
    }
    const deleteQuery = 'DELETE FROM lms_CourseNonGradedAssessment WHERE id = ?';
    await queryPromiseWithAsync(deleteQuery, [id]);
    return res.json({message:"Deletion successfull",success:true})
  } catch (error) {
    return res.json({message:"Internal Server error",success:false,error:error})

  }
}

// --------------------------------------Course-----------------------------------


const createCourse = async (req, res) => {
  try {
    const course_name = req.body.course_name;
    if (!course_name) {
      return res.json({message: "fields Cannot be null or Empty",success: false});
    }
    const sql ="INSERT INTO lms_Course (course_name) VALUES (?)";
    connection.query(sql, [course_name], (err, resp) => {
      if (err) {
        console.log("Fatal error", err);
        return res.json({ message: "Fatal Error", error: err, success: false });
      }
      return res.json({ message: "Successfully Added Course", success: true });
    });
  } catch (error) {
    return res.json({ message: "Internal Server Error", error: error });
  }
};

const getCourseManagement = async (req, res) => {
  try {
    const course_id = req.params.course_id
    if(!course_id){
      return res.json({message:"Course id is not provided",success:false})
    }
    const sql = "SELECT id, module_name FROM lms_Module WHERE course_id = ?";
    connection.query(sql, [course_id],async (err, categories) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }

      const moduleData = [];

      // Use Promise.all to wait for all module queries to complete
      await Promise.all(
        categories.map(async (category) => {
          const lessonQuery = "SELECT id, lesson_name, number_of_videos FROM lms_lessons WHERE module_id = ?";
          const lessons = await new Promise((resolve, reject) => {
            connection.query(
              lessonQuery,
              [category.id],
              (lessonErr, lessonResp) => {
                if (lessonErr) {
                  console.log("err in module query", lessonErr);
                  reject(lessonErr);
                } else {
                  resolve(lessonResp);
                }
              }
            );
          });

          // Create an array of modules for the current course
          const lessonsData = lessons.map((lesson) => ({
            lessonId: lesson.id,
            lessonName: lesson.lesson_name,
            numberOfVideos: lesson.number_of_videos,
          }));

          // Add courseId, courseName, and modulesData to the result array
          moduleData.push({
            moduleId: category.id,
            moduleName: category.module_name,
            lessonsData: lessonsData,
          });
        })
      );

      return res.status(200).json({ success: true, data: moduleData });
    });
  } catch (error) {
    console.log("err", error)
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getCourse = async(req,res)=>{
  try {
    const searchQuery = 'SELECT * FROM lms_Course'
    const result = await queryPromiseWithAsync(searchQuery)
    if(result.length<=0){
      return res.json({message:"Unable to find Data ",success:false})
    }
    return res.json({message:"success",success:true,data:result})
    
  } catch (error) {
    console.log("Internal Server Error");
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const courseEvaluation = async (req, res) => {
  const comp_id = req.params.comp_id;
  if (!comp_id) {
    return res.json({ message: "Company ID is not given", success: false });
  }

  let q = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";
  connection.query(q, [comp_id], (err, resp) => {
    if (err) {
      return res.json({
        message: "Error getting company data",
        success: false,
      });
    } else {
      if (resp?.length <= 0) {
        return res.json({
          message: "Haven't purchase the Course Yet",
          success: false,
        });
      } else {
        // If the company exists, proceed to query employee data
        const sql =
          "SELECT emp_id, emp_name, emp_email,course_code FROM lms_courseEmployee WHERE comp_id = ?";
        connection.query(sql, [comp_id], (err, resp) => {
          if (err) {
            console.log(err);
            return res.json({
              message: "Failed",
              message: err,
              success: false,
            });
          } else {
            return res.json({ message: "Success", data: resp, success: true });
          }
        });
      }
    }
  });
};

const getCourseIdByCompanyId = async(req,res)=>{
  try {
    const comp_id = req.params.comp_id
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const searchQuery = "SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?"
    const result = await queryPromiseWithAsync(searchQuery,comp_id)
    if(result.length<=0){
      return res.json({message:"company havent perchased the course yet",success:false})
    }
    const course_id = result[0].course_id
    return res.json({message:"successful",success:true,data:course_id})
    
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", success: false ,error:error})
  }
}

// const createM = async (req, res) => {
//   try {
//     const course_id = req.params.course_id
//     console.log("course_id",course_id);
//     const module_name = req.body.module_name;
//     const module_description = req.body.module_description;
//     if (!module_name || !module_description) {
//       return res.json({
//         message: "fields Cannot be null or Empty",
//         success: false,
//       });
//     }
//     const sql =
//       "INSERT INTO lms_Module (course_id,module_name, module_description) VALUES (?, ?,?)";

//     connection.query(sql, [course_id,module_name, module_description], (err, resp) => {
//       if (err) {
//         console.log("Fatal error", err);
//         return res.json({ message: "Fatal Error", error: err, success: false });
//       }
//       return res.json({ message: "Successfully Added Course", success: true });
//     });
//   } catch (error) {
//     return res.json({ message: "Internal Server Error", error: error });
//   }
// };
// --------------------------------Working----------------

const updateCourse = async (req, res) => {
  try {
    const id = req.params.id;
    const { course_name } = req.body;
    if(!id){
      return res.json({message:"Id is not provided",success:false})
    }
    if (!course_name) {
      return res.json({message: "Nothing is provided for update",success: false});
    }
    const sql = `UPDATE lms_Course SET course_name=? WHERE id = ?`;
    const result = await queryPromiseWithAsync(sql,[course_name,id])
    if(result?.length<=0){
      return res.json({message: "Update Failed",success: false});
    }
    return res.json({ message: "Update is Successful",data: result,success: true});
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

const getCourseReportById= async(req,res)=>{
  try{
    const comp_id= req.params.comp_id;
    const emp_id= req.params.emp_id;
      if(!emp_id || ! comp_id){
      return res.json({message:"Employee Id  Or Company Id is not provided",success:false})
    }
    const getresult= "SELECT total_score, out_off, module_id, attempt, lms_Module.module_name FROM lms_GradedAssesmentAnswersByEmployee as lmsgrade INNER JOIN lms_Module ON lms_Module.id = lmsgrade.module_id WHERE comp_id = ? AND emp_id = ? ORDER BY module_id ASC"
    const result = await queryPromiseWithAsync(getresult, [comp_id, emp_id]);
    if(result?.length<=0){
      return res.json({message:"Haven't submitted any graded yet",success:false})
    }
    
    return res.json({message:"successful",success:true,data:result})
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", success: false ,error:error})
  }
}


//  ----------------------------------------Report and analysis-------------------------
const totalDataGet = async (req, res) => {
  const comp_id = req.params.comp_id;
  if(!comp_id){
    return res.json({message:"Company Id is not provided",success:false})
  }
  try {
    const sqlCompanyDetails =
      "SELECT no_of_tna, no_of_course FROM lms_companyDetails WHERE id=?";
    connection.query(
      sqlCompanyDetails,
      [comp_id],
      (err, respCompanyDetails) => {
        if (err) {
          console.log("err", err);
          return res.json({
            message: "Error in company details query",
            success: false,
          });
        }

        const Total_Number_Of_Tna_Purchased = respCompanyDetails[0].no_of_tna;
        const Total_Number_Of_Course_Purchased =
          respCompanyDetails[0].no_of_course;

        const sqlEmployeeAnswers =
          "SELECT COUNT(*) AS Total_tna_given FROM lms_TNA_Employee_Answers WHERE comp_id =?";
        connection.query(
          sqlEmployeeAnswers,
          [comp_id],
          (err, resEmployeeAnswers) => {
            if (err) {
              console.log("Error in Answer query", err);
              return res.json({
                message: "Error in employee answers query",
                success: false,
              });
            }

            const Total_tna_given = resEmployeeAnswers[0].Total_tna_given;
            const data = {
              Total_Number_Of_Tna_Purchased,
              Total_Number_Of_Course_Purchased,
              Total_tna_given,
            };

            // console.log("data", resEmployeeAnswers[0]);
            return res.json({ message: "success", data: data, success: true });
          }
        );
      }
    );
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.json({ message: "Internal Server Error", success: false });
  }
};

const getComanyEmployeeForResult = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = "SELECT emp_id FROM lms_courseEmployee WHERE comp_id =?";
    const result = await queryPromiseWithAsync(sql,comp_id)
    if(result.length<=0){
      return res.json({ message: "Data Not found", success: false });
    }
   return res.json({ message: "success", data: result, success: true });
  } catch (error) {
    return res.json({message: "Internal Server Error",error: error,success: false});
  }
};

const getCourseEmployeeBycompanyIdForReport = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = `SELECT emp_id as id,emp_name,emp_email,emp_contact as contact_no FROM lms_courseEmployee WHERE comp_id =?`;

    connection.query(sql, [comp_id], (err, resp) => {
      if (err) {
        console.log("err", err);
        return res.json({ message: "Fatal Error", error: err, success: false });
      }

      return res.json({ message: "Success", data: resp, success: true });
    });
  } catch (error) {
    return res.json({ message: "Internal server Error", error: error,success: false});
  }
};

const getAverageMarksByCompanyId = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = `SELECT ga.course_id,c.course_name,COUNT(DISTINCT ga.emp_id) AS total_employees,
                SUM(ga.total_score) AS total_score, AVG(ga.total_score) AS average_score
            FROM
                lms_GradedAssesmentAnswersByEmployee ga
            JOIN
            lms_Module c ON ga.course_id = c.id
            WHERE
                ga.comp_id = ?
            GROUP BY
                ga.course_id, c.course_name`;

    connection.query(sql, [comp_id], (err, result) => {
      if (err) {
        return res.json({ message: "Fatal error", error: err, success: false });
      }
      return res.json({ message: "success", data: result, success: true });
    });
  } catch (error) {
    return res.json({message: "Internal server error",error: error,success: false,});
  }
};

const getTotalNumberOfEmployeeInCourseAndTna = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = `SELECT (SELECT COUNT(*) FROM lms_courseEmployee WHERE comp_id = ?) AS course_Employee_Count,(SELECT COUNT(*) FROM lms_employee WHERE comp_id = ?) AS total_employee,
    (SELECT COUNT(*) FROM lms_TNA_Employee_Answers WHERE comp_id = ?) AS total_tna_attendees`;

    const resp = await queryPromiseWithAsync(sql,[comp_id, comp_id, comp_id])
    if(resp.length<=0){
      return res.json({message:"No Data Found",success:false})
    }
    const result = {
      course_Employee_Count: resp[0]?.course_Employee_Count || 0,
      total_employee: resp[0]?.total_employee || 0,
      total_tna_attendees: resp[0]?.total_tna_attendees || 0,
    };
    return res.json({ message: "Success", data: result, success: true });

   
  } catch (error) {
    console.log(error);
  return res.json({message:"Internal Server Error",error:error,success:false})

  }
};

const getLessonNameFromNonGradedAssesmentByModuleId = async(req,res)=>{
  try {
    const module_id = req.params.module_id
    const emp_id = req.params.emp_id
      if(!emp_id||!module_id ){
      return res.json({message:"Employee Id Or Module id is not provided",success:false})
    }
    const searchSql = `
    SELECT 
      c.lesson_id, 
      c.score, 
      c.out_off,
      c.attempt,
      l.lesson_name
    FROM 
      lms_CourseNonGradedAnswerByEmployee AS c
    JOIN 
      lms_lessons AS l 
    ON 
      c.lesson_id = l.id
    WHERE 
      c.module_id = ? AND 
      c.emp_id = ?
  `;
     
    const result = await queryPromiseWithAsync(searchSql,[module_id,emp_id])
    if(result?.length<=0){
      res.json({message:"Data not found",success:false})
      return
    }
    return res.json({message:"Success",success:true,data:result})

  } catch (error) {
    return res.json({message:"Internal Server Error",success:false})
  }
}

const getVideoDetailsByEmployeeID = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    const module_id = req.params.module_id;
      if(!emp_id||!module_id ){
      return res.json({message:"Employee Id Or Module id is not provided",success:false})
    }
    const sql =
      'SELECT evd.lesson_id, evd.video_id, evd.video_duration, evd.video_watched, evd.attempt, l.lesson_name ' +
      'FROM lms_EmployeeVideoData AS evd ' +
      'JOIN lms_lessons AS l ON evd.lesson_id = l.id ' +
      'WHERE evd.emp_id = ? AND evd.module_id = ?';

    const result = await queryPromiseWithAsync(sql, [emp_id, module_id]);

    if (result?.length <= 0) {
      return res.json({ message: "No data found", success: false });
    }

    return res.json({ message: "Success", success: true, data: result });
  } catch (error) {
    // Handle error appropriately
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

// const getCourseName = async (req, res) => {
//   try {
//     const comp_id = req.params.comp_id;
//     const course_id = 1;

//     const getNameSql = "SELECT course_name FROM lms_Course WHERE id = ? ";
//     const getNameResult = await queryPromiseWithAsync(getNameSql, course_id);
//     if(getNameResult?.length<=0){
//       return res.json({
//         message: "Course not found",
//         success: false,
       
//       });
//     }
//     const course_name = getNameResult[0].course_name;

//     // Execute the first query to get module names and IDs
//     const sqlModule = "SELECT id, module_name FROM lms_Module WHERE course_id = ?";
//     const moduleResult = await queryPromiseWithAsync(sqlModule, course_id);

//     // Execute the second query to get start_date and end_date
//     const sqlCourseCompany =
//       "SELECT start_date, end_date FROM lms_CourseCompany WHERE comp_id = ?";
//     const courseCompanyResult = await queryPromiseWithAsync(sqlCourseCompany, [
//       comp_id,
//     ]);

//     // Execute the third query to get the count of lessons and number of videos for each module
//     const lessonCounts = await Promise.all(
//       moduleResult.map(async (module) => {
//         const sqlLessonCount =
//           "SELECT COUNT(*) AS lesson_count, SUM(number_of_videos) AS total_videos FROM lms_lessons WHERE module_id = ?";
//         const lessonCountResult = await queryPromiseWithAsync(sqlLessonCount, [
//           module.id,
//         ]);
//         return {
//           module_id: module.id,
//           lesson_count: lessonCountResult[0].lesson_count,
//           total_videos: lessonCountResult[0].total_videos,
//         };
//       })
//     );

//     // Add lessonCounts to moduleResult
//     const moduleResultWithCounts = moduleResult.map((module, index) => ({
//       ...module,
//       lesson_count: lessonCounts[index].lesson_count,
//       total_videos: lessonCounts[index].total_videos,
//     }));

//     // Format end_date and add one day if it has time component
//     const formattedCourseCompanyResult = courseCompanyResult.map((row) => {
//       let endDate = new Date(row.end_date);

//       // Check if end_date has time component (ending with 'Z')
//       if (row.end_date.endsWith("Z")) {
//         endDate.setDate(endDate.getDate() + 1); // Add one day
//       }

//       const formattedEndDate = endDate.toLocaleDateString("en-GB"); // Format to DD-MM-YY
//       return { ...row, end_date: formattedEndDate, course_name: course_name };
//     });

//     console.log("formattedCourseCompanyResult",formattedCourseCompanyResult);
//     // Combine the results into one object
//     const combinedResult = {
//       moduleResult: moduleResultWithCounts,
//       courseDetails: formattedCourseCompanyResult,
//     };
//     console.log("combinedResultcombinedResultcombinedResult",combinedResult);

//     return res.json({
//       message: "success",
//       success: true,
//       data: combinedResult,
//     });
//   } catch (error) {
//     console.log("Internal Server Error", error);
//     throw error;
//   }
// };

const getModuleIdByEmployee = async(req,res)=>{
  try {
    const course_id = req.params.course_id;
    const emp_id = req.params.emp_id;
      if(!emp_id||!course_id ){
      return res.json({message:"Employee Id Or Module id is not provided",success:false})
    }
    const searchQuery = 'SELECT * FROM lms_Module WHERE course_id = ?';
    const modules = await queryPromiseWithAsync(searchQuery, course_id);

    if (modules?.length <= 0) {
      return res.json({ message: "Unable to find Data", success: false });
    }
    const data = [];

    for (const module of modules) {
      const module_id = module.id;

    const searchAttended = 'SELECT * FROM lms_EmployeeVideoData WHERE module_id = ? AND emp_id = ?';
    const attendedResult = await queryPromiseWithAsync(searchAttended, [module_id, emp_id]);
    module.hasAttempt = attendedResult?.length > 0;
    data.push(module);     
    }

    return res.json({ message: "Data fetched successfully", success: true, data: data});
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
}

const getModuleLessonWithVideoAttempt = async (req, res) => {
  try {
    const course_id = req.params.course_id;
    const emp_id = req.params.emp_id;
      if(!emp_id||!course_id ){
      return res.json({message:"Employee Id Or Course id is not provided",success:false})
    }
    const searchQuery = 'SELECT * FROM lms_Module WHERE course_id = ?';
    const modules = await queryPromiseWithAsync(searchQuery, course_id);

    if (modules?.length <= 0) {
      return res.json({ message: "Unable to find Data", success: false });
    }
    const data = [];

    for (const module of modules) {
      const module_id = module.id;

      const searchAttended = 'SELECT * FROM lms_EmployeeVideoData WHERE module_id = ? AND emp_id = ?';
      const attendedResult = await queryPromiseWithAsync(searchAttended, [module_id, emp_id]);

      module.hasAttempt = attendedResult?.length > 0;

      data.push(
        module
      );
    }
    return res.json({ message: "Data fetched successfully", success: true, data: data });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

const getLessonDetailsByEmployeeIDAndModuleId = async (req, res) => {
  try {
    const module_id = req.params.module_id;
    const emp_id = req.params.emp_id;
      if(!emp_id||!module_id ){
      return res.json({message:"Employee Id Or Module id is not provided",success:false})
    }
    const searchQuery = 'SELECT * FROM lms_lessons WHERE module_id = ?';
    const lessons = await queryPromiseWithAsync(searchQuery, module_id);

    if (lessons?.length <= 0) {
      return res.json({ message: "Unable to find Data", success: false });
    }

    const data = [];

    for (const lesson of lessons) {
      const lesson_id = lesson.id;

      const searchAttended = 'SELECT * FROM lms_EmployeeVideoData WHERE lesson_id = ? AND emp_id = ?';
      const attendedResult = await queryPromiseWithAsync(searchAttended, [lesson_id, emp_id]);

      lesson.hasAttempt = attendedResult?.length > 0;

      data.push(
        lesson
      );
    }

    return res.json({ message: "Data fetched successfully", success: true, data: data });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

const getVideoDetailsByEmployeeIDAndModuleId = async (req, res) => {
  try {
    const lesson_id = req.params.lesson_id;
    const emp_id = req.params.emp_id;
  if(!emp_id||!lesson_id ){
      return res.json({message:"Employee Id Or Lesson id is not provided",success:false})
    }
    const searchQuery = `
      SELECT cv.*, evd.video_watched, evd.video_duration,evd.attempt
      FROM lms_CourseVideo cv
      LEFT JOIN lms_EmployeeVideoData evd ON cv.id = evd.video_id AND evd.emp_id = ?
      WHERE cv.lesson_id = ?
    `;

    const videos = await queryPromiseWithAsync(searchQuery, [emp_id, lesson_id]);

    if (videos?.length <= 0) {
      return res.json({ message: "Unable to find Data", success: false });
    }

    return res.json({ message: "Data fetched successfully", success: true, data: videos });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

const getModuleWithNonGradedAttempt = async (req, res) => {
  try {
    const course_id = req.params.course_id;
    const emp_id = req.params.emp_id;
      if(!emp_id||!course_id ){
      return res.json({message:"Employee Id Or Course id is not provided",success:false})
    }
    const searchQuery = 'SELECT * FROM lms_Module WHERE course_id = ? AND isGraded = 1';
    const modules = await queryPromiseWithAsync(searchQuery, course_id);

    if (modules?.length <= 0) {
      return res.json({ message: "Unable to find Data", success: false });
    }
    const data = [];
    for (const module of modules) {
      const module_id = module.id;
      const searchAttended = 'SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE module_id = ? AND emp_id = ?';
      const attendedResult = await queryPromiseWithAsync(searchAttended, [module_id, emp_id]);
      module.hasAttempt = attendedResult?.length > 0;
      data.push(
        module
      );
    }

    return res.json({ message: "Data fetched successfully", success: true, data: data });
  } catch (error) {
    console.log("Internal Server Error", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

// const getModuleWithMcqData = async (req, res) => {
//   try {
//     const sql = "SELECT DISTINCT module_id FROM lms_CourseGradedAssessmentMCQ";
//     const result = await queryPromiseWithAsync(sql);

//     if (result?.length <= 0) {
//       return res.json({ message: "No module has MCQ questions yet", data: [], success: false });
//     }

//     const data = [];

//     for (const id of result) {
//       const search = 'SELECT id, module_name FROM lms_Module WHERE id = ?';
//       const searchResult = await queryPromiseWithAsync(search, [id.module_id]); // Use [id.module_id] to match parameterized query format
//       if(searchResult?.length<=0){
//         return null
//       }
//       data.push(searchResult[0]);
//     }
//     return res.json({ message: "done", data, success: true });
//   } catch (error) {
//     console.log("error", error);
//     return res.status(500).json({ message: "An error occurred", error, success: false });
//   }
// };

const getModuleWithMcqData = async (req, res) => {
  try {
    const sql = "SELECT DISTINCT module_id FROM lms_CourseGradedAssessmentMCQ";
    const result = await queryPromiseWithAsync(sql);

    if (result?.length <= 0) {
      return res.json({ message: "No module has MCQ questions yet", data: [], success: false });
    }

    const data = [];

    for (const { module_id } of result) {
      const search = 'SELECT id, module_name FROM lms_Module WHERE id = ?';
      const searchResult = await queryPromiseWithAsync(search, [module_id]);

      if (searchResult?.length > 0) {
        data.push(searchResult[0]);
      }
    }

    return res.json({ message: "done", data, success: true });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({ message: "An error occurred", error, success: false });
  }
};

// ----------------------------------changes done
// const courseEvaluationByCompIdAndCourseId = async (req, res) => {
//   console.log("errrrs");

//  try {
//   const comp_id = req.params.comp_id;
//   const module_id = req.params.module_id;
//   if (!comp_id) {
//     return res.json({ message: "Company ID is not given", success: false });
//   }
//   if (!module_id) {
//     return res.json({ message: "Course ID is not given", success: false });
//   }
//   let q = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";
//   const result = await queryPromiseWithAsync(q, comp_id)
//   if (result.length <= 0) {
//     return res.json({ message: "Haven't purchased the Course Yet", success: false });
//   }
//   const sql = "SELECT lms_GradedAssesmentAnswersByEmployee.emp_id, lms_courseEmployee.emp_name, lms_courseEmployee.emp_email, lms_courseEmployee.course_code " +
//     "FROM lms_GradedAssesmentAnswersByEmployee " +
//     "JOIN lms_courseEmployee ON lms_GradedAssesmentAnswersByEmployee.emp_id = lms_courseEmployee.emp_id " +
//     "WHERE lms_GradedAssesmentAnswersByEmployee.comp_id = ? AND lms_GradedAssesmentAnswersByEmployee.module_id = ?";
//   const sqlResult = await queryPromiseWithAsync(sql,[comp_id, module_id]) 
//   if(sqlResult.length<=0){
//     return res.json({ message: "Data Not found", success: false });
//   }
//   return res.json({ message: "Success", data: sqlResult, success: true });
//  } catch (error) {
//   return res.json({message:"Internal Server Error",error:error,success:false})
//  }
// };


// const courseEvaluationByCompIdAndCourseId = async (req, res) => {
//   try {
//     const { comp_id, module_id } = req.params;

//     if (!comp_id) {
//       return res.status(400).json({ message: "Company ID is not provided", success: false });
//     }

//     if (!module_id) {
//       return res.status(400).json({ message: "Module ID is not provided", success: false });
//     }

//     let checkPurchaseQuery = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";
//     const purchaseResult = await queryPromiseWithAsync(checkPurchaseQuery, comp_id);

//     if (purchaseResult.length <= 0) {
//       return res.status(404).json({ message: "Haven't purchased the course yet", success: false });
//     }

//     const evaluationQuery = `
//       SELECT lms_GradedAssesmentAnswersByEmployee.emp_id, lms_courseEmployee.emp_name, lms_courseEmployee.emp_email, lms_courseEmployee.course_code 
//       FROM lms_GradedAssesmentAnswersByEmployee 
//       JOIN lms_courseEmployee ON lms_GradedAssesmentAnswersByEmployee.emp_id = lms_courseEmployee.emp_id 
//       WHERE lms_GradedAssesmentAnswersByEmployee.comp_id = ? AND lms_GradedAssesmentAnswersByEmployee.module_id = ?
//     `;

//     const evaluationResult = await queryPromiseWithAsync(evaluationQuery, [comp_id, module_id]);

//     if (evaluationResult.length <= 0) {
//       return res.status(404).json({ message: "Data not found", success: false });
//     }

//     return res.status(200).json({ message: "Success", data: evaluationResult, success: true });

//   } catch (error) {
//     console.error("Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
//   }
// };


// -----------------------------------changes done


// -----------------changes-done--------------------------------------


const getIncorrectTopicByCompanyId = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const module_id = req.params.module_id;

    if(!comp_id || ! module_id){
      return res.json({message:"Company Id Or Module Id is not provided",success:false})
    }
    // Fetch emp_id based on comp_id and course_id
    const empIdsResult = await new Promise((resolve, reject) => {
      const sql ="SELECT emp_id FROM lms_GradedAssesmentAnswersByEmployee WHERE comp_id = ? ";
      connection.query(sql, [comp_id], (err, resp) => {
        if (err) {
          console.log("errrr",err);
          reject(err);
        } else {
          // console.log(resp);
          resolve(resp.map((item) => item.emp_id));
        }
      });
    });
    if (empIdsResult.length <= 0) {
      return res.json({message:"This company's employee hasn't submitted answers for this Module.",
        success: false,});
    }
    const searchEmp ="SELECT emp_id, mcq_id, mcq_correctAnswer, mcq_selectedAnswer FROM lms_GradedAssesmentAnswersByEmployee WHERE module_id = ? AND emp_id IN(?)";
    const searchResp = await new Promise((resolve, reject) => {
      connection.query(searchEmp, [module_id,empIdsResult], (searchErr, searchResp) => {
        if (searchErr) {
          reject(searchErr);
        } else {
          resolve(searchResp);
        }
      });
    });
    if (searchResp?.length <= 0) {
      return res.json({ message: "No Data found for this company", success: false })
    }
    const incorrectQuestionIds = [];

    // Process each response
    for (let i = 0; i < searchResp?.length; i++) {
      const mcqId = JSON.parse(searchResp[i].mcq_id);
      const correctAnswer = JSON.parse(searchResp[i].mcq_correctAnswer);
      const selectedAnswer = JSON.parse(searchResp[i].mcq_selectedAnswer);

      const incorrectIds = checkAnswersWithQuestions(
        correctAnswer,
        selectedAnswer,
        mcqId
      );
      // console.log("incorrectIds",incorrectIds,"searchResp[i].mcq_id",searchResp[i].emp_id);
      incorrectQuestionIds.push(...incorrectIds);
    }
    // console.log("incorrectQuestionIds", incorrectQuestionIds);

    // Create a map to store the count of each question type
    const typeCountsMap = new Map();

    // Count occurrences of each question type
    incorrectQuestionIds.forEach((id) => {
      if (typeCountsMap.has(id)) {
        typeCountsMap.set(id, typeCountsMap.get(id) + 1);
      } else {
        typeCountsMap.set(id, 1);
      }
    });

    // Query the table to get the type of each question
    const getTypeQuery =
      "SELECT id, type FROM lms_CourseGradedAssessmentMCQ WHERE id IN (?)";
    const typeResp = await new Promise((resolve, reject) => {
      connection.query(
        getTypeQuery,
        [incorrectQuestionIds],
        (typeErr, typeResp) => {
          if (typeErr) {
            reject(typeErr);
          } else {
            resolve(typeResp);
          }
        }
      );
    });

    const typeCounts = {};
    for (let i = 0; i < typeResp?.length; i++) {
      const questionId = typeResp[i].id;
      const questionType = typeResp[i].type;
      const count = typeCountsMap.get(questionId) || 0;

      typeCounts[questionType] = (typeCounts[questionType] || 0) + count;
    }
    // console.log("typeCounts",typeCounts);

    return res.json({
      success: true,
      message: "Success",
      data: { uniqueTypes: Object.keys(typeCounts), typeCounts },
    });
  } catch (error) {
    return res.json({message: "Internal Server error",error: error,success: false,});
  }
};

function checkAnswersWithQuestions( correctAnswers,selectedAnswers,questionIds) {
  const incorrectQuestionIds = [];

  for (let i = 0; i < correctAnswers?.length; i++) {
    const correctAnswer = correctAnswers[i];
    const selectedAnswer = selectedAnswers[i];
    const questionId = questionIds[i];

    if (selectedAnswer !== correctAnswer) {
      incorrectQuestionIds.push(questionId);
    }
  }
  return incorrectQuestionIds;
}


// ----------------------------------------Upload Final mcq----------------------------------


const uploadFinalAssessmentMcq = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: "No file uploaded" });
    }
    const course_id = req.params.course_id
    if(!course_id){
      return res.json({message:"Course Id is not provided",success:false})
    }
    
    const filePath = req.file.path;
    let count = 0;
    const finalAssessmentStatus = 1;
    const category_id = 1;
    const category = "MCQ";
    const response = await csv().fromFile(filePath);

    for (const item of response) {
      count++;
      const query = `
            INSERT INTO lms_CourseGradedAssessmentMCQ (course_id ,questions, options, correctAnswer,category_id,category,finalAssessmentStatus)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          const optionsArray = [];
          if (item["Option A"]) optionsArray.push(item["Option A"].trim());
          if (item["Option B"]) optionsArray.push(item["Option B"].trim());
          if (item["Option C"]) optionsArray.push(item["Option C"].trim());
          if (item["Option D"]) optionsArray.push(item["Option D"].trim());
    
          const correctAnswer = item.CorrectAnswer.trim();
      connection.query(query, [
        course_id,
        item.Questions,
        JSON.stringify(optionsArray), // Assuming you want to store options as JSON string
        correctAnswer,
        category_id,
        category,
        finalAssessmentStatus
      ]);
    }
    return res.json({
      status: 202,
      success: true,
      msg: "File imported successfully",
      total_no_of_question_upoaded: count,
    });
  } catch (error) {
    console.log("Error in importUser:", error);
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};

const getAllFinalAssesmentMcqQuestion = async (req, res) => {
  try {
    const course_id = req.params.course_id
     if(!course_id){
      return res.json({message:"course Id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE course_id = ? AND finalAssessmentStatus = 1";
    connection.query(sql,[course_id], (err, resp) => {
      if (err) {
        console.log(err);
        return res.json({ msg: "Query Error", success: false, error: err });
      }
      const count = resp?.length;
      // if(resp?.length<=0){
      //   return res.json({})
      // }
      return res.json({
        msg: "data",
        count: count,
        questions: resp,
        success: true,
      });
    });
  } catch (error) {
    console.log("errr", error);
    return res.json({
      message: "Internal Server Error",
      success: false,
      error: error,
    });
  }
};

const updateFinalAssesmentMCQquestionsById = async (req, res) => {
  try {
    const id = req.params.id;
    // console.log("question_idquestion_id",id);
        if(!id){
      return res.json({message:" Id is not provided",success:false})
    }
    const { questions, options, correctAnswer } = req.body;
    // console.log("questions, options, correctAnswer ",questions, options, correctAnswer );

    // Check if at least one of the fields is provided
    if (!questions && !options && !correctAnswer) {
      return res.json({ msg: "No fields provided for update", success: false });
    }

    const updateFields = [];

    if (questions) {
      updateFields.push(`questions = '${questions}'`);
    }

    if (options) {
      updateFields.push(`options = '${options}'`);
    }

    if (correctAnswer) {
      updateFields.push(`correctAnswer = '${correctAnswer}'`);
    }

    const updateSql = `UPDATE lms_CourseGradedAssessmentMCQ SET ${updateFields.join(
      ","
    )} WHERE id = ?`;

    connection.query(updateSql, [id], (err, result) => {
      if (err) {
        console.error("Error updating MCQ questions:", err);
        return res.json({
          msg: "Error updating MCQ questions",
          success: false,
        });
      }
      // console.log("resultresultresult",result);

      if (result.affectedRows > 0) {
        return res.json({
          msg: "MCQ questions updated successfully",
          success: true,
        });
      } else {
        return res.json({ msg: "MCQ questions not found", success: false });
      }
    });
  } catch (error) {
    console.error("Error in updateMCQquestionsById:", error);
    return res.json({ msg: "Internal server error", success: false });
  }
};


const getFinalAssesmentMcqByQuestionId = async (req, res) => {
  try {
    const question_id = req.params.question_id;
     if(!question_id){
      return res.json({message:"Question Id is not provided",success:false})
    }
    console.log("question_idquestion_id",question_id);
    const sql = "SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE id =?";
    connection.query(sql, [question_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal error", success: false, error: err });
      }
      // console.log("resp", resp);
      return res.json({ message: "Success", success: true, data: resp[0] });
    });
  } catch (error) {
    return res.json({
      message: "Internal server Error",
      success: false,
      error: error,
    });
  }
};

const deleteFinalMcq = async(req,res)=>{
  try {
    const id = req.params.id
    const getMcq = 'SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE id = ? AND finalAssessmentStatus = 1'
    const result = await queryPromiseWithAsync(getMcq,id)
    if(result.length<=0){
    return res.json({message:"Deletion unsuccessfull",success:false})
    }
    const deleteQuery = 'DELETE FROM lms_TNA_MCQ WHERE id = ?';
    await queryPromiseWithAsync(deleteQuery, [mcq_id]);
    return res.json({message:"Deletion successfull",success:true})
  } catch (error) {
    return res.json({message:"Internal Server error",success:false,error:error})

  }
}


// -----------------------------------Final Assessment Other -----------------------


const uploadFinalAssesmentOtherQuestion = async (req, res) => {
  try {
    const course_id = req.params.course_id;
    const finalAssessmentStatus =1
    if (!course_id) {
      return res.status(400).json({ success: false, message: "Course id does not provided" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const filePath = req.file.path;
    let count = 0;
    const response = await csv().fromFile(filePath);

    for (const item of response) {
      // Map the category to category_id
      const categoryId =
        item.Category.toLowerCase() === "email"
          ? 3
          : item.Category.toLowerCase() === "text"
            ? 2
            : item.Category.toLowerCase() === "audio"
              ? 4
              : null;
      const category =
        item.Category.toLowerCase() === "email"
          ? "Email"
          : item.Category.toLowerCase() === "text"
            ? "Text"
            : item.Category.toLowerCase() === "audio"
              ? "Audio"
              : null;

      // Check if a valid category is found
      if (categoryId !== null || category !== null) {
        count++;
        const query = `
                    INSERT INTO lms_GradedAssementOtherQuestions (course_id,category,category_id, topic,finalAssessmentStatus)
                    VALUES (?,?,?, ?,?)
                `;

        // Assuming you have a MySQL connection object named 'connection'
        await connection.query(query, [
          course_id,
          category,
          categoryId,
          item.Topics,
          finalAssessmentStatus
        ]);
      }
    }
    return res.json({
      status: 202,
      success: true,
      message: "File imported successfully",
      total_question: count,
    });
  } catch (error) {
    console.log("Error in emailAndTextQuestionUpload:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const getAllFinalAssesmentEmailQuestions = async (req, res) => {
  try {
    const course_id = req.params.course_id
     if(!course_id){
      return res.json({message:"course Id is not provided",success:false})
    }
    const getCategorySQL =
      "SELECT * FROM lms_GradedAssementOtherQuestions WHERE category=? AND course_id = ? AND finalAssessmentStatus = 1";
    const category = "Email";

    connection.query(getCategorySQL, [category,course_id], async (err, resp) => {
      if (err) {
        console.log(err.message);
        return res.json({ message: "error Occurred", error: err, success: false });
      }
      const count = resp?.length;
      return res.json({
        msg: "done",
        count: count,
        questions: resp,
        success: true,
      });
    });
  } catch (error) {
    console.log("error", error);
    return res.json({ msg: "error", error, success: false });
  }
};

const getAllFinalAssesmentTextQuestions = async (req, res) => {
  try {
    const course_id = req.params.course_id
     if(!course_id){
      return res.json({message:"course Id is not provided",success:false})
    }
    const getCategorySQL =
      "SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = ? AND course_id = ? AND finalAssessmentStatus = 1";
    const category = "Text";

    connection.query(getCategorySQL, [category,course_id], async (err, resp) => {
      if (err) {
        console.log(err.message);
        return res.json({ msg: "error", error: err });
      }
      const count = resp?.length;
      return res.json({ msg: "done", count: count, questions: resp });
    });
  } catch (error) {
    console.log("error", error);
    return res.json({ msg: "error", error });
  }
};

const getAllFinalAssesmentAudioQuestions = async (req, res) => {
  try {
    const course_id = req.params.course_id
     if(!course_id){
      return res.json({message:"course Id is not provided",success:false})
    }
    const getCategorySQL ="SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = ? AND course_id = ? AND finalAssessmentStatus = 1";
    const category = "Audio";

    connection.query(getCategorySQL, [category,course_id], async (err, resp) => {
      if (err) {
        console.log(err.message);
        return res.json({ message: "error", error: err });
      }
      const count = resp?.length;
      return res.json({ message: "Successful", count: count, questions: resp });
    });
  } catch (error) {
    console.log("error", error);
    return res.json({ message: "Internal Server Error", error:error });
  }
};

const getFinalAssesmentOtherQuestionByQuestionId = async (req, res) => {
  try {
    const question_id = req.params.question_id;
        if(!question_id){
      return res.json({message:"Question Id is not provided",success:false})
    }
    // console.log("question_id", question_id);
    const sql = "SELECT * FROM lms_GradedAssementOtherQuestions WHERE id =?";
    connection.query(sql, [question_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal error", success: false, error: err });
      }
      // console.log(resp);
      return res.json({ message: "Success", success: true, data: resp });
    });
  } catch (error) {
    return res.json({
      message: "Internal server Error",
      success: false,
      error: error,
    });
  }
};

const updateFinalAssesmentEmailQuestionById = async (req, res) => {
  const id = req.params.question_id;
      if(!id){
      return res.json({message:"Question Id is not provided",success:false})
    }
  const questions = req.body;
  const sql = "UPDATE lms_FinalAssessmentOtherQuestions SET topic = ? WHERE id =?";
  connection.query(sql, [questions.topic, id], (err, resp) => {
    if (err) {
      return res.json({message: "Error In Querry",success: false, error: err});
    }

    return res.json({ message: "Successfully updated", success: true });
  });
};

const updateFinalAssesmentTextQuestionById = async (req, res) => {
  const id = req.params.question_id;
      if(!id){
      return res.json({message:"Question Id is not provided",success:false})
    }
  const questions = req.body;

  const sql = "UPDATE lms_GradedAssementOtherQuestions SET topic = ? WHERE id =?";

  connection.query(sql, [questions.topic, id], (err, resp) => {
    if (err) {
      return res.json({
        message: "Error In Querry",
        success: false,
        error: err,
      });
    }

    return res.json({ message: "Successfully updated", success: true });
  });
};

const updateFinalAssesmentAudioQuestionById = async (req, res) => {
  const id = req.params.question_id;
  const questions = req.body;
      if(!id){
      return res.json({message:"Question Id is not provided",success:false})
    }

  const sql = "UPDATE lms_GradedAssementOtherQuestions SET topic = ? WHERE id =?";

  connection.query(sql, [questions.topic, id], (err, resp) => {
    if (err) {
      return res.json({
        message: "Error In Querry",
        success: false,
        error: err,
      });
    }

    return res.json({ message: "Successfully updated", success: true });
  });
};

const updateFinalAssesmentOtherQuestionsById = async (req, res) => {
  try {
    const question_id = req.params.question_id;
    const questions = req.body.question;
        if(!question_id || ! questions){
      return res.json({message:"Question Id Or Questions is not provided",success:false})
    }
   
    const sql = "UPDATE lms_GradedAssementOtherQuestions SET topic = ? WHERE id =?";

    connection.query(sql, [questions, question_id], (err, resp) => {
      if (err) {
        return res.json({
          message: "Error In Querry",
          success: false,
          error: err,
        });
      }

      return res.json({ message: "Successfully updated", success: true });
    });
  } catch (error) {
    console.log("error", error);
  }
};

const deleteFinalOtherQuestion = async(req,res)=>{
  try {
    const id = req.params.id
    const getQuerry = 'SELECT * FROM lms_GradedAssementOtherQuestions WHERE id = ? AND finalAssessmentStatus = 1 '
    const result = await queryPromiseWithAsync(getQuerry,id)
    if(result.length<=0){
    return res.json({message:"Deletion unsuccessfull",success:false})
    }
    const deleteQuery = 'DELETE FROM lms_GradedAssementOtherQuestions WHERE id = ?';
    await queryPromiseWithAsync(deleteQuery, [id]);
    return res.json({message:"Deletion successfull",success:true})
  } catch (error) {
    return res.json({message:"Internal Server error",success:false,error:error})

  }
}

// --------------------------------Final Assessment----------------------

const finalAssesmentAnswerByEmployee = async (req, res) => {
  try {
  if(!req.body){
   
      return res.json({message:"Data not provided",success:false})
    }
     const mcqSet = req.body.mcq;
    const emp_id = req.params.emp_id;
    const course_id = req.params.course_id;
    const mcq_selectedAnswer = req.body.mcq_selectedAnswer; // In Array of string
    const email_answer = req.body.email_answer; // In Array of string
    const text_answer = req.body.text_answer; // In Array of string
    const mcq_score = req.body.mcq_score;
     if(!course_id || ! emp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = "select comp_id FROM lms_courseEmployee WHERE emp_id = ?";
    connection.query(sql, [emp_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal Error", error: err, success: false });
      }
    });
    if (Array.isArray(mcqSet)) {
      const mcqQuestions = mcqSet.filter((item) => item.category === "MCQ");
      const textQuestions = mcqSet.filter((item) => item.category === "Text");
      const emailQuestions = mcqSet.filter((item) => item.category === "Email");
      const audioQuestions = mcqSet.filter((item) => item.category === "Audio");
      const mcqIdArray = mcqQuestions.map((v) => v.id);
      const textIdArray = textQuestions.map((v) => v.id)
      const emailIdArray = emailQuestions.map((v) => v.id)
      const audioIdArray = audioQuestions.map((v) => v.id)
      const mcqQuestionsArr = mcqQuestions.map((v) => v.questions);
      const optionsArr = mcqQuestions.map((v) => v.options);
      const correctAnswerArr = mcqQuestions.map((v) => v.correctAnswer);
      const emailQuestionArr = emailQuestions.map((v) => v.topic);
      const textQuestionArr = textQuestions.map((v) => v.topic);
      const audioQuestionArr = audioQuestions.map((v) => v.topic);
      const mcq_score_outOff = mcqIdArray?.length * 2;
      const selectSql =
        "SELECT comp_id FROM lms_courseEmployee WHERE emp_id = ?";
      connection.query(selectSql, [emp_id], (err, resp) => {
        if (err) {
          console.log("err in SELECT query", err);
          return res.json({ message: "error in SELECT query", success: false });
        }
        if (resp?.length === 0) {
          console.log("No user found for emp_id:", emp_id);
          return res.json({ message: "No user found", success: false });
        }
        const comp_id = resp[0].comp_id;
        const finalAssessmentStatus=1
        const checkEmployeeSql =
          "SELECT COUNT(*) AS count FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus = 1";
        connection.query(
          checkEmployeeSql,
          [emp_id, course_id],
          (checkErr, checkResults) => {
            if (checkErr) {
              console.log("err in checking employee existence", checkErr);
              return res.json({
                message: "error in checking employee existence",
                success: false,
              });
            }
            // console.log("checkResults", checkResults);
            if (checkResults[0].count > 0) {
              return res.json({message:"Your answer has been submitted  before",success:false})
              // // const updateSql = `
              // //               UPDATE lms_GradedAssesmentAnswersByEmployee 
              // //               SET mcq_id=?,text_id = ?,email_id=?,audio_id = ?, mcq_questions = ?, mcq_options = ?, mcq_correctAnswer = ?, mcq_selectedAnswer = ?,
              // //                   email_question = ?, email_answer = ?, text_question = ?, text_answer = ?,audio_question = ? , mcq_score = ?,mcq_score_outOff=?,text_score =0,text_score_outOff=0,email_score=0,email_score_outOff=0,audio_score=0,audio_score_outOff=0,total_score=0,out_off=0, attempt = attempt + 1
              // //               WHERE emp_id = ? AND course_id =? AND finalAssessmentStatus = ?
              // //           `;
              // // console.log("audioQuestionArr", audioQuestionArr);
              // connection.query(
              //   updateSql,
              //   [
              //     JSON.stringify(mcqIdArray),
              //     JSON.stringify(textIdArray),
              //     JSON.stringify(emailIdArray),
              //     JSON.stringify(audioIdArray),
              //     JSON.stringify(mcqQuestionsArr),
              //     JSON.stringify(optionsArr),
              //     JSON.stringify(correctAnswerArr),
              //     JSON.stringify(mcq_selectedAnswer),
              //     JSON.stringify(emailQuestionArr),
              //     JSON.stringify(email_answer),
              //     JSON.stringify(textQuestionArr),
              //     JSON.stringify(text_answer),
              //     JSON.stringify(audioQuestionArr),
              //     mcq_score,
              //     mcq_score_outOff,
              //     emp_id,
              //     course_id,
              //     finalAssessmentStatus
              //   ],
              //   (updateErr, updateResults) => {
              //     if (updateErr) {
              //       console.log("err in UPDATE query", updateErr);
              //       return res.json({
              //         message: "error in UPDATE query",
              //         success: false,
              //       });
              //     }
              //     console.log("updateResults", updateResults);
              //     return res.json({ message: "done", success: true });
              //   }
              // );
            } else {
              console.log("Insert");
              const insertSql = `
                            INSERT INTO lms_GradedAssesmentAnswersByEmployee 
                                (comp_id, emp_id,course_id,mcq_id,text_id,email_id,audio_id, mcq_questions, mcq_options, mcq_correctAnswer, mcq_selectedAnswer,
                                email_question, email_answer, text_question, text_answer,audio_question, mcq_score, mcq_score_outOff,attempt,finalAssessmentStatus) 
                            VALUES (?,?, ?, ?,?,?, ?,?, ?, ?,?,?, ?, ?, ?, ?, ?,?,1, 1)
                        `;

              connection.query(
                insertSql,
                [
                  comp_id,
                  emp_id,
                  course_id,
                  JSON.stringify(mcqIdArray),
                  JSON.stringify(textIdArray),
                  JSON.stringify(emailIdArray),
                  JSON.stringify(audioIdArray),
                  JSON.stringify(mcqQuestionsArr),
                  JSON.stringify(optionsArr),
                  JSON.stringify(correctAnswerArr),
                  JSON.stringify(mcq_selectedAnswer),
                  JSON.stringify(emailQuestionArr),
                  JSON.stringify(email_answer),
                  JSON.stringify(textQuestionArr),
                  JSON.stringify(text_answer),
                  JSON.stringify(audioQuestionArr),
                  mcq_score,
                  mcq_score_outOff,
                ],
                (insertErr, insertResults) => {
                  if (insertErr) {
                    console.log("err in INSERT query", insertErr);
                    return res.json({
                      message: "error in INSERT query",
                      success: false,
                    });
                  }
                  console.log("insertResults", insertResults);
                  return res.json({ message: "done", success: true });
                }
              );
            }
          }
        );
      });
    }
  } catch (error) {
    console.log("Error:", error);
    return res.json({ message: "Error", success: false });
  }
};

const finalAssesmentAudioAnswer = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    const course_id = req.params.course_id;
    const finalAssessmentStatus = 1
     if(!emp_id || !course_id){
      return res.json({message:"Employee Id Or Course Id is not provided",success:false})
    }

    // Check if a file is uploaded
    if (!req.file) {
      // If no file is uploaded, set audio_answer to an empty string
      const updateQuery = 'UPDATE lms_GradedAssesmentAnswersByEmployee SET audio_answer = ? WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus  = ?';
      await queryPromiseWithAsync(updateQuery, ["", emp_id, course_id,finalAssessmentStatus]);
      
      return res.status(200).json({ message: "No file uploaded, audio answer set to empty string", success: true });
    }

    const audio = req.file;
    console.log("Audio file:", audio);
    console.log("Employee ID:", emp_id);
    console.log("Course ID:", course_id);
    console.log("Body:", req.body);

    // Assuming you have a function `queryPromiseWithAsync` to handle database queries asynchronously
    const searchEmpAnswer = 'SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus = 1';
    const searchResult = await queryPromiseWithAsync(searchEmpAnswer, [emp_id, course_id]);

    if (searchResult?.length <= 0) {
      return res.status(404).json({ message: "Employee's answer not found", success: false });
    }

    const updateQuery = 'UPDATE lms_GradedAssesmentAnswersByEmployee SET audio_answer = ? WHERE emp_id = ? AND course_id = ? AND finalAssessmentStatus = 1';
    const updateResult = await queryPromiseWithAsync(updateQuery, [audio.filename, emp_id, course_id]);

    return res.json({ message: "Audio file uploaded successfully", success: true });

  } catch (error) {
    console.error("Internal server error:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

const randomFinalAssementQuestions = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const course_id = req.params.course_id;
     if(!comp_id || !course_id){
      return res.json({message:"Company Id  Or Course Id is not provided",success:false})
    }
    const licenseSql = "SELECT * FROM lms_CourseCompany WHERE comp_id = ?";
    connection.query(licenseSql, [comp_id], async (licenseErr, licenseResp) => {
      if (licenseErr) {
        return res.json({
          message: "Fatal error in license query",
          success: false,
        });
      }

      if (licenseResp?.length <= 0) {
        return res.json({
          message: "Company hasn't purchased the Course license",
          success: false,
        });
      }

      // Fetch 10 random questions from lms_TNA_MCQ
      const mcqSql = `SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE course_id = ${course_id} AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 10`;
      const questions = await queryPromise(mcqSql);

      // Fetch one random email question from lms_EmailAndTextQuestions
      const randomEmailSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Email" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
      const randomEmailResult = await queryPromise(randomEmailSql);

      // Fetch one random text question from lms_EmailAndTextQuestions
      const randomTextSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Text" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
      const randomTextResult = await queryPromise(randomTextSql);

      // Fetch one random audio question from lms_EmailAndTextQuestions
      const randomAudioSql = `SELECT * FROM lms_GradedAssementOtherQuestions WHERE category = "Audio" AND course_id = ${course_id}  AND finalAssessmentStatus = 1 ORDER BY RAND() LIMIT 1`;
      const randomAudioResult = await queryPromise(randomAudioSql);

      // Check if all queries were successful
      if (randomEmailResult && randomTextResult && randomAudioResult) {
        const shuffledQuestionsA = [...questions].sort(() => Math.random() - 0.5);

        // Check if any of the result arrays are empty
        if (randomEmailResult?.length === 0) {
          shuffledQuestionsA.push([]);
        } else {
          shuffledQuestionsA.push(randomEmailResult[0]);
        }

        if (randomTextResult?.length === 0) {
          shuffledQuestionsA.push([]);
        } else {
          shuffledQuestionsA.push(randomTextResult[0]);
        }

        if (randomAudioResult?.length === 0) {
          shuffledQuestionsA.push([]);
        } else {
          shuffledQuestionsA.push(randomAudioResult[0]);
        }

        const sets = {
          setA: shuffledQuestionsA,
        };

        // console.log("sets", sets.setA);
        return res.json({ message: "data received", data: sets, success: true });
      } else {
        return res.json({ message: "Error in fetching questions", success: false });
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({
      error: error,
      message: "error in getMcq Api",
      success: false,
    });
  }
};

const finalAssesmentManagementQuestions = async (req, res) => {
  try {
    const course_id = req.params.course_id
    const finalAssessmentStatus =1
     if(!course_id){
      return res.json({message:"Course Id is not provided",success:false})
    }
    const mcqResult = await getFinalAssesmentMCQData(course_id,finalAssessmentStatus);
    // Fetch Other Questions Management Data
    const otherResult = await getFinalAssesmentOtherQuestionsData(course_id,finalAssessmentStatus);
   return res.status(200).json({
      message: "Data fetched successfully",
      mcqResult,
      otherResult,
      success: true,
    });
  } catch (error) {
    console.error("Error in finalAssesmentManagementQuestions:", error);
    res.status(500).json({ message: "Internal server error", error:error, success: false });
  }
};

async function getFinalAssesmentMCQData(course_id, finalAssessmentStatus) {
  try {
    const mcqCategorySQL = "SELECT category FROM lms_CourseGradedAssessmentMCQ WHERE course_id = ? AND finalAssessmentStatus = ?";
    const mcqCategories = await queryPromise(mcqCategorySQL, [course_id, finalAssessmentStatus]);
    if (mcqCategories?.length <= 0) {
      return 0
    }
    const resultData = await Promise.all(
      mcqCategories.map(async (mcqCategory) => {
        const getCategoryCountSQL = `SELECT COUNT(*) as count FROM lms_CourseGradedAssessmentMCQ WHERE category = '${mcqCategory.category}' AND course_id = ${course_id} AND finalAssessmentStatus = ${finalAssessmentStatus} `;
        const getTopicsSQL = `SELECT topic FROM lms_CourseGradedAssessmentMCQ WHERE category = '${mcqCategory.category}'AND course_id = ${course_id} AND finalAssessmentStatus = ${finalAssessmentStatus} `;

        const [countResult, topicsResult] = await Promise.all([
          queryPromise(getCategoryCountSQL),
          queryPromise(getTopicsSQL),
        ]);

        const count = countResult[0].count;
        const topics = topicsResult.map((topic) => topic.topic);

        const mcqData = {
          category: mcqCategory.category,
          count,
          topics,
        };
        // console.log("mcqData",mcqData);

        return mcqData;
      })
    );
    // console.log("resultData",resultData);

    return resultData[0];
  } catch (error) {
    console.error("Error in getMCQData:", error);
    throw error;
  }
}

async function getFinalAssesmentOtherQuestionsData(course_id, finalAssessmentStatus) {
  try {
    const getCategorySQL = "SELECT category FROM lms_GradedAssementOtherQuestions WHERE course_id =? AND finalAssessmentStatus = ?";
    const categories = await queryPromise(getCategorySQL, [course_id, finalAssessmentStatus]);
    const result = await Promise.all(
      categories.map(async (category) => {
        const getCategoryCountSQL = `SELECT COUNT(*) as count FROM lms_GradedAssementOtherQuestions WHERE category = '${category.category}'AND course_id = ${course_id} AND finalAssessmentStatus = ${finalAssessmentStatus} `;
        const getTopicsSQL = `SELECT topic FROM lms_GradedAssementOtherQuestions WHERE category = '${category.category}'AND course_id = ${course_id} AND finalAssessmentStatus = ${finalAssessmentStatus} `;

        const [countResult, topicsResult] = await Promise.all([
          queryPromise(getCategoryCountSQL),
          queryPromise(getTopicsSQL),
        ]);

        const count = countResult[0].count;
        const topics = topicsResult.map((topic) => topic.topic);

        return {
          category: category.category,
          count,
          topics,
        };
      })
    );

    // Separate the data for email and text
    const emailData = result.find(
      (item) => item.category.toLowerCase() === "email"
    ) || { count: 0 };
    const textData = result.find(
      (item) => item.category.toLowerCase() === "text"
    ) || { count: 0 };
    const audioData = result.find(
      (item) => item.category.toLowerCase() === "audio"
    ) || { count: 0 };

    return {
      emailResult: emailData,
      textResult: textData,
      audioResult: audioData
    };
  } catch (error) {
    console.error("Error in getOtherQuestionsData:", error);
    throw error;
  }
}

// ------------------------------------FInal Employee------------------------

const getFinalAssesmentEmployee = async(req,res)=>{
  try {
    const comp_id = req.params.comp_id
    const course_id = req.params.course_id
        if(!comp_id || ! course_id){
      return res.json({message:"Company Id  Or Course Id is not provided",success:false})
    }

    const selectQuery = 'SELECT emp_id FROM lms_GradedAssesmentAnswersByEmployee  WHERE comp_id = ? AND course_id = ? AND finalAssessmentStatus = 1'

    const result = await queryPromiseWithAsync(selectQuery,[comp_id,course_id])
    if(result?.length<=0){
      return res.json({message:"No data found",success:false})

    }
    let data =[]
  for (const v of result) {
    const sql = "SELECT id, emp_name, emp_email FROM lms_employee WHERE id = ?";
    const resultOfSql = await queryPromiseWithAsync(sql, v.emp_id);
    // console.log("resultOfSql", resultOfSql[0]);
    data.push(resultOfSql[0]);
  }
  return res.json({ message: "Success", data: data, success: true });

  } catch (error) {
    return res.json({ message: "Internal Server Error", success: false });
  }
}


const getDatafromFinalAssesmentEmployeeAnswer = async (req, res) => {
  const emp_id = req.params.emp_id;
  const course_id = req.params.course_id;
    if(!emp_id || ! course_id){
      return res.json({message:"Employee Id  Or Course Id is not provided",success:false})
    }

  const finalAssessmentStatus = 1
  const sql ="SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id =? AND course_id =? AND finalAssessmentStatus = ?";
  connection.query(sql, [emp_id, course_id,finalAssessmentStatus], (err, resp) => {
    if (err) {
      console.log("err", err);
      return res.json({
        error: err.message,
        message: "error in query",
        success: false,
      });
    }
    if (resp?.length <= 0) {
      console.log("Haven't submitted the graded assement of this course");
      return res.json({
        message: "Haven't submitted the graded assement of this course",
        success: false,
      });
    }   
    const parsedResp = resp.map((entry) => {
      return {
        ...entry,
        mcq_options: JSON.parse(entry.mcq_options)     
      };
    });
 

    return res.json({ message: "done", success: true, data: parsedResp });
  });
};

const updateFinalAssesmentScore = async (req, res) => {
  const id = req.params.emp_id;
  const course_id = req.params.course_id
    if(!id || ! course_id){
      return res.json({message:"Id  Or Course Id is not provided",success:false})
    }
      if(!req.body){
      return res.json({message:"Data not provided",success:false})
    }
  const mcq_score = req.body.mcq.mcq_score;
  const mcq_score_outOff = req.body.mcq.mcq_score_out_off;
  const email_score = req.body.email.email_score;
  const email_score_outOff = req.body.email.email_score_out_off;
  const text_score = req.body.text.text_score;
  const text_score_outOff = req.body.text.text_score_out_off;
  const audio_score = req.body.audio.audio_score
  const audio_score_outOff = req.body.audio.audio_score_out_off
  const out_off = mcq_score_outOff + email_score_outOff + text_score_outOff + audio_score_outOff;
  const total_score = mcq_score + email_score + text_score + audio_score;
  // console.log(req.body);
  // console.log("id",id);
  // console.log("mcq_score",mcq_score);
  // console.log("mcq_score_outOff",mcq_score_outOff);
  // console.log("email_score",email_score);
  // console.log("email_score_outOff",email_score_outOff);
  // console.log("text_score",text_score);
  // console.log("text_score_outOff",text_score_outOff);
  // console.log("out_off",out_off);
  // console.log("total_score",total_score);

  try {
    const updateQuery = `
        UPDATE lms_GradedAssesmentAnswersByEmployee
        SET
        mcq_score = COALESCE(?, mcq_score),
        mcq_score_outOff = COALESCE(?, mcq_score_outOff),
        email_score_outOff = COALESCE(?, email_score_outOff),
        text_score_outOff = COALESCE(?, text_score_outOff),
            out_off = COALESCE(?, out_off),
            email_score = COALESCE(?, email_score),
        text_score = COALESCE(?, text_score),
        total_score = COALESCE(?, total_score),
        audio_score = COALESCE(?, audio_score),
        audio_score_outOff = COALESCE(?, audio_score_outOff)
        WHERE
        emp_id = ? AND course_id = ? AND finalAssessmentStatus = 1
      `;

    // Execute the update query
    await connection.query(
      updateQuery,
      [mcq_score,mcq_score_outOff,email_score_outOff,text_score_outOff,out_off,
        email_score,
        text_score,
        total_score,
        audio_score,
        audio_score_outOff,
        id,
        course_id
      ],
      (err, resp) => {
        if (err) {
          console.log("err", err);
          return res.status(500).json({ success: false, message: "Fatal error", error: err });
        }
        return res.json({
          data: resp,
          success: true,
          message: "Data Updated successfully",
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
};


// -------------------------------------Final Report------------------------------
const finalAssessmentReport = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
      if(!comp_id ){
      return res.json({message:"Company Id is not provided",success:false})
    }
    
    const searchCourseId = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?'
    const result = await queryPromiseWithAsync(searchCourseId,comp_id)
    if(result.length<=0){
      return res.json({message:"company haven't purchase course yet",success:false})
    }

    const sql = `SELECT t.emp_id, e.emp_name, e.emp_email, t.mcq_score, t.email_score, t.text_score,t.total_score,t.out_Off 
            FROM lms_GradedAssesmentAnswersByEmployee t
            JOIN lms_courseEmployee e ON t.emp_id = e.emp_id
            WHERE t.course_id = ? AND t.finalAssessmentStatus = 1 AND t.comp_id = ?;
        `;

    connection.query(sql, [result[0].course_id,comp_id], (err, resp) => {
      if (err) {
        console.log("Error:", err.message);
        return res.json({
          message: "Error occurred in API/query",
          success: false,
        });
      }
      if (resp.length <= 0) {
        return res.json({ message: "Company Data Not found" ,success:false});
      }
      return res.json({ message: "Successful", data: resp, success: true });
    });
  } catch (error) {
    console.log("Error:", error);
    return res.json({ message: "Internal server error", success: false ,error:error});
  }
};

const finalReportById = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    console.log("emp_idemp_id",emp_id);
    if(!emp_id){
      return res.json({message:"Employee id is not provided",success:false})
    }
    const sql = "SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id =? AND finalAssessmentStatus = 1";
    connection.query(sql, [emp_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal Error", success: false, error: err });
      }
      if (resp?.length <= 0) {
        return res.json({ message: "No data found", success: false, notFound: true });
      }
      // console.log("resp", resp[0]);
      const {
        mcq_questions,
        text_question,
        email_question,
        audio_question,
        mcq_score,
        mcq_score_outOff,
        email_score,
        email_score_outOff,
        text_score,
        text_score_outOff,
        audio_score,
        audio_score_outOff,
        total_score,
        out_off,
      } = resp[0];

      const result = {
        MCQ: {
          question_count: JSON.parse(mcq_questions)?.length,
          score: mcq_score,
          out_off: mcq_score_outOff,
        },
        Text: {
          question_count: JSON.parse(text_question)?.length,
          score: text_score,
          out_off: text_score_outOff,
        },
        Email: {
          question_count: JSON.parse(email_question)?.length,
          score: email_score,
          out_off: email_score_outOff,
        },
        Oral: {
          question_count: JSON.parse(audio_question).length,
          score: audio_score,
          out_off: audio_score_outOff,
        },
        total_score: total_score,
        out_off: out_off,
      };
    const passedFailed = Math.round(total_score / out_off *100) > 70 ? "Pass" : "Fail"

      return res.json({ message: "success", data: result,result:passedFailed, success: true });
    });
  } catch (error) {
    console.log("err", error);
  }
};

const checkFinalAssessmentQuestion = async(req,res)=>{
  try {
    const checkMcq = 'SELECT * FROM lms_CourseGradedAssessmentMCQ WHERE finalAssessmentStatus = 1 '
    const checkMcqResult = await queryPromiseWithAsync(checkMcq)
    const checkOther= 'SELECT * FROM lms_GradedAssementOtherQuestions WHERE finalAssessmentStatus = 1 '
    const checkOtherResult = await queryPromiseWithAsync(checkOther)
    if(checkMcqResult.length<=0||checkOtherResult<=0){
  
      return res.json({message:"No final Assessment is created",success:false})
    }
    return res.json({message:"final Assessment is created",success:true})
  } catch (error) {
    return res.json({message:"Internal Server Error",success:false,error:error})
    
  }
}




// ---------------------------------------Notification-------------------------------
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

// const getNotify = async (req, res) => {
//   try {
//     const sql = 'SELECT * FROM lms_Notify';
//     const notifyResults = await queryPromiseWithAsync(sql);

//     if (notifyResults?.length <= 0) {
//       // console.log("No data found")
//       res.status(200).json({ message: "No Data Found", success: false });
//       return;
//     }
//     const notifications = [];
//     for (const notify of notifyResults) {
//       // console.log("notify",notify);
//       const sqlGetEmployeeName = 'SELECT emp_name FROM lms_courseEmployee WHERE emp_id = ?';
//       const employeeResult = await queryPromiseWithAsync(sqlGetEmployeeName, notify.emp_id);

//       const sqlGetCompanyName = 'SELECT comp_name FROM lms_companyDetails WHERE id = ?'
//       const companyResult = await queryPromiseWithAsync(sqlGetCompanyName,notify.comp_id)
//       const sqlGetModuleName = 'SELECT module_name FROM lms_Module WHERE id = ?';
//       const moduleResult = await queryPromiseWithAsync(sqlGetModuleName, notify.module_id);

//       if (employeeResult?.length > 0 && moduleResult?.length > 0) {
//         notifications.push({
//           id:notify.id,
//           emp_id:notify.emp_id,
//           comp_id:notify.comp_id,
//           module_id:notify.module_id,
//           comp_name:companyResult[0].comp_name,
//           emp_name: employeeResult[0].emp_name,
//           module_name: moduleResult[0].module_name,
//           status: notify.Reattempt == 1 ? 'Reattempted' : 'Attempted',
//         });
//       }
//     }
//   //  console.log("notifications",notifications);
//     return res.status(200).json({ data: notifications, success: true });
//   } catch (error) {
//     return  res.status(500).json({ message: "Internal Server Error", success: false });
//   }
// }


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
          id: notify?.id,
          emp_id: notify?.emp_id,
          comp_id: notify?.comp_id,
          module_id: notify?.module_id,
          comp_name: companyResult?.[0]?.comp_name,
          emp_name: employeeResult?.[0]?.emp_name,
          module_name: moduleResult?.[0]?.module_name,
          status: notify?.Reattempt == 1 ? 'Reattempted' : 'Attempted',
        };
      } else {
        return null;
      }
    }));

    // Filter out null results
    const filteredNotifications = notifications?.filter(notification => notification !== null);

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
    if (deletedResult?.affectedRows === 0) {
      return res.status(500).json({ message: "Data not deleted", success: false });
    }
    return res.status(200).json({ message: "Data deleted successfully", success: true });

  } catch (error) {
    console.error("Error deleting notification data:", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

// ------------------------------------------Archive--------------------------------------
const archiveCompany= async(req,res)=>{
  try {
    const comp_id = req.params.comp_id;
    const deleteCompany = "UPDATE lms_companyDetails SET Archive_status = 0 WHERE id=?";

    const result = await queryPromiseWithAsync(deleteCompany, comp_id)
    if(result?.length<=0){
      return res.json({message:"data not found",success:false})
    }
      // Check if any rows were affected to determine if the video was deleted successfully
      const deletedRows = result?.affectedRows;
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
      const restoredRows = result?.affectedRows;
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
    const id = result?.map((value) => {
      return value?.id;
    });
    const compName = result?.map((value) => {
      return value?.comp_name;
    });
    return res.json({id: id,comp_name: compName,compData: result,success: true,});
  }
  catch (error) {
    console.log(error);
    return res.json({message: "error in fetching data",success: false,error: error,});
  }
};

// ---------------------------------------miscellaneous---------------
const getEmployeeByCompanyIds = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const sql = "SELECT id, emp_name, emp_email, contact_no FROM lms_employee WHERE comp_id = ?";
    const result = await queryPromiseWithAsync(sql,comp_id)
    if(result?.length<=0){
      return res.json({ message: "Employee not found for these company", success: false });
    }
    return res.json({ message: "Employee found for these company", success: true,data:result })
  } catch (error) {
    console.log("Error", error);
    return res.json({ message: "Internal server Error", success: false, error: error });
  }
};

const updateCourseStatusApi = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const module_id = req.body.module_id
    const status = req.body.status;
    if(!comp_id || ! module_id){
      return res.json({message:"Company Id Or module Id is not provided",success:false})
    }
   
    const sql = "UPDATE lms_CourseAllotmentToCompany SET status = ? WHERE comp_id = ? AND module_id =?";
    connection.query(sql, [status, comp_id, module_id], (err, resp) => {
      if (err) {
        return res.json({
          error: err.message,
          message: "error in query",
          success: false,
        });
      } else {
        return res.json({ message: "status updated", success: true });
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({error: err.message,message: "Internal server Error",success: false,
    });
  }
};

const getCourseAccessByCompId = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const searchCourseID = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?'
    const searchedResult = await queryPromiseWithAsync(searchCourseID,comp_id)
    const course_id = searchedResult?.[0]?.course_id
    if(!course_id){
      return res.json({message:"Unable to get Course Id ",success:false})
    }
    
    const searchQuery = "SELECT module_id, status FROM lms_CourseAllotmentToCompany WHERE comp_id=? AND course_id =?";
    const searchResult = await queryPromiseWithAsync(searchQuery, [comp_id,course_id]);
    if (searchResult?.length <= 0) {
      return res.json({ message: "No course assigned to this company", success: false });
    }

    // Extract course IDs from searchResult
    const moduleIds = searchResult?.map((row) => row?.module_id);

    // Fetch course names based on course IDs
    const searchQueryForCourseNames = 'SELECT id, module_name FROM lms_Module WHERE id IN (?)';
    const moduleNamesResult = await queryPromiseWithAsync(searchQueryForCourseNames, [moduleIds]);

    // Map course IDs to course names
    const moduleNameMap = {};
    moduleNamesResult?.forEach((row) => {
      moduleNameMap[row?.id] = row?.module_name;
    });

    // Add course names to searchResult
    const searchResultWithCourseNames = searchResult?.map((row) => ({
      module_id: row?.module_id,
      status: row?.status,
      module_name: moduleNameMap[row?.module_id],
    }));
   
    return res.json({ message: "Successful", success: true, data: searchResultWithCourseNames });
  } catch (error) {
    console.log("Internal server Error", error);
    return res.json({ message: "Internal server Error", success: false, error: error });
  }
};

const getLatestEventForMail = async (req, res) => {
  try {
    const sql = 'SELECT comp_id, company, date FROM trialEvents';
    const result = await queryPromiseWithAsync(sql);
    // console.log("result",result);
    if(result?.length<=0){
      res.json({message:"No events found",success:false})
      return
    }
    const currentDate = moment().add(1, 'days').startOf('day'); // Get the current date + 1 day
    const upcomingEvents = [];
    // Check for upcoming events
    result?.forEach((row) => {
      const { comp_id, company, date } = row;
      const dates = JSON.parse(date);
      const isUpcoming = dates?.some((date) => moment(date).isSame(currentDate, 'day'));
      if (isUpcoming) {
        upcomingEvents?.push({ comp_id, company, date: currentDate.format('YYYY-MM-DD') });
      }
    });
    // console.log("upcomingEvents",upcomingEvents);
    if (upcomingEvents?.length === 0) {
      console.log("No event Found");
      return;
    }
    for (const event of upcomingEvents) {
      const searchQuery = 'SELECT * FROM lms_latestEvents WHERE comp_id = ? AND date = ?';
      const resultSearchQuery = await queryPromiseWithAsync(searchQuery, [event?.comp_id, event?.date]);
      // console.log("resultSearchQuery",resultSearchQuery.length);
      if (resultSearchQuery?.length <= 0) {
        const checkComp = 'SELECT * FROM lms_latestEvents WHERE comp_id = ? AND sendMail = 1'
        const checkCompResult = await queryPromiseWithAsync(checkComp,event?.comp_id)
        // console.log("checkCompResult",checkCompResult);
        if(checkCompResult?.length<=0){
          const insert = 'INSERT INTO lms_latestEvents (comp_id, comp_name, date) VALUES (?, ?, ?)';
          const insertResult = await queryPromiseWithAsync(insert, [event?.comp_id, event?.company, event?.date]);
        
        }else{
          const updateCompany = 'UPDATE lms_latestEvents SET date = ? , sendMail = 0 WHERE comp_id = ?'
          const updateResult = await queryPromiseWithAsync(updateCompany,[event?.date,event?.comp_id])
          // console.log("updateResult",updateResult);
          if(updateResult?.affectedRows!=0){
            console.log("same company event exist");
          }
        }
       
      } else {
        console.log(`event for comp_id ${event?.company} to date ${event?.date} exists`);
      }
    }
    const searchSql = 'SELECT comp_id, date FROM lms_latestEvents WHERE sendMail = 0';
    const resultSearchSql = await queryPromiseWithAsync(searchSql);
    // console.log("resultSearchSql", resultSearchSql);
    if (resultSearchSql?.length === 0) {
      console.log("No events found to send emails.");
      return;
    }
    // Group comp_ids and dates by comp_id
    const groupedEvents = resultSearchSql.reduce((acc, { comp_id, date }) => {
      if (!acc[comp_id]) {
        acc[comp_id] = [];
      }
      acc[comp_id].push(date);
      return acc;
    }, {});

    // console.log("Grouped Events:", groupedEvents);

    let allEmailsSent = true; // Flag to track if all emails were sent successfully

    // Iterate over each comp_id and send email once
    for (const comp_id of Object.keys(groupedEvents)) {
      const dates = groupedEvents[comp_id];
      const sqlEmployee = "SELECT emp_id, emp_email FROM lms_courseEmployee WHERE comp_id = ?";
      const employeesResult = await queryPromiseWithAsync(sqlEmployee, [comp_id]);
      if (employeesResult?.length === 0) {
        console.log("No employees found for comp_id:", comp_id);
        continue;
      }
      const employeeEmails = employeesResult.map(({ emp_email }) => emp_email);
     // console.log("employeeEmails",employeeEmails);
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const sender = { email: senderMail, name: "Nihal" };
      const subject = "Graded assessment";
      const textContent = `Hello, please attempt Graded Assessment before offline which is scheduled for ${dates.join(', ')}.`;
      const htmlContent = `Hello, please attempt Graded Assessment before offline which is scheduled for ${dates.join(', ')}.`;
      const receivers = employeeEmails.map(email => ({ email }));
      try {
        await apiInstance.sendTransacEmail({
          sender,
          to: receivers,
          subject,
          textContent,
          htmlContent,
        });
        // Update sendMail flag to 1 for processed comp_id
        const updateSql = "UPDATE lms_latestEvents SET sendMail = 1 WHERE comp_id = ?";
        await queryPromiseWithAsync(updateSql, [comp_id]);
      } catch (error) {
        console.error(`Failed to send emails for comp_id: ${comp_id}`, error);
        allEmailsSent = false; // Set the flag to false if any email sending operation fails
      }
    }
    if (allEmailsSent) {
      console.log("Emails sent successfully");
    } else {
      console.log("Failed to send all emails");
    }
  } catch (error) {
    console.log("Internal Server Error", error);
    // res.status(500).send("Internal Server Error");
  }
};

cron.schedule('0 */3 * * *', async () => {
  console.log('Running the task every 3 hours');
  await getLatestEventForMail();
});


const getCompanyNameAndCourseID = async(req,res)=>{
  try {
    const comp_id = req.params.comp_id
    // Assuming you have a database connection object
    const query = `SELECT lms_companyDetails.*, lms_CourseCompany.course_id 
    FROM lms_companyDetails
    INNER JOIN lms_CourseCompany 
    ON lms_companyDetails.id = lms_CourseCompany.comp_id
    WHERE lms_companyDetails.id = ?
  `;
    const result = await queryPromiseWithAsync(query,comp_id)
    if(result.length<=0){
    return res.json({message:"No data found",success:false})
    }
    return res.json({message:"Successful",success:true,data:result[0]})
  } catch (error) {
    return res.json({message:"Internal Server error",success:false})
  }
}

const totalCompanyCount = async (req, res) => {
  try {
    const sql = "SELECT COUNT(*) as count FROM lms_companyDetails";
    const result = await queryPromise(sql);
    if (result?.length === 0) {
      return res.json({ message: "Unable to get data", success: false });
    }
    return res.json({message: "Success",success: true,data: result[0].count});
  } catch (error) {
    return res.json({ message: "Internal Server Error", error: error });
  }
};

const totalTnaCompanyCount = async (req, res) => {
  try {
    const sql = "SELECT COUNT(*) as count FROM lms_companyDetails";
    const result = await queryPromiseWithAsync(sql);
    // console.log("result",result);
    if (result?.length === 0) {
      return res.json({ message: "Unable to get data", success: false });
    }
    return res.json({message: "Success",success: true,data: result[0].count});
  } catch (error) {
    console.log("error",error);
    return res.json({ message: "Internal Server Error", error: error,success:false });
  }
};

const totalCourseCompanyCount = async (req, res) => {
  try {
    const sql = "SELECT COUNT(*) as count FROM lms_CourseCompany ";
    const result = await queryPromiseWithAsync(sql);
    if (result?.length === 0) {
      return res.json({ message: "Unable to get data", success: false });
    }
    // console.log("result[0].count",result[0].count);
    return res.json({
      message: "Success",
      success: true,
      data: result[0].count,
    });
  } catch (error) {
    return res.json({ message: "Internal Server Error", error: error });
  }
};

const totalCourseRevenue = async (req, res) => {
  try {
    const sql = "SELECT grand_total FROM lms_CourseCompany";
    const result = await queryPromiseWithAsync(sql);

    if (result?.length === 0) {
      return res.json({ message: "No data found", success: true, data: 0 });
    }

    let sum = 0;
    result.forEach((v) => {
      sum = sum + parseInt(v.grand_total) || 0; // Ensure sub_total is a number
    });

    return res.json({ message: "Success", success: true, data: sum });
  } catch (error) {
    console.error("Error in totalTnaRevenue:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error });
  }
};

const totalTnaRevenue = async (req, res) => {
  try {
    const sql = "SELECT grand_total FROM TNA_licensing";
    const result = await queryPromiseWithAsync(sql);

    if (result?.length === 0) {
      return res.json({ message: "No data found", success: true, data: 0 });
    }

    let sum = 0;

    // Use forEach instead of map for calculating sum
    result.forEach((v) => {
      sum = sum + parseInt(v.grand_total) || 0; // Ensure sub_total is a number
    });

    return res.json({ message: "Success", success: true, data: sum });
  } catch (error) {
    console.error("Error in totalTnaRevenue:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error });
  }
};

const courseEmployeeManagementView = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const licenseType = 'Course'; // Hardcoded value
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = `SELECT 
        emp_name, emp_id,
        course_code, 
        DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(DATE_ADD(end_date, INTERVAL 1 DAY), '%Y-%m-%d') as end_date,
        status,
        ? AS licenseType
      FROM lms_courseEmployee
      WHERE comp_id = ?`;

    connection.query(sql, [licenseType, comp_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal error", success: false, error: err });
      }
      if (resp?.length <= 0) {
        return res.json({ message: 'Course is not purchased by this company', success: false });
      }
      return res.json({ message: 'Success', success: true, data: resp });
    });
  } catch (error) {
    return res.json({ message: "Internal Server Error", error: error });
  }
};

const logInAndLogOutTimeForAll = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;

    const sql = `SELECT log.id, log.comp_id, log.emp_id, log.logInTime, log.logOutTime, emp.emp_name, comp.comp_name FROM lms_EmployeeLogInLogOut log
      JOIN lms_employee emp ON log.emp_id = emp.id
      JOIN lms_companyDetails comp ON log.comp_id = comp.id
      WHERE log.comp_id = ?
      ORDER BY log.logInTime DESC
    `; // Filter by comp_id and order by logInTime in descending order

    const result = await queryPromiseWithAsync(sql, [comp_id]);

    return res.status(200).json({ success: true, message: "Success", data: result });
  } catch (error) {
    console.log("Internal Server Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const updateStatusApi = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const status = req.body.status;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = "UPDATE lms_companyDetails SET status = ? WHERE id = ?";
    connection.query(sql, [status, comp_id], (err, resp) => {
      if (err) {
        return res.json({
          error: err.message,
          message: "error in query",
          success: false,
        });
      } else {
        return res.json({ message: "status updated", success: true });
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({
      error: err.message,
      message: "Internal server Error",
      success: false,
    });
  }
};



// getCompanyNameAndCourseID()
module.exports = {
  checkFinalAssessmentQuestion,
  logInAndLogOutTimeForAll,
  getEmployeeByCompanyId,
  courseEmployeeManagementView,
  signUp,
  login,
  createCompany,
  getCompany,
  getCompanyById,
  generateTnaLicensing,
  updateCompany,
  uploadEmployee,
  superAdminUpdatePassword,
  updatePassword,
  mcqTokenVerify,
  reActivationLink,
  forgotPassword,
  resetPassword,
  tnaMcqUpload,
  emailAndTextQuestionUpload,
  verifyPasswordLink,
  getMcqforEmployeeSetWise,
  getEmployee,
  updateCompanyAdminDetails,
  updateStatusApi,
  uploadEmployeeAndGenerateLicense,
  uploadCourseEmployee,
  generateCourseLicensing,
  getCalendarEvents,
  calendarEvents,
  tnaEvaluation,
  tnaAnswerByEmployee,
  getDatafromEmployeeAnswer,
  tnaManagementQuestions,
  updatedDateData,
  updatedCompData,
  mcqAllQuestion,
  getAllEmailQuestions,
  getAllTextQuestions,
  getEmployeeById,
  getEmployeeByCompanyIds,
  getCompanyByEmployeeById,
  getEmployeeTnaDetailsById,
  updateMCQquestionsById,
  updateEmailQuestionById,
  updateTextQuestionById,
  tnaReport,
  createModule,
  videoUpload,
  uploadGradedAssesmentMCQ,
  UploadGradedEmailAndTextQuestion,
  getGradedMcq,
  getAllTnaTextAndEmailQuestions,
  updateGradedMCQquestionsById,
  updateGradedTextAndEmailquestionsById,
  createModuleAndUploadVideos,
  getCourseManagement,
  getModuleInfo,
  getModuleData,
  updateModuleAndVideo,
  updateDataForScore,
  updateModule,
  updateVideo,
  totalDataGet,
  getVideoByModuleId,
  tnaReportById,
  randomGradedAssementQuestions,
  uploadNonGradedAssessment,
  GradedAssesmentAnswerByEmployee,
  getGradedAssessmentAllQuestionCourseId,
  getGradedAssessmentByModuleId,
  getGradedassesmentMcqByQuestionId,
  getGradedAssessmentOtherQuestionsByModuleId,
  getGradedassesmentOthersByQuestionId,
  createCourse,
  createM,
  updateCourse,
  getModuleById,
  deleteVideo,
  createModuleAndUploadVideosAssesment,
  getComanyEmployeeForResult,
  getPercentageOfTnaEmployee,
  getCourseEmployeeBycompanyId,
  getScoreFromEmployeeAnswer,
  getTNAMcqByQuestionId,
  updateTNAMCQquestionsById,
  getTNAOtherQuestionByQuestionId,
  updateTNATextAndEmailquestionsById,
  getAverageMarksByCompanyId,
  getTotalNumberOfEmployeeInCourseAndTna,
  getIncorrectTopicByCompanyId,
  courseEvaluation,
  courseEvaluationByCompIdAndCourseId,
  getCourseEmployeeById,
  getDatafromCourseEmployeeAnswer,
  updateCourseScore,
  getCourseCompany,
  generateTnaCodeWithoutEmployee,
  startDateAndEndDateOfCourseCompany,
  getCalendarFutureEvents,
  totalCompanyCount,
  totalTnaCompanyCount,
  totalCourseCompanyCount,
  totalTnaRevenue,
  totalCourseRevenue,
  getTnaCompany,
  setEvent,
  checkUniqueToken,
  getNonGradedMcqQuestions,
  NonGradedAssesmentAnswerByEmployee,
  getCourseAccessByCompId,
  updateCourseStatusApi,
  audioAnswer,
  getTnaEmployeeByCompanyId,
  getCourseEmployeeBycompanyIdForReport,
  tnaPassedEmployee,
  getCourse,
  getModule,
  updateCourseModule,
  getModuleWithAttempt,
  getCourseIdByCompanyId,
  finalAssesmentManagementQuestions,
  uploadFinalAssessmentMcq,
  uploadFinalAssesmentOtherQuestion,
  getAllFinalAssesmentMcqQuestion,
  getAllFinalAssesmentEmailQuestions,
  getAllFinalAssesmentTextQuestions,
  getAllFinalAssesmentAudioQuestions,
  updateFinalAssesmentMCQquestionsById,
  updateFinalAssesmentEmailQuestionById,
  updateFinalAssesmentTextQuestionById,
  updateFinalAssesmentAudioQuestionById,
  getFinalAssesmentMcqByQuestionId,
  getFinalAssesmentOtherQuestionByQuestionId,
  updateFinalAssesmentOtherQuestionsById,
  getFinalAssesmentEmployee,
  getDatafromNonGradedEmployeeAnswer,
  randomFinalAssementQuestions,
  finalAssesmentAnswerByEmployee,
  finalAssesmentAudioAnswer,
  getDatafromFinalAssesmentEmployeeAnswer,
  updateFinalAssesmentScore,
  checkAuthentication,
  getCourseReportById,
  overallCompanyGradedPerformance,
  getCourseCompanyById,
  getLessonNameFromNonGradedAssesmentByModuleId,
  getVideoDetailsByEmployeeID,
  getModuleIdByEmployee,
  getModuleLessonWithVideoAttempt,
  getLessonDetailsByEmployeeIDAndModuleId,
  getVideoDetailsByEmployeeIDAndModuleId,
  finalAssessmentReport,
  getModuleWithNonGradedAttempt,
  getModuleWithMcqData,
  updateNotify ,
  getNotify,
  deleteNotify,
  archiveCompany,restoreCompany,
  getArchiveCompany,
  getCourseData,
  deleteTnaMcq,
  deleteCourseMcq,
  deleteTnaOtherQuestion,
  deleteCourseOtherQuestion,
  deleteNonGradedMcq,
  deleteFinalMcq,
  deleteFinalOtherQuestion,
  getCompanyNameAndCourseID,
  finalReportById,
  deleteCompany,
  deleteTnaEmployee,
  deleteCourseEmployee
};



// overallCompanyGradedPerformance()

// const getOverallPerformance = async(req,res)=>{
//   try {
//     // const getModuleNameWithId = 'SELECT id,module_name FROM lms_Module'
//     // const result = await queryPromiseWithAsync(getModuleNameWithId)
//     // console.log("resultt",result);
//     // for(const id of result){
//       // console.log("id",id.id);
//       const searchMarks = 'SELECT total_score ,out_Off FROM lms_TNA_Employee_Answers WHERE   comp_id = ?'
//       const searchMarkResult = await queryPromiseWithAsync(searchMarks,[1])
//       console.log("searchMarkResultsearchMarkResult",searchMarkResult?.length);
//       if(searchMarkResult?.length<=0){
//         console.log("ididididi",id.id);
//         // break;
//       }
//       let  addTotalScore =0
//       let  addOutOff =0
//       for(let score of searchMarkResult){
//         addTotalScore =  addTotalScore + score.total_score
//         addOutOff= addOutOff+ score.out_Off
//       }
//       console.log("addTotalScore",addTotalScore);
//       console.log("addOutOff",addOutOff);

//     // }
//   } catch (error) {
    
//   }
// }
// getOverallPerformance()



// const deleteCompany = async(req,res)=>{
//   try {
//     const comp_id = req.params.comp_id
//     const searchCompId = 'SELECT * FROM lms_companyDetails WHERE id = ?'
//     const searchResult = await queryPromiseWithAsync(searchCompId,comp_id)
//     if(searchResult.length<=0){
//       return res.json({message:"Company Not found in DataBase",sucess:false})
//     }
//     const deleteQuery = "DELETE FROM lms_companyDetails WHERE id = ?"
//     await queryPromiseWithAsync(deleteQuery,comp_id)
     
//     const searchEmployee = 'SELECT * FROM lms_employee WHERE comp_id =?'
//     const searchEmployeeResult = await queryPromiseWithAsync(searchEmployee, comp_id)
//     if (searchEmployeeResult.length > 0) {
//       for (let i of searchEmployeeResult) {
//         // console.log("i", i.id);
//         const employeeAnswer = 'SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id =?'
//         const searchEmployeeAnswerResult = await queryPromiseWithAsync(employeeAnswer, i.id)
//         // console.log("searchEmployeeAnswerResult",searchEmployeeAnswerResult);
//         if (searchEmployeeAnswerResult.length > 0) {
//         // console.log("i", i.id);

//           const deleteQuery = "DELETE FROM lms_TNA_Employee_Answers WHERE emp_id = ?"
//           await queryPromiseWithAsync(deleteQuery, i.id)
//         }
//         const deleteQuery = "DELETE FROM lms_employee WHERE id = ?"
//         await queryPromiseWithAsync(deleteQuery, i.id)
//       }
//     }

//     const searchLicensing = 'SELECT * FROM TNA_licensing WHERE comp_id = ? '
//     const searchLicensingResult = await queryPromiseWithAsync(searchLicensing,comp_id)
//     if(searchLicensingResult.length>0){
//       const deleteQuery = "DELETE FROM TNA_licensing WHERE comp_id = ?"
//     await queryPromiseWithAsync(deleteQuery,comp_id)
//     }


//     // /*----------------deleting From course as well---------- */

//     const searchCompIdInCourse = 'SELECT * FROM lms_CourseCompany WHERE comp_id = ?'
//     const  searchCompIdInCourseResult= await queryPromiseWithAsync(searchCompIdInCourse,comp_id)
//     if(searchCompIdInCourseResult.length>0){
//       const deleteCourseCompanyQuery = "DELETE FROM lms_CourseCompany WHERE comp_id = ?"
//       await queryPromiseWithAsync(deleteCourseCompanyQuery,comp_id)
//     }

// // -----------------------------------Course Employee,Graded,nongraded------------------
//     const searchCourseEmployee = 'SELECT * FROM lms_courseEmployee WHERE comp_id =?'
//     const searchCourseEmployeeResult = await queryPromiseWithAsync(searchCourseEmployee,comp_id)
//     if(searchCourseEmployeeResult.length>0){
//       for(let i of searchCourseEmployeeResult){
//         // console.log("i",i.emp_id);
//           const employeeGradedAnswer = 'SELECT * FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id =?'
//         const searchEmployeeGradedAnswerResult = await queryPromiseWithAsync(employeeGradedAnswer, i.id)
//         // console.log("searchEmployeeAnswerResult",searchEmployeeAnswerResult);
//         if (searchEmployeeGradedAnswerResult.length > 0) {
//         // console.log("i", i.id);

//           const deleteQuery = "DELETE FROM lms_GradedAssesmentAnswersByEmployee WHERE emp_id = ?"
//           await queryPromiseWithAsync(deleteQuery, i.id)
//         }
//         const employeeNonGradedAnswer = 'SELECT * FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id =?'
//         const searchEmployeeNonGradedAnswerResult = await queryPromiseWithAsync(employeeNonGradedAnswer, i.id)
//         // console.log("searchEmployeeAnswerResult",searchEmployeeAnswerResult);
//         if (searchEmployeeNonGradedAnswerResult.length > 0) {
//         // console.log("i", i.id);

//           const deleteQuery = "DELETE FROM lms_CourseNonGradedAnswerByEmployee WHERE emp_id = ?"
//           await queryPromiseWithAsync(deleteQuery, i.id)
//         }

// // --------------------------------deleting Login And logout time---------------

//         const searchEmployeeLogin = 'SELECT * FROM lms_EmployeeLogInLogOut WHERE emp_id = ?'
//        const searchEmployeeLoginResult = await queryPromiseWithAsync(searchEmployeeLogin,i.emp_id)

//         if (searchEmployeeLoginResult.length > 0) {
//           for (let i of searchEmployeeLoginResult) {
//             // console.log("iiemp",i);

//             const deleteQuery = "DELETE FROM lms_EmployeeLogInLogOut WHERE emp_id = ?"
//             await queryPromiseWithAsync(deleteQuery, i.emp_id)
//           }
//         }
// // --------------------------------- Delete User Video Details ---------------

//         const searchEmployeeVideoDetails = 'SELECT * FROM lms_EmployeeVideoData WHERE emp_id = ?'
//         const searchEmployeeVideoDetailsResult = await queryPromiseWithAsync(searchEmployeeVideoDetails, i.emp_id)

//         if (searchEmployeeVideoDetailsResult.length > 0) {
//           for (let i of searchEmployeeVideoDetailsResult) {
//             // console.log("ii",i);+
//             const deleteQuery = "DELETE FROM lms_EmployeeVideoData WHERE emp_id = ?"
//             await queryPromiseWithAsync(deleteQuery, i.emp_id)
//           }
//         }

//         const deleteQuery = "DELETE FROM lms_courseEmployee WHERE emp_id = ?"
//         await queryPromiseWithAsync(deleteQuery,i.emp_id)
//       }
//     }

//     // -----------------------------Deleting Course Access----------------------
//     const searchCourseAllotment = 'SELECT * FROM lms_CourseAllotmentToCompany WHERE comp_id = ?'
//     const searchCourseAllotmentResult = await queryPromiseWithAsync(searchCourseAllotment,comp_id)
//     if(searchCourseAllotmentResult.length>0){
//       for(let i of searchCourseAllotmentResult){
//         // console.log("i", i.comp_id);
//         const deleteQuery = "DELETE FROM lms_CourseAllotmentToCompany WHERE comp_id = ?"
//             await queryPromiseWithAsync(deleteQuery,comp_id)
//       }
//     }

//     // -----------------------------Deleting Events------------------------
//     const searchEvents = 'SELECT * FROM trialEvents WHERE comp_id = ?'
//     const searchEventsResult = await queryPromiseWithAsync(searchEvents,comp_id)
//     if(searchEventsResult.length>0){
//         const deleteQuery = "DELETE FROM trialEvents WHERE comp_id = ?"
//             await queryPromiseWithAsync(deleteQuery,comp_id)
    
//     }

//     return res.json({message:"Deletion successfull",success:true})

//   } catch (error) {
//     return res.json({message:"Internal Server error",success:false,error:error})
    
//   }
// }
