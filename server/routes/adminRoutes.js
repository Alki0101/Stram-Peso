const router = require("express").Router();
const {
	getAdminAnalytics,
	getAllUsers,
	updateUserRole,
	deactivateUser,
	reactivateUser,
	updateEmployerVerification,
	deleteUser,
} = require("../controllers/adminController");
const { verifyToken: protect, authorizeRoles } = require("../middleware/auth");

router.get("/analytics", protect, authorizeRoles("admin"), getAdminAnalytics);
router.get("/users", protect, authorizeRoles("admin"), getAllUsers);
router.put("/users/:id/role", protect, authorizeRoles("admin"), updateUserRole);
router.put("/users/:id/deactivate", protect, authorizeRoles("admin"), deactivateUser);
router.put("/users/:id/reactivate", protect, authorizeRoles("admin"), reactivateUser);
router.put("/users/:id/verification", protect, authorizeRoles("admin"), updateEmployerVerification);
router.delete("/users/:id", protect, authorizeRoles("admin"), deleteUser);

module.exports = router;
