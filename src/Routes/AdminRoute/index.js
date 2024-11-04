const express = require("express")
const {verifyAdminToken} = require("../../Middleware/jwt")

const auth = require("./Auth")
const course = require("./Course")
const employee = require("./Employee")
const company = require("./Company")
const report = require("./Report")
const tna = require("./TNA")
const adminRouter = express.Router()

adminRouter.use("/auth",auth)
adminRouter.use(verifyAdminToken)
adminRouter.use("/course",course)
adminRouter.use("/company",company)
adminRouter.use("/employee",employee)
adminRouter.use("/tna",tna)
adminRouter.use("/report",report)



module.exports = {adminRouter}