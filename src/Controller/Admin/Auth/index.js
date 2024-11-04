const { generateLoginToken } = require("../../../Middleware/jwt")
const bcrypt = require("bcrypt")
const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")


const adminLogin = async (req, res) => {
    try {
        const { email_Id, password } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email_Id || !password) {
            return res.status(400).json({ message: "Can't set empty fields", success: false });
        }

        if (!emailRegex.test(email_Id)) {
            return res.status(400).json({ message: "Invalid Email", success: false });
        }

        // Use placeholders to prevent SQL injection
        const companyDetailsSql = "SELECT * FROM lms_companyDetails WHERE admin_email = ?";
        const companyResult = await queryPromiseWithAsync(companyDetailsSql, [email_Id]);

        if (companyResult.length <= 0) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        const isPasswordValid = await bcrypt.compare(password, companyResult[0].admin_password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Incorrect password", success: false });
        }

        const companyObj = {
            roleId: companyResult[0].role_Id,
            email: companyResult[0].admin_email,
            password: companyResult[0].admin_password
        };

        const adminToken = await generateLoginToken(companyObj);

        const updateSql = "UPDATE lms_companyDetails SET token = ? WHERE admin_email = ?";
        await queryPromiseWithAsync(updateSql, [adminToken, email_Id]);

        return res.status(200).json({
            status: 200,
            message: "Login successful",
            token: adminToken,
            comp_id: companyResult[0].id,
            success: true,
        });
        
    } catch (error) {
        console.error("Error during admin login:", error);
        return res.status(500).json({ message: "Internal Error", error: error.message, success: false });
    }
};

const checkAuthentication = async(req,res)=>{
    try {
        const token = req.params.token
        const comp_id = req.params.comp_id
        if(!comp_id|| !token ){
            return res.json({message:"Company Id Or token  Not Provided",success:false})
        }
       
        const selectQuery = 'SELECT * FROM lms_companyDetails WHERE token = ? AND id =?'
        const result = await queryPromiseWithAsync(selectQuery,[token,comp_id])
        if(result?.length<=0){
            return res.json({message:"token Error",success:false});
        }
        return res.json({message:"success",success:true});
    } catch (error) {
        console.log("Internal Server Error");
        return res.json({message:"Internal Server Error",success:false,error:error});
    }
}

module.exports= {adminLogin,checkAuthentication}