const express = require("express")
const {createCompany,getCompany,getCompanyById,updateCompany,deleteCompany} = require("../../../Controller/SuperAdmin/Company")
const router = express.Router()

router.get("/",getCompany)
router.get("/byId/:comp_id",getCompanyById)
router.post("/companyCreation",createCompany)
router.put("/updateById/:comp_id",updateCompany)
router.delete("/deleteById/:comp_id",deleteCompany)


module.exports = router
