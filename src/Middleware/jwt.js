const jwt = require("jsonwebtoken");
const secretKey = "helloThisIsMySecretKey";
const userSecretKey ="ThisIsUserSecretKEy"

const generateToken = async (userId, roleId) => {
  const token = await jwt.sign({ userId, roleId }, secretKey);
  return token;
};

const generateLoginToken = async (userId) => {
  const token = await jwt.sign({ userId }, userSecretKey);
  return token;
};


// const generateLoginToken = async (userId) => {
//   const token = await jwt.sign({ userId }, userSecretKey, { expiresIn: "10s" });
//   return token;
// };

function verifySuperAdminToken(req, res, next) {
  const bearerToken = req.headers["authorization"];
// console.log("bearerToken",bearerToken);
  if (!bearerToken || !bearerToken.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Unauthorized",success:false });
  }

  const token = bearerToken.split(" ")[1];

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token",success:false });
    }

    const data = decoded;
// console.log("data",data);
    if (data.userId.roleId !== 1) {
      return res.status(403).json({ message: "User not validated",success:false });
    }

    req.userData = data; // Use a more general name to store user data
    next();
  });
}

function verifyAdminToken(req, res, next) {
  const bearerToken = req.headers["authorization"];
// console.log("bearerToken",bearerToken);
  if (!bearerToken || !bearerToken.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Unauthorized",success:false });
  }

  const token = bearerToken.split(" ")[1];
// console.log("token",token);
  jwt.verify(token, userSecretKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token",success:false  });
    }

    const data = decoded;
// console.log("data",data);
    

    req.userData = data; // Use a more general name to store user data
    next();
  });
}

function verifyUserToken(req, res, next) {
  const bearerToken = req.headers["authorization"];
  // console.log("bearerToken", bearerToken);
  if (!bearerToken || !bearerToken.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Unauthorized", success: false });
  }

  const token = bearerToken.split(" ")[1];
  // console.log("token", token);
  jwt.verify(token, userSecretKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token", success: false });
    }
    const data = decoded;
    // console.log("data", data);
    if (data.length <= 0) {
      return res.status(400).json({ message: "Unknown error", success: false })
    }
    req.userData = data; // Use a more general name to store user data
    next();
  });
}

module.exports = { generateToken, generateLoginToken, verifySuperAdminToken, verifyAdminToken,verifyUserToken };
