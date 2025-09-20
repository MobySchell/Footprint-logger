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

// Enhanced personalized recommendation system
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

		// Generate category-specific recommendations
		const categoryRecommendations = generateCategoryRecommendations(
			topCategory,
			topValue,
			emissions
		);
		recommendations.push(...categoryRecommendations);

		// Add time-based recommendations
		const timeBasedRecs = generateTimeBasedRecommendations(emissions);
		recommendations.push(...timeBasedRecs);

		// Add improvement-based recommendations
		const improvementRecs = generateImprovementRecommendations(emissions);
		recommendations.push(...improvementRecs);
	}

	return recommendations.slice(0, 5); // Return top 5 recommendations
};

const generateCategoryRecommendations = (topCategory, topValue, emissions) => {
	const recommendations = [];

	const categoryRecommendations = {
		Transport: {
			tips: [
				"Consider cycling or walking for short trips under 2 miles",
				"Use public transportation when possible",
				"Combine multiple errands into one efficient trip",
				"Try carpooling or ride-sharing for longer journeys",
				"Consider working from home one day per week",
				"Maintain your vehicle for better fuel efficiency",
			],
			thresholds: {
				high: 20, // kg CO₂
				medium: 10,
			},
		},
		Food: {
			tips: [
				"Try meal planning to reduce food waste",
				"Consider plant-based meals 2-3 times per week",
				"Buy local and seasonal produce when possible",
				"Reduce portion sizes to minimize waste",
				"Choose products with minimal packaging",
				"Start a small herb garden for fresh ingredients",
			],
			thresholds: {
				high: 15,
				medium: 8,
			},
		},
		Energy: {
			tips: [
				"Switch to LED light bulbs throughout your home",
				"Unplug electronics when not in use",
				"Use a programmable thermostat",
				"Adjust thermostat by 2-3 degrees",
				"Air dry clothes instead of using the dryer",
				"Use cold water for washing clothes when possible",
			],
			thresholds: {
				high: 25,
				medium: 12,
			},
		},
		Housing: {
			tips: [
				"Improve home insulation to reduce heating/cooling needs",
				"Use energy-efficient appliances",
				"Consider renewable energy options",
				"Regular maintenance of HVAC systems",
				"Use natural lighting when possible",
				"Install low-flow water fixtures",
			],
			thresholds: {
				high: 30,
				medium: 15,
			},
		},
		Waste: {
			tips: [
				"Practice the 3 R's: Reduce, Reuse, Recycle",
				"Compost organic waste",
				"Choose reusable alternatives to single-use items",
				"Repair items instead of replacing them",
				"Donate items you no longer need",
				"Buy products with minimal packaging",
			],
			thresholds: {
				high: 10,
				medium: 5,
			},
		},
		Consumption: {
			tips: [
				"Practice mindful consumption - buy only what you need",
				"Choose quality items that last longer",
				"Support local and sustainable businesses",
				"Consider second-hand options for non-essential items",
				"Share or borrow items you rarely use",
				"Research the environmental impact before purchasing",
			],
			thresholds: {
				high: 18,
				medium: 9,
			},
		},
		Digital: {
			tips: [
				"Reduce screen time and streaming when possible",
				"Use devices longer before upgrading",
				"Stream in lower quality when high definition isn't needed",
				"Turn off devices instead of leaving them on standby",
				"Use cloud services efficiently",
				"Choose energy-efficient devices",
			],
			thresholds: {
				high: 8,
				medium: 4,
			},
		},
	};

	const categoryData = categoryRecommendations[topCategory];
	if (!categoryData) return recommendations;

	// Determine urgency level
	let urgencyLevel = "low";
	if (topValue >= categoryData.thresholds.high) {
		urgencyLevel = "high";
	} else if (topValue >= categoryData.thresholds.medium) {
		urgencyLevel = "medium";
	}

	// Add priority recommendation
	recommendations.push({
		type: "priority",
		category: topCategory,
		urgency: urgencyLevel,
		message: `Focus on reducing ${topCategory} emissions (your highest category at ${topValue.toFixed(
			1
		)} kg CO₂)`,
		impact: "high",
	});

	// Add specific tips based on urgency
	const tipCount =
		urgencyLevel === "high" ? 3 : urgencyLevel === "medium" ? 2 : 1;
	const selectedTips = categoryData.tips.slice(0, tipCount);

	selectedTips.forEach((tip, index) => {
		recommendations.push({
			type: "action",
			category: topCategory,
			urgency: urgencyLevel,
			message: tip,
			impact: index === 0 ? "high" : "medium",
		});
	});

	return recommendations;
};

const generateTimeBasedRecommendations = (emissions) => {
	const recommendations = [];

	// Analyze time patterns
	const now = new Date();
	const recentEmissions = emissions.filter(
		(e) =>
			new Date(e.timestamp) >=
			new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
	);

	if (recentEmissions.length === 0) return recommendations;

	// Check for increasing trend
	const weeklyTrend = calculateWeeklyTrend(emissions);
	if (weeklyTrend.trend === "increasing") {
		recommendations.push({
			type: "alert",
			category: "General",
			urgency: "high",
			message: `Your emissions increased by ${Math.abs(
				weeklyTrend.changePercentage
			).toFixed(
				1
			)}% this week. Consider reviewing your recent activities.`,
			impact: "high",
		});
	}

	// Weekend vs weekday analysis
	const weekdayComparison =
		calculateWeekdayWeekendComparison(recentEmissions);
	if (weekdayComparison.comparison === "weekends_higher") {
		recommendations.push({
			type: "insight",
			category: "Lifestyle",
			urgency: "medium",
			message:
				"Your weekend emissions are higher than weekdays. Consider eco-friendly weekend activities.",
			impact: "medium",
		});
	} else if (weekdayComparison.comparison === "weekdays_higher") {
		recommendations.push({
			type: "insight",
			category: "Lifestyle",
			urgency: "medium",
			message:
				"Your weekday emissions are higher. Consider sustainable commuting options or work-from-home days.",
			impact: "medium",
		});
	}

	return recommendations;
};

const generateImprovementRecommendations = (emissions) => {
	const recommendations = [];

	const improvementPatterns = calculateImprovementPatterns(emissions);

	if (!improvementPatterns.hasEnoughData) {
		recommendations.push({
			type: "encouragement",
			category: "General",
			urgency: "low",
			message:
				"Keep tracking your activities to unlock personalized improvement insights!",
			impact: "low",
		});
		return recommendations;
	}

	// Overall improvement feedback
	if (improvementPatterns.trend === "improving") {
		recommendations.push({
			type: "celebration",
			category: "General",
			urgency: "low",
			message: `Great progress! You've reduced emissions by ${improvementPatterns.improvementPercent.toFixed(
				1
			)}% compared to when you started.`,
			impact: "positive",
		});
	} else if (improvementPatterns.trend === "worsening") {
		recommendations.push({
			type: "motivation",
			category: "General",
			urgency: "medium",
			message:
				"Your emissions have increased recently. Let's get back on track with some focused actions!",
			impact: "medium",
		});
	}

	// Category-specific improvement recommendations
	if (improvementPatterns.bestImprovingCategory) {
		recommendations.push({
			type: "success",
			category: improvementPatterns.bestImprovingCategory,
			urgency: "low",
			message: `Excellent work on reducing ${improvementPatterns.bestImprovingCategory} emissions! Keep up the momentum.`,
			impact: "positive",
		});
	}

	// Identify categories that need attention
	Object.entries(improvementPatterns.categoryImprovements).forEach(
		([category, improvement]) => {
			if (
				improvement.trend === "worsening" &&
				improvement.improvementPercent < -10
			) {
				recommendations.push({
					type: "focus",
					category: category,
					urgency: "high",
					message: `${category} emissions have increased by ${Math.abs(
						improvement.improvementPercent
					).toFixed(1)}%. This category needs attention.`,
					impact: "high",
				});
			}
		}
	);

	return recommendations;
};

const generateSeasonalRecommendations = (emissions) => {
	const recommendations = [];
	const currentMonth = new Date().getMonth();
	const currentSeason = getSeason(currentMonth);

	const seasonalTips = {
		Spring: [
			"Spring cleaning? Donate items instead of throwing them away",
			"Start a garden for fresh, local produce",
			"Take advantage of milder weather for walking and cycling",
		],
		Summer: [
			"Use fans instead of air conditioning when possible",
			"Grill outdoors to keep your house cooler",
			"Take advantage of longer daylight for outdoor activities",
		],
		Fall: [
			"Prepare your home for winter to improve energy efficiency",
			"Use fallen leaves for natural composting",
			"Harvest rainwater for garden use",
		],
		Winter: [
			"Lower your thermostat when sleeping or away",
			"Use natural light during shorter winter days",
			"Consider energy-efficient heating options",
		],
	};

	const seasonTips = seasonalTips[currentSeason];
	if (seasonTips) {
		const randomTip =
			seasonTips[Math.floor(Math.random() * seasonTips.length)];
		recommendations.push({
			type: "seasonal",
			category: "Lifestyle",
			urgency: "low",
			message: randomTip,
			impact: "medium",
		});
	}

	return recommendations;
};

const getSeason = (month) => {
	if (month >= 2 && month <= 4) return "Spring";
	if (month >= 5 && month <= 7) return "Summer";
	if (month >= 8 && month <= 10) return "Fall";
	return "Winter";
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

// Advanced trend analysis functions
const calculateMonthlyTrend = (emissions) => {
	const now = new Date();
	const months = [];

	for (let i = 0; i < 6; i++) {
		const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

		const monthEmissions = emissions.filter((e) => {
			const date = new Date(e.timestamp);
			return date >= monthStart && date <= monthEnd;
		});

		const monthTotal = monthEmissions.reduce((sum, e) => sum + e.value, 0);

		months.unshift({
			month: monthStart.toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			}),
			total: monthTotal,
			activities: monthEmissions.length,
			average:
				monthEmissions.length > 0
					? monthTotal / monthEmissions.length
					: 0,
		});
	}

	// Calculate month-over-month changes
	const trends = months.map((month, index) => {
		if (index === 0) return { ...month, change: 0, changePercent: 0 };

		const previousMonth = months[index - 1];
		const change = month.total - previousMonth.total;
		const changePercent =
			previousMonth.total > 0 ? (change / previousMonth.total) * 100 : 0;

		return {
			...month,
			change,
			changePercent,
			trend:
				change > 0
					? "increasing"
					: change < 0
					? "decreasing"
					: "stable",
		};
	});

	return trends;
};

const calculateSeasonalVariations = (emissions) => {
	const seasons = {
		Spring: { months: [2, 3, 4], emissions: [], total: 0 },
		Summer: { months: [5, 6, 7], emissions: [], total: 0 },
		Fall: { months: [8, 9, 10], emissions: [], total: 0 },
		Winter: { months: [11, 0, 1], emissions: [], total: 0 },
	};

	emissions.forEach((emission) => {
		const month = new Date(emission.timestamp).getMonth();

		Object.keys(seasons).forEach((season) => {
			if (seasons[season].months.includes(month)) {
				seasons[season].emissions.push(emission);
				seasons[season].total += emission.value;
			}
		});
	});

	// Calculate averages and patterns
	const seasonalData = Object.entries(seasons).map(([season, data]) => ({
		season,
		total: data.total,
		average:
			data.emissions.length > 0 ? data.total / data.emissions.length : 0,
		activities: data.emissions.length,
		topCategory: getTopCategory(data.emissions),
	}));

	// Find peak season
	const peakSeason = seasonalData.reduce((peak, current) =>
		current.total > peak.total ? current : peak
	);

	return {
		seasonalBreakdown: seasonalData,
		peakSeason: peakSeason.season,
		totalRange:
			Math.max(...seasonalData.map((s) => s.total)) -
			Math.min(...seasonalData.map((s) => s.total)),
	};
};

const getTopCategory = (emissions) => {
	if (emissions.length === 0) return null;

	const categoryTotals = emissions.reduce((acc, e) => {
		acc[e.category] = (acc[e.category] || 0) + e.value;
		return acc;
	}, {});

	return (
		Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0] ||
		null
	);
};

const calculateDailyPatterns = (emissions) => {
	const dayTotals = emissions.reduce((acc, e) => {
		const dayOfWeek = new Date(e.timestamp).getDay();
		const dayNames = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		];
		const dayName = dayNames[dayOfWeek];

		acc[dayName] = (acc[dayName] || 0) + e.value;
		return acc;
	}, {});

	const dayAverages = Object.entries(dayTotals).map(([day, total]) => {
		const dayCount = emissions.filter((e) => {
			const dayOfWeek = new Date(e.timestamp).getDay();
			const dayNames = [
				"Sunday",
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
			];
			return dayNames[dayOfWeek] === day;
		}).length;

		return {
			day,
			total,
			average: dayCount > 0 ? total / dayCount : 0,
			activities: dayCount,
		};
	});

	// Find peak day
	const peakDay = dayAverages.reduce((peak, current) =>
		current.average > peak.average ? current : peak
	);

	return {
		dailyBreakdown: dayAverages,
		peakDay: peakDay.day,
		weekdayVsWeekend: calculateWeekdayWeekendComparison(emissions),
	};
};

const calculateWeekdayWeekendComparison = (emissions) => {
	const weekdayEmissions = emissions.filter((e) => {
		const dayOfWeek = new Date(e.timestamp).getDay();
		return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
	});

	const weekendEmissions = emissions.filter((e) => {
		const dayOfWeek = new Date(e.timestamp).getDay();
		return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
	});

	const weekdayTotal = weekdayEmissions.reduce((sum, e) => sum + e.value, 0);
	const weekendTotal = weekendEmissions.reduce((sum, e) => sum + e.value, 0);

	const weekdayAvg =
		weekdayEmissions.length > 0
			? weekdayTotal / weekdayEmissions.length
			: 0;
	const weekendAvg =
		weekendEmissions.length > 0
			? weekendTotal / weekendEmissions.length
			: 0;

	return {
		weekday: {
			total: weekdayTotal,
			average: weekdayAvg,
			activities: weekdayEmissions.length,
		},
		weekend: {
			total: weekendTotal,
			average: weekendAvg,
			activities: weekendEmissions.length,
		},
		comparison:
			weekdayAvg > weekendAvg
				? "weekdays_higher"
				: weekendAvg > weekdayAvg
				? "weekends_higher"
				: "equal",
	};
};

const calculateImprovementPatterns = (emissions) => {
	if (emissions.length < 4) {
		return {
			hasEnoughData: false,
			message: "Need more data to identify improvement patterns",
		};
	}

	// Sort emissions by date
	const sortedEmissions = emissions.sort(
		(a, b) => new Date(a.timestamp) - new Date(b.timestamp)
	);

	// Split into first half and second half
	const midPoint = Math.floor(sortedEmissions.length / 2);
	const firstHalf = sortedEmissions.slice(0, midPoint);
	const secondHalf = sortedEmissions.slice(midPoint);

	const firstHalfAvg =
		firstHalf.reduce((sum, e) => sum + e.value, 0) / firstHalf.length;
	const secondHalfAvg =
		secondHalf.reduce((sum, e) => sum + e.value, 0) / secondHalf.length;

	const improvement = firstHalfAvg - secondHalfAvg;
	const improvementPercent =
		firstHalfAvg > 0 ? (improvement / firstHalfAvg) * 100 : 0;

	// Category-specific improvements
	const categoryImprovements = {};
	const categories = [...new Set(emissions.map((e) => e.category))];

	categories.forEach((category) => {
		const categoryFirstHalf = firstHalf.filter(
			(e) => e.category === category
		);
		const categorySecondHalf = secondHalf.filter(
			(e) => e.category === category
		);

		if (categoryFirstHalf.length > 0 && categorySecondHalf.length > 0) {
			const firstAvg =
				categoryFirstHalf.reduce((sum, e) => sum + e.value, 0) /
				categoryFirstHalf.length;
			const secondAvg =
				categorySecondHalf.reduce((sum, e) => sum + e.value, 0) /
				categorySecondHalf.length;
			const catImprovement = firstAvg - secondAvg;
			const catImprovementPercent =
				firstAvg > 0 ? (catImprovement / firstAvg) * 100 : 0;

			categoryImprovements[category] = {
				improvement: catImprovement,
				improvementPercent: catImprovementPercent,
				trend:
					catImprovement > 0
						? "improving"
						: catImprovement < 0
						? "worsening"
						: "stable",
			};
		}
	});

	return {
		hasEnoughData: true,
		overallImprovement: improvement,
		improvementPercent,
		trend:
			improvement > 0
				? "improving"
				: improvement < 0
				? "worsening"
				: "stable",
		categoryImprovements,
		bestImprovingCategory:
			Object.entries(categoryImprovements).sort(
				([, a], [, b]) => b.improvementPercent - a.improvementPercent
			)[0]?.[0] || null,
	};
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
		const monthlyTrend = calculateMonthlyTrend(emissions);
		const seasonalVariations = calculateSeasonalVariations(emissions);
		const dailyPatterns = calculateDailyPatterns(emissions);
		const improvementPatterns = calculateImprovementPatterns(emissions);
		const recommendations = generateRecommendations(emissions);
		const seasonalRecommendations =
			generateSeasonalRecommendations(emissions);
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
			monthlyTrend,
			seasonalVariations,
			dailyPatterns,
			improvementPatterns,
			recommendations,
			seasonalRecommendations,
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

// Dedicated personalized recommendations endpoint
router.get("/recommendations/:userId", authenticateToken, async (req, res) => {
	try {
		const { userId } = req.params;

		// Ensure user can only access their own recommendations
		if (userId !== req.user.id.toString()) {
			return res.status(403).json({
				message: "Cannot access another user's recommendations",
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
				recommendations: [
					{
						type: "getting_started",
						category: "General",
						urgency: "medium",
						message:
							"Start tracking your daily activities to receive personalized recommendations!",
						impact: "high",
					},
					{
						type: "tip",
						category: "General",
						urgency: "low",
						message:
							"Small changes in daily habits can make a big difference for the environment.",
						impact: "medium",
					},
				],
			});
		}

		// Generate comprehensive recommendations
		const allRecommendations = [];

		// Category-specific recommendations
		const categoryTotals = emissions.reduce((acc, e) => {
			acc[e.category] = (acc[e.category] || 0) + e.value;
			return acc;
		}, {});

		const sortedCategories = Object.entries(categoryTotals).sort(
			([, a], [, b]) => b - a
		);

		if (sortedCategories.length > 0) {
			const [topCategory, topValue] = sortedCategories[0];
			const categoryRecs = generateCategoryRecommendations(
				topCategory,
				topValue,
				emissions
			);
			allRecommendations.push(...categoryRecs);
		}

		// Time-based recommendations
		const timeBasedRecs = generateTimeBasedRecommendations(emissions);
		allRecommendations.push(...timeBasedRecs);

		// Improvement-based recommendations
		const improvementRecs = generateImprovementRecommendations(emissions);
		allRecommendations.push(...improvementRecs);

		// Seasonal recommendations
		const seasonalRecs = generateSeasonalRecommendations(emissions);
		allRecommendations.push(...seasonalRecs);

		// Sort by urgency and impact
		const prioritizedRecommendations = allRecommendations.sort((a, b) => {
			const urgencyWeight = { high: 3, medium: 2, low: 1 };
			const impactWeight = { high: 3, medium: 2, low: 1, positive: 1 };

			const scoreA = urgencyWeight[a.urgency] + impactWeight[a.impact];
			const scoreB = urgencyWeight[b.urgency] + impactWeight[b.impact];

			return scoreB - scoreA;
		});

		res.json({
			recommendations: prioritizedRecommendations.slice(0, 8), // Return top 8 recommendations
			totalRecommendations: prioritizedRecommendations.length,
			categorySummary: {
				highPriority: prioritizedRecommendations.filter(
					(r) => r.urgency === "high"
				).length,
				mediumPriority: prioritizedRecommendations.filter(
					(r) => r.urgency === "medium"
				).length,
				lowPriority: prioritizedRecommendations.filter(
					(r) => r.urgency === "low"
				).length,
			},
			generatedAt: new Date(),
		});
	} catch (error) {
		console.error("Error generating recommendations:", error);
		res.status(500).json({
			message: "Server error generating recommendations",
		});
	}
});

export default router;
