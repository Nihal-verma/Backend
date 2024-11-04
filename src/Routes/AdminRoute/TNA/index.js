const express = require("express")
const {tnaAndCourseCount,tnaLicenseDetails,tnaLicenseManagementView,createTnaLicensing,getTnaLicenseCount} = require("../../../Controller/Admin/TNA")
const router = express.Router()
router.get("/tnaAndCourseCount/:comp_id",tnaAndCourseCount) //Dashboard
router.get("/LicenseDetails/:comp_id",tnaLicenseDetails)
router.get("/getLicenseCount/:comp_id",getTnaLicenseCount)
router.post("/createLicensing/:comp_id",createTnaLicensing)
router.get("/LicenseManagementView/:comp_id",tnaLicenseManagementView)
module.exports = router
