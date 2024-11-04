const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")
const connection = require("../../../../mysql");
require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.EMAIL_API_KEY;
const senderMail = process.env.EMAIL;

const getIncorrectTopicByCompanyId = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const module_id = req.params.module_id;

    if(!comp_id || ! module_id){
      return res.json({message:"Company Id Or Module Id is not provided",success:false})
    }
    // Fetch emp_id based on comp_id and course_id
    const empIdsResult = await new Promise((resolve, reject) => {
      const sql ="SELECT emp_id FROM lms_GradedAssesmentAnswersByEmployee WHERE comp_id = ? ";
      connection.query(sql, [comp_id], (err, resp) => {
        if (err) {
          console.log("errrr",err);
          reject(err);
        } else {
          console.log(resp);
          resolve(resp.map((item) => item.emp_id));
        }
      });
    });
    if (empIdsResult.length <= 0) {
      return res.json({message:"This company's employee hasn't submitted answers for this Module.",
        success: false,});
    }
    const searchEmp ="SELECT emp_id, mcq_id, mcq_correctAnswer, mcq_selectedAnswer FROM lms_GradedAssesmentAnswersByEmployee WHERE module_id = ? AND emp_id IN(?)";
    const searchResp = await new Promise((resolve, reject) => {
      connection.query(searchEmp, [module_id,empIdsResult], (searchErr, searchResp) => {
        if (searchErr) {
          reject(searchErr);
        } else {
          resolve(searchResp);
        }
      });
    });
    if (searchResp?.length <= 0) {
      return res.json({ message: "No Data found for this company", success: false })
    }
    const incorrectQuestionIds = [];

    // Process each response
    for (let i = 0; i < searchResp?.length; i++) {
      const mcqId = JSON.parse(searchResp[i].mcq_id);
      const correctAnswer = JSON.parse(searchResp[i].mcq_correctAnswer);
      const selectedAnswer = JSON.parse(searchResp[i].mcq_selectedAnswer);

      const incorrectIds = checkAnswersWithQuestions(
        correctAnswer,
        selectedAnswer,
        mcqId
      );
      console.log("incorrectIds",incorrectIds,"searchResp[i].mcq_id",searchResp[i].emp_id);
      incorrectQuestionIds.push(...incorrectIds);
    }
    console.log("incorrectQuestionIds", incorrectQuestionIds);

    // Create a map to store the count of each question type
    const typeCountsMap = new Map();

    // Count occurrences of each question type
    incorrectQuestionIds.forEach((id) => {
      if (typeCountsMap.has(id)) {
        typeCountsMap.set(id, typeCountsMap.get(id) + 1);
      } else {
        typeCountsMap.set(id, 1);
      }
    });

    // Query the table to get the type of each question
    const getTypeQuery =
      "SELECT id, type FROM lms_CourseGradedAssessmentMCQ WHERE id IN (?)";
    const typeResp = await new Promise((resolve, reject) => {
      connection.query(
        getTypeQuery,
        [incorrectQuestionIds],
        (typeErr, typeResp) => {
          if (typeErr) {
            reject(typeErr);
          } else {
            resolve(typeResp);
          }
        }
      );
    });

    const typeCounts = {};
    for (let i = 0; i < typeResp?.length; i++) {
      const questionId = typeResp[i].id;
      const questionType = typeResp[i].type;
      const count = typeCountsMap.get(questionId) || 0;

      typeCounts[questionType] = (typeCounts[questionType] || 0) + count;
    }
    console.log("typeCounts",typeCounts);

    return res.json({
      success: true,
      message: "Success",
      data: { uniqueTypes: Object.keys(typeCounts), typeCounts },
    });
  } catch (error) {
    return res.json({message: "Internal Server error",error: error,success: false,});
  }
};

function checkAnswersWithQuestions( correctAnswers,selectedAnswers,questionIds) {
  const incorrectQuestionIds = [];

  for (let i = 0; i < correctAnswers?.length; i++) {
    const correctAnswer = correctAnswers[i];
    const selectedAnswer = selectedAnswers[i];
    const questionId = questionIds[i];

    if (selectedAnswer !== correctAnswer) {
      incorrectQuestionIds.push(questionId);
    }
  }
  return incorrectQuestionIds;
}

const updateStatusApi = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const status = req.body.status;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = "UPDATE lms_companyDetails SET status = ? WHERE id = ?";
    connection.query(sql, [status, comp_id], (err, resp) => {
      if (err) {
        return res.json({
          error: err.message,
          message: "error in query",
          success: false,
        });
      } else {
        return res.json({ message: "status updated", success: true });
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({
      error: err.message,
      message: "Internal server Error",
      success: false,
    });
  }
};


const totalCompanyCount = async (req, res) => {
  try {
    const sql = "SELECT COUNT(*) as count FROM lms_companyDetails";
    const result = await queryPromise(sql);
    if (result?.length === 0) {
      return res.json({ message: "Unable to get data", success: false });
    }
    return res.json({message: "Success",success: true,data: result[0].count});
  } catch (error) {
    return res.json({ message: "Internal Server Error", error: error });
  }
};

const totalTnaCompanyCount = async (req, res) => {
  try {
    const sql = "SELECT COUNT(*) as count FROM TNA_licensing";
    const result = await queryPromise(sql);
    if (result?.length === 0) {
      return res.json({ message: "Unable to get data", success: false });
    }
    return res.json({message: "Success",success: true,data: result[0].count});
  } catch (error) {
    return res.json({ message: "Internal Server Error", error: error,success:false });
  }
};

const totalCourseCompanyCount = async (req, res) => {
  try {
    const sql = "SELECT COUNT(*) as count FROM lms_CourseCompany ";
    const result = await queryPromiseWithAsync(sql);
    if (result?.length === 0) {
      return res.json({ message: "Unable to get data", success: false });
    }
    // console.log("result[0].count",result[0].count);
    return res.json({
      message: "Success",
      success: true,
      data: result[0].count,
    });
  } catch (error) {
    return res.json({ message: "Internal Server Error", error: error });
  }
};

const totalCourseRevenue = async (req, res) => {
  try {
    const sql = "SELECT grand_total FROM lms_CourseCompany";
    const result = await queryPromiseWithAsync(sql);

    if (result?.length === 0) {
      return res.json({ message: "No data found", success: true, data: 0 });
    }

    let sum = 0;
    result.forEach((v) => {
      sum = sum + parseInt(v.grand_total) || 0; // Ensure sub_total is a number
    });

    return res.json({ message: "Success", success: true, data: sum });
  } catch (error) {
    console.error("Error in totalTnaRevenue:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error });
  }
};

const totalTnaRevenue = async (req, res) => {
  try {
    const sql = "SELECT grand_total FROM TNA_licensing";
    const result = await queryPromiseWithAsync(sql);

    if (result?.length === 0) {
      return res.json({ message: "No data found", success: true, data: 0 });
    }

    let sum = 0;

    // Use forEach instead of map for calculating sum
    result.forEach((v) => {
      sum = sum + parseInt(v.grand_total) || 0; // Ensure sub_total is a number
    });

    return res.json({ message: "Success", success: true, data: sum });
  } catch (error) {
    console.error("Error in totalTnaRevenue:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error });
  }
};

const courseEmployeeManagementView = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const licenseType = 'Course'; // Hardcoded value
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const sql = `
      SELECT 
        emp_name, emp_id,
        course_code, 
        DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(DATE_ADD(end_date, INTERVAL 1 DAY), '%Y-%m-%d') as end_date,
        status,
        ? AS licenseType
      FROM lms_courseEmployee
      WHERE comp_id = ?`;

    connection.query(sql, [licenseType, comp_id], (err, resp) => {
      if (err) {
        return res.json({ message: "Fatal error", success: false, error: err });
      }
      if (resp?.length <= 0) {
        return res.json({ message: 'Course is not purchased by this company', success: false });
      }
      return res.json({ message: 'Success', success: true, data: resp });
    });
  } catch (error) {
    return res.json({ message: "Internal Server Error", error: error });
  }
};

const logInAndLogOutTimeForAll = async (req, res) => {
  try {
    const sql =
      'SELECT log.id, log.comp_id, log.emp_id, log.logInTime, log.logOutTime, emp.emp_name, comp.comp_name ' +
      'FROM lms_EmployeeLogInLogOut log ' +
      'JOIN lms_employee emp ON log.emp_id = emp.id ' +
      'JOIN lms_companyDetails comp ON log.comp_id = comp.id ' +
      'ORDER BY log.logInTime DESC'; // Order by logInTime in descending order

    const result = await queryPromiseWithAsync(sql);
    // console.log("result", result);
    return res.status(200).json({ success: true, message: "Success", data: result })
    // Further processing of the result if needed
  } catch (error) {
    console.log("Internal Server Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
// ------------------------------------------changes done-----------------------------

const updateCourseStatusApi = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    const module_id = req.body.module_id
    const status = req.body.status;
    if(!comp_id || ! module_id){
      return res.json({message:"Company Id Or module Id is not provided",success:false})
    }
    // console.log("course_id", module_id)
    // console.log("status", status)
    //   ;
    const sql = "UPDATE lms_CourseAllotmentToCompany SET status = ? WHERE comp_id = ? AND module_id =?";
    connection.query(sql, [status, comp_id, module_id], (err, resp) => {
      if (err) {
        return res.json({
          error: err.message,
          message: "error in query",
          success: false,
        });
      } else {
        return res.json({ message: "status updated", success: true });
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({
      error: err.message,
      message: "Internal server Error",
      success: false,
    });
  }
};
// -------------------------------------changes-done-----------------------------

const getCourseAccessByCompId = async (req, res) => {
  try {
    const comp_id = req.params.comp_id;
    if(!comp_id){
      return res.json({message:"Company Id is not provided",success:false})
    }
    const searchCourseID = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?'
    const searchedResult = await queryPromiseWithAsync(searchCourseID,comp_id)
    const course_id = searchedResult[0].course_id
    if(!course_id){
      return res.json({message:"Unable to get Course Id ",success:false})
    }
    
    const searchQuery = "SELECT module_id, status FROM lms_CourseAllotmentToCompany WHERE comp_id=? AND course_id =?";
    const searchResult = await queryPromiseWithAsync(searchQuery, [comp_id,course_id]);
    if (searchResult?.length <= 0) {
      console.log("not found");
      return res.json({ message: "No course assigned to this company", success: false });
    }

    // Extract course IDs from searchResult
    const moduleIds = searchResult.map((row) => row.module_id);

    // Fetch course names based on course IDs
    const searchQueryForCourseNames = 'SELECT id, module_name FROM lms_Module WHERE id IN (?)';
    const moduleNamesResult = await queryPromiseWithAsync(searchQueryForCourseNames, [moduleIds]);

    // Map course IDs to course names
    const moduleNameMap = {};
    moduleNamesResult.forEach((row) => {
      moduleNameMap[row.id] = row.module_name;
    });

    // Add course names to searchResult
    const searchResultWithCourseNames = searchResult.map((row) => ({
      module_id: row.module_id,
      status: row.status,
      module_name: moduleNameMap[row.module_id],
    }));

    // console.log("search result with course names", searchResultWithCourseNames);
    return res.json({ message: "Successful", success: true, data: searchResultWithCourseNames });

  } catch (error) {
    console.log("Internal server Error", error);
    return res.json({ message: "Internal server Error", success: false, error: error });
  }
};

module.exports = {getIncorrectTopicByCompanyId,updateStatusApi,totalCompanyCount,totalTnaCompanyCount,totalCourseCompanyCount,totalCourseRevenue,totalTnaRevenue,courseEmployeeManagementView,logInAndLogOutTimeForAll,updateCourseStatusApi,getCourseAccessByCompId}