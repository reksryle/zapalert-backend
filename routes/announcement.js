const express = require("express");
const router = express.Router();

module.exports = (io) => {
  router.post("/", (req, res) => {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is empty" });
    }

    // Send the message to all connected users via socket.io
    io.emit("public-announcement", {
      message,
      createdAt: new Date(),
    });

    console.log("📢 Announcement broadcasted:", message);

    res.json({ success: true });
  });

  return router;
};
