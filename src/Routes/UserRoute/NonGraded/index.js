
const express = require("express")
const {verifyUserToken} = require("../../../Middleware/jwt")
const audioUploadMulter = require("../../../Middleware/audioMulter")


const {getNonGraded,getNongradedDataByEmployee,getDatafromNonGradedEmployeeAnswer,getNonGradedLessonWise,getNonGradedMcqQuestions,NonGradedAssesmentAnswerByEmployee} = require('../../../Controller/User/NonGraded')
const router = express.Router()
router.get("/getNonGradedMcqQuestions/:comp_id/:module_id/:lesson_id",getNonGradedMcqQuestions)
router.get("/getNonGraded/:module_id/:lesson_id",verifyUserToken,getNonGraded)
router.get("/getNongradedDataByEmployee/:emp_id",verifyUserToken,getNongradedDataByEmployee)
router.get("/getNonGradedLessonWise/:module_id",verifyUserToken,getNonGradedLessonWise)
router.get("/getDatafromNonGradedEmployeeAnswer/:emp_id/:lesson_id",verifyUserToken,getDatafromNonGradedEmployeeAnswer)
router.post("/NonGradedAssesmentAnswerByEmployee/:emp_id/:module_id/:lesson_id",NonGradedAssesmentAnswerByEmployee)



module.exports = router
