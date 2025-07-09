const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const { User, Admin } = require('../models');
const { ObjectId } = require("mongodb");

// Multer config for file uploads (Valid ID)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// ✅ SIGNUP
router.post("/signup", upload.single("validId"), async (req, res) => {
  try {
    console.log("Incoming signup request:", req.body);
    console.log("Uploaded file:", req.file);
    const { firstName, lastName, age, username, password, role } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Valid ID is required." });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Username already exists." });
    }

        // ✅ Validate age before proceeding
    const numericAge = parseInt(age, 10);
    if (age < 7 || age > 100) {
      return res.status(400).json({ message: "Please put your real age." });
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      age: numericAge,
      username,
      password: hashedPassword,
      role,
      status: "pending",
      idImagePath: req.file.path,
      submittedAt: new Date(),
    });

    await newUser.save();

    res.status(201).json({ message: "Signup successful. Await admin approval." });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup." });
  }
});

// ✅ LOGIN
// routes/auth.js
router.post("/login", async (req, res) => {
    console.log('📥 Login request from:', req.ip);
  console.log('Body:', req.body);
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // ✅ Send full user info
    res.status(200).json({
      message: "Login successful",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});



// GET pending users (for admin dashboard)
router.get("/pending-users", async (req, res) => {
  try {
    const users = await User.find({ status: "pending" });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending users." });
  }
});

// PATCH approve user
router.patch("/approve/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(id, { status: "approved" }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({ message: "User approved.", user });
  } catch (error) {
    res.status(500).json({ message: "Failed to approve user." });
  }
});

// DELETE reject user
router.delete("/reject/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({ message: "User rejected and deleted." });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject user." });
  }
});


module.exports = router;
