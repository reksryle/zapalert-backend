const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ✅ Define Report Schema
const reportSchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: { type: String, required: true },
  username: { type: String, required: true }, 
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },  
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
      const { type, description, username, firstName, lastName, latitude, longitude } = req.body;

      if (!type || !description || !firstName || !lastName || !latitude || !longitude) {
        return res.status(400).json({ error: "All fields are required." });
      }

      const newReport = new Report({
        type,
        description,
        username,
        firstName,
        lastName,
        latitude,
        longitude,
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
