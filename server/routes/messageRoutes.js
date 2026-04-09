const router = require("express").Router();
const {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  deleteConversation,
  getUnreadCount,
} = require("../controllers/messageController");
const { verifyToken: protect } = require("../middleware/auth");

router.post("/conversations", protect, createConversation);
router.get("/conversations", protect, getConversations);
router.get("/conversations/:conversationId/messages", protect, getMessages);
router.post("/conversations/:conversationId/messages", protect, sendMessage);
router.delete("/conversations/:conversationId", protect, deleteConversation);
router.get("/unread-count", protect, getUnreadCount);

module.exports = router;
