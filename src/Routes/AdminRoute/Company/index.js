const express = require("express")
const {getCompanyEvent,getCompany,getCompanyById,getCompanyByEmployeeById} = require("../../../Controller/Admin/Company")
const router = express.Router()
router.get("/getCompanyEvent/:comp_id",getCompanyEvent)
router.get("/getAll",getCompany)
router.get("/getById/:comp_id",getCompanyById)
router.get("/getByEmployeeId/:emp_id",getCompanyByEmployeeById)
module.exports = router
