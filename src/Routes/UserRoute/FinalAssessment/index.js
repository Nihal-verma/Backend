const express = require("express")
const audioUploadMulter = require("../../../Middleware/audioMulter")


const {randomFinalAssementQuestions,finalAssesmentAnswerByEmployee,finalAssesmentAudioAnswer,checkFinalAssessmentQuestion} = require('../../../Controller/User/FinalAssessment')
const router = express.Router()

router.get("/getQuestions/:comp_id",randomFinalAssementQuestions)
router.post("/submitFinalAnswer/:emp_id/:comp_id",finalAssesmentAnswerByEmployee)
router.post("/submitAudio/:emp_id/:comp_id",audioUploadMulter.single("file"),finalAssesmentAudioAnswer)
router.get("/checkFinalAssessmentAllQuestion",checkFinalAssessmentQuestion)


module.exports = router
