import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import authRoutes from "./routes/auth.js";
import emissionsRoutes from "./routes/emissions.js";
import analysisRoutes from "./routes/analysis.js";
import { ensureIndexes } from "./utils/backendHelpers.js";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
				"https://footprint-logger-1.onrender.com", // your backend URL (for testing)
				"https://footprint-logger-frontend.onrender.com", // alternative frontend URL
			];

			// Log the origin for debugging
			console.log("CORS Origin check:", origin);

			if (allowedOrigins.includes(origin)) return callback(null, true);

			// For debugging, temporarily allow all origins
			console.log("CORS: Allowing origin for debugging:", origin);
			return callback(null, true);
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

// Global error handler for CORS and other errors
app.use((err, req, res) => {
	console.error("Server Error:", err);

	// Ensure CORS headers are always set, even on errors
	res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
	res.header("Access-Control-Allow-Credentials", "true");
	res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");

	if (err.message === "Not allowed by CORS") {
		return res
			.status(403)
			.json({ message: "CORS Error: Origin not allowed" });
	}

	res.status(500).json({
		message: "Internal Server Error",
		error:
			process.env.NODE_ENV === "development"
				? err.message
				: "Something went wrong",
	});
});

// MongoDB Connection
let db;
let dbConnected = false;

const connectDB = async () => {
	try {
		// Try multiple Atlas connection approaches and local fallbacks
		const connectionStrings = [
			process.env.MONGODB_URI,
			// Try simplified Atlas connection string without some parameters
			process.env.MONGODB_URI?.split("?")[0] +
				"?retryWrites=true&w=majority",
			// Only try local connections in development
			...(process.env.NODE_ENV !== "production"
				? [
						"mongodb://127.0.0.1:27017/footprint-logger",
						"mongodb://localhost:27017/footprint-logger",
				  ]
				: []),
		]
			.filter(Boolean)
			.filter((uri, index, arr) => arr.indexOf(uri) === index); // Remove duplicates

		let connected = false;

		for (const uri of connectionStrings) {
			try {
				console.log(
					`🔄 Trying to connect to: ${uri.replace(
						/\/\/[^:]+:[^@]+@/,
						"//*****:*****@"
					)}`
				); // Hide credentials in logs

				// Minimal MongoDB client options for Atlas
				const options = {
					serverSelectionTimeoutMS: 10000, // 10 second timeout
					connectTimeoutMS: 30000, // 30 second connection timeout
					maxPoolSize: 10, // Maintain up to 10 socket connections
					serverApi: {
						version: "1",
						strict: true,
						deprecationErrors: true,
					},
				};

				const client = new MongoClient(uri, options);
				await client.connect();

				// Test the connection
				await client.db().admin().ping();

				db = client.db();
				dbConnected = true;
				connected = true;
				console.log("✅ Connected to MongoDB successfully");
				break;
			} catch (err) {
				console.log(`❌ Failed to connect: ${err.message}`);
				// Log additional error details for SSL issues
				if (
					err.message.includes("SSL") ||
					err.message.includes("TLS") ||
					err.message.includes("ssl")
				) {
					console.log(
						`🔍 SSL Error Details: This might be a MongoDB Atlas cluster issue`
					);
					console.log(`💡 Possible solutions:`);
					console.log(
						`   - Check if your Atlas cluster is active and not paused`
					);
					console.log(
						`   - Verify Network Access settings in Atlas (allow 0.0.0.0/0)`
					);
					console.log(`   - Try restarting the Atlas cluster`);
					console.log(
						`   - Check if cluster is on a supported MongoDB version`
					);
				}
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

// Serve static files from React build (production)
if (process.env.NODE_ENV === "production") {
	// Serve static files from the React app build directory
	app.use(express.static(path.join(__dirname, "dist")));

	// Handle React routing - send all non-API requests to React app
	app.get("/*splat", (req, res) => {
		// Skip API routes and specific endpoints
		if (
			req.path.startsWith("/api/") ||
			req.path === "/favicon.ico" ||
			req.path === "/debug-headers"
		) {
			return res.status(404).json({ message: "API endpoint not found" });
		}

		res.sendFile(path.join(__dirname, "dist", "index.html"));
	});
} else {
	// Development mode - show API info
	app.get("/", (req, res) => {
		res.json({
			message: "Carbon Footprint Logger API (Development)",
			status: "running",
			database: dbConnected ? "connected" : "disconnected",
			frontend: "Run 'npm run dev' for frontend development server",
			endpoints: {
				health: "/api/health",
				auth: "/api/auth/*",
				emissions: "/api/emissions/*",
				analysis: "/api/analysis/*",
			},
			timestamp: new Date(),
		});
	});
}

// Health check
app.get("/api/health", (req, res) => {
	console.log("Health check requested from:", req.headers.origin);
	res.json({
		message: "Server is running!",
		database: dbConnected ? "connected" : "disconnected",
		timestamp: new Date(),
		origin: req.headers.origin,
	});
});

// Simple test endpoint for CORS debugging
app.get("/api/test", (req, res) => {
	console.log("Test endpoint hit from:", req.headers.origin);
	res.json({
		message: "CORS test successful!",
		origin: req.headers.origin,
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
	app.listen(PORT, "0.0.0.0", () => {
		console.log(`Server running on port ${PORT} and bound to 0.0.0.0`);
		console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
		console.log(`Database: ${dbConnected ? "connected" : "disconnected"}`);
	});
};

startServer();
