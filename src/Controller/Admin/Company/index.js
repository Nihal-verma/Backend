const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")

const getCompanyEvent = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = 'SELECT date FROM trialEvents WHERE comp_id = ?';
        const result = await queryPromiseWithAsync(sql, comp_id);
        
        if (result?.length <= 0) {
            return res.json({ message: "No events created yet", success: false });
        }
        const data = JSON.parse(result[0].date);
        const newDate = data.map(v => new Date(v));
        const sortedDate = newDate.sort((a, b) => a - b);
        const formattedDate = sortedDate.map(v => {
            return v.toLocaleDateString('en-GB');
        });

        return res.json({ message: "Success", success: true, data: formattedDate });
    } catch (error) {
        return res.status(500).json({ status: 500, success: false, message: 'Internal Server Error' });
    }
}

const getCompany = async (req, res) => {
    try {
      const sql = "SELECT * FROM lms_companyDetails WHERE Archive_status = 1";
      const result = await queryPromiseWithAsync(sql)
      return res.json({ compData: result, success: true });
     
    } catch (error) {
      console.log(error);
      return res.json({message: "error in fetching data",success: false,msg: error,});
    }
};
  
const getCompanyById = async (req, res) => {
    try {
      const comp_id = req.params.comp_id;
      // console.log("getCompanyById",id);
      if(!comp_id){
        return res.json({message:"Company Id is not provided",success:false})
      }
      const sql = "SELECT * FROM lms_companyDetails Where id = ?";
      const result = await queryPromiseWithAsync(sql,comp_id)
      const id = result.map((value) => {
            return value.id;
        });
      const compName = result.map((value) => {
       return value.comp_name;
      });
       return res.json({id: id,comp_name: compName,compData: result,success: true});
      
    } catch (error) {
      console.log(error);
      return res.json({message: "error in fetching data",success: false,error: error});
    }
};

const getCompanyByEmployeeById = async (req, res) => {
    try {
        const employeeId = req.params.emp_id;

        if (!employeeId) {
            return res.status(400).json({ message: "Employee Id is not provided", success: false });
        }

        const employeeSql = "SELECT comp_id FROM lms_employee WHERE id = ?";
        const employeeRows = await queryPromiseWithAsync(employeeSql, [employeeId]);

        if (employeeRows.length === 0) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const comp_id = employeeRows[0].comp_id;
        const courseSql = 'SELECT course_id FROM lms_CourseCompany WHERE comp_id = ?';
        const courseResult = await queryPromiseWithAsync(courseSql, [comp_id]);
        const companySql = "SELECT * FROM lms_companyDetails WHERE id = ?";
        const companyDetails = await queryPromiseWithAsync(companySql, [comp_id]);

        if (companyDetails.length === 0) {
            return res.status(404).json({ message: "Company not found", success: false });
        }

        if (courseResult.length === 0) {
            return res.status(200).json({message: "Success",success: true,data: companyDetails[0] });
        } else {
            const course_id = courseResult[0].course_id;
            return res.status(200).json({message: "Success", success: true,data: companyDetails[0],
                course_id: course_id});
        }
    } catch (error) {
        console.error("Error fetching company details by employee ID:", error);
        return res.status(500).json({ message: "Internal server error", success: false, error: error.message });
    }
};

module.exports = {getCompanyEvent,getCompany,getCompanyById,getCompanyByEmployeeById}
// getCompany,employee,getTotalNumberOfEmployeeInCourseAndTna,getTnaEmployeeByCompanyId