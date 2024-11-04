const express = require("express")
const {createCourse,getCourseManagement,getCourse,courseEvaluation,getCourseIdByCompanyId,updateCourse} = require("../../../Controller/SuperAdmin/Course")


const router = express.Router()
router.get("/getAllCourse",getCourse)
router.post("/createCourse",createCourse)
router.get("/getCourseManagement/:course_id",getCourseManagement)
router.get("/courseEvaluation/:comp_id",courseEvaluation)
router.get("/getCourseIdByCompanyId/:comp_id",getCourseIdByCompanyId)
router.put("/updateCourse/:id",updateCourse)

module.exports = router
