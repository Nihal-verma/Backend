const express = require("express")
const upload = require("../../../Middleware/multer")
const {checkUniqueToken,tnaAnswerByEmployee,getDatafromEmployeeAnswer,getScoreFromEmployeeAnswer,updateDataForScore,tnaEvaluation,tnaManagementQuestions} = require("../../../Controller/SuperAdmin/TNA/TnaEvaluation")
const {tnaMcqUpload,mcqAllQuestion,updateMCQquestionsById,getMcqforEmployeeSetWise,updateTNAMCQquestionsById,deleteTnaMcq} = require("../../../Controller/SuperAdmin/TNA/TnaMCQ")

const {emailAndTextQuestionUpload,getAllTextQuestions,getAllEmailQuestions,updateEmailQuestionById,updateTextQuestionById,getAllTnaTextAndEmailQuestions,updateTNATextAndEmailquestionsById,deleteTnaOtherQuestion} = require("../../../Controller/SuperAdmin/TNA/TnaOther")



const router = express.Router()
router.get("/checkToken/:uniqueToken",checkUniqueToken)
router.post("/tnaAnswerByEmployee/:tnaLicenseCode/:comp_id/:uniqueToken",tnaAnswerByEmployee)
router.get("/getDatafromEmployeeAnswer/:emp_id",getDatafromEmployeeAnswer)
router.get("/getScoreFromEmployeeAnswer/:emp_id",getScoreFromEmployeeAnswer)
router.put("/updateDataForScore/:emp_id", updateDataForScore)
router.get("/tnaEvaluation/:comp_id",tnaEvaluation)
router.get("/tnaManagementQuestions",tnaManagementQuestions)


router.post("/tnaMcqUpload",upload.single("file"),tnaMcqUpload)
router.get("/getAllMcqQuestions",mcqAllQuestion)
router.put("/updateMCQquestionsById/:id",updateMCQquestionsById)
router.get("/getMcq/:tnaLicenseCode/:comp_id/:uniqueToken",getMcqforEmployeeSetWise)
router.delete("/deleteTnaMcq/:id",deleteTnaMcq)
router.put("/updateTNAMCQquestionsById/:question_id",updateTNAMCQquestionsById)

router.post("/emailAndTextQuetionUpload",upload.single("file"),emailAndTextQuestionUpload)
router.get("/getAllEmailQuestions",getAllEmailQuestions)
router.get("/getAllTextQuestions",getAllTextQuestions)
router.put("/updateEmailQuestionById/:id",updateEmailQuestionById)
router.put("/updateTextQuestionById/:id",updateTextQuestionById)
router.get("/getAllTnaTextAndEmailQuestions",getAllTnaTextAndEmailQuestions)
router.put("/updateTNATextAndEmailquestionsById/:question_id",updateTNATextAndEmailquestionsById)
router.delete("/deleteTnaOtherQuestion/:id",deleteTnaOtherQuestion)



module.exports = router