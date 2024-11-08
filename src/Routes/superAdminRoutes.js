const express = require("express")
const upload = require("../Middleware/multer")
const audioUploadMulter = require("../Middleware/audioMulter")
const videoUploadMulter = require("../Middleware/videoMulter")
const superAdminRoute = express.Router()
const {verifySuperAdminToken} = require("../Middleware/jwt")
const superAdminData = require("../Controller/superAdminApi")

superAdminRoute.get("/reActivationLink/:emp_id/:comp_id",superAdminData.reActivationLink)
// superAdminRoute.post("/signup",superAdminData.signUp)
// superAdminRoute.post("/login",superAdminData.login)
// superAdminRoute.get("/:token",superAdminData.mcqTokenVerify)
// superAdminRoute.post("/forgotPassword",superAdminData.forgotPassword)
// superAdminRoute.post("/resetPassword",superAdminData.resetPassword)

superAdminRoute.get("/getEmployeeByCompanyId/:comp_id",superAdminData.getEmployeeByCompanyId)

superAdminRoute.post("/generateTnaLicensing/:comp_id",superAdminData.generateTnaLicensing)
superAdminRoute.post("/uploadEmployee/:comp_id",upload.single("file"),superAdminData.uploadEmployee)
superAdminRoute.post("/companyCreation",superAdminData.createCompany)
superAdminRoute.get("/getCompany",superAdminData.getCompany)
superAdminRoute.get("/getCompany/:comp_id",superAdminData.getCompanyById)
superAdminRoute.put("/companies/:comp_id",superAdminData.updateCompany)
superAdminRoute.put("/superAdminUpdatePassword",superAdminData.superAdminUpdatePassword)
superAdminRoute.put("/updatePassword",superAdminData.updatePassword)
superAdminRoute.post("/emailAndTextQuetionUpload",upload.single("file"),superAdminData.emailAndTextQuestionUpload)
superAdminRoute.get("/verifyPasswordLink/:token",superAdminData.verifyPasswordLink)
superAdminRoute.post("/tnaMcqUpload",upload.single("file"),superAdminData.tnaMcqUpload)
superAdminRoute.post("/uploadEmployeeAndGenerateLicense/:id", upload.single("file"), superAdminData.uploadEmployeeAndGenerateLicense);
superAdminRoute.post("/uploadCourseEmployee/:comp_id/:course_id",upload.single("file"),superAdminData.uploadCourseEmployee)
superAdminRoute.get("/getMcq/:tnaLicenseCode/:comp_id/:uniqueToken",superAdminData.getMcqforEmployeeSetWise)
superAdminRoute.get("/checkToken/:uniqueToken",superAdminData.checkUniqueToken)
superAdminRoute.get("/getEmployee/:comp_id",superAdminData.getEmployee)
superAdminRoute.put("/updateCompanyAdminDetails/:comp_id",superAdminData.updateCompanyAdminDetails)
superAdminRoute.post("/calendarEvents",superAdminData.calendarEvents)
superAdminRoute.post("/tnaAnswerByEmployee/:tnaLicenseCode/:comp_id/:uniqueToken",superAdminData.tnaAnswerByEmployee)
superAdminRoute.post("/generateCourseLicensing/:comp_id/:course_id",superAdminData.generateCourseLicensing)
superAdminRoute.post("/generateTnaCodeWithoutEmployee/:comp_id",superAdminData.generateTnaCodeWithoutEmployee)
superAdminRoute.get("/getCalendarEvents",superAdminData.getCalendarEvents)
superAdminRoute.get("/getCalendarFutureEvents",superAdminData.getCalendarFutureEvents)
superAdminRoute.get("/tnaEvaluation/:comp_id",superAdminData.tnaEvaluation)
superAdminRoute.get("/getDatafromEmployeeAnswer/:emp_id",superAdminData.getDatafromEmployeeAnswer)
superAdminRoute.get("/tnaManagementQuestions",superAdminData.tnaManagementQuestions)
superAdminRoute.put("/updatedDateData",superAdminData.updatedDateData)
superAdminRoute.put("/updatedCompData",superAdminData.updatedCompData)
superAdminRoute.get("/mcqAllQuestion",superAdminData.mcqAllQuestion)
superAdminRoute.get("/getAllEmailQuestions",superAdminData.getAllEmailQuestions)
superAdminRoute.get("/getAllTextQuestions",superAdminData.getAllTextQuestions)
superAdminRoute.get("/employee/:emp_id",superAdminData.getEmployeeById)
superAdminRoute.get("/getCompanyByEmployeeById/:emp_id",superAdminData.getCompanyByEmployeeById)
superAdminRoute.get("/getEmployeeTnaDetailsById/:emp_id",superAdminData.getEmployeeTnaDetailsById)
superAdminRoute.put("/updateMCQquestionsById/:id",superAdminData.updateMCQquestionsById)
superAdminRoute.put("/updateEmailQuestionById/:id",superAdminData.updateEmailQuestionById)
superAdminRoute.put("/updateTextQuestionById/:id",superAdminData.updateTextQuestionById)
superAdminRoute.get("/getModuleInfo",superAdminData.getModuleInfo)
superAdminRoute.post("/createModule/:module_id",superAdminData.createModule)
superAdminRoute.post("/createModuleAndUploadVideosAssesment/:module_id", upload.fields([
  { name: "nonGraded", maxCount: 1 },
  { name: "file", maxCount: 6 },
]), superAdminData.createModuleAndUploadVideosAssesment);
superAdminRoute.put("/updateModuleAndVideos/:lesson_id/:video_id",videoUploadMulter.array("videos",5),superAdminData.updateModuleAndVideo)
superAdminRoute.put("/updateModule/:lesson_id",superAdminData.updateModule)
superAdminRoute.get("/getModuleById/:lesson_id",superAdminData.getModuleById)
superAdminRoute.post("/uploadMultipleVideos/:lesson_id",videoUploadMulter.array("file",5),superAdminData.videoUpload)
superAdminRoute.post("/uploadGradedAssesmentMCQ/:module_id",upload.single("file"),superAdminData.uploadGradedAssesmentMCQ)
superAdminRoute.post("/UploadGradedEmailAndTextQuestion/:module_id",upload.single("file"),superAdminData.UploadGradedEmailAndTextQuestion)
superAdminRoute.get("/getAllTnaTextAndEmailQuestions",superAdminData.getAllTnaTextAndEmailQuestions)
superAdminRoute.put("/updateGradedMCQquestionsById/:question_id",superAdminData.updateGradedMCQquestionsById)
superAdminRoute.put("/updateTNAMCQquestionsById/:question_id",superAdminData.updateTNAMCQquestionsById)
superAdminRoute.put("/updateGradedTextAndEmailquestionsById/:question_id",superAdminData.updateGradedTextAndEmailquestionsById)
superAdminRoute.get("/getGradedAssessmentOtherQuestionsByModuleId/:module_id",superAdminData.getGradedAssessmentOtherQuestionsByModuleId)
superAdminRoute.get("/getGradedassesmentOthersByQuestionId/:question_id",superAdminData.getGradedassesmentOthersByQuestionId)
superAdminRoute.delete("/deleteCourseOtherQuestion/:id",superAdminData.deleteCourseOtherQuestion)
superAdminRoute.put("/updateTNATextAndEmailquestionsById/:question_id",superAdminData.updateTNATextAndEmailquestionsById)
// superAdminRoute.post("/createModuleAndUploadVideos/:course_id",videoUploadMulter.array("file",5),upload.single("nonGraded"),superAdminData.createModuleAndUploadVideos)

superAdminRoute.get("/getCourseManagement/:course_id",superAdminData.getCourseManagement)
superAdminRoute.put("/updateDataForScore/:emp_id", superAdminData.updateDataForScore)
superAdminRoute.put("/updateModule/:lesson_id",superAdminData.updateModule)
superAdminRoute.get("/getModuleById/:lesson_id",superAdminData.getModuleById)
superAdminRoute.put("/updateVideo/:video_id",videoUploadMulter.single("file"),superAdminData.updateVideo)


superAdminRoute.get("/getVideoByModuleId/:lesson_id",superAdminData.getVideoByModuleId)


superAdminRoute.get("/randomGradedAssementQuestions/:comp_id/:module_id",superAdminData.randomGradedAssementQuestions)
superAdminRoute.post("/audioAnswer/:emp_id/:module_id",audioUploadMulter.single("file"),superAdminData.audioAnswer)
superAdminRoute.post("/GradedAssesmentAnswerByEmployee/:emp_id/:module_id",superAdminData.GradedAssesmentAnswerByEmployee)
superAdminRoute.get("/courseEvaluationByCompIdAndCourseId/:comp_id:/:module_id",superAdminData.courseEvaluationByCompIdAndCourseId)
superAdminRoute.get("/getDatafromCourseEmployeeAnswer/:emp_id/:module_id",superAdminData.getDatafromCourseEmployeeAnswer)

// --------------------------------------NonGraded-----------------------------------
superAdminRoute.get("/getNonGradedMcqQuestions/:comp_id/:module_id/:lesson_id",superAdminData.getNonGradedMcqQuestions)
superAdminRoute.post("/uploadNonGradedAssessment/:module_id/:lesson_id", upload.single("file"),superAdminData.uploadNonGradedAssessment)
superAdminRoute.delete("/deleteNonGradedMcq/:id",superAdminData.deleteNonGradedMcq)
superAdminRoute.post("/NonGradedAssesmentAnswerByEmployee/:emp_id/:module_id/:lesson_id",superAdminData.NonGradedAssesmentAnswerByEmployee)


// ------------------------------------Graded other-=-------------------------------------
superAdminRoute.get("/getGradedAssessmentAllQuestionCourseId",superAdminData.getGradedAssessmentAllQuestionCourseId)
superAdminRoute.get("/getGradedAssessmentByModuleId/:module_id",superAdminData.getGradedAssessmentByModuleId)
superAdminRoute.get("/getGradedassesmentMcqByQuestionId/:question_id",superAdminData.getGradedassesmentMcqByQuestionId)
superAdminRoute.delete("/deleteCourseMcq/:id",superAdminData.deleteCourseMcq)


superAdminRoute.get("/getTNAMcqByQuestionId/:question_id",superAdminData.getTNAMcqByQuestionId)
superAdminRoute.get("/getTNAOtherQuestionByQuestionId/:question_id",superAdminData.getTNAOtherQuestionByQuestionId)

superAdminRoute.post("/createCourse",superAdminData.createCourse)
superAdminRoute.post("/createM/:course_id",superAdminData.createM)
superAdminRoute.get("/getCourseData",superAdminData.getCourseData)
superAdminRoute.get("/getModuleData",superAdminData.getModuleData)
superAdminRoute.put("/updateCourseModule/:id",superAdminData.updateCourseModule)
superAdminRoute.get("/getModule/:course_id",superAdminData.getModule)
superAdminRoute.get("/getModuleWithAttempt/:course_id/:emp_id",superAdminData.getModuleWithAttempt)

superAdminRoute.get("/getCourse",superAdminData.getCourse)
superAdminRoute.put("/updateCourse/:id",superAdminData.updateCourse)
superAdminRoute.delete("/deleteVideo/:lesson_id",superAdminData.deleteVideo)

superAdminRoute.get("/getCourseEmployeeBycompanyId/:comp_id",superAdminData.getCourseEmployeeBycompanyId)
superAdminRoute.get("/getScoreFromEmployeeAnswer/:emp_id",superAdminData.getScoreFromEmployeeAnswer)

superAdminRoute.get("/courseEvaluation/:comp_id",superAdminData.courseEvaluation)

superAdminRoute.get("/courseEmployee/:emp_id",superAdminData.getCourseEmployeeById)

superAdminRoute.put("/updateCourseScore/:emp_id/:module_id", superAdminData.updateCourseScore)
superAdminRoute.get("/getCourseCompany",superAdminData.getCourseCompany)
superAdminRoute.get("/getTnaCompany",superAdminData.getTnaCompany)
superAdminRoute.get("/getIncorrectTopicByCompanyId/:comp_id/:module_id",superAdminData.getIncorrectTopicByCompanyId)
superAdminRoute.get("/courseEmployeeManagementView/:comp_id",superAdminData.courseEmployeeManagementView)
superAdminRoute.post("/startDateAndEndDateOfCourseCompany",superAdminData.startDateAndEndDateOfCourseCompany)
superAdminRoute.put("/updateStatusApi/:comp_id",superAdminData.updateStatusApi)
superAdminRoute.get("/totalCompanyCount",superAdminData.totalCompanyCount)
superAdminRoute.get("/totalTnaCompanyCount",superAdminData.totalTnaCompanyCount)
superAdminRoute.get("/totalCourseCompanyCount",superAdminData.totalCourseCompanyCount)
superAdminRoute.get("/totalCourseRevenue",superAdminData.totalCourseRevenue)
superAdminRoute.get("/totalTnaRevenue",superAdminData.totalTnaRevenue)
superAdminRoute.post("/setEvent",superAdminData.setEvent)
superAdminRoute.get("/logInAndLogOutTimeForAll/:comp_id",superAdminData.logInAndLogOutTimeForAll)
superAdminRoute.get("/getCourseAccessByCompId/:comp_id",superAdminData.getCourseAccessByCompId)
superAdminRoute.put("/updateCourseStatusApi/:comp_id",superAdminData.updateCourseStatusApi)

superAdminRoute.get("/getTnaEmployeeByCompanyId/:comp_id",superAdminData.getTnaEmployeeByCompanyId)
superAdminRoute.get("/getModuleWithAttempt/:course_id/:emp_id",superAdminData.getModuleWithAttempt)
superAdminRoute.get("/getCourseIdByCompanyId/:comp_id",superAdminData.getCourseIdByCompanyId)
superAdminRoute.get("/finalAssesmentManagementQuestions/:course_id",superAdminData.finalAssesmentManagementQuestions)
superAdminRoute.post("/uploadFinalAssessmentMcq/:course_id",upload.single("file"),superAdminData.uploadFinalAssessmentMcq)
superAdminRoute.post("/uploadFinalAssesmentOtherQuestion/:course_id",upload.single("file"),superAdminData.uploadFinalAssesmentOtherQuestion)
superAdminRoute.get("/getAllFinalAssesmentMcqQuestion/:course_id",superAdminData.getAllFinalAssesmentMcqQuestion)
superAdminRoute.get("/getAllFinalAssesmentEmailQuestions/:course_id",superAdminData.getAllFinalAssesmentEmailQuestions)
superAdminRoute.get("/getAllFinalAssesmentTextQuestions/:course_id",superAdminData.getAllFinalAssesmentTextQuestions)
superAdminRoute.get("/getAllFinalAssesmentAudioQuestions/:course_id",superAdminData.getAllFinalAssesmentAudioQuestions)
superAdminRoute.put("/updateFinalAssesmentMCQquestionsById/:id",superAdminData.updateFinalAssesmentMCQquestionsById)
superAdminRoute.put("/updateFinalAssesmentEmailQuestionById/:id",superAdminData.updateFinalAssesmentEmailQuestionById)
superAdminRoute.put("/updateFinalAssesmentTextQuestionById/:id",superAdminData.updateFinalAssesmentTextQuestionById)
superAdminRoute.put("/updateFinalAssesmentAudioQuestionById/:id",superAdminData.updateFinalAssesmentAudioQuestionById)
superAdminRoute.get("/getFinalAssesmentMcqByQuestionId/:question_id",superAdminData.getFinalAssesmentMcqByQuestionId)
superAdminRoute.get("/getFinalAssesmentOtherQuestionByQuestionId/:question_id",superAdminData.getFinalAssesmentOtherQuestionByQuestionId)
superAdminRoute.put("/updateFinalAssesmentOtherQuestionsById/:question_id",superAdminData.  updateFinalAssesmentOtherQuestionsById)
superAdminRoute.get("/getFinalAssesmentEmployee/:comp_id/:course_id",superAdminData.getFinalAssesmentEmployee)
superAdminRoute.get("/randomFinalAssementQuestions/:comp_id/:course_id",superAdminData.randomFinalAssementQuestions)
superAdminRoute.post("/finalAssesmentAnswerByEmployee/:emp_id/:course_id",superAdminData.finalAssesmentAnswerByEmployee)
superAdminRoute.post("/finalAssesmentAudioAnswer/:emp_id/:course_id",audioUploadMulter.single("file"),superAdminData.finalAssesmentAudioAnswer)
superAdminRoute.get("/getDatafromFinalAssesmentEmployeeAnswer/:emp_id/:course_id",superAdminData.getDatafromFinalAssesmentEmployeeAnswer)
superAdminRoute.put("/updateFinalAssesmentScore/:emp_id/:course_id", superAdminData.updateFinalAssesmentScore)
superAdminRoute.get("/checkAuthentication/:token",superAdminData.checkAuthentication)
superAdminRoute.get("/overallCompanyGradedPerformance/:comp_id",superAdminData.overallCompanyGradedPerformance)
superAdminRoute.get("/getCourseReportById/:emp_id/:comp_id", superAdminData.getCourseReportById)
superAdminRoute.get("/getCourseCompanyById/:comp_id", superAdminData.getCourseCompanyById)
superAdminRoute.get("/getLessonNameFromNonGradedAssesmentByModuleId/:module_id/:emp_id", superAdminData.getLessonNameFromNonGradedAssesmentByModuleId)
superAdminRoute.get("/getVideoDetailsByEmployeeID/:module_id/:emp_id", superAdminData.getVideoDetailsByEmployeeID)
superAdminRoute.get("/getModuleIdByEmployee/:course_id/:emp_id", superAdminData.getModuleIdByEmployee)
superAdminRoute.get("/getModuleLessonWithVideoAttempt/:course_id/:emp_id",superAdminData.getModuleLessonWithVideoAttempt)
superAdminRoute.get("/getLessonDetailsByEmployeeIDAndModuleId/:module_id/:emp_id",superAdminData.getLessonDetailsByEmployeeIDAndModuleId)
superAdminRoute.get("/getVideoDetailsByEmployeeIDAndModuleId/:lesson_id/:emp_id",superAdminData.getVideoDetailsByEmployeeIDAndModuleId)

// -------------------------------Report and Analiysis-----------------

superAdminRoute.get("/tnaReport/:comp_id",superAdminData.tnaReport)
superAdminRoute.get("/tnaPassedEmployee/:comp_id",superAdminData.tnaPassedEmployee)
superAdminRoute.get("/tnaReportById/:emp_id",superAdminData.tnaReportById)
superAdminRoute.get("/getPercentageOfTnaEmployee/:comp_id",superAdminData.getPercentageOfTnaEmployee)
superAdminRoute.get("/finalReportById/:emp_id",superAdminData.finalReportById)
superAdminRoute.get("/checkFinalAssessmentAllQuestion",superAdminData.checkFinalAssessmentQuestion)
superAdminRoute.get("/finalAssessmentReport/:comp_id",superAdminData.finalAssessmentReport)

superAdminRoute.get("/getModuleWithMcqData",superAdminData.getModuleWithMcqData)
superAdminRoute.post("/updateNotify/:emp_id",superAdminData.updateNotify)
superAdminRoute.get("/getNotify",superAdminData.getNotify)
superAdminRoute.delete("/deleteNotify/:id",superAdminData.deleteNotify)
superAdminRoute.put("/archiveCompany/:comp_id", superAdminData.archiveCompany)
superAdminRoute.put("/restoreCompany/:comp_id", superAdminData.restoreCompany)
superAdminRoute.get("/getArchiveCompany", superAdminData.getArchiveCompany)
superAdminRoute.get("/getEmployeeByCompanyIds/:comp_id",superAdminData.getEmployeeByCompanyIds)
superAdminRoute.get("/getCompanyNameAndCourseID/:comp_id",superAdminData.getCompanyNameAndCourseID)


superAdminRoute.get("/getModuleWithNonGradedAttempt/:course_id/:emp_id",superAdminData.getModuleWithNonGradedAttempt)
superAdminRoute.get("/totalDataGet/:comp_id",superAdminData.totalDataGet)
superAdminRoute.get("/getComanyEmployeeForResult/:comp_id",superAdminData.getComanyEmployeeForResult)
superAdminRoute.get("/getCourseEmployeeBycompanyIdForReport/:comp_id",superAdminData.getCourseEmployeeBycompanyIdForReport)
superAdminRoute.get("/getAverageMarksByCompanyId/:comp_id",superAdminData.getAverageMarksByCompanyId)
superAdminRoute.get("/getTotalNumberOfEmployeeInCourseAndTna/:comp_id",superAdminData.getTotalNumberOfEmployeeInCourseAndTna)
superAdminRoute.delete("/deleteTnaMcq/:id",superAdminData.deleteTnaMcq)
superAdminRoute.delete("/deleteTnaOtherQuestion/:id",superAdminData.deleteTnaOtherQuestion)
superAdminRoute.delete("/deleteFinalMcq/:id",superAdminData.deleteFinalMcq)
superAdminRoute.delete("/deleteFinalOtherQuestion/:id",superAdminData.deleteFinalOtherQuestion)

superAdminRoute.delete("/deleteCompany/:comp_id",superAdminData.deleteCompany)
superAdminRoute.delete("/deleteTnaEmployee/:emp_id",superAdminData.deleteTnaEmployee)
superAdminRoute.delete("/deleteCourseEmployee/:emp_id",superAdminData.deleteCourseEmployee)








module.exports ={superAdminRoute}