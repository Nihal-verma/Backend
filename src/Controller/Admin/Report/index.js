const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")
const getCourseReportById= async(req,res)=>{
    try{
      const comp_id= req.params.comp_id;
      const emp_id= req.params.emp_id;
        if(!emp_id || ! comp_id){
        return res.json({message:"Employee Id  Or Company Id is not provided",success:false})
      }

      const getresult= "SELECT total_score, out_off, module_id, attempt, lms_Module.module_name FROM lms_GradedAssesmentAnswersByEmployee as lmsgrade INNER JOIN lms_Module ON lms_Module.id = lmsgrade.module_id WHERE comp_id = ? AND emp_id = ? ORDER BY module_id ASC"

      const result = await queryPromiseWithAsync(getresult, [comp_id, emp_id]);
      if(result?.length<=0){
        return res.json({message:"Haven't submitted any graded yet",success:false})
      }
      return res.json({message:"successful",success:true,data:result})
    } catch (error) {
      return res.status(500).json({ message: "Internal Server Error", success: false ,error:error})
    }
}

const getCourseEmployeeBycompanyIdForReport = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = `SELECT emp_id as id,emp_name,emp_email,emp_contact as contact_no FROM lms_courseEmployee WHERE comp_id =?`;
      const resp = await queryPromiseWithAsync(sql,comp_id)
      if(resp.length<=0){
        return res.json({ message: "Data not found", success: false });
      }
        return res.json({ message: "Success", data: resp, success: true });
    } catch (error) {
      return res.json({ message: "Internal server Error", error: error,success: false});
    }
};


const overallCompanyGradedPerformance = async (req, res) => {
    try {
      const comp_id = req.params.comp_id
        if(!comp_id ){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const searchCourseId = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?';
      const courseResult = await queryPromiseWithAsync(searchCourseId, comp_id);
      if(courseResult?.length<=0){
        return res.json({message:"Company heven't purchased course yet or company doesn't exist",success:false})
      }
      const searchAllModuleIDs = 'SELECT id, module_name FROM lms_Module WHERE course_id = ? AND isGraded = 1';
      const moduleResults = await queryPromiseWithAsync(searchAllModuleIDs, courseResult[0].course_id);
      if(moduleResults?.length<=0){
        return res.json({message:"Module doesn't exist on this course Which is perchased by this company which have assessment also",success :false})
      }
      // Step 3: Iterate over each module to calculate total score and out of
      const modulePerformance = [];
      for (const module of moduleResults) {
        const moduleId = module.id;
        const moduleName = module.module_name;
        const searchMarks = 'SELECT total_score, out_off FROM lms_GradedAssesmentAnswersByEmployee WHERE comp_id = ? AND module_id = ?';
        const searchedResults = await queryPromiseWithAsync(searchMarks, [comp_id, moduleId]);
  
        let totalScore = 0;
        let outOff = 0;
        if (searchedResults?.length > 0) {
          for (const result of searchedResults) {
            totalScore += result.total_score;
            outOff += result.out_off;
          }
        }
  
        // Calculate average score if there are entries
        const averageScore = searchedResults?.length > 0 ? totalScore / searchedResults?.length : 0;
        const averageOutOff = searchedResults?.length > 0 ? outOff / searchedResults?.length : 0
        const attendedBy = searchedResults?.length > 0 ? searchedResults?.length : 0
        modulePerformance.push({moduleName,totalScore,outOff,averageScore,averageOutOff,attendedBy});
      }
      return res.json({message:"success",success:true,data:modulePerformance})
    } catch (error) {
      console.error("Internal Server error:", error);
     return res.status(500).send("Internal Server error");
    }
}


const tnaReportById = async (req, res) => {
    try {
        const emp_id = req.params.emp_id;
        if (!emp_id) {
            return res.json({ message: "Employee id is not provided", success: false })
        }
        const sql = "SELECT * FROM lms_TNA_Employee_Answers WHERE emp_id =?";
        const resultSql = await queryPromiseWithAsync(sql, emp_id)
        if (resultSql?.length <= 0) {
            return res.json({ message: "No data found", success: false, notFound: true });
        }
        // console.log("resp", resp[0]);
        const {mcq_questions,text_question,email_question,mcq_score,mcq_score_out_off,
            email_score,
            email_score_out_off,
            text_score,
            text_score_out_off,
            total_score,
            out_Off,
        } = resultSql[0];

        const result = {
            MCQ: {
                question_count: JSON.parse(mcq_questions)?.length,
                score: mcq_score,
                out_off: mcq_score_out_off,
            },
            TEXT: {
                question_count: JSON.parse(text_question)?.length,
                score: text_score,
                out_off: text_score_out_off,
            },
            EMAIL: {
                question_count: JSON.parse(email_question)?.length,
                score: email_score,
                out_off: email_score_out_off,
            },
            total_score: total_score,
            out_off: out_Off,
        };
        const passedFailed = Math.round(total_score / out_Off * 100) > 70 ? "Pass" : "Fail"
        return res.json({ message: "success", data: result, result: passedFailed, success: true });

    } catch (error) {
        console.log("err", error);
        return res.status(500).json({ message: "Internal Server error", error: error, success: false });
    }
};

module.exports = {getCourseReportById,getCourseEmployeeBycompanyIdForReport,overallCompanyGradedPerformance,tnaReportById}