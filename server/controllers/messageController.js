const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const getUserId = (req) => req.user._id || req.user.id;

const ensureConversationBetweenUsers = async (userA, userB) => {
  const existing = await Conversation.findOne({
    participants: { $all: [userA, userB] },
  });

  if (existing) {
    return existing;
  }

  return Conversation.create({ participants: [userA, userB] });
};

exports.ensureConversationBetweenUsers = ensureConversationBetweenUsers;

exports.createConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required" });
    }

    if (String(participantId) === String(userId)) {
      return res.status(400).json({ message: "Cannot create conversation with yourself" });
    }

    const conversation = await ensureConversationBetweenUsers(userId, participantId);
    const populated = await Conversation.findById(conversation._id).populate({
      path: "participants",
      select: "name role desiredJobTitle",
    });

    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create conversation" });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const userId = getUserId(req);

    const conversations = await Conversation.find({ participants: userId })
      .populate({ path: "participants", select: "name role desiredJobTitle" })
      .sort({ lastMessageAt: -1, createdAt: -1 });

    return res.json(conversations);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId).select("participants");
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (participant) => String(participant) === String(userId)
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.conversationId || req.body.conversationId;
    const { content } = req.body;

    if (!conversationId || !content || !String(content).trim()) {
      return res.status(400).json({ message: "conversationId and content are required" });
    }

    const conversation = await Conversation.findById(conversationId).select("participants");
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (participant) => String(participant) === String(userId)
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }

    const message = await Message.create({
      conversationId,
      sender: userId,
      content: String(content).trim(),
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        lastMessage: message.content,
        lastMessageAt: message.createdAt,
      },
    });

    const populatedMessage = await Message.findById(message._id).populate("sender", "name role");

    return res.status(201).json(populatedMessage);
  } catch (error) {
    return res.status(500).json({ message: "Failed to send message" });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (participant) => String(participant) === String(userId)
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Conversation.findByIdAndDelete(conversationId);
    await Message.deleteMany({ conversationId });

    return res.json({ message: "Conversation deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete conversation" });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = getUserId(req);

    const conversations = await Conversation.find({ participants: userId }).select("_id");
    const conversationIds = conversations.map((conversation) => conversation._id);

    if (!conversationIds.length) {
      return res.json({ count: 0 });
    }

    const count = await Message.countDocuments({
      conversationId: { $in: conversationIds },
      sender: { $ne: userId },
      isRead: false,
    });

    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch unread count" });
  }
};
