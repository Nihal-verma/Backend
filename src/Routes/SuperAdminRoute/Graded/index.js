const express = require("express")
const audioUploadMulter = require('../../../Middleware/audioMulter')
const upload = require('../../../Middleware/multer')


const {randomAssessmentQuestions,GradedAssesmentAnswerByEmployee,audioAnswer,courseEvaluationByCompIdAndCourseId,getDatafromCourseEmployeeAnswer,updateCourseScore} = require("../../../Controller/SuperAdmin/Graded/GradedEvaluation")


const {uploadGradedAssesmentMCQ,getGradedMcq,updateGradedMCQquestionsById,getGradedAssessmentByModuleId,getGradedassesmentMcqByQuestionId,deleteCourseMcq} = require("../../../Controller/SuperAdmin/Graded/GradedMCQ")

const {getGradedAssessmentAllQuestionModuleId,UploadGradedEmailAndTextQuestion,updateGradedTextAndEmailquestionsById,getGradedAssessmentOtherQuestionsByModuleId,getGradedassesmentOthersByQuestionId,deleteCourseOtherQuestion} = require("../../../Controller/SuperAdmin/Graded/GradedOther")

const router = express.Router()


router.get("/randomAssessmentQuestions/:comp_id/:module_id",randomAssessmentQuestions)
router.post("/audioAnswer/:emp_id/:module_id",audioUploadMulter.single("file"),audioAnswer)
router.post("/GradedAssesmentAnswerByEmployee/:emp_id/:module_id",GradedAssesmentAnswerByEmployee)
router.get("/courseEvaluationByCompIdAndCourseId/:comp_id/:course_id",courseEvaluationByCompIdAndCourseId)
router.get("/getDatafromCourseEmployeeAnswer/:emp_id/:module_id",getDatafromCourseEmployeeAnswer)
router.put("/updateCourseScore/:emp_id/:module_id", updateCourseScore)


router.post("/uploadGradedAssesmentMCQ/:module_id",upload.single("file"),uploadGradedAssesmentMCQ)
router.put("/updateGradedMCQquestionsById/:question_id",updateGradedMCQquestionsById)
router.get("/getGradedAssessmentByModuleId/:module_id",getGradedAssessmentByModuleId)
router.get("/getGradedassesmentMcqByQuestionId/:question_id",getGradedassesmentMcqByQuestionId)
router.delete("/deleteCourseMcq/:id",deleteCourseMcq)

router.get("/getGradedAssessmentAllQuestionModuleId",getGradedAssessmentAllQuestionModuleId)
router.post("/UploadGradedEmailAndTextQuestion/:module_id",upload.single("file"),UploadGradedEmailAndTextQuestion)
router.put("/updateGradedTextAndEmailquestionsById/:question_id",updateGradedTextAndEmailquestionsById)
router.get("/getGradedAssessmentOtherQuestionsByModuleId/:module_id",getGradedAssessmentOtherQuestionsByModuleId)
router.get("/getGradedassesmentOthersByQuestionId/:question_id",getGradedassesmentOthersByQuestionId)
router.delete("/deleteCourseOtherQuestion/:id",deleteCourseOtherQuestion)


module.exports = router
