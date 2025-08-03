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

// ✅ POST /api/reports — submit emergency
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
    if (isNaN(parsedAge)) {
      parsedAge = undefined;
    }

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

// ✅ GET /api/reports — fetch all reports
router.get("/", async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error("❌ Failed to fetch reports:", err);
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

// ✅ PATCH /api/reports/:id/respond — mark report as responded
router.patch("/:id/respond", authMiddleware, async (req, res) => {
  try {
    const updated = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "responded" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Report not found." });
    }

    // 🔔 Emit 'responded' event to resident
    const io = req.app.get("io");
    const socketMap = req.app.get("socketMap");
    const residentSocketId = socketMap.get(updated.username);

    if (residentSocketId) {
      const responderName = req.user
        ? `${req.user.firstName} ${req.user.lastName}`
        : "Responder";

      io.to(residentSocketId).emit("responded", {
        type: updated.type,
        responderName,
        time: new Date().toISOString(),
      });

      console.log(`📤 Emitted 'responded' to ${updated.username}`);
    } else {
      console.warn(`⚠️ No socket found for resident ${updated.username}`);
    }

    res.json({ message: "Report marked as responded", report: updated });
  } catch (err) {
    console.error("❌ Failed to update report:", err);
    res.status(500).json({ error: "Failed to update report status." });
  }
});

// ✅ PATCH /api/reports/:id/ontheway — mark report as on the way
router.patch("/:id/ontheway", authMiddleware, async (req, res) => {
  console.log("✅ Received PATCH /ontheway request from:", req.user);

  try {
    const updated = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "on_the_way" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Report not found." });
    }

    const io = req.app.get("io");
    const socketMap = req.app.get("socketMap");
    const residentSocketId = socketMap.get(updated.username);

    if (residentSocketId) {
      const responderName = req.user
        ? `${req.user.firstName} ${req.user.lastName}`
        : "Responder";

      io.to(residentSocketId).emit("notify-resident", {
        type: updated.type,
        responderName,
        time: new Date().toISOString(),
      });

      console.log(`🔔 Notified ${updated.username} from ${responderName}`);
    } else {
      console.warn(`⚠️ No socket found for resident ${updated.username}`);
    }

    res.json({ message: "Report marked as on the way", report: updated });
  } catch (err) {
    console.error("❌ Failed to update report to on the way:", err);
    res.status(500).json({ error: "Failed to update report status." });
  }
});

// ✅ DELETE /api/reports/:id — used by both responder and admin
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Report.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Report not found." });
    }

    // ✅ If responder is deleting, notify the resident
    if (req.user.role !== "admin") {
      const io = req.app.get("io");
      const socketMap = req.app.get("socketMap");
      const residentSocketId = socketMap.get(deleted.username);

      if (residentSocketId) {
        const responderName = `${req.user.firstName} ${req.user.lastName}`;

        io.to(residentSocketId).emit("declined", {
          type: deleted.type,
          responderName,
          time: new Date().toISOString(),
        });

        console.log(`📤 Emitted 'declined' to ${deleted.username}`);
      } else {
        console.warn(`⚠️ No socket found for resident ${deleted.username}`);
      }
    }

    res.json({ message: "Report declined and removed." });
  } catch (err) {
    console.error("❌ Failed to delete report:", err);
    res.status(500).json({ error: "Failed to delete report." });
  }
});

module.exports = router;
