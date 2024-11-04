const express = require("express")
const {verifyUserToken} = require("../../../Middleware/jwt")
const audioUploadMulter = require("../../../Middleware/audioMulter")


const {getGraded,randomGradedAssementQuestions,GradedAssesmentAnswerByEmployee,audioAnswer} = require('../../../Controller/User/Graded')
const router = express.Router()

router.get("/:module_id",verifyUserToken,getGraded)
router.get("/getQuestions/:comp_id/:module_id",randomGradedAssementQuestions)
router.post("/submitAnswer/:emp_id/:module_id",GradedAssesmentAnswerByEmployee)
router.post("/audioAnswer/:emp_id/:module_id",audioUploadMulter.single("file"),audioAnswer)


module.exports = router
