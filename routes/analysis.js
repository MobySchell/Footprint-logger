import express from "express";
import { ObjectId } from "mongodb";
import { authenticateToken } from "./auth.js";

const router = express.Router();

// Helper function to calculate weekly trend
const calculateWeeklyTrend = (emissions) => {
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

	const change = thisWeekTotal - lastWeekTotal;
	const changePercentage =
		lastWeekTotal > 0 ? (change / lastWeekTotal) * 100 : 0;

	return {
		currentWeek: thisWeekTotal,
		previousWeek: lastWeekTotal,
		change: change,
		changePercentage: changePercentage,
		trend: change > 0 ? "increasing" : change < 0 ? "decreasing" : "stable",
	};
};

// Helper function to generate recommendations
const generateRecommendations = (emissions) => {
	const categoryTotals = emissions.reduce((acc, e) => {
		acc[e.category] = (acc[e.category] || 0) + e.value;
		return acc;
	}, {});

	const sortedCategories = Object.entries(categoryTotals).sort(
		([, a], [, b]) => b - a
	);

	const recommendations = [];

	if (sortedCategories.length > 0) {
		const [topCategory, topValue] = sortedCategories[0];

		const categoryRecommendations = {
			Transport: [
				"Consider cycling or walking for short trips",
				"Use public transportation when possible",
				"Combine multiple errands into one trip",
			],
			Food: [
				"Try meal planning to reduce food waste",
				"Consider plant-based meals a few times per week",
				"Buy local and seasonal produce when possible",
			],
			Energy: [
				"Switch to LED light bulbs",
				"Unplug electronics when not in use",
				"Use a programmable thermostat",
			],
			Housing: [
				"Improve home insulation",
				"Use energy-efficient appliances",
				"Consider renewable energy options",
			],
		};

		recommendations.push(
			`Focus on reducing ${topCategory} emissions (your highest category at ${topValue.toFixed(
				1
			)} kg CO₂)`
		);

		if (categoryRecommendations[topCategory]) {
			recommendations.push(
				...categoryRecommendations[topCategory].slice(0, 2)
			);
		}
	}

	return recommendations;
};

// Helper function to calculate comparisons
const calculateComparisons = (emissions) => {
	const now = new Date();
	const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

	const thisMonth = emissions.filter(
		(e) => new Date(e.timestamp) >= oneMonthAgo
	);
	const lastMonth = emissions.filter((e) => {
		const date = new Date(e.timestamp);
		return date >= twoMonthsAgo && date < oneMonthAgo;
	});

	const thisMonthTotal = thisMonth.reduce((sum, e) => sum + e.value, 0);
	const lastMonthTotal = lastMonth.reduce((sum, e) => sum + e.value, 0);

	const monthlyChange = thisMonthTotal - lastMonthTotal;

	// Calculate personal average (all time)
	const totalEmissions = emissions.reduce((sum, e) => sum + e.value, 0);
	const averagePerDay =
		emissions.length > 0 ? totalEmissions / emissions.length : 0;
	const currentDailyAverage =
		thisMonth.length > 0 ? thisMonthTotal / thisMonth.length : 0;

	return {
		vsLastMonth: monthlyChange,
		vsPersonalAverage: currentDailyAverage - averagePerDay,
		thisMonthTotal,
		lastMonthTotal,
	};
};

// Helper function to generate achievements
const generateAchievements = (emissions) => {
	const achievements = [];

	// Check for logging streak
	const today = new Date();
	let streak = 0;
	for (let i = 0; i < 7; i++) {
		const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
		const dayEmissions = emissions.filter((e) => {
			const emissionDate = new Date(e.timestamp);
			return emissionDate.toDateString() === checkDate.toDateString();
		});

		if (dayEmissions.length > 0) {
			streak++;
		} else {
			break;
		}
	}

	if (streak >= 3) {
		achievements.push(`${streak}-day streak of logging activities!`);
	}

	// Check for emission reduction
	const weeklyTrend = calculateWeeklyTrend(emissions);
	if (weeklyTrend.changePercentage < -10) {
		achievements.push(
			`${Math.abs(weeklyTrend.changePercentage).toFixed(
				0
			)}% reduction in weekly emissions`
		);
	}

	// Check total activities milestone
	if (emissions.length >= 50 && emissions.length % 25 === 0) {
		achievements.push(`${emissions.length} activities tracked milestone!`);
	}

	return achievements;
};

// Main insights endpoint
router.get("/insights/:userId", authenticateToken, async (req, res) => {
	try {
		const { userId } = req.params;

		// Ensure user can only access their own insights
		if (userId !== req.user.id.toString()) {
			return res.status(403).json({
				message: "Cannot access another user's insights",
			});
		}

		// Fetch user's emissions
		const emissions = await req.db
			.collection("emissions")
			.find({ userId: new ObjectId(userId) })
			.sort({ timestamp: -1 })
			.toArray();

		if (emissions.length === 0) {
			return res.json({
				insights: {
					message:
						"Start tracking activities to see personalized insights!",
					hasData: false,
				},
			});
		}

		// Calculate all insights
		const weeklyTrend = calculateWeeklyTrend(emissions);
		const recommendations = generateRecommendations(emissions);
		const comparison = calculateComparisons(emissions);
		const achievements = generateAchievements(emissions);

		// Get top category
		const categoryTotals = emissions.reduce((acc, e) => {
			acc[e.category] = (acc[e.category] || 0) + e.value;
			return acc;
		}, {});

		const topCategory = Object.entries(categoryTotals).sort(
			([, a], [, b]) => b - a
		)[0];

		const insights = {
			hasData: true,
			weeklyTrend,
			recommendations,
			comparison,
			achievements,
			topCategory: topCategory ? topCategory[0] : null,
			topCategoryValue: topCategory ? topCategory[1] : 0,
			totalEmissions: emissions.reduce((sum, e) => sum + e.value, 0),
			totalActivities: emissions.length,
			generatedAt: new Date(),
		};

		res.json({ insights });
	} catch (error) {
		console.error("Error generating insights:", error);
		res.status(500).json({
			message: "Server error generating insights",
		});
	}
});

export default router;
