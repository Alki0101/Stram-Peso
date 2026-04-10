const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const InviteCode = require("../models/InviteCode");
const JobApplication = require("../models/JobApplication");
const fs = require("fs");
const path = require("path");

const normalizeWorkExperience = (value) => {
  if (!value) return value;
  if (value === "1-3 years") return "1–3 years";
  if (value === "3-5 years") return "3–5 years";
  return value;
};

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "resident",
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasCompletedOnboarding: false,
        onboardingComplete: false,
      },
      hasCompletedOnboarding: false,
      onboardingComplete: false,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.isActive === false) {
      return res.status(403).json({ message: "Your account is deactivated. Please contact the administrator." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasCompletedOnboarding:
          typeof user.hasCompletedOnboarding === "boolean"
            ? user.hasCompletedOnboarding
            : Boolean(user.onboardingComplete),
        onboardingComplete: Boolean(user.onboardingComplete),
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const currentUser = await User.findById(userId).select("role password");

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.email) {
      const existing = await User.findOne({ email: req.body.email, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    if (currentUser.role === "admin" && req.body.newPassword) {
      const currentPassword = String(req.body.currentPassword || "");
      const isCurrentValid = await bcrypt.compare(currentPassword, currentUser.password);

      if (!isCurrentValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      if (String(req.body.newPassword).length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }
    }

    let parsedSkills;
    if (req.body.skills !== undefined) {
      try {
        parsedSkills = JSON.parse(req.body.skills);
        if (!Array.isArray(parsedSkills)) {
          parsedSkills = [];
        }
      } catch (e) {
        parsedSkills = String(req.body.skills)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    const updates = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      dateOfBirth: req.body.dateOfBirth || null,
      gender: req.body.gender,
    };

    if (currentUser.role === "admin") {
      updates.dateOfBirth = undefined;
      updates.gender = undefined;
      updates.about = undefined;
      updates.address = undefined;
      updates.desiredJobTitle = undefined;
      updates.skills = undefined;
      updates.workExperience = undefined;
      updates.educationalAttainment = undefined;
      updates.availabilityStatus = undefined;
    } else if (currentUser.role === "employer") {
      updates.companyName = req.body.companyName;
      updates.industry = req.body.industry;
      updates.companySize = req.body.companySize;
      updates.website = req.body.website;
      updates.companyDescription = req.body.companyDescription;
      updates.businessAddress = req.body.businessAddress;
      updates.address = req.body.businessAddress;
    } else {
      updates.about = req.body.about;
      updates.address = req.body.address;
      updates.desiredJobTitle = req.body.desiredJobTitle;
      updates.skills = parsedSkills;
      updates.workExperience = normalizeWorkExperience(req.body.workExperience);
      updates.educationalAttainment = req.body.educationalAttainment;
      updates.availabilityStatus = req.body.availabilityStatus;
    }

    if (req.files?.resumeFile?.[0]) {
      updates.resumeFile = `uploads/${req.files.resumeFile[0].filename}`;
    }

    if (req.files?.validIdFile?.[0]) {
      updates.validIdFile = `uploads/${req.files.validIdFile[0].filename}`;
    }

    if (req.files?.businessPermit?.[0]) {
      updates.businessPermitUrl = `uploads/${req.files.businessPermit[0].filename}`;
    }

    if (req.files?.registrationDoc?.[0]) {
      updates.registrationDocUrl = `uploads/${req.files.registrationDoc[0].filename}`;
    }

    if (req.files?.resume?.[0]) {
      updates.resumeFile = `uploads/${req.files.resume[0].filename}`;
    }

    if (req.files?.supportingDocument?.[0]) {
      updates.validIdFile = `uploads/${req.files.supportingDocument[0].filename}`;
    }

    if (
      req.body.onboardingComplete === true ||
      req.body.onboardingComplete === "true" ||
      req.query.complete === "true"
    ) {
      updates.hasCompletedOnboarding = true;
      updates.onboardingComplete = true;
    }

    if (currentUser.role === "admin" && req.body.newPassword) {
      updates.password = await bcrypt.hash(String(req.body.newPassword), 10);
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    const user = await User.findByIdAndUpdate(userId, cleanUpdates, {
      new: true,
    }).select("-password");

    res.json({ message: "Profile updated", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const filesToDelete = [user.resumeFile, user.validIdFile].filter(Boolean);

    await Promise.all(
      filesToDelete.map(
        (filePath) =>
          new Promise((resolve) => {
            const normalizedPath = filePath.replace(/^\/+/, "").replace(/\\/g, "/");
            const fileName = normalizedPath.split("/").pop();
            if (!fileName) {
              resolve();
              return;
            }

            const absolutePath = path.join(__dirname, "..", "uploads", fileName);
            fs.unlink(absolutePath, (err) => {
              // Ignore missing files so account deletion can proceed.
              if (err && err.code !== "ENOENT") {
                console.error("Failed to remove upload:", absolutePath, err.message);
              }
              resolve();
            });
          })
      )
    );

    await JobApplication.deleteMany({ applicant: userId });
    await user.deleteOne();

    return res.status(200).json({ message: "Account successfully deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete account" });
  }
};

exports.registerEmployer = async (req, res) => {
  const { name, email, password, inviteCode } = req.body;
  try {
    // Trim the invite code to remove extra whitespace
    const trimmedCode = inviteCode.trim();
    const code = await InviteCode.findOne({ code: trimmedCode, isActive: true });
    if (!code || code.expiresAt < Date.now() || code.usedBy) {
      return res.status(400).json({ message: "Invalid or expired invite code" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "employer",
    });

    code.isActive = false;
    code.usedAt = Date.now();
    code.usedBy = user._id;
    await code.save();

    res.json({ message: "Employer registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateInviteCode = async (req, res) => {
  try {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const invite = await InviteCode.create({
      code,
      createdBy: req.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({ code: invite.code });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.promoteToEmployer = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure the user is a resident
    if (user.role !== "resident") {
      return res.status(400).json({ message: "User is not a resident" });
    }

    // Promote the user to employer
    user.role = "employer";
    await user.save();

    // Return the updated user without the password
    const { password, ...updatedUser } = user.toObject();
    res.json({ message: "User promoted to employer", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};