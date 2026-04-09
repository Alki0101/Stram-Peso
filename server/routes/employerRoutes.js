const router = require("express").Router();
const {
  getEmployerJobs,
  createJob,
  updateJob,
  deleteJob,
  getApplicantsForJob,
  updateApplicationStatus,
  getEmployerStats,
  getEmployerProfileStats,
} = require("../controllers/employerController");
const { verifyToken: protect, authorizeRoles } = require("../middleware/auth");

router.get("/jobs", protect, authorizeRoles("employer"), getEmployerJobs);
router.post("/jobs", protect, authorizeRoles("employer"), createJob);
router.put("/jobs/:id", protect, authorizeRoles("employer"), updateJob);
router.delete("/jobs/:id", protect, authorizeRoles("employer"), deleteJob);
router.get("/jobs/:jobId/applicants", protect, authorizeRoles("employer"), getApplicantsForJob);
router.put("/applications/:applicationId/status", protect, authorizeRoles("employer"), updateApplicationStatus);
router.get("/stats", protect, authorizeRoles("employer"), getEmployerStats);
router.get("/profile-stats", protect, authorizeRoles("employer"), getEmployerProfileStats);

module.exports = router;
