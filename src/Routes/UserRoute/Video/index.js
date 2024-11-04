
const express = require("express")
const {verifyUserToken} = require("../../../Middleware/jwt")
const audioUploadMulter = require("../../../Middleware/audioMulter")


const {getSessionWithVideo,videoTime,getVideoTime} = require('../../../Controller/User/Video')
const router = express.Router()

router.get("/getSessionWithVideo/:module_id",verifyUserToken,getSessionWithVideo)
router.post("/videoTime/:id/:comp_id/:emp_id" ,videoTime)
router.get("/getVideoTime/:emp_id" ,verifyUserToken,getVideoTime)



module.exports = router
