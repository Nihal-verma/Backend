const express = require("express")
const {verifyUserToken} = require("../../../Middleware/jwt")
const audioUploadMulter = require("../../../Middleware/audioMulter")


const {getLessonNameFromNonGradedAssesmentByModuleId} = require('../../../Controller/User/Lesson')
const router = express.Router()

router.get("/nameByModuleId/:module_id/:emp_id",verifyUserToken,getLessonNameFromNonGradedAssesmentByModuleId)


module.exports = router
