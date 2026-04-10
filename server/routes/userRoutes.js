const router = require("express").Router();
const { verifyToken: protect } = require("../middleware/auth");
const { completeOnboarding } = require("../controllers/userController");

router.put("/onboarding", protect, completeOnboarding);

module.exports = router;
