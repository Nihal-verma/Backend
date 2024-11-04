const express = require(`express`)
const {getIncorrectTopicByCompanyId,updateStatusApi,totalCompanyCount,totalTnaCompanyCount,totalCourseCompanyCount,totalCourseRevenue,totalTnaRevenue,courseEmployeeManagementView,logInAndLogOutTimeForAll,updateCourseStatusApi,getCourseAccessByCompId} = require(`../../../Controller/SuperAdmin/Miscellaneous`)
const router = express.Router()

router.get(`/getIncorrectTopicByCompanyId/:comp_id/:module_id`,getIncorrectTopicByCompanyId)
router.get(`/courseEmployeeManagementView/:comp_id`,courseEmployeeManagementView)
router.put(`/updateStatusApi/:comp_id`,updateStatusApi)
router.get(`/totalCompanyCount`,totalCompanyCount)
router.get(`/TnaCompanyCount`,totalTnaCompanyCount)
router.get(`/totalCourseCompanyCount`,totalCourseCompanyCount)
router.get(`/totalCourseRevenue`,totalCourseRevenue)
router.get(`/totalTnaRevenue`,totalTnaRevenue)
router.get(`/logInAndLogOutTimeForAll`,logInAndLogOutTimeForAll)
router.get(`/getCourseAccessByCompId/:comp_id`,getCourseAccessByCompId)
router.put(`/updateCourseStatusApi/:comp_id`,updateCourseStatusApi)


module.exports = router
