// middlewares/auth.js
import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization") || req.header("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ keep the full payload
    req.user = verified;

    // ✅ ALSO expose a consistent userId field
    req.userId = verified.id || verified._id;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized (missing userId)" });
    }

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default auth;
