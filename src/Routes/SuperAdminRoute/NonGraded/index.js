const express = require("express")
const upload = require("../../../Middleware/multer")
const {getNonGradedMcqQuestions,uploadNonGradedAssessment,NonGradedAssesmentAnswerByEmployee,deleteNonGradedMcq} = require("../../../Controller/SuperAdmin/NonGraded")
const router = express.Router()
router.get("/getNonGradedMcqQuestions/:comp_id/:module_id/:lesson_id",getNonGradedMcqQuestions)
router.post("/uploadNonGradedAssessment/:module_id/:lesson_id", upload.single("file"),uploadNonGradedAssessment)
router.post("/NonGradedAssesmentAnswerByEmployee/:emp_id/:module_id/:lesson_id",NonGradedAssesmentAnswerByEmployee)
router.delete("/deleteNonGradedMcq/:id",deleteNonGradedMcq)



module.exports = router
