const express = require("express")
const auth = require("./Auth")
const course = require("./Course")
const employee = require("./Employee")
const final = require("./FinalAssessment")
const graded = require("./Graded")
const lesson = require("./Lesson")
const tna = require("./TNA")
const modules = require("./Module")
const events = require("./Events")
const nonGraded = require("./NonGraded")
const video = require("./Video")


const router = express.Router()

router.use("/auth", auth)
router.use("/course", course)
router.use("/employee", employee)
router.use("/final", final)
router.use("/graded", graded)
router.use("/lesson", lesson)
router.use("/tna", tna)
router.use("/module", modules)
router.use("/events", events)
router.use("/nonGraded", nonGraded)
router.use("/video", video)


module.exports = { router }