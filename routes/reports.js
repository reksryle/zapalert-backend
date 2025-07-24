const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");


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
      description = "", // ✅ Allow optional description (default to empty string)
      username,
      firstName,
      lastName,
      age,
      contactNumber,
      latitude,
      longitude,
    } = req.body;

    // ✅ Remove `!description` from the required fields check
    if (!type || !firstName || !lastName || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // ✅ Parse and sanitize age input
    let parsedAge = Number(age);
    if (isNaN(parsedAge)) {
      parsedAge = undefined; // optional: or set to 0 or a default value
    }

    const newReport = new Report({
      type,
      description, // can be empty
      username,
      firstName,
      lastName,
      age: parsedAge,
      contactNumber,
      latitude,
      longitude,
      status: "pending", // optional but recommended
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
router.patch("/:id/respond", async (req, res) => {
  try {
    const updated = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "responded" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Report not found." });
    }

    res.json({ message: "Report marked as responded", report: updated });
  } catch (err) {
    console.error("❌ Failed to update report:", err);
    res.status(500).json({ error: "Failed to update report status." });
  }
});

// ✅ PATCH /api/reports/:id/ontheway — mark report as on the way
router.patch("/:id/ontheway", async (req, res) => {
  console.log("✅ Received PATCH /ontheway request with body:", req.body);
  try {
    const updated = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "on_the_way" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Report not found." });
    }

    // 🔔 Emit socket event to resident
    const io = req.app.get("io");
    const socketMap = req.app.get("socketMap");
    const residentSocketId = socketMap[updated.username];

    if (residentSocketId) {
      const responderDisplayName = req.body.responderName
        ? `Responder ${req.body.responderName}`
        : "Responder";

      io.to(residentSocketId).emit("notify-resident", {
        type: updated.type,
        responderName: responderDisplayName,
        time: new Date().toISOString(),
      });

      console.log(`🔔 Notified ${updated.username} from ${responderDisplayName}`);
    } else {
      console.warn(`⚠️ No socket found for resident ${updated.username}`);
    }


    res.json({ message: "Report marked as on the way", report: updated });
  } catch (err) {
    console.error("❌ Failed to update report to on the way:", err);
    res.status(500).json({ error: "Failed to update report status." });
  }
});



// ✅ DELETE /api/reports/:id — decline a report
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Report.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Report not found." });
    }
    res.json({ message: "Report declined and removed." });
  } catch (err) {
    console.error("❌ Failed to delete report:", err);
    res.status(500).json({ error: "Failed to delete report." });
  }
});

module.exports = router;
