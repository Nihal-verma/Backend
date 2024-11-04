const express = require("express")
const {createModule,getAllModuleData,updateModule,getModuleByCourseId,getModuleWithAttempt} = require("../../../Controller/SuperAdmin/Module")
const router = express.Router()

router.post("/create/:course_id",createModule)
router.get("/getAll",getAllModuleData)
router.put("/update/:id",updateModule)
router.get("/getModuleByCourseId/:course_id",getModuleByCourseId)
router.get("/getModuleWithAttempt/:course_id/:emp_id",getModuleWithAttempt)


module.exports = router
