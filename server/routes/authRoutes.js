const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { 
    register, 
    login, 
    getMe, 
  getProfile,
    updateProfile,
    deleteAccount,
    registerEmployer, 
    generateInviteCode, 
    promoteToEmployer 
} = require("../controllers/authController");
const { verifyToken: protect, isAdmin } = require("../middleware/auth");

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
    cb(null, allowedTypes.test(file.mimetype));
  }
});

const profileUpload = multer({ dest: path.join(__dirname, "../uploads") });

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/profile", protect, getProfile);
router.put(
  "/profile",
  protect,
  profileUpload.fields([
    { name: "resumeFile", maxCount: 1 },
    { name: "validIdFile", maxCount: 1 },
    { name: "businessPermit", maxCount: 1 },
    { name: "registrationDoc", maxCount: 1 },
  ]),
  updateProfile
);
router.delete("/profile", protect, deleteAccount);
router.patch(
  "/me",
  protect,
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "supportingDocument", maxCount: 1 },
  ]),
  updateProfile
);

router.post("/register/employer", registerEmployer);
router.post("/invite", protect, isAdmin, generateInviteCode);
router.patch("/promote/:userId", protect, isAdmin, promoteToEmployer);

module.exports = router;