const express = require("express")
const {adminLogin,checkAuthentication} = require("../../../Controller/Admin/Auth")
const router = express.Router()
router.post("/login",adminLogin)
router.get("/checkAuthentication/:token/:comp_id",checkAuthentication)

module.exports = router
