const router = require("express").Router();
const {
	getAdminAnalytics,
	getAllUsers,
	getHomepageJobManagement,
	updateUserRole,
	deactivateUser,
	reactivateUser,
	updateEmployerVerification,
	deleteUser,
	toggleHomepageFeature,
} = require("../controllers/adminController");
const { verifyToken: protect, authorizeRoles } = require("../middleware/auth");

router.get("/analytics", protect, authorizeRoles("admin"), getAdminAnalytics);
router.get("/users", protect, authorizeRoles("admin"), getAllUsers);
router.get("/jobs/homepage-display", protect, authorizeRoles("admin"), getHomepageJobManagement);
router.put("/jobs/:id/homepage-feature", protect, authorizeRoles("admin"), toggleHomepageFeature);
router.put("/users/:id/role", protect, authorizeRoles("admin"), updateUserRole);
router.put("/users/:id/deactivate", protect, authorizeRoles("admin"), deactivateUser);
router.put("/users/:id/reactivate", protect, authorizeRoles("admin"), reactivateUser);
router.put("/users/:id/verification", protect, authorizeRoles("admin"), updateEmployerVerification);
router.delete("/users/:id", protect, authorizeRoles("admin"), deleteUser);

module.exports = router;
