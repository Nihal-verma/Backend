const {queryPromiseWithAsync} = require("../../../Utility/helperFunction")

const courseLicenseDetails = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const sql = `SELECT cc.course_code, ce.emp_id, ce.emp_name, ce.end_date, ce.status
            FROM lms_courseEmployee ce
            LEFT JOIN lms_CourseCompany cc ON ce.comp_id = cc.comp_id
            WHERE ce.comp_id = ?
        `;
        const result = await queryPromiseWithAsync(sql,comp_id)
        if (result?.length <= 0) {
            return res.json({ message: "Data of this company does not exist", success: false });
        }
        return res.json({ message: "Success", data: resp, success: true });
    } catch (error) {
        console.log("Error", error);
        return res.json({ message: "Internal server Error", success: false, error: error });
    }
};

const courseLicenseManagementView = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if(!comp_id){
            return res.json({message:"Company Id Not Provided",success:false})
        }
        const licenseType = 'Course'; // Hardcoded value

        const sql = `SELECT emp_name, emp_id,course_code,end_date,status,? AS licenseType FROM lms_courseEmployee WHERE comp_id = ?`;
        const result = await queryPromiseWithAsync(sql,[licenseType,comp_id])
            if (result?.length <= 0) {
                return res.json({ message: 'Course is not purchased by this company', success: false });
            }
            const processedData = result?.map(row => {
                let endDate = new Date(row.end_date);
                if (endDate.getUTCHours() === 0 && endDate.getUTCMinutes() === 0 && endDate.getUTCSeconds() === 0) {
                } else {
                    endDate.setUTCDate(endDate.getUTCDate());
                }

                // Format the date to dd-mm-yy
                const day = String(endDate.getUTCDate()).padStart(2, '0');
                const month = String(endDate.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
                const year = String(endDate.getUTCFullYear()).slice(-2); // Get last two digits of the year
                row.end_date = `${day}-${month}-${year}`;
                return row;
            });

            return res.json({ message: 'Success', success: true, data: processedData });
       
    } catch (error) {
        return res.json({ message: "Internal Server Error", error: error });
    }
};

const getLicenseManagement = async (req, res) => {
    try {
        const comp_id = req.params.comp_id;
        if (!comp_id) {
            return res.json({ message: "Company Id Not Provided", success: false });
        }
        // Query for Course License
        const courseLicenseQuery = "SELECT start_date, end_date, total_no_of_attendies FROM lms_CourseCompany WHERE comp_id = ?";
        const courseResp = await queryPromiseWithAsync(courseLicenseQuery, comp_id);

        let courseData = {};
        if (courseResp?.length > 0) {
            const courseStartDate = new Date(courseResp[0].start_date);
            const courseEndDate = new Date(courseResp[0].end_date);
            const courseTotalAttendies = courseResp[0].total_no_of_attendies;
            const formattedCourseStartDate = courseStartDate.toLocaleDateString('en-GB');
            const formattedCourseEndDate = courseEndDate.toLocaleDateString('en-GB');

            courseData = {
                start_date: formattedCourseStartDate,
                end_date: formattedCourseEndDate,
                total_no_of_attendies: courseTotalAttendies,
            };
        }

        // Query for TNA License
        const tnaLicenseQuery = "SELECT start_date, end_date, total_no_of_attendies FROM TNA_licensing WHERE comp_id = ?";
        const tnaResp = await queryPromiseWithAsync(tnaLicenseQuery, comp_id);

        let tnaData = {};
        if (tnaResp?.length > 0) {
            const tnaStartDate = new Date(tnaResp[0].start_date);
            const tnaEndDate = new Date(tnaResp[0].end_date);
            const tnaTotalAttendies = tnaResp[0].total_no_of_attendies;

            const formattedTnaStartDate = tnaStartDate.toLocaleDateString('en-GB');
            const formattedTnaEndDate = tnaEndDate.toLocaleDateString('en-GB');

            tnaData = {
                start_date: formattedTnaStartDate,
                end_date: formattedTnaEndDate,
                total_no_of_attendies: tnaTotalAttendies,
            };
        }

        const data = {
            courseLicense: courseData,
            tnaLicense: tnaData,
        };

        return res.json({ message: "Success", data: data, success: true });
    } catch (error) {
        console.error("Internal Server Error", error);
        return res.status(500).json({ message: "Internal Server Error", success: false, error: error });
    }
}
;

module.exports = {courseLicenseDetails,courseLicenseManagementView,getLicenseManagement}