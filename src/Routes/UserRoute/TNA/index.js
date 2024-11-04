
const express = require("express")
const {verifyUserToken} = require("../../../Middleware/jwt")
const audioUploadMulter = require("../../../Middleware/audioMulter")


const {getMcqforEmployeeSetWise,tnaAnswerByEmployee} = require('../../../Controller/User/TNA')
const router = express.Router()

router.get("/getMcq/:tnaLicenseCode/:comp_id/:uniqueToken",getMcqforEmployeeSetWise)
router.post("/submitAnswer/:tnaLicenseCode/:comp_id/:uniqueToken",tnaAnswerByEmployee)



module.exports = router
