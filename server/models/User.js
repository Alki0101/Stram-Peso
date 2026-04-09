const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["resident", "employer", "admin"],
    default: "resident",
  },
  about: { type: String, default: "" },
  phone: { type: String, default: null },
  dateOfBirth: { type: Date, default: null },
  gender: { type: String, enum: ["Male", "Female", "Prefer not to say"], default: null },
  address: { type: String, default: null },
  skills: { type: [String], default: [] },
  desiredJobTitle: { type: String, default: null },
  educationalAttainment: {
    type: String,
    enum: [
      "Elementary Graduate",
      "High School Graduate",
      "Senior High School Graduate",
      "Vocational / TESDA",
      "College Undergraduate",
      "College Graduate",
      "Master's Degree",
      "Doctorate",
    ],
    default: null,
  },
  workExperience: {
    type: String,
    enum: [
      "Fresh Graduate",
      "Less than 1 year",
      "1–3 years",
      "3–5 years",
      "5+ years",
    ],
    default: null,
  },
  availabilityStatus: {
    type: String,
    enum: ["Actively Looking", "Open to Offers", "Currently Employed"],
    default: null,
  },
  companyName: { type: String, default: "" },
  industry: { type: String, default: "" },
  companySize: {
    type: String,
    enum: ["", "1-10", "11-50", "51-200", "200+"],
    default: "",
  },
  website: { type: String, default: "" },
  companyDescription: { type: String, default: "" },
  businessAddress: { type: String, default: "" },
  verificationStatus: {
    type: String,
    enum: ["unverified", "pending", "verified"],
    default: "unverified",
  },
  businessPermitUrl: { type: String, default: null },
  registrationDocUrl: { type: String, default: null },
  resumeFile: { type: String, default: null },
  validIdFile: { type: String, default: null },
  onboardingComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
