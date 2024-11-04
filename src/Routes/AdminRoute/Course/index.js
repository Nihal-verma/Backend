const express = require("express")
const {courseLicenseDetails,courseLicenseManagementView,getLicenseManagement} = require("../../../Controller/Admin/Course")
const router = express.Router()
router.get("/getLicense/:comp_id",getLicenseManagement)
router.get("/LicenseDetails/:comp_id",courseLicenseDetails)
router.get("/LicenseManagementView/:comp_id",courseLicenseManagementView)
module.exports = router
