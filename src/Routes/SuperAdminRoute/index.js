const express = require("express")
const {verifySuperAdminToken} = require("../../Middleware/jwt")

const archive = require("./Archive")
const auth = require("./Auth")
const calendar = require("./Calendar")
const company = require("./Company")
const course = require("./Course")
const employee = require("./Employee")
const final = require("./FinalAssessment")
const graded = require("./Graded")
const lesson = require("./Lesson")
const miscellaneous = require("./Miscellaneous")
const modules = require("./Module")
const nonGraded = require("./NonGraded")
const report = require("./Report")
const tna = require("./TNA")


const superAdminRouter = express.Router()

superAdminRouter.use("/archive",archive)
superAdminRouter.use("/auth",auth)
superAdminRouter.use("/lesson",lesson)
superAdminRouter.use("/graded",graded)
superAdminRouter.use("/module",modules)
superAdminRouter.use("/calendar",calendar)
superAdminRouter.use("/course",course)
superAdminRouter.use("/company",company)
superAdminRouter.use("/",miscellaneous)
superAdminRouter.use("/employee",employee)
superAdminRouter.use("/tna",tna)
superAdminRouter.use("/nonGraded",nonGraded)
superAdminRouter.use("/report",report)
superAdminRouter.use("/final",final)


module.exports = {superAdminRouter}