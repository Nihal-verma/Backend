const express = require("express")
const {getCourseReportById,getCourseEmployeeBycompanyIdForReport,overallCompanyGradedPerformance,tnaReportById}= require("../../../Controller/Admin/Report")

const router = express.Router()
router.get("/getCourseReportById/:emp_id/:comp_id", getCourseReportById)
router.get("/getCourseEmployeeBycompanyIdForReport/:comp_id",getCourseEmployeeBycompanyIdForReport)
router.get("/overallCompanyGradedPerformance/:comp_id",overallCompanyGradedPerformance)
router.get("/tnaReportById/:emp_id",tnaReportById)

module.exports = router
