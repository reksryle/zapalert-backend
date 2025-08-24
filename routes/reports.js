const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Define Report Schema
const reportSchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: { type: String, required: false, default: "" },
  username: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  age: { type: Number },
  contactNumber: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

// ✅ Create Model
const Report = mongoose.model("Report", reportSchema);

// ---------------------------
// POST /api/reports — submit emergency
// ---------------------------
router.post("/", async (req, res) => {
  try {
    const {
      type,
      description = "",
      username,
      firstName,
      lastName,
      age,
      contactNumber,
      latitude,
      longitude,
    } = req.body;

    if (!type || !firstName || !lastName || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    let parsedAge = Number(age);
    if (isNaN(parsedAge)) parsedAge = undefined;

    const newReport = new Report({
      type,
      description,
      username,
      firstName,
      lastName,
      age: parsedAge,
      contactNumber,
      latitude,
      longitude,
      status: "pending",
    });

    await newReport.save();
    res.status(201).json({ message: "Report submitted successfully!" });
  } catch (err) {
    console.error("❌ Failed to save report:", err);
    res.status(500).json({ error: "Failed to save report." });
  }
});

// ---------------------------
// GET /api/reports — fetch all reports
// ---------------------------
router.get("/", async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error("❌ Failed to fetch reports:", err);
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

// ---------------------------
// PATCH /api/reports/:id/respond — notify resident and other responders
// ---------------------------
router.patch("/:id/respond", authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });

    const io = req.app.get("io");
    const socketMap = req.app.get("socketMap");
    const residentSocketId = socketMap.get(report.username);

    const responderName = req.user
      ? `${req.user.firstName} ${req.user.lastName}`
      : "Responder";

    // Update status in MongoDB
    report.status = "responded";
    await report.save();

    // Notify resident
    if (residentSocketId) {
      io.to(residentSocketId).emit("responded", {
        type: report.type,
        responderName,
        residentName: `${report.firstName} ${report.lastName}`,
        time: new Date().toISOString(),
      });
      console.log(`📤 Emitted 'responded' to ${report.username}`);
    }

    // Notify other responders
    const currentResponderId = req.user?._id?.toString() || req.user?.responderId || req.user?.username;
    io.sockets.sockets.forEach((socket) => {
      if (socket.responderId && currentResponderId && socket.responderId.toString() !== currentResponderId) {
        socket.emit("notify-responded", {
          reportId: report._id,
          type: report.type,
          responderName,
          residentName: `${report.firstName} ${report.lastName}`,
          time: new Date().toISOString(),
        });
      }
    });

    res.json({ message: "Report marked as responded.", reportId: report._id, status: report.status });
  } catch (err) {
    console.error("❌ Failed to process responded:", err);
    res.status(500).json({ error: "Failed to mark as responded." });
  }
});


// ---------------------------
// PATCH /api/reports/:id/ontheway — mark report as on the way
// ---------------------------
router.patch("/:id/ontheway", authMiddleware, async (req, res) => {
  try {
    const updated = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "on_the_way" },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Report not found." });

    const io = req.app.get("io");
    const socketMap = req.app.get("socketMap");
    const residentSocketId = socketMap.get(updated.username);

    const responderName = req.user
      ? `${req.user.firstName} ${req.user.lastName}`
      : "Responder";

    // Notify resident
    if (residentSocketId) {
      io.to(residentSocketId).emit("notify-resident", {
        type: updated.type,
        responderName,
        residentName: `${updated.firstName} ${updated.lastName}`,
        time: new Date().toISOString(),
      });
    }

    // Notify other responders
    const currentResponderId = req.user?._id?.toString() || req.user?.responderId || req.user?.username;
    io.sockets.sockets.forEach((socket) => {
      if (socket.responderId && currentResponderId && socket.responderId.toString() !== currentResponderId) {
        socket.emit("notify-on-the-way", {
          reportId: updated._id,
          type: updated.type,
          responderName,
          residentName: `${updated.firstName} ${updated.lastName}`,
          time: new Date().toISOString(),
        });
      }
    });

    res.json({ message: "Report marked as on the way", report: updated });
  } catch (err) {
    console.error("❌ Failed to update report to on the way:", err);
    res.status(500).json({ error: "Failed to update report status." });
  }
});

// ---------------------------
// DELETE /api/reports/:id — decline report
// ---------------------------
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });

    const io = req.app.get("io");
    const responderName = `${req.user.firstName} ${req.user.lastName}`;
    const reportId = report._id;

    const socketMap = req.app.get("socketMap");
    const residentSocketId = socketMap.get(report.username);

    // Notify resident
    if (residentSocketId) {
      io.to(residentSocketId).emit("declined", {
        type: report.type,
        responderName,
        residentName: `${report.firstName} ${report.lastName}`,
        time: new Date().toISOString(),
      });
    }

    // Notify other responders
    const currentResponderId = req.user?._id?.toString() || req.user?.responderId || req.user?.username;
    io.sockets.sockets.forEach((socket) => {
      if (socket.responderId && currentResponderId && socket.responderId.toString() !== currentResponderId) {
        socket.emit("responder-declined", {
          reportId,
          type: report.type,
          responderName,
          residentName: `${report.firstName} ${report.lastName}`,
          time: new Date().toISOString(),
        });
      }
    });

    res.json({ message: "Report declined (hidden only for the acting responder)." });
  } catch (err) {
    console.error("❌ Failed to process decline:", err);
    res.status(500).json({ error: "Failed to process decline." });
  }
});

module.exports = router;
