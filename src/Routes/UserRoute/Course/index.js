const express = require("express")
const {verifyUserToken} = require("../../../Middleware/jwt")

const {getCourseName,accessForCourse,getUserData,employeeCanAccessCourse} = require("../../../Controller/User/Course")
const router = express.Router()

router.get("/getCourseName/:comp_id",verifyUserToken,getCourseName)
router.get("/accessForCourse/:comp_id" ,verifyUserToken,accessForCourse)
router.post("/getUserData/:emp_id",getUserData)
router.post("/employeeCanAccessCourse/:emp_id",employeeCanAccessCourse)



module.exports = router