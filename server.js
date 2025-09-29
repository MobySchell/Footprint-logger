import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import authRoutes from "./routes/auth.js";
import emissionsRoutes from "./routes/emissions.js";
import analysisRoutes from "./routes/analysis.js";
import { ensureIndexes } from "./utils/backendHelpers.js";
// Path imports removed - API-only deployment

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Basic security headers with explicit CSP override
app.use((req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	res.setHeader("X-XSS-Protection", "1; mode=block");

	// Remove any existing CSP headers
	res.removeHeader("Content-Security-Policy");
	res.removeHeader("Content-Security-Policy-Report-Only");

	next();
});

// CORS Setup
app.use(
	cors({
		origin: function (origin, callback) {
			// allow requests with no origin (curl, Postman)
			if (!origin) return callback(null, true);

			const allowedOrigins = [
				"http://localhost:5173",
				"http://localhost:3000",
				"https://footprint-logger-0yry.onrender.com", // your deployed frontend
			];

			if (allowedOrigins.includes(origin)) return callback(null, true);

			return callback(new Error("Not allowed by CORS"));
		},
		credentials: true,
	})
);

// Additional CORS headers for all responses
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
	res.header("Access-Control-Allow-Credentials", "true");
	res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");

	// Additional headers to override platform CSP
	res.header("X-Content-Security-Policy", "");
	res.header("X-WebKit-CSP", "");
	res.removeHeader("Content-Security-Policy");
	res.removeHeader("Content-Security-Policy-Report-Only");

	next();
});

// Parse JSON bodies
app.use(express.json());

// Log requests for debugging
app.use((req, res, next) => {
	console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
	next();
});

// MongoDB Connection
let db;
let dbConnected = false;

const connectDB = async () => {
	try {
		const connectionStrings = [
			process.env.MONGODB_URI,
			"mongodb://127.0.0.1:27017/footprint-logger",
			"mongodb://localhost:27017/footprint-logger",
		].filter(Boolean);

		let connected = false;

		for (const uri of connectionStrings) {
			try {
				console.log(`🔄 Trying to connect to: ${uri}`);
				const client = new MongoClient(uri, {
					serverSelectionTimeoutMS: 3000,
				});
				await client.connect();
				db = client.db();
				dbConnected = true;
				connected = true;
				console.log("✅ Connected to MongoDB");
				break;
			} catch (err) {
				console.log(`❌ Failed to connect to ${uri}: ${err.message}`);
			}
		}

		if (!connected) throw new Error("Could not connect to MongoDB");

		await ensureIndexes(db);
	} catch (error) {
		console.error("❌ MongoDB connection error:", error.message);
		dbConnected = false;
	}
};

// Make DB available to routes
app.use((req, res, next) => {
	req.db = db;
	req.dbConnected = dbConnected;
	next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/emissions", emissionsRoutes);
app.use("/api/analysis", analysisRoutes);

// Root route for direct browser access
app.get("/", (req, res) => {
	res.json({
		message: "Carbon Footprint Logger API",
		status: "running",
		database: dbConnected ? "connected" : "disconnected",
		endpoints: {
			health: "/api/health",
			auth: "/api/auth/*",
			emissions: "/api/emissions/*",
			analysis: "/api/analysis/*",
		},
		timestamp: new Date(),
	});
});

// Health check
app.get("/api/health", (req, res) => {
	res.json({
		message: "Server is running!",
		database: dbConnected ? "connected" : "disconnected",
		timestamp: new Date(),
	});
});

// Handle favicon requests (prevents CSP errors)
app.get("/favicon.ico", (req, res) => {
	console.log("Favicon request received from:", req.get("User-Agent"));

	// Remove ALL security headers that might cause CSP issues
	res.removeHeader("Content-Security-Policy");
	res.removeHeader("Content-Security-Policy-Report-Only");
	res.removeHeader("X-Content-Security-Policy");
	res.removeHeader("X-WebKit-CSP");

	// Set basic headers
	res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
	res.setHeader("Content-Type", "image/x-icon");

	// Return a simple 1x1 transparent icon (base64 encoded)
	const transparentIcon = Buffer.from(
		"AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAA=",
		"base64"
	);

	res.send(transparentIcon);
});

// Debug route to check headers
app.get("/debug-headers", (req, res) => {
	res.json({
		headers: res.getHeaders(),
		csp: res.getHeader("Content-Security-Policy"),
		timestamp: new Date(),
	});
});

// Serve React Frontend (removed for API-only deployment)
// API-only server - no static file serving needed for Render deployment

// Start Server
const startServer = async () => {
	await connectDB();
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
};

startServer();
