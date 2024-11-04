const express = require("express")
const {archiveCompany,restoreCompany,getArchiveCompany} = require("../../../Controller/SuperAdmin/Archive")
const router = express.Router()
router.put("/archiveCompany/:comp_id", archiveCompany)
router.put("/restoreCompany/:comp_id", restoreCompany)
router.get("/getArchiveCompany", getArchiveCompany)

module.exports = router
