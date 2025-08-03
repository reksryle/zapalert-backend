const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const router = express.Router();
const { User, Admin } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

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
      firstName, lastName, username, password, age,
      contactNumber, barangay, barrio, role
    } = req.body;

    const contactRegex = /^09\d{9}$/;
    if (!contactRegex.test(contactNumber)) {
      return res.status(400).json({ message: "Contact number must start with 09 and be 11 digits long." });
    }

    if (!req.file) return res.status(400).json({ message: "Valid ID is required." });

    if (!age || age < 7 || age > 100) {
      return res.status(400).json({ message: "Age must be between 7 and 100." });
    }

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username already exists." });

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


// ✅ LOGIN — now sets zapToken cookie
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

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,  // ✅ added
        lastName: user.lastName     // ✅ added
      },
      JWT_SECRET,
      { expiresIn: "10y" }
    );

    res
      .cookie("zapToken", token, {
        httpOnly: true,
        secure: true, // change to true in production with HTTPS
        sameSite: "None",
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
      })
      .json({
        message: "Login successful",
        role: user.role,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        contactNumber: user.contactNumber,
        address: user.address,
      });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});


// ✅ SESSION CHECK — returns user info if zapToken is valid
router.get("/session", async (req, res) => {
  try {
    const token = req.cookies?.zapToken;
    if (!token) return res.status(401).json({ message: "No token." });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
      role: user.role,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      age: user.age,
      contactNumber: user.contactNumber,
      address: user.address,
    });
  } catch (err) {
    console.error("Session check failed:", err);
    res.status(401).json({ message: "Invalid or expired token." });
  }
});

// /api/auth/check-session
router.get("/check-session", (req, res) => {
  const token = req.cookies?.zapToken;
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ userId: decoded.userId, role: decoded.role });
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
});


// ✅ LOGOUT — clears cookie
router.post("/logout", (req, res) => {
  res.clearCookie("zapToken", {
    httpOnly: true,
    secure: true, // true in production
    sameSite: "None",
  });
  res.json({ message: "Logged out successfully." });
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
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.idImagePath) {
      const absolutePath = path.resolve(user.idImagePath);
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User and image deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error during delete" });
  }
});

// ✅ GET all users
router.get("/all-users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

module.exports = router;
