const express = require("express")
const upload = require("../../../Middleware/multer")
const {uploadCourseEmployee,generateCourseLicensing,uploadEmployeeAndGenerateLicense,deleteCourseEmployee,getCourseEmployeeBycompanyId,getCourseEmployeeById} = require("../../../Controller/SuperAdmin/Employee/CourseEmployee")
const {uploadEmployee,generateTnaLicensing,generateTnaCodeWithoutEmployee,getEmployeeById,getEmployeeByCompanyId,getCompanyByEmployeeById,getEmployeeTnaDetailsById,getTnaEmployeeByCompanyId} = require("../../../Controller/SuperAdmin/Employee/TnaEmployee")
const {getFinalAssesmentEmployee,getDatafromFinalAssesmentEmployeeAnswer,updateFinalAssesmentScore} = require("../../../Controller/SuperAdmin/Employee/FinalEmployee")


const router = express.Router()

router.post("/uploadCourseEmployee/:comp_id/:course_id",upload.single("file"),uploadCourseEmployee)
router.post("/generateCourseLicensing/:comp_id/:course_id",generateCourseLicensing)
router.post("/uploadEmployeeAndGenerateLicense/:id", upload.single("file"), uploadEmployeeAndGenerateLicense);
router.get("/getCourseEmployeeBycompanyId/:comp_id",getCourseEmployeeBycompanyId)
router.get("/courseEmployee/:emp_id",getCourseEmployeeById)
router.delete("/deleteById/:emp_id",deleteCourseEmployee)
router.post("/upload/:comp_id",upload.single("file"),uploadEmployee)
router.post("/generateTnaLicensing/:comp_id",generateTnaLicensing)
router.post("/generateTnaCodeWithoutEmployee/:comp_id",generateTnaCodeWithoutEmployee)
router.get("/getEmployeeByCompanyId/:comp_id",getEmployeeByCompanyId)
router.get("/getById/:emp_id",getEmployeeById)
router.get("/getCompanyByEmployeeById/:emp_id",getCompanyByEmployeeById)
router.get("/getEmployeeTnaDetailsById/:emp_id",getEmployeeTnaDetailsById)
router.get("/getTnaEmployeeByCompanyId/:comp_id",getTnaEmployeeByCompanyId)
router.get("/getFinalAssesmentEmployee/:comp_id/:course_id",getFinalAssesmentEmployee)
router.get("/getDatafromFinalAssesmentEmployeeAnswer/:emp_id/:course_id",getDatafromFinalAssesmentEmployeeAnswer)
router.put("/updateFinalAssesmentScore/:emp_id/:course_id", updateFinalAssesmentScore)

module.exports = router
