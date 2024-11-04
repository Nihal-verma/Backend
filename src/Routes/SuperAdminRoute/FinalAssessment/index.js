const express = require("express")
const upload = require("../../../Middleware/multer")
const audioUploadMulter = require("../../../Middleware/audioMulter")


const {finalAssesmentAnswerByEmployee,finalAssesmentAudioAnswer,randomFinalAssementQuestions,finalAssesmentManagementQuestions} = require("../../../Controller/SuperAdmin/FinalAssessment/FinalEvaluation")

const {uploadFinalAssessmentMcq,getAllFinalAssesmentMcqQuestion,updateFinalAssesmentMCQquestionsById,getFinalAssesmentMcqByQuestionId,deleteFinalMcq} = require("../../../Controller/SuperAdmin/FinalAssessment/FinalMCQ")

const {uploadFinalAssesmentOtherQuestion,getAllFinalAssesmentEmailQuestions,getAllFinalAssesmentTextQuestions,getAllFinalAssesmentAudioQuestions,getFinalAssesmentOtherQuestionByQuestionId,updateFinalAssesmentEmailQuestionById,updateFinalAssesmentTextQuestionById,updateFinalAssesmentAudioQuestionById,updateFinalAssesmentOtherQuestionsById,deleteFinalOtherQuestion} = require("../../../Controller/SuperAdmin/FinalAssessment/FinalOthers")


const router = express.Router()

router.get("/randomFinalAssementQuestions/:comp_id/:course_id",randomFinalAssementQuestions)
router.post("/finalAssesmentAnswerByEmployee/:emp_id/:course_id",finalAssesmentAnswerByEmployee)
router.post("/finalAssesmentAudioAnswer/:emp_id/:course_id",audioUploadMulter.single("file"),finalAssesmentAudioAnswer)
router.get("/finalAssesmentManagementQuestions/:course_id",finalAssesmentManagementQuestions)
router.post("/uploadFinalAssessmentMcq/:course_id",upload.single("file"),uploadFinalAssessmentMcq)
router.get("/getAllFinalAssesmentMcqQuestion/:course_id",getAllFinalAssesmentMcqQuestion)
router.put("/updateFinalAssesmentMCQquestionsById/:id",updateFinalAssesmentMCQquestionsById)
router.get("/getFinalAssesmentMcqByQuestionId/:question_id",getFinalAssesmentMcqByQuestionId)
router.delete("/deleteFinalMcq/:id",deleteFinalMcq)
router.post("/uploadFinalAssesmentOtherQuestion/:course_id",upload.single("file"),uploadFinalAssesmentOtherQuestion)
router.get("/getAllFinalAssesmentEmailQuestions/:course_id",getAllFinalAssesmentEmailQuestions)
router.get("/getAllFinalAssesmentTextQuestions/:course_id",getAllFinalAssesmentTextQuestions)
router.get("/getAllFinalAssesmentAudioQuestions/:course_id",getAllFinalAssesmentAudioQuestions)
router.put("/updateFinalAssesmentEmailQuestionById/:id",updateFinalAssesmentEmailQuestionById)
router.put("/updateFinalAssesmentTextQuestionById/:id",updateFinalAssesmentTextQuestionById)
router.put("/updateFinalAssesmentAudioQuestionById/:id",updateFinalAssesmentAudioQuestionById)
router.get("/getFinalAssesmentOtherQuestionByQuestionId/:question_id",getFinalAssesmentOtherQuestionByQuestionId)
router.put("/updateFinalAssesmentOtherQuestionsById/:question_id",  updateFinalAssesmentOtherQuestionsById)
router.delete("/deleteFinalOtherQuestion/:id",deleteFinalOtherQuestion)


module.exports = router
