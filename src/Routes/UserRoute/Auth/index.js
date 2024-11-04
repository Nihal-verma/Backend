const express = require("express")
const {userLogin,logOutUser,checkAuthentication} = require("../../../Controller/User/Auth")
const router = express.Router()

router.post("/loginUser",userLogin)
router.post("/logOutUser/:loginId",logOutUser)
router.post("/checkAuthentication",checkAuthentication)

module.exports = router