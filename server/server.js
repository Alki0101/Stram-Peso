require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const app = express();
const server = http.createServer(app);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/; // ✅ added pdf for resumes
    const isValidType = allowedTypes.test(file.mimetype);
    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  }
});

(async () => {
  await connectDB();
  
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
  app.use(express.json());
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/jobs", require("./routes/jobRoutes"));
  app.use("/api/employer", require("./routes/employerRoutes"));
  app.use("/api/admin", require("./routes/adminRoutes"));
  app.use("/api/messages", require("./routes/messageRoutes"));
  app.use("/api/users", require("./routes/userRoutes"));

  app.locals.upload = upload;

  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    socket.on("join_conversation", (conversationId) => {
      if (!conversationId) return;
      socket.join(String(conversationId));
    });

    socket.on("leave_conversation", (conversationId) => {
      if (!conversationId) return;
      socket.leave(String(conversationId));
    });

    socket.on("send_message", (data = {}) => {
      const { conversationId, senderId, content } = data;
      if (!conversationId || !senderId || !String(content || "").trim()) return;

      io.to(String(conversationId)).emit("receive_message", {
        conversationId,
        sender: senderId,
        content: String(content).trim(),
        createdAt: new Date(),
        isRead: false,
      });
    });

    socket.on("typing", (data = {}) => {
      if (!data.conversationId) return;
      socket.to(String(data.conversationId)).emit("user_typing", {
        conversationId: data.conversationId,
        senderId: data.senderId,
      });
    });

    socket.on("stop_typing", (data = {}) => {
      if (!data.conversationId) return;
      socket.to(String(data.conversationId)).emit("user_stop_typing", {
        conversationId: data.conversationId,
      });
    });
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();