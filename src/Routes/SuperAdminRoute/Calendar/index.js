const express = require("express")
const {calendarEvents,getCalendarEvents,getCalendarFutureEvents,updatedDateData,updatedCompData,setEvent,startDateAndEndDateOfCourseCompany} = require("../../../Controller/SuperAdmin/Calendar")
const router = express.Router()


router.post("/calendarEvents",calendarEvents)
router.get("/getAllEvents",getCalendarEvents)
router.get("/getFutureEvents",getCalendarFutureEvents)
router.put("/updatedDateData",updatedDateData)
router.put("/updatedCompData",updatedCompData)
router.post("/startDateAndEndDateOfCourseCompany",startDateAndEndDateOfCourseCompany)
router.post("/setEvent",setEvent)




module.exports = router
