const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

exports.isResident = (req, res, next) => {
  // Allow all authenticated roles (resident, employee, admin)
  if (!["resident", "employee", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

exports.isEmployee = (req, res, next) => {
  // Allow only employees, not admins
  if (req.user.role !== "employee") {
    return res.status(403).json({ message: "Only employees can perform this action" });
  }
  next();
};

exports.isEmployer = (req, res, next) => {
  // Allow only employers, not admins
  if (req.user.role !== "employer") {
    return res.status(403).json({ message: "Only employers can perform this action" });
  }
  next();
};

exports.isEmployeeOrResident = (req, res, next) => {
  // Allow residents and employees, but not admins
  if (!["resident", "employee"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only residents or employees can perform this action" });
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can perform this action" });
  }
  next();
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
