import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import authRoutes from "./routes/auth.js";
import emissionsRoutes from "./routes/emissions.js";
import analysisRoutes from "./routes/analysis.js";
import { ensureIndexes } from "./utils/backendHelpers.js";
import path from "path";
import helmet from "helmet";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Content Security Policy
app.use(
	helmet.contentSecurityPolicy({
		useDefaults: false, // fully control CSP
		directives: {
			defaultSrc: ["'none'"], // block everything by default
			scriptSrc: ["'self'"], // allow React JS
			styleSrc: ["'self'"], // allow CSS
			imgSrc: ["'self'", "https://footprint-logger-0yry.onrender.com"], // allow images/favicons
			connectSrc: [
				"'self'",
				"https://footprint-logger-0yry.onrender.com",
			], // allow API calls
			fontSrc: ["'self'"],
			objectSrc: ["'none'"],
			baseUri: ["'self'"],
		},
	})
);

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

// Health check
app.get("/api/health", (req, res) => {
	res.json({
		message: "Server is running!",
		database: dbConnected ? "connected" : "disconnected",
		timestamp: new Date(),
	});
});

// Serve React Frontend
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "client/build")));

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// Start Server
const startServer = async () => {
	await connectDB();
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
};

startServer();
