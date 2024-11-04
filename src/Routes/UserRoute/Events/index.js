const express = require("express")
const {verifyUserToken} = require("../../../Middleware/jwt")

const getCompanyEvent = require('../../../Controller/User/Events')
const router = express.Router()

router.get("/get/:comp_id",verifyUserToken,getCompanyEvent)


module.exports = router
