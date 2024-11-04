const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")

const path = "http://172.20.1.203:4000/VideoUpload/";


const getSessionWithVideo = async (req, res) => {
    try {
      const module_id = req.params.module_id;
      if (!module_id) {
        return res.status(400).json({ message: "Module Id is not provided", success: false });
      }
      const sql ="SELECT id, lesson_name, lesson_description FROM lms_lessons WHERE module_id = ?";
      const result = await queryPromiseWithAsync(sql, [module_id]);
      if (result?.length <= 0) {
        return res.status(400).json({ message: "No lesson Found for this module Id", success: false });
      }
      const lesson_ids = result?.map(({ id }) => id); // Extract module IDs from the result
  
      const videoResult = await Promise.all(
        lesson_ids.map(async (lesson_id) => {
          const searchVideoSql ="SELECT * FROM lms_CourseVideo WHERE module_id = ? AND lesson_id = ?";
          const videos = await queryPromiseWithAsync(searchVideoSql, [module_id, lesson_id]);
          if (videos?.length <= 0) {
            return null
          }
          return {
            lesson_id,
            videoId: videos?.map((row) => row.id),
            videos: videos?.map((row) => row?.video),
          }; // Adjust 'video_column_name' with the actual column name containing video data
        })
      );
      const combinedResult = {result,videoResult};
      return res.json({ success: true, path: path, data: combinedResult });
    } catch (error) {
      console.log("Internal Server error", error);
      return res.status(500).json({ success: false, message: "Internal Server Error",error:error });
    }
};
  
const videoTime = async (req, res) => {
    try {
      const module_id = req.params.id;
      const comp_id = req.params.comp_id;
      const emp_id = req.params.emp_id;
      // console.log("course_id", course_id);
      if (!module_id || !comp_id || !emp_id) {
        return res.status(400).json({ message: "Module Id Or Company Id Or Emp_id is not provided", success: false });
      }
  
      const { lesson_id, video_id, video_duration, video_watched } = req.body;
  
      const searchSql = 'SELECT * FROM lms_EmployeeVideoData WHERE emp_id = ? AND video_id = ?';
      const searchResult = await queryPromiseWithAsync(searchSql, [emp_id, video_id]);
  
      if (searchResult?.length > 0) {
        // Assuming `video_watched_value` is the value you want to update in the `video_watched` column
        const video_watched_value = video_watched /* provide the value */
  
        // Construct the update query
        const updateTimeQuery = "UPDATE lms_EmployeeVideoData SET video_watched = ?, attempt = attempt + 1 WHERE emp_id = ? AND video_id = ?";
  
        const UpdatedResult = await queryPromiseWithAsync(updateTimeQuery, [video_watched_value, emp_id, video_id]);
        
        return res.status(200).json({ message: 'Video time updated successfully', success: true, data: UpdatedResult });
      }
  
      const InserQuery = 'INSERT INTO lms_EmployeeVideoData (module_id, comp_id, emp_id,lesson_id, video_id, video_duration, video_watched ) VALUE(?,?,?,?,?,?,?)'
      const InsertResult = await queryPromiseWithAsync(InserQuery, [module_id, comp_id, emp_id, lesson_id, video_id, video_duration, video_watched])
      return res.status(200).json({ message: 'Video time added successfully', data: { lesson_id: lesson_id, video_id: video_id, video_duration: video_duration, video_watched: video_watched }, success: true });
    } catch (error) {
      console.log("Internal Server error", error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
};
  
const getVideoTime = async (req, res) => {
    try {
      const emp_id = req.params.emp_id;
      if (!emp_id) {
        return res.status(400).json({ message: "Employee Id is not provided", success: false });
      }
      // Construct the SQL query to retrieve video time data based on employee ID
      const searchSql = 'SELECT lesson_id, video_id, video_watched FROM lms_EmployeeVideoData WHERE emp_id = ?';
      const searchResult = await queryPromiseWithAsync(searchSql, [emp_id]);
      if (searchResult?.length <= 0) {
        return res.status(200).json({ message: "No data found", success: false });
      }
  
      const formattedData = searchResult.reduce((acc, { lesson_id, video_id, video_watched }) => {
        if (!acc[lesson_id]) {
          acc[lesson_id] = {};
        }
        acc[lesson_id][video_id] = video_watched;
        return acc;
      }, {});
      return res.status(200).json({ success: true, data: formattedData });
    } catch (error) {
      console.log("Internal Server error", error);
      return res.status(500).json({ message: 'Internal Server Error',error:error });
    }
};

module.exports = {getSessionWithVideo,videoTime,getVideoTime}