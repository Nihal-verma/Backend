const express = require("express")
const {overallCompanyGradedPerformance,getCourseReportById} = require("../../../Controller/SuperAdmin/Report/Course")
const {finalAssessmentReport,finalReportById,checkFinalAssessmentQuestion} = require("../../../Controller/SuperAdmin/Report/Final")
const {tnaReport,tnaPassedEmployee,tnaReportById,getPercentageOfTnaEmployee} = require("../../../Controller/SuperAdmin/Report/TNA")
const {totalDataGet,getComanyEmployeeForResult,getModuleWithNonGradedAttempt,getCourseEmployeeBycompanyIdForReport,getAverageMarksByCompanyId,getTotalNumberOfEmployeeInCourseAndTna} = require("../../../Controller/SuperAdmin/Report/index")



const router = express.Router()

router.get("/getModuleWithNonGradedAttempt/:course_id/:emp_id",getModuleWithNonGradedAttempt)
router.get("/totalDataGet/:comp_id",totalDataGet)
router.get("/getComanyEmployeeForResult/:comp_id",getComanyEmployeeForResult)
router.get("/getCourseEmployeeBycompanyIdForReport/:comp_id",getCourseEmployeeBycompanyIdForReport)
router.get("/getAverageMarksByCompanyId/:comp_id",getAverageMarksByCompanyId)
router.get("/getTotalNumberOfEmployeeInCourseAndTna/:comp_id",getTotalNumberOfEmployeeInCourseAndTna)

router.get("/finalReportById/:emp_id",finalReportById)
router.get("/checkFinalAssessmentAllQuestion",checkFinalAssessmentQuestion)
router.get("/finalAssessmentReport/:comp_id",finalAssessmentReport)
router.get("/overallCompanyGradedPerformance/:comp_id",overallCompanyGradedPerformance)
router.get("/getCourseReportById/:emp_id/:comp_id", getCourseReportById)
router.get("/tnaReport/:comp_id",tnaReport)
router.get("/tnaPassedEmployee/:comp_id",tnaPassedEmployee)
router.get("/tnaReportById/:emp_id",tnaReportById)
router.get("/getPercentageOfTnaEmployee/:comp_id",getPercentageOfTnaEmployee)

module.exports = router
