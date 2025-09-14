import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "24h",
  });
};

// Register route - matches Register.jsx form fields
router.post("/register", async (req, res) => {
  try {
    const { name, surname, email, password } = req.body;

    // Validation to match Register.jsx frontend validation
    if (!name || !surname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await req.db
      .collection("users")
      .findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user document
    const newUser = {
      name,
      surname,
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await req.db.collection("users").insertOne(newUser);

    // Generate token
    const token = generateToken(result.insertedId);

    // Response format expected by Register.jsx
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: result.insertedId,
        name,
        surname,
        email: email.toLowerCase(),
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    res.status(500).json({
      message: "Server error during registration",
    });
  }
});

// Login route - matches Login.jsx form fields
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation to match Login.jsx frontend validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await req.db
      .collection("users")
      .findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Response format expected by Login.jsx
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error during login",
    });
  }
});

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your-secret-key",
    async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid token" });
      }

      try {
        const user = await req.db
          .collection("users")
          .findOne({ _id: new ObjectId(decoded.userId) });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        req.user = {
          id: user._id,
          name: user.name,
          surname: user.surname,
          email: user.email,
        };
        next();
      } catch (error) {
        console.error("Token verification error:", error);
        res.status(500).json({
          message: "Server error during token verification",
        });
      }
    }
  );
};

// Get current user route (used by AuthContext to verify token)
router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Logout route (for NavBar logout functionality)
router.post("/logout", authenticateToken, (req, res) => {
  res.json({ message: "Logout successful" });
});

export default router;
