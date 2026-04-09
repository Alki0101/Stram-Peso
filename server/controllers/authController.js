const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const InviteCode = require("../models/InviteCode");
const JobApplication = require("../models/JobApplication");
const fs = require("fs");
const path = require("path");

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

    res.json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingComplete: false,
      },
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
        role: user.role
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
    const currentUser = await User.findById(userId).select("role");

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.email) {
      const existing = await User.findOne({ email: req.body.email, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ message: "Email already exists" });
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

    if (currentUser.role === "employer") {
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
      updates.workExperience = req.body.workExperience;
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
      updates.onboardingComplete = true;
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