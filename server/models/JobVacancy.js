const mongoose = require("mongoose");

const jobVacancySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  salary: { type: String, default: "", required: false },
  requirements: { type: String, default: "", required: false },
  jobType: {
    type: String,
    enum: ["Full-time", "Part-time", "Contract", "Internship"],
    default: "Full-time",
  },
  slots: { type: Number, default: 1 },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ["active", "closed", "draft"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("JobVacancy", jobVacancySchema);
