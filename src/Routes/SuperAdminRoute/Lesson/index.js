const express = require("express")
const upload = require('../../../Middleware/multer')
const videoUploadMulter = require('../../../Middleware/videoMulter')
const {createLesson,createLessonAndUploadVideos,updateLessonAndVideo,getLessonInfo,createLessonUploadVideoAndAssesment,updateLesson,getLessonById} = require("../../../Controller/SuperAdmin/Lesson")
const router = express.Router()


router.post("/createLesson/:module_id",createLesson)
router.post("/createLessonUploadVideoAndAssesment/:module_id", upload.fields([
  { name: "nonGraded", maxCount: 1 },
  { name: "file", maxCount: 6 },
]), createLessonUploadVideoAndAssesment);
// router.post("/createLessonAndUploadVideos/:course_id",videoUploadMulter.array("file",5),upload.single("nonGraded"),createLessonAndUploadVideos)
router.put("/updateLessonAndVideo/:lesson_id/:video_id",videoUploadMulter.array("videos",5),updateLessonAndVideo)
router.get("/getInfo",getLessonInfo)
router.put("/updateLesson/:lesson_id",updateLesson)
router.get("/ById/:lesson_id",getLessonById)



module.exports = router
