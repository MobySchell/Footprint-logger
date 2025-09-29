import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import authRoutes from "./routes/auth.js";
import emissionsRoutes from "./routes/emissions.js";
import analysisRoutes from "./routes/analysis.js";
import { ensureIndexes } from "./utils/backendHelpers.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Middleware - Allow frontend to access backend
app.use(
	cors({
		origin: function (origin, callback) {
			// Allow requests with no origin (like mobile apps, curl, Postman)
			if (!origin) return callback(null, true);

			// Allow any localhost port for development
			if (
				origin.match(/^http:\/\/localhost:\d+$/) ||
				origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)
			) {
				return callback(null, true);
			}

			// Allow specific origins
			const allowedOrigins = [
				"http://localhost:5173",
				"http://localhost:3000",
			];
			if (allowedOrigins.indexOf(origin) !== -1) {
				return callback(null, true);
			}

			return callback(new Error("Not allowed by CORS"));
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		optionsSuccessStatus: 200, // For legacy browser support
		preflightContinue: false,
	})
);

// Additional CORS headers for all responses
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", req.headers.origin);
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

// MongoDB connection
let db;
let dbConnected = false;

const connectDB = async () => {
	try {
		// Try different connection strings for local MongoDB
		const connectionStrings = [
			process.env.MONGODB_URI,
			"mongodb://127.0.0.1:27017/footprint-logger",
			"mongodb://localhost:27017/footprint-logger",
		].filter(Boolean);

		let client;
		let connected = false;

		for (const uri of connectionStrings) {
			try {
				console.log(`🔄 Trying to connect to: ${uri}`);
				client = new MongoClient(uri, {
					serverSelectionTimeoutMS: 3000, // 3 second timeout
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

		if (!connected) {
			throw new Error(
				"Could not connect to MongoDB with any connection string"
			);
		}

		// Create database indexes for better performance
		await ensureIndexes(db);
	} catch (error) {
		console.error("❌ MongoDB connection error:", error.message);
		console.log(
			"⚠️  Server will start without database. Some features won't work."
		);
		console.log(
			"💡 To fix: Install and start MongoDB, or use MongoDB Atlas"
		);
		console.log("💡 Common fixes:");
		console.log("   - Ubuntu: sudo systemctl start mongod");
		console.log("   - macOS: brew services start mongodb-community");
		console.log("   - Docker: docker run -d -p 27017:27017 mongo");
		dbConnected = false;
	}
};

// Make database available to routes
app.use((req, res, next) => {
	req.db = db;
	req.dbConnected = dbConnected;
	next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/emissions", emissionsRoutes);
app.use("/api/analysis", analysisRoutes);

// Health check route
app.get("/api/health", (req, res) => {
	res.json({
		message: "Server is running!",
		database: dbConnected ? "connected" : "disconnected",
		timestamp: new Date(),
	});
});

// Start server
const startServer = async () => {
	await connectDB();
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
};

startServer();
