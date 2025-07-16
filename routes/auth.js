const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
<<<<<<< HEAD
const fs = require("fs");
const router = express.Router();
const { User, Admin } = require('../models');
=======

const router = express.Router();
const { User, Admin } = require('../models');
const { ObjectId } = require("mongodb");
>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb

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
<<<<<<< HEAD
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
=======
    console.log("Incoming signup request:", req.body);
    console.log("Uploaded file:", req.file);
    const { firstName, lastName, age, username, password, role } = req.body;
>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb

    if (!req.file) {
      return res.status(400).json({ message: "Valid ID is required." });
    }

<<<<<<< HEAD
    if (!age || age < 7 || age > 100) {
      return res.status(400).json({ message: "Age must be between 7 and 100." });
    }

=======
>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Username already exists." });
    }

<<<<<<< HEAD
=======
        // ✅ Validate age before proceeding
    const numericAge = parseInt(age, 10);
    if (numericAge < 7 || age > 100) {
      return res.status(400).json({ message: "Please put your real age." });
    }


>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
<<<<<<< HEAD
      username,
      password: hashedPassword,
      age,
      contactNumber,
      barangay: barangay || "Zapatera",
      barrio,
=======
      age: numericAge,
      username,
      password: hashedPassword,
>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb
      role,
      status: "pending",
      idImagePath: req.file.path,
      submittedAt: new Date(),
    });

<<<<<<< HEAD

=======
>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb
    await newUser.save();

    res.status(201).json({ message: "Signup successful. Await admin approval." });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup." });
  }
});

<<<<<<< HEAD

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
=======
// ✅ LOGIN
// routes/auth.js
router.post("/login", async (req, res) => {
  console.log("📥 Login request:", req.body);

  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    console.log("🔍 Found user:", user);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status !== "approved") return res.status(403).json({ error: "Not approved" });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("✅ Password match:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

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
>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb
  }
});


<<<<<<< HEAD
// ✅ GET pending users
=======


// GET pending users (for admin dashboard)
>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb
router.get("/pending-users", async (req, res) => {
  try {
    const users = await User.find({ status: "pending" });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending users." });
  }
});

<<<<<<< HEAD
// ✅ PATCH approve user
=======
// PATCH approve user
>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb
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

<<<<<<< HEAD
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
=======
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

router.get("/test", (req, res) => {
  res.json({ message: "✅ Backend is live!" });
>>>>>>> 7d04e962bd450f07664b236dfc8837d0e562fecb
});

module.exports = router;
