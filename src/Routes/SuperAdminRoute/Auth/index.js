const express = require("express")
const {signUp,superAdminUpdatePassword,updatePassword,login,checkAuthentication,mcqTokenVerify,reActivationLink,forgotPassword,verifyPasswordLink,resetPassword} = require("../../../Controller/SuperAdmin/Auth")
const router = express.Router()

router.post("/signup",signUp)
router.post("/login",login)
router.get("/:token",mcqTokenVerify)
router.post("/forgotPassword",forgotPassword)
router.post("/resetPassword",resetPassword)
router.put("/superAdminUpdatePassword",superAdminUpdatePassword)
router.get("/verifyPasswordLink/:token",verifyPasswordLink)

router.put("/restoreCompany/:comp_id", superAdminUpdatePassword)
router.put("/updatePassword",updatePassword)
router.get("/checkAuthentication/:token",checkAuthentication)

router.get("/reActivationLink/:emp_id/:comp_id",reActivationLink)



module.exports = router
