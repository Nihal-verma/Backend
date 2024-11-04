const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../public/AudioUpload");
    fs.mkdirSync(dir, { recursive: true }); // Create the directory if it doesn't exist
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original file name
  },
});

const audioUploadMulter = multer({ storage: storage });

module.exports = audioUploadMulter;
