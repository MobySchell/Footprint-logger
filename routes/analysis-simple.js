import express from "express";
import { ObjectId } from "mongodb";
import { authenticateToken } from "./auth.js";
import {
	analysisCache,
	calculateQuickStats,
	calculateWeeklyComparison,
} from "../utils/backendHelpers.js";

const router = express.Router();

// Simple helper to calculate weekly trend
const getWeeklyTrend = (emissions) => {
	const now = new Date();
	const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

	const thisWeek = emissions.filter(
		(e) => new Date(e.timestamp) >= oneWeekAgo
	);
	const lastWeek = emissions.filter((e) => {
		const date = new Date(e.timestamp);
		return date >= twoWeeksAgo && date < oneWeekAgo;
	});

	const thisWeekTotal = thisWeek.reduce((sum, e) => sum + e.value, 0);
	const lastWeekTotal = lastWeek.reduce((sum, e) => sum + e.value, 0);

	return {
		currentWeek: thisWeekTotal,
		previousWeek: lastWeekTotal,
		change: thisWeekTotal - lastWeekTotal,
		trend:
			thisWeekTotal > lastWeekTotal
				? "increasing"
				: thisWeekTotal < lastWeekTotal
				? "decreasing"
				: "stable",
	};
};

// Simple helper to get top categories
const getTopCategories = (emissions) => {
	const categoryTotals = {};

	emissions.forEach((e) => {
		categoryTotals[e.category] =
			(categoryTotals[e.category] || 0) + e.value;
	});

	return Object.entries(categoryTotals)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3)
		.map(([category, total]) => ({ category, total }));
};

// Simple recommendations based on top category
const getSimpleRecommendations = (topCategory) => {
	const recommendations = {
		transport:
			"Try using public transport, walking, or biking for short trips",
		food: "Consider eating less meat and more local, seasonal foods",
		energy: "Turn off lights when not needed and use energy-efficient appliances",
		housing: "Reduce water usage and recycle more",
	};

	return [
		{
			category: topCategory,
			suggestion:
				recommendations[topCategory] ||
				"Look for ways to reduce emissions in this category",
			priority: "high",
		},
	];
};

// Main insights endpoint - simplified version
router.get("/insights/:userId", authenticateToken, async (req, res) => {
	try {
		const { userId } = req.params;

		// Check user access
		if (userId !== req.user.id.toString()) {
			return res.status(403).json({
				message: "Cannot access another user's insights",
			});
		}

		// Check cache
		const cached = analysisCache.get(userId, "insights");
		if (cached) {
			return res.json({ insights: cached, fromCache: true });
		}

		// Get user's emissions
		const emissions = await req.db
			.collection("emissions")
			.find({ userId: new ObjectId(userId) })
			.sort({ timestamp: -1 })
			.toArray();

		if (emissions.length === 0) {
			return res.json({
				insights: {
					message: "Start tracking activities to see your insights!",
					hasData: false,
				},
			});
		}

		// Calculate simple insights
		const weeklyTrend = getWeeklyTrend(emissions);
		const topCategories = getTopCategories(emissions);
		const topCategory = topCategories[0]?.category;
		const recommendations = getSimpleRecommendations(topCategory);

		// Basic stats
		const totalEmissions = emissions.reduce((sum, e) => sum + e.value, 0);
		const averageDaily = totalEmissions / 30; // Rough daily average

		const insights = {
			hasData: true,
			totalEmissions: Math.round(totalEmissions * 10) / 10,
			totalActivities: emissions.length,
			averageDaily: Math.round(averageDaily * 10) / 10,
			weeklyTrend,
			topCategories,
			recommendations,
			generatedAt: new Date(),
		};

		// Cache for 5 minutes
		analysisCache.set(userId, "insights", {}, insights);

		res.json({ insights });
	} catch (error) {
		console.error("Error generating insights:", error);
		res.status(500).json({
			message: "Server error generating insights",
		});
	}
});

// Simple recommendations endpoint
router.get("/recommendations/:userId", authenticateToken, async (req, res) => {
	try {
		const { userId } = req.params;

		if (userId !== req.user.id.toString()) {
			return res.status(403).json({
				message: "Cannot access another user's recommendations",
			});
		}

		const emissions = await req.db
			.collection("emissions")
			.find({ userId: new ObjectId(userId) })
			.toArray();

		if (emissions.length === 0) {
			return res.json({
				recommendations: {
					message:
						"Start tracking activities to get recommendations!",
					hasData: false,
				},
			});
		}

		const topCategories = getTopCategories(emissions);
		const recommendations = topCategories.map((cat) => ({
			category: cat.category,
			suggestion: getSimpleRecommendations(cat.category)[0].suggestion,
			emissions: cat.total,
		}));

		res.json({ recommendations });
	} catch (error) {
		console.error("Error getting recommendations:", error);
		res.status(500).json({
			message: "Server error getting recommendations",
		});
	}
});

// Quick stats endpoint
router.get("/quick-stats/:userId", authenticateToken, async (req, res) => {
	try {
		const { userId } = req.params;

		if (userId !== req.user.id.toString()) {
			return res.status(403).json({
				message: "Cannot access another user's statistics",
			});
		}

		// Check cache
		const cached = analysisCache.get(userId, "quick-stats");
		if (cached) {
			return res.json({ ...cached, fromCache: true });
		}

		// Get basic stats
		const stats = await calculateQuickStats(req.db, userId);
		const weeklyComparison = await calculateWeeklyComparison(
			req.db,
			userId
		);

		const response = {
			...stats,
			weeklyComparison,
		};

		// Cache for 2 minutes
		analysisCache.set(userId, "quick-stats", {}, response);

		res.json(response);
	} catch (error) {
		console.error("Error getting quick stats:", error);
		res.status(500).json({
			message: "Server error getting statistics",
		});
	}
});

// Weekly comparison endpoint
router.get(
	"/weekly-comparison/:userId",
	authenticateToken,
	async (req, res) => {
		try {
			const { userId } = req.params;

			if (userId !== req.user.id.toString()) {
				return res.status(403).json({
					message: "Cannot access another user's comparison",
				});
			}

			const comparison = await calculateWeeklyComparison(req.db, userId);
			res.json(comparison);
		} catch (error) {
			console.error("Error getting weekly comparison:", error);
			res.status(500).json({
				message: "Server error getting comparison",
			});
		}
	}
);

// Simple health check
router.get("/health", (req, res) => {
	res.json({
		status: "healthy",
		timestamp: new Date(),
	});
});

// Simple database status
router.get("/db-status", async (req, res) => {
	try {
		const emissionsCount = await req.db
			.collection("emissions")
			.countDocuments();
		const usersCount = await req.db.collection("users").countDocuments();

		res.json({
			status: "connected",
			collections: {
				emissions: emissionsCount,
				users: usersCount,
			},
			timestamp: new Date(),
		});
	} catch (error) {
		console.error("Database status check error:", error);
		res.status(500).json({
			status: "error",
			message: "Database connection issue",
			timestamp: new Date(),
		});
	}
});

export default router;
