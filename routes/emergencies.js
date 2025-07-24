const express = require("express");
const router = express.Router();

// Temporary mock emergency data
const mockEmergencies = [
  {
    id: 1,
    type: "Fire",
    location: "Zone 1",
    reportedBy: "john123",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    type: "Flood",
    location: "Zone 5",
    reportedBy: "jane456",
    status: "responded",
    createdAt: new Date().toISOString(),
  },
];

router.get("/", (req, res) => {
  res.json(mockEmergencies); // Send array directly
});

module.exports = router;
