const express = require("express")
const {verifyUserToken} = require("../../../Middleware/jwt")

const {getNameApi,checkTotalScore} = require("../../../Controller/User/Employee")
const router = express.Router()

router.get("/checkTotalScore/:emp_id/:module_id",checkTotalScore)
router.get("/getName/:emp_id",verifyUserToken,getNameApi)



module.exports = router