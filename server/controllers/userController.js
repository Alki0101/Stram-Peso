const User = require("../models/User");

const normalizeWorkExperience = (value) => {
  if (!value) return value;
  if (value === "1-3 years") return "1–3 years";
  if (value === "3-5 years") return "3–5 years";
  return value;
};

exports.completeOnboarding = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const currentUser = await User.findById(userId).select("role");

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = {
      hasCompletedOnboarding: true,
      onboardingComplete: true,
    };

    if (currentUser.role === "employer") {
      updates.companyName = req.body.companyName;
      updates.industry = req.body.industry;
      updates.companySize = req.body.companySize;
      updates.businessAddress = req.body.businessAddress;
      updates.website = req.body.website || "";
      updates.companyDescription = req.body.companyDescription;
      updates.phone = req.body.phone;
      updates.address = req.body.businessAddress;
    } else {
      Object.assign(updates, req.body);
      updates.workExperience = normalizeWorkExperience(req.body.workExperience);
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    const user = await User.findByIdAndUpdate(userId, cleanUpdates, {
      new: true,
    }).select("-password");

    return res.json({
      message: "Onboarding completed",
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to complete onboarding" });
  }
};
