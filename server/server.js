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

  const authRoutes = require("./routes/authRoutes");
  const jobRoutes = require("./routes/jobRoutes");
  const employerRoutes = require("./routes/employerRoutes");
  const adminRoutes = require("./routes/adminRoutes");
  const messageRoutes = require("./routes/messageRoutes");
  const userRoutes = require("./routes/userRoutes");

  const mountApiRoutes = (basePath) => {
    app.use(`${basePath}/auth`, authRoutes);
    app.use(`${basePath}/jobs`, jobRoutes);
    app.use(`${basePath}/employer`, employerRoutes);
    app.use(`${basePath}/admin`, adminRoutes);
    app.use(`${basePath}/messages`, messageRoutes);
    app.use(`${basePath}/users`, userRoutes);
  };

  // Versioned API namespace.
  mountApiRoutes("/api/v1");
  // Backward compatibility for existing clients.
  mountApiRoutes("/api");

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