const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;

    if (file.mimetype === "text/csv") {
      dir = path.join(__dirname, "../../public/upload");
    } else if (
      file.mimetype === "video/mp4" ||
      file.mimetype === "video/webm" ||
      file.mimetype === "video/ogg" ||
      file.mimetype === "video/x-msvideo"
    ) {
      dir = path.join(__dirname, "../../public/VideoUpload");
    } else {
      return cb(new Error("Invalid file type"), false);
    }

    fs.mkdirSync(dir, { recursive: true }); // Create the directory if it doesn't exist
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
