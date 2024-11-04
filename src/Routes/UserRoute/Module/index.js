const express = require("express")
const {verifyUserToken} = require("../../../Middleware/jwt")
const audioUploadMulter = require("../../../Middleware/audioMulter")


const {getModuleNameById} = require('../../../Controller/User/Module')
const router = express.Router()
router.get("/getModuleNameById/:module_id",verifyUserToken,getModuleNameById)


module.exports = router
