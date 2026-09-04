
const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized, token missing",
      });
    }

    // Get token
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // authRoutes.js stores the ID as "userId"
    req.user = {
      id: decoded.userId.toString(),
    };

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error.message);

    return res.status(401).json({
      message: "Not authorized, invalid token",
    });
  }
};

module.exports = protect;

