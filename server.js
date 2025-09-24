import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import authRoutes from "./routes/auth.js";
import emissionsRoutes from "./routes/emissions.js";
import analysisRoutes from "./routes/analysis.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
	cors({
		origin: ["http://localhost:5173", "http://localhost:3000"], // Allow Vite and Create React App default ports
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	})
);
app.use(express.json());

// MongoDB connection
let db;
const connectDB = async () => {
	try {
		const client = new MongoClient(
			process.env.MONGODB_URI ||
				"mongodb://localhost:27017/footprint-logger"
		);
		await client.connect();
		db = client.db();
		console.log("Connected to MongoDB");
	} catch (error) {
		console.error("MongoDB connection error:", error);
		process.exit(1);
	}
};

// Make database available to routes
app.use((req, res, next) => {
	req.db = db;
	next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/emissions", emissionsRoutes);
app.use("/api/analysis", analysisRoutes);

// Test route
app.get("/api/health", (req, res) => {
	res.json({ message: "Server is running!" });
});

// Start server
const startServer = async () => {
	await connectDB();
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
};

startServer();
