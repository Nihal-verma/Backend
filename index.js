const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

const connection = require("./mysql.js");
const { superAdminRoute } = require("./src/Routes/superAdminRoutes.js");
const { adminRoute } = require("./src/Routes/adminRoute.js");
const { route } = require("./src/Routes/globalRoute.js");
const { router } = require("./src/Routes/UserRoute/index.js");
const { adminRouter } = require("./src/Routes/AdminRoute/index.js");
const { superAdminRouter } = require("./src/Routes/SuperAdminRoute/index.js");


app.use(cors({
  origin: '*', // Allow all origins
  methods: 'GET,POST,PUT,DELETE,OPTIONS', // Allow specific methods
  allowedHeaders: 'Content-Type,Authorization', // Allow specific headers
}));
// Simplified cors setup

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static file serving
app.use(express.static("public"));


// Middleware to handle OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Routes

app.use(route);

app.use("/",router)

app.use("/admin",adminRouter)
app.use("/superAdmin",superAdminRouter)
app.use("/superAdmin", superAdminRoute);
app.use("/admin", adminRoute);

// Server listening
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});



// const express = require("express");
// const app = express();
// const cors = require("cors");
// const path = require("path");
// require("dotenv").config();
// const port = process.env.PORT || 3000; // Provide a default port if not specified
// // app.use(express.static("./VideoUpload"))
// const connection = require("./mysql.js");
// const { superAdminRoute } = require("./Routes/superAdminRoutes.js");
// const { adminRoute } = require("./Routes/adminRoute.js");
// const { route } = require("./Routes/globalRoute.js");

// // Middleware
// app.use(cors({
//   origin: "*",
//   credentials: true, // Enable credentials (cookies, authorization headers, etc.)
// }));

// app.use(express.json({limit: '50mb'}));
// app.use(express.urlencoded({limit: '50mb'}));
// app.use(express.static("upload"));
// app.use(express.static("VideoUpload"))
// app.use(express.static("AudioUpload"))


// app.use((req, res, next) => {
//   if (req.method === 'OPTIONS'){
//       return res.status(200).json({});
//   }
//   next();
// });


// // Routes
// app.use(route)
// app.use("/superAdmin",superAdminRoute);
// app.use("/admin",adminRoute)

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });


