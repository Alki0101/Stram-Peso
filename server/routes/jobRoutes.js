const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  createJob,
  getJobs,
  getJobById,
  getHomepageJobs,
  updateJob,
  deleteJob,
  applyToJob,
  updateMyApplication,
  deleteMyApplication,
  getApplicationsForJob,
  getMyApplications,
  getEmployerJobs,
} = require("../controllers/jobController");
const { verifyToken, isResident, isEmployer, isAdmin } = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpeg|jpg|png/;
    const isValidType = allowedTypes.test(file.mimetype);
    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  }
});

router.get("/homepage", getHomepageJobs);
router.get("/", getJobs);
router.get("/mine", verifyToken, isEmployer, getEmployerJobs);
router.get("/applications/me", verifyToken, isResident, getMyApplications);
router.put("/applications/:id", verifyToken, isResident, upload.single("resume"), updateMyApplication);
router.delete("/applications/:id", verifyToken, isResident, deleteMyApplication);
router.post("/", verifyToken, isEmployer, createJob);
router.post("/:id/apply", verifyToken, isResident, upload.single("resume"), applyToJob);
router.get("/:id/applications", verifyToken, getApplicationsForJob);
router.get("/:id", getJobById);
router.put("/:id", verifyToken, isEmployer, updateJob);
router.delete("/:id", verifyToken, isEmployer, deleteJob);

module.exports = router;
