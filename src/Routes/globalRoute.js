const express = require("express")
const videoUploadMulter = require("../Middleware/videoMulter")
const {verifyUserToken} = require("../Middleware/jwt")
const audioUploadMulter = require("../Middleware/audioMulter")
const route = express.Router()
const superAdminData = require("../Controller/superAdminApi")
const userData = require("../Controller/userApi")




route.post("/signup",superAdminData.signUp)
route.post("/login",superAdminData.login)
route.get("/:token",superAdminData.mcqTokenVerify)
route.post("/forgotPassword",superAdminData.forgotPassword)
route.post("/resetPassword",superAdminData.resetPassword)
route.post("/loginUser",userData.userLogin)
route.post("/logOutUser/:loginId",userData.logOutUser)
route.get("/checkFinalAssessmentAllQuestion",userData.checkFinalAssessmentQuestion)
route.post("/checkAuthentication",userData.checkAuthentication)
route.get("/getNonGradedMcqQuestions/:comp_id/:module_id/:lesson_id",userData.getNonGradedMcqQuestions)
route.get("/getNonGraded/:module_id/:lesson_id",verifyUserToken,userData.getNonGraded)
route.get("/getNongradedDataByEmployee/:emp_id",verifyUserToken,userData.getNongradedDataByEmployee)
route.get("/getNonGradedLessonWise/:module_id",verifyUserToken,userData.getNonGradedLessonWise)
route.get("/getDatafromNonGradedEmployeeAnswer/:emp_id/:lesson_id",verifyUserToken,userData.getDatafromNonGradedEmployeeAnswer)
route.post("/NonGradedAssesmentAnswerByEmployee/:emp_id/:module_id/:lesson_id",userData.NonGradedAssesmentAnswerByEmployee)
route.get("/getCourseName/:comp_id",verifyUserToken,userData.getCourseName)
route.get("/getSessionWithVideo/:module_id",verifyUserToken,userData.getSessionWithVideo)
route.get("/getModuleNameById/:module_id",verifyUserToken,userData.getModuleNameById)
route.get("/getGraded/:module_id",verifyUserToken,userData.getGraded)
route.post("/videoTime/:id/:comp_id/:emp_id" ,userData.videoTime)
route.get("/getVideoTime/:emp_id" ,verifyUserToken,userData.getVideoTime)
route.get("/accessForCourse/:comp_id" ,verifyUserToken,userData.accessForCourse)
route.post("/employeeCanAccessCourse/:emp_id",userData.employeeCanAccessCourse)
route.get("/getLessonNameFromNonGradedAssesmentByModuleId/:module_id/:emp_id",verifyUserToken,userData.getLessonNameFromNonGradedAssesmentByModuleId)
route.post("/getUserData/:emp_id",userData.getUserData)
route.get("/checkTotalScore/:emp_id/:module_id",userData.checkTotalScore)
route.get("/getNameApi/:emp_id",verifyUserToken,userData.getNameApi)
route.get("/getCompanyEvent/:comp_id",verifyUserToken,userData.getCompanyEvent)

// --------------------------------------SuperAdmin--------------------------------

route.get("/randomFinalAssementQuestions/:comp_id/:course_id",userData.randomFinalAssementQuestions)
route.post("/finalAssesmentAnswerByEmployee/:emp_id/:course_id",userData.finalAssesmentAnswerByEmployee)
route.post("/finalAssesmentAudioAnswer/:emp_id/:course_id",audioUploadMulter.single("file"),userData.finalAssesmentAudioAnswer)
route.get("/randomGradedAssementQuestions/:comp_id/:module_id",userData.randomGradedAssementQuestions)
route.get("/getMcq/:tnaLicenseCode/:comp_id/:uniqueToken",userData.getMcqforEmployeeSetWise)
route.post("/GradedAssesmentAnswerByEmployee/:emp_id/:module_id",userData.GradedAssesmentAnswerByEmployee)
route.post("/audioAnswer/:emp_id/:module_id",audioUploadMulter.single("file"),userData.audioAnswer)
route.post("/tnaAnswerByEmployee/:tnaLicenseCode/:comp_id/:uniqueToken",userData.tnaAnswerByEmployee)
// route.get("/getMcq/:tnaLicenseCode/:comp_id/:uniqueToken",userData.getMcqforEmployeeSetWise)








module.exports ={route}