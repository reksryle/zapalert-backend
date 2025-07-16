const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { User, Admin } = require('../models');

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
    const {
      firstName,
      lastName,
      username,
      password,
      age,
      contactNumber,
      barangay,
      barrio,
      role,
    } = req.body;

    const contactRegex = /^09\d{9}$/;
    if (!contactRegex.test(contactNumber)) {
      return res.status(400).json({ message: "Contact number must start with 09 and be 11 digits long." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Valid ID is required." });
    }

    if (!age || age < 7 || age > 100) {
      return res.status(400).json({ message: "Age must be between 7 and 100." });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      age,
      contactNumber,
      barangay: barangay || "Zapatera",
      barrio,
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
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid username or password." });

    if (user.status !== "approved") {
      return res.status(403).json({ message: `Account is ${user.status}. Wait for admin approval.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid username or password." });

    // ✅ Add firstName and lastName here:
    res.status(200).json({
      message: "Login successful",
      role: user.role,
      userId: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});


// ✅ GET pending users
router.get("/pending-users", async (req, res) => {
  try {
    const users = await User.find({ status: "pending" });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending users." });
  }
});

// ✅ PATCH approve user
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

// ✅ DELETE reject user (also delete uploaded image)
router.delete("/reject/:id", async (req, res) => {
  try {
    // 1. Find the user in MongoDB
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. If image path exists, try to delete it
    if (user.idImagePath) {
      const absolutePath = path.resolve(user.idImagePath); // ✅ get absolute path
      console.log("🧾 Trying to delete:", absolutePath);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log("✅ Image deleted from filesystem");
      } else {
        console.warn("⚠️ Image file not found:", absolutePath);
      }
    }

    // 3. Delete the user from the database
    await User.findByIdAndDelete(req.params.id);
    console.log("✅ User deleted from MongoDB");

    res.json({ message: "User and image deleted successfully" });

  } catch (err) {
    console.error("❌ Error deleting user/image:", err);
    res.status(500).json({ message: "Server error during delete" });
  }
});


// ✅ GET all users
router.get("/all-users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

module.exports = router;
