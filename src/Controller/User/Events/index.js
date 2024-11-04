const connection = require("../../../../mysql");
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
        console.log("Internal server error", error);
        return res.status(500).json({success: false, message: 'Internal Server Error' });
    }
};

module.exports = getCompanyEvent