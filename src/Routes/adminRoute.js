const express = require("express")
const adminRoute = express.Router()
const {verifyAdminToken} = require("../Middleware/jwt")
const adminApi = require("../Controller/adminApi")
const upload = require("../Middleware/multer")

// adminRoute.get("/admin/getCourseLicenseManagement/:comp_id",adminApi.getCourseLicenseManagement)
// adminRoute.get("/admin/getTNALicenseManagement/:comp_id",adminApi.getTNALicenseManagement)


adminRoute.post('/adminLogin',adminApi.adminLogin)
adminRoute.post('/createTnaLicensing/:comp_id',adminApi.createTnaLicensing)
adminRoute.post("/uploadEmployee/:comp_id",upload.single("file"),adminApi.uploadEmployee)
adminRoute.get("/getEmployeeByCompanyId/:comp_id",adminApi.getEmployeeByCompanyId)
adminRoute.get('/tnaAndCourseCount/:comp_id',adminApi.tnaAndCourseCount) //Dashboard
adminRoute.get("/tnaLicenseDetails/:comp_id",adminApi.tnaLicenseDetails)
adminRoute.get("/getTnaLicenseCount/:comp_id",adminApi.getTnaLicenseCount)
adminRoute.get("/tnaLicenseManagementView/:comp_id",adminApi.tnaLicenseManagementView)
adminRoute.get('/getLicenseManagement/:comp_id',adminApi.getLicenseManagement)
adminRoute.get("/courseLicenseDetails/:comp_id",adminApi.courseLicenseDetails)
adminRoute.get("/courseLicenseManagementView/:comp_id",adminApi.courseLicenseManagementView)
adminRoute.get("/getCompanyEvent/:comp_id",adminApi.getCompanyEvent)
adminRoute.get("/checkAuthentication/:token/:comp_id",adminApi.checkAuthentication)






module.exports ={adminRoute}