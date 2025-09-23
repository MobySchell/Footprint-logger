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

// Enhanced comparative analysis function
const calculateComparisons = (emissions) => {
	const now = new Date();

	// Time period comparisons
	const timeComparisons = calculateTimePeriodComparisons(emissions, now);

	// Personal goal comparisons
	const goalComparisons = calculatePersonalGoalComparisons(emissions, now);

	// Category comparisons
	const categoryComparisons = calculateCategoryComparisons(emissions, now);

	// Historical trend comparisons
	const historicalComparisons = calculateHistoricalComparisons(
		emissions,
		now
	);

	// Performance metrics
	const performanceMetrics = calculatePerformanceMetrics(emissions, now);

	return {
		timePeriods: timeComparisons,
		personalGoals: goalComparisons,
		categories: categoryComparisons,
		historical: historicalComparisons,
		performance: performanceMetrics,
		generatedAt: now,
	};
};

const calculateTimePeriodComparisons = (emissions, now) => {
	const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
	const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
	const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

	// Weekly comparison
	const thisWeek = emissions.filter(
		(e) => new Date(e.timestamp) >= oneWeekAgo
	);
	const lastWeek = emissions.filter((e) => {
		const date = new Date(e.timestamp);
		return date < oneWeekAgo && date >= twoWeeksAgo;
	});

	// Monthly comparison
	const thisMonth = emissions.filter(
		(e) => new Date(e.timestamp) >= oneMonthAgo
	);
	const lastMonth = emissions.filter((e) => {
		const date = new Date(e.timestamp);
		return date < oneMonthAgo && date >= twoMonthsAgo;
	});

	// Quarterly comparison
	const thisQuarter = emissions.filter(
		(e) => new Date(e.timestamp) >= threeMonthsAgo
	);
	const previousQuarter = emissions.filter((e) => {
		const date = new Date(e.timestamp);
		return (
			date < threeMonthsAgo &&
			date >= new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
		);
	});

	const calculatePeriodMetrics = (current, previous, periodName) => {
		const currentTotal = current.reduce((sum, e) => sum + e.value, 0);
		const previousTotal = previous.reduce((sum, e) => sum + e.value, 0);
		const change = currentTotal - previousTotal;
		const changePercentage =
			previousTotal > 0 ? (change / previousTotal) * 100 : 0;

		const currentAvg =
			current.length > 0 ? currentTotal / current.length : 0;
		const previousAvg =
			previous.length > 0 ? previousTotal / previous.length : 0;

		return {
			period: periodName,
			current: {
				total: currentTotal,
				average: currentAvg,
				activities: current.length,
			},
			previous: {
				total: previousTotal,
				average: previousAvg,
				activities: previous.length,
			},
			comparison: {
				change,
				changePercentage,
				trend:
					change > 0
						? "increasing"
						: change < 0
						? "decreasing"
						: "stable",
				interpretation: getChangeInterpretation(changePercentage),
			},
		};
	};

	return {
		weekly: calculatePeriodMetrics(thisWeek, lastWeek, "weekly"),
		monthly: calculatePeriodMetrics(thisMonth, lastMonth, "monthly"),
		quarterly: calculatePeriodMetrics(
			thisQuarter,
			previousQuarter,
			"quarterly"
		),
	};
};

const calculatePersonalGoalComparisons = (emissions, now) => {
	// Default personal goals (these could be stored in user preferences in the future)
	const defaultGoals = {
		dailyTarget: 5.0, // kg CO₂ per day
		weeklyTarget: 35.0, // kg CO₂ per week
		monthlyTarget: 150.0, // kg CO₂ per month
		yearlyTarget: 1800.0, // kg CO₂ per year
		categoryTargets: {
			Transport: 30, // % of total emissions
			Food: 25,
			Energy: 20,
			Housing: 15,
			Consumption: 10,
		},
	};

	const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

	// Current period emissions
	const weeklyEmissions = emissions.filter(
		(e) => new Date(e.timestamp) >= oneWeekAgo
	);
	const monthlyEmissions = emissions.filter(
		(e) => new Date(e.timestamp) >= oneMonthAgo
	);
	const yearlyEmissions = emissions.filter(
		(e) => new Date(e.timestamp) >= oneYearAgo
	);

	const weeklyTotal = weeklyEmissions.reduce((sum, e) => sum + e.value, 0);
	const monthlyTotal = monthlyEmissions.reduce((sum, e) => sum + e.value, 0);
	const yearlyTotal = yearlyEmissions.reduce((sum, e) => sum + e.value, 0);

	// Calculate daily average for this week
	const daysWithData = new Set(
		weeklyEmissions.map((e) => new Date(e.timestamp).toDateString())
	).size;
	const dailyAverage = daysWithData > 0 ? weeklyTotal / daysWithData : 0;

	// Category distribution
	const categoryTotals = monthlyEmissions.reduce((acc, e) => {
		acc[e.category] = (acc[e.category] || 0) + e.value;
		return acc;
	}, {});

	const categoryPercentages = {};
	Object.keys(categoryTotals).forEach((category) => {
		categoryPercentages[category] =
			monthlyTotal > 0
				? (categoryTotals[category] / monthlyTotal) * 100
				: 0;
	});

	const calculateGoalComparison = (actual, target, period) => {
		const difference = actual - target;
		const percentageOfTarget = target > 0 ? (actual / target) * 100 : 0;
		const status =
			actual <= target
				? "on_track"
				: actual <= target * 1.1
				? "close"
				: "over_target";

		return {
			period,
			target,
			actual,
			difference,
			percentageOfTarget,
			status,
			daysRemaining: getDaysRemainingInPeriod(period, now),
		};
	};

	return {
		daily: calculateGoalComparison(
			dailyAverage,
			defaultGoals.dailyTarget,
			"daily"
		),
		weekly: calculateGoalComparison(
			weeklyTotal,
			defaultGoals.weeklyTarget,
			"weekly"
		),
		monthly: calculateGoalComparison(
			monthlyTotal,
			defaultGoals.monthlyTarget,
			"monthly"
		),
		yearly: calculateGoalComparison(
			yearlyTotal,
			defaultGoals.yearlyTarget,
			"yearly"
		),
		categoryTargets: Object.keys(defaultGoals.categoryTargets).map(
			(category) => ({
				category,
				target: defaultGoals.categoryTargets[category],
				actual: categoryPercentages[category] || 0,
				difference:
					(categoryPercentages[category] || 0) -
					defaultGoals.categoryTargets[category],
				status:
					(categoryPercentages[category] || 0) <=
					defaultGoals.categoryTargets[category]
						? "on_track"
						: "over_target",
			})
		),
	};
};

const calculateCategoryComparisons = (emissions, now) => {
	const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

	// Current week by category
	const thisWeekByCategory = emissions
		.filter((e) => new Date(e.timestamp) >= oneWeekAgo)
		.reduce((acc, e) => {
			acc[e.category] = (acc[e.category] || 0) + e.value;
			return acc;
		}, {});

	// Previous week by category
	const lastWeekByCategory = emissions
		.filter((e) => {
			const date = new Date(e.timestamp);
			return date < oneWeekAgo && date >= twoWeeksAgo;
		})
		.reduce((acc, e) => {
			acc[e.category] = (acc[e.category] || 0) + e.value;
			return acc;
		}, {});

	// Calculate category comparisons
	const allCategories = new Set([
		...Object.keys(thisWeekByCategory),
		...Object.keys(lastWeekByCategory),
	]);

	const categoryComparisons = Array.from(allCategories).map((category) => {
		const current = thisWeekByCategory[category] || 0;
		const previous = lastWeekByCategory[category] || 0;
		const change = current - previous;
		const changePercentage = previous > 0 ? (change / previous) * 100 : 0;

		return {
			category,
			current,
			previous,
			change,
			changePercentage,
			trend:
				change > 0
					? "increasing"
					: change < 0
					? "decreasing"
					: "stable",
			interpretation: getChangeInterpretation(changePercentage),
		};
	});

	// Sort by absolute change to identify most significant changes
	const sortedByChange = [...categoryComparisons].sort(
		(a, b) => Math.abs(b.change) - Math.abs(a.change)
	);

	return {
		byCategory: categoryComparisons,
		mostChanged: sortedByChange.slice(0, 3),
		improvingCategories: categoryComparisons.filter(
			(c) => c.trend === "decreasing"
		),
		worseningCategories: categoryComparisons.filter(
			(c) => c.trend === "increasing"
		),
	};
};

const calculateHistoricalComparisons = (emissions, now) => {
	if (emissions.length === 0) {
		return {
			hasData: false,
			message: "Not enough historical data for comparison",
		};
	}

	// Calculate rolling averages
	const rollingAverages = calculateRollingAverages(emissions, now);

	// Calculate percentile rankings
	const percentileRankings = calculatePercentileRankings(emissions, now);

	// Calculate all-time statistics
	const allTimeStats = calculateAllTimeStatistics(emissions);

	return {
		hasData: true,
		rollingAverages,
		percentileRankings,
		allTimeStats,
	};
};

const calculateRollingAverages = (emissions, now) => {
	const periods = [7, 14, 30, 90]; // days
	const rollingAverages = {};

	periods.forEach((days) => {
		const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
		const periodEmissions = emissions.filter(
			(e) => new Date(e.timestamp) >= cutoffDate
		);

		const total = periodEmissions.reduce((sum, e) => sum + e.value, 0);
		const average =
			periodEmissions.length > 0 ? total / periodEmissions.length : 0;

		rollingAverages[`${days}day`] = {
			period: `${days} days`,
			total,
			average,
			activities: periodEmissions.length,
		};
	});

	return rollingAverages;
};

const calculatePercentileRankings = (emissions, now) => {
	if (emissions.length < 10) {
		return {
			hasEnoughData: false,
			message: "Need at least 10 data points for percentile analysis",
		};
	}

	// Group emissions by week
	const weeklyTotals = [];
	const weeksBack = 12; // Analyze last 12 weeks

	for (let i = 0; i < weeksBack; i++) {
		const weekStart = new Date(
			now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000
		);
		const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

		const weekEmissions = emissions.filter((e) => {
			const date = new Date(e.timestamp);
			return date >= weekStart && date < weekEnd;
		});

		if (weekEmissions.length > 0) {
			weeklyTotals.push(
				weekEmissions.reduce((sum, e) => sum + e.value, 0)
			);
		}
	}

	if (weeklyTotals.length < 4) {
		return {
			hasEnoughData: false,
			message: "Need at least 4 weeks of data for percentile analysis",
		};
	}

	// Current week
	const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const currentWeekEmissions = emissions.filter(
		(e) => new Date(e.timestamp) >= currentWeekStart
	);
	const currentWeekTotal = currentWeekEmissions.reduce(
		(sum, e) => sum + e.value,
		0
	);

	// Calculate percentiles
	const sortedWeekly = [...weeklyTotals].sort((a, b) => a - b);
	const percentiles = [10, 25, 50, 75, 90].map((p) => ({
		percentile: p,
		value: calculatePercentile(sortedWeekly, p),
	}));

	// Find current week's percentile ranking
	const currentPercentile = calculateCurrentPercentile(
		currentWeekTotal,
		sortedWeekly
	);

	return {
		hasEnoughData: true,
		currentWeek: currentWeekTotal,
		currentPercentile,
		percentiles,
		interpretation: getPercentileInterpretation(currentPercentile),
	};
};

const calculateAllTimeStatistics = (emissions) => {
	if (emissions.length === 0) return null;

	const allValues = emissions.map((e) => e.value);
	const total = allValues.reduce((sum, val) => sum + val, 0);

	const sortedValues = [...allValues].sort((a, b) => a - b);
	const min = sortedValues[0];
	const max = sortedValues[sortedValues.length - 1];
	const median = calculatePercentile(sortedValues, 50);
	const average = total / allValues.length;

	// Find date range
	const dates = emissions.map((e) => new Date(e.timestamp));
	const earliest = new Date(Math.min(...dates));
	const latest = new Date(Math.max(...dates));
	const totalDays =
		Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)) + 1;

	return {
		total,
		average,
		median,
		min,
		max,
		totalActivities: emissions.length,
		dateRange: {
			earliest,
			latest,
			totalDays,
		},
		dailyAverage: total / totalDays,
	};
};

const calculatePerformanceMetrics = (emissions, now) => {
	const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const recentEmissions = emissions.filter(
		(e) => new Date(e.timestamp) >= oneMonthAgo
	);

	if (recentEmissions.length === 0) {
		return {
			hasData: false,
			message: "No recent data for performance analysis",
		};
	}

	// Consistency metrics
	const dailyTotals = {};
	recentEmissions.forEach((e) => {
		const date = new Date(e.timestamp).toDateString();
		dailyTotals[date] = (dailyTotals[date] || 0) + e.value;
	});

	const dailyValues = Object.values(dailyTotals);
	const average =
		dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;
	const variance =
		dailyValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) /
		dailyValues.length;
	const standardDeviation = Math.sqrt(variance);
	const coefficientOfVariation =
		average > 0 ? (standardDeviation / average) * 100 : 0;

	// Frequency metrics
	const totalDays = Math.ceil((now - oneMonthAgo) / (1000 * 60 * 60 * 24));
	const activeDays = Object.keys(dailyTotals).length;
	const trackingFrequency = (activeDays / totalDays) * 100;

	return {
		hasData: true,
		consistency: {
			average,
			standardDeviation,
			coefficientOfVariation,
			interpretation: getConsistencyInterpretation(
				coefficientOfVariation
			),
		},
		frequency: {
			totalDays,
			activeDays,
			trackingFrequency,
			interpretation: getFrequencyInterpretation(trackingFrequency),
		},
	};
};

// Helper functions
const getChangeInterpretation = (changePercentage) => {
	const absChange = Math.abs(changePercentage);
	if (absChange < 5) return "minimal_change";
	if (absChange < 15) return "moderate_change";
	if (absChange < 30) return "significant_change";
	return "major_change";
};

const getDaysRemainingInPeriod = (period, now) => {
	switch (period) {
		case "daily":
			return 1;
		case "weekly":
			const daysUntilSunday = (7 - now.getDay()) % 7;
			return daysUntilSunday === 0 ? 7 : daysUntilSunday;
		case "monthly":
			const lastDayOfMonth = new Date(
				now.getFullYear(),
				now.getMonth() + 1,
				0
			).getDate();
			return lastDayOfMonth - now.getDate();
		case "yearly":
			const endOfYear = new Date(now.getFullYear(), 11, 31);
			return Math.ceil((endOfYear - now) / (1000 * 60 * 60 * 24));
		default:
			return 0;
	}
};

const calculatePercentile = (sortedArray, percentile) => {
	const index = (percentile / 100) * (sortedArray.length - 1);
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	const weight = index % 1;

	if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
	if (lower === upper) return sortedArray[lower];

	return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
};

const calculateCurrentPercentile = (value, sortedArray) => {
	let count = 0;
	for (let i = 0; i < sortedArray.length; i++) {
		if (sortedArray[i] < value) count++;
	}
	return (count / sortedArray.length) * 100;
};

const getPercentileInterpretation = (percentile) => {
	if (percentile <= 25) return "excellent";
	if (percentile <= 50) return "good";
	if (percentile <= 75) return "average";
	return "needs_improvement";
};

const getConsistencyInterpretation = (coefficientOfVariation) => {
	if (coefficientOfVariation < 20) return "very_consistent";
	if (coefficientOfVariation < 40) return "moderately_consistent";
	if (coefficientOfVariation < 60) return "somewhat_inconsistent";
	return "highly_variable";
};

const getFrequencyInterpretation = (frequency) => {
	if (frequency >= 90) return "excellent_tracking";
	if (frequency >= 70) return "good_tracking";
	if (frequency >= 50) return "moderate_tracking";
	return "inconsistent_tracking";
};

// Enhanced insights and notification system
const generateAchievements = (emissions) => {
	const insights = {
		achievements: [],
		warnings: [],
		milestones: [],
		celebrations: [],
		notifications: [],
	};

	if (emissions.length === 0) {
		insights.notifications.push({
			type: "welcome",
			priority: "medium",
			title: "Welcome to Carbon Tracking!",
			message:
				"Start by logging your first activity to begin your journey toward sustainability.",
			icon: "🌱",
			actionable: true,
			action: "Log First Activity",
		});
		return insights;
	}

	// Generate all insight types
	const achievements = generateUserAchievements(emissions);
	const warnings = generateWarnings(emissions);
	const milestones = generateMilestones(emissions);
	const celebrations = generateCelebrations(emissions);
	const notifications = generateSmartNotifications(emissions);

	return {
		achievements,
		warnings,
		milestones,
		celebrations,
		notifications: [
			...notifications,
			...achievements,
			...warnings,
			...milestones,
			...celebrations,
		],
		summary: {
			totalInsights:
				achievements.length +
				warnings.length +
				milestones.length +
				celebrations.length,
			highPriority: notifications.filter((n) => n.priority === "high")
				.length,
			mediumPriority: notifications.filter((n) => n.priority === "medium")
				.length,
			lowPriority: notifications.filter((n) => n.priority === "low")
				.length,
		},
	};
};

const generateUserAchievements = (emissions) => {
	const achievements = [];
	const today = new Date();

	// 1. Logging Streak Achievement
	const streak = calculateLoggingStreak(emissions, today);
	if (streak >= 3) {
		achievements.push({
			type: "achievement",
			category: "consistency",
			priority: streak >= 7 ? "high" : "medium",
			title: `${streak}-Day Tracking Streak! 🔥`,
			message: `You've been consistently tracking for ${streak} days in a row. Keep up the momentum!`,
			icon: "🔥",
			points: streak * 10,
			unlocked: true,
			date: today,
		});
	}

	// 2. Emission Reduction Achievement
	const weeklyTrend = calculateWeeklyTrend(emissions);
	if (weeklyTrend.changePercentage < -10) {
		const reductionPercent = Math.abs(weeklyTrend.changePercentage);
		achievements.push({
			type: "achievement",
			category: "improvement",
			priority: reductionPercent >= 25 ? "high" : "medium",
			title: `${reductionPercent.toFixed(0)}% Weekly Reduction! 📉`,
			message: `Excellent progress! You've reduced your weekly emissions by ${reductionPercent.toFixed(
				1
			)}%.`,
			icon: "📉",
			points: Math.floor(reductionPercent * 5),
			unlocked: true,
			date: today,
		});
	}

	// 3. Category Mastery Achievement
	const categoryImprovements = calculateImprovementPatterns(emissions);
	if (
		categoryImprovements.hasEnoughData &&
		categoryImprovements.bestImprovingCategory
	) {
		achievements.push({
			type: "achievement",
			category: "expertise",
			priority: "medium",
			title: `${categoryImprovements.bestImprovingCategory} Master! 🏆`,
			message: `You're excelling at reducing ${categoryImprovements.bestImprovingCategory} emissions!`,
			icon: "🏆",
			points: 100,
			unlocked: true,
			date: today,
		});
	}

	// 4. Low Impact Day Achievement
	const recentEmissions = emissions.filter(
		(e) =>
			new Date(e.timestamp) >=
			new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
	);
	const dailyTotals = {};
	recentEmissions.forEach((e) => {
		const date = new Date(e.timestamp).toDateString();
		dailyTotals[date] = (dailyTotals[date] || 0) + e.value;
	});

	const lowImpactDays = Object.values(dailyTotals).filter(
		(total) => total < 3.0
	); // Under 3kg CO₂
	if (lowImpactDays.length >= 1) {
		achievements.push({
			type: "achievement",
			category: "daily_goal",
			priority: "medium",
			title: "Low Impact Day! 🌿",
			message: `You had ${lowImpactDays.length} day(s) this week under 3kg CO₂. Great work!`,
			icon: "🌿",
			points: lowImpactDays.length * 25,
			unlocked: true,
			date: today,
		});
	}

	// 5. Data Completeness Achievement
	const activeDays = Object.keys(dailyTotals).length;
	if (activeDays >= 6) {
		achievements.push({
			type: "achievement",
			category: "completeness",
			priority: "medium",
			title: "Consistent Tracker! 📊",
			message: `You tracked activities for ${activeDays} out of 7 days this week!`,
			icon: "📊",
			points: 50,
			unlocked: true,
			date: today,
		});
	}

	return achievements;
};

const generateWarnings = (emissions) => {
	const warnings = [];
	const today = new Date();

	// 1. Increasing Emission Trend Warning
	const weeklyTrend = calculateWeeklyTrend(emissions);
	if (weeklyTrend.changePercentage > 15) {
		warnings.push({
			type: "warning",
			category: "trend",
			priority: "high",
			title: "Rising Emissions Alert! ⚠️",
			message: `Your emissions increased by ${weeklyTrend.changePercentage.toFixed(
				1
			)}% this week. Consider reviewing your activities.`,
			icon: "⚠️",
			actionable: true,
			action: "View Recommendations",
			date: today,
		});
	}

	// 2. Goal Overshoot Warning
	const goalComparisons = calculatePersonalGoalComparisons(emissions, today);
	if (goalComparisons.weekly.status === "over_target") {
		const overshoot = goalComparisons.weekly.percentageOfTarget - 100;
		warnings.push({
			type: "warning",
			category: "goals",
			priority: overshoot > 25 ? "high" : "medium",
			title: "Weekly Goal Exceeded! 🎯",
			message: `You're ${overshoot.toFixed(
				0
			)}% over your weekly goal with ${
				goalComparisons.weekly.daysRemaining
			} days remaining.`,
			icon: "🎯",
			actionable: true,
			action: "Adjust Activities",
			date: today,
		});
	}

	// 3. Tracking Gap Warning
	const daysSinceLastLog = getDaysSinceLastLog(emissions, today);
	if (daysSinceLastLog > 2) {
		warnings.push({
			type: "warning",
			category: "tracking",
			priority: daysSinceLastLog > 5 ? "high" : "medium",
			title: "Tracking Gap Detected! 📝",
			message: `It's been ${daysSinceLastLog} days since your last activity log. Stay consistent!`,
			icon: "📝",
			actionable: true,
			action: "Log Activity",
			date: today,
		});
	}

	// 4. High Single-Day Emissions Warning
	const recentEmissions = emissions.filter(
		(e) =>
			new Date(e.timestamp) >=
			new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
	);
	const dailyTotals = {};
	recentEmissions.forEach((e) => {
		const date = new Date(e.timestamp).toDateString();
		dailyTotals[date] = (dailyTotals[date] || 0) + e.value;
	});

	const highImpactDays = Object.entries(dailyTotals).filter(
		([date, total]) => total > 10.0
	); // Over 10kg CO₂
	if (highImpactDays.length > 0) {
		const [highestDate, highestValue] = highImpactDays.reduce(
			(max, current) => (current[1] > max[1] ? current : max)
		);
		warnings.push({
			type: "warning",
			category: "daily_high",
			priority: "medium",
			title: "High Impact Day! 📈",
			message: `You had a high emission day (${highestValue.toFixed(
				1
			)}kg CO₂). Consider balancing with lower impact activities.`,
			icon: "📈",
			actionable: true,
			action: "View Tips",
			date: new Date(highestDate),
		});
	}

	return warnings;
};

const generateMilestones = (emissions) => {
	const milestones = [];
	const today = new Date();
	const totalActivities = emissions.length;
	const totalEmissions = emissions.reduce((sum, e) => sum + e.value, 0);

	// 1. Activity Count Milestones
	const activityMilestones = [10, 25, 50, 100, 250, 500, 1000];
	const reachedMilestone = activityMilestones.find(
		(milestone) =>
			totalActivities >= milestone && totalActivities < milestone + 5
	);
	if (reachedMilestone) {
		milestones.push({
			type: "milestone",
			category: "activities",
			priority: "medium",
			title: `${reachedMilestone} Activities Logged! 🎯`,
			message: `Congratulations! You've tracked ${totalActivities} activities so far.`,
			icon: "🎯",
			points: reachedMilestone * 2,
			progress: {
				current: totalActivities,
				target: reachedMilestone,
				percentage: 100,
			},
			date: today,
		});
	}

	// 2. Time-based Milestones
	const firstActivity =
		emissions.length > 0
			? new Date(Math.min(...emissions.map((e) => new Date(e.timestamp))))
			: null;
	if (firstActivity) {
		const daysTracking = Math.floor(
			(today - firstActivity) / (1000 * 60 * 60 * 24)
		);
		const timeMilestones = [7, 30, 60, 100, 200, 365];
		const reachedTimeMilestone = timeMilestones.find(
			(milestone) =>
				daysTracking >= milestone && daysTracking < milestone + 3
		);
		if (reachedTimeMilestone) {
			milestones.push({
				type: "milestone",
				category: "duration",
				priority: "medium",
				title: `${reachedTimeMilestone} Days of Tracking! 📅`,
				message: `You've been tracking your carbon footprint for ${daysTracking} days!`,
				icon: "📅",
				points: reachedTimeMilestone * 3,
				progress: {
					current: daysTracking,
					target: reachedTimeMilestone,
					percentage: 100,
				},
				date: today,
			});
		}
	}

	// 3. Emission Reduction Milestones
	const improvementPatterns = calculateImprovementPatterns(emissions);
	if (
		improvementPatterns.hasEnoughData &&
		improvementPatterns.improvementPercent > 0
	) {
		const reductionMilestones = [10, 25, 50, 75];
		const reachedReduction = reductionMilestones.find(
			(milestone) =>
				improvementPatterns.improvementPercent >= milestone &&
				improvementPatterns.improvementPercent < milestone + 5
		);
		if (reachedReduction) {
			milestones.push({
				type: "milestone",
				category: "improvement",
				priority: "high",
				title: `${reachedReduction}% Total Reduction! 🌟`,
				message: `Amazing! You've reduced your emissions by ${improvementPatterns.improvementPercent.toFixed(
					1
				)}% overall.`,
				icon: "🌟",
				points: reachedReduction * 10,
				progress: {
					current: improvementPatterns.improvementPercent,
					target: reachedReduction,
					percentage: 100,
				},
				date: today,
			});
		}
	}

	return milestones;
};

const generateCelebrations = (emissions) => {
	const celebrations = [];
	const today = new Date();

	// 1. Personal Best Celebrations
	const personalBests = findPersonalBests(emissions);
	personalBests.forEach((best) => {
		celebrations.push({
			type: "celebration",
			category: "personal_best",
			priority: "high",
			title: `New Personal Best! 🎉`,
			message: `${best.description} - keep up the excellent work!`,
			icon: "🎉",
			points: 150,
			date: today,
		});
	});

	// 2. Streak Celebrations
	const currentStreak = calculateLoggingStreak(emissions, today);
	const streakMilestones = [7, 14, 30, 60, 100];
	if (streakMilestones.includes(currentStreak)) {
		celebrations.push({
			type: "celebration",
			category: "streak",
			priority: "high",
			title: `${currentStreak}-Day Streak! 🔥`,
			message: `Incredible consistency! You've tracked activities for ${currentStreak} days straight!`,
			icon: "🔥",
			points: currentStreak * 15,
			date: today,
		});
	}

	// 3. Goal Achievement Celebrations
	const goalComparisons = calculatePersonalGoalComparisons(emissions, today);
	const onTrackGoals = [
		goalComparisons.daily,
		goalComparisons.weekly,
		goalComparisons.monthly,
	].filter((goal) => goal.status === "on_track");

	if (onTrackGoals.length >= 2) {
		celebrations.push({
			type: "celebration",
			category: "goals",
			priority: "medium",
			title: "Multiple Goals On Track! 🎯",
			message: `You're meeting ${onTrackGoals.length} of your emission goals. Fantastic progress!`,
			icon: "🎯",
			points: onTrackGoals.length * 50,
			date: today,
		});
	}

	return celebrations;
};

const generateSmartNotifications = (emissions) => {
	const notifications = [];
	const today = new Date();

	// 1. Daily Check-in Notification
	const todayEmissions = emissions.filter((e) => {
		const date = new Date(e.timestamp);
		return date.toDateString() === today.toDateString();
	});

	if (todayEmissions.length === 0 && today.getHours() >= 18) {
		notifications.push({
			type: "reminder",
			priority: "medium",
			title: "Daily Check-in Time! ⏰",
			message:
				"Don't forget to log today's activities before the day ends.",
			icon: "⏰",
			actionable: true,
			action: "Log Today's Activities",
			timing: "evening",
		});
	}

	// 2. Weekly Review Notification
	if (today.getDay() === 0 && today.getHours() >= 10) {
		// Sunday morning
		const weeklyStats = getWeeklyStats(emissions);
		notifications.push({
			type: "review",
			priority: "medium",
			title: "Weekly Review Available! 📊",
			message: `This week: ${
				weeklyStats.activities
			} activities, ${weeklyStats.total.toFixed(
				1
			)}kg CO₂. View your detailed analysis.`,
			icon: "📊",
			actionable: true,
			action: "View Weekly Report",
			timing: "weekly",
		});
	}

	// 3. Goal Progress Notification
	const goalComparisons = calculatePersonalGoalComparisons(emissions, today);
	if (
		goalComparisons.weekly.percentageOfTarget > 80 &&
		goalComparisons.weekly.percentageOfTarget < 100
	) {
		notifications.push({
			type: "progress",
			priority: "medium",
			title: "Close to Weekly Goal! 🎯",
			message: `You're at ${goalComparisons.weekly.percentageOfTarget.toFixed(
				0
			)}% of your weekly goal. ${
				goalComparisons.weekly.daysRemaining
			} days left!`,
			icon: "🎯",
			actionable: true,
			action: "View Goal Progress",
			timing: "goal_proximity",
		});
	}

	// 4. Motivation Notification
	const improvementPatterns = calculateImprovementPatterns(emissions);
	if (
		improvementPatterns.hasEnoughData &&
		improvementPatterns.trend === "improving"
	) {
		notifications.push({
			type: "motivation",
			priority: "low",
			title: "You're Improving! 📈",
			message: `Your efforts are paying off! Keep up the great work toward sustainability.`,
			icon: "📈",
			actionable: false,
			timing: "encouragement",
		});
	}

	return notifications;
};

// Helper functions for insights
const calculateLoggingStreak = (emissions, today) => {
	let streak = 0;
	for (let i = 0; i < 30; i++) {
		// Check up to 30 days
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
	return streak;
};

const getDaysSinceLastLog = (emissions, today) => {
	if (emissions.length === 0) return Infinity;
	const lastLog = new Date(
		Math.max(...emissions.map((e) => new Date(e.timestamp)))
	);
	return Math.floor((today - lastLog) / (1000 * 60 * 60 * 24));
};

const findPersonalBests = (emissions) => {
	const bests = [];
	// This would analyze historical data to find personal records
	// For now, return empty array - could be enhanced with actual PB detection
	return bests;
};

const getWeeklyStats = (emissions) => {
	const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const weekEmissions = emissions.filter(
		(e) => new Date(e.timestamp) >= oneWeekAgo
	);
	return {
		activities: weekEmissions.length,
		total: weekEmissions.reduce((sum, e) => sum + e.value, 0),
	};
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

// Dedicated comparative analysis endpoint
router.get("/comparisons/:userId", authenticateToken, async (req, res) => {
	try {
		const { userId } = req.params;

		// Ensure user can only access their own comparisons
		if (userId !== req.user.id.toString()) {
			return res.status(403).json({
				message: "Cannot access another user's comparative analysis",
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
				comparisons: {
					hasData: false,
					message:
						"Start tracking activities to see comparative analysis!",
				},
			});
		}

		// Generate comprehensive comparisons
		const comparisons = calculateComparisons(emissions);

		res.json({
			comparisons,
			summary: {
				totalDataPoints: emissions.length,
				dateRange: {
					earliest:
						emissions.length > 0
							? new Date(
									Math.min(
										...emissions.map(
											(e) => new Date(e.timestamp)
										)
									)
							  )
							: null,
					latest:
						emissions.length > 0
							? new Date(
									Math.max(
										...emissions.map(
											(e) => new Date(e.timestamp)
										)
									)
							  )
							: null,
				},
				analysisTypes: [
					"Time Period Comparisons",
					"Personal Goal Analysis",
					"Category Comparisons",
					"Historical Trends",
					"Performance Metrics",
				],
			},
		});
	} catch (error) {
		console.error("Error generating comparative analysis:", error);
		res.status(500).json({
			message: "Server error generating comparative analysis",
		});
	}
});

// Dedicated insights and notifications endpoint
router.get("/notifications/:userId", authenticateToken, async (req, res) => {
	try {
		const { userId } = req.params;

		// Ensure user can only access their own notifications
		if (userId !== req.user.id.toString()) {
			return res.status(403).json({
				message: "Cannot access another user's notifications",
			});
		}

		// Fetch user's emissions
		const emissions = await req.db
			.collection("emissions")
			.find({ userId: new ObjectId(userId) })
			.sort({ timestamp: -1 })
			.toArray();

		// Generate comprehensive insights and notifications
		const insights = generateAchievements(emissions);

		// Add metadata
		const responseData = {
			...insights,
			metadata: {
				userId,
				generatedAt: new Date(),
				totalDataPoints: emissions.length,
				analysisDate: new Date(),
				userJoinedDays:
					emissions.length > 0
						? Math.floor(
								(new Date() -
									new Date(
										Math.min(
											...emissions.map(
												(e) => new Date(e.timestamp)
											)
										)
									)) /
									(1000 * 60 * 60 * 24)
						  )
						: 0,
			},
		};

		res.json(responseData);
	} catch (error) {
		console.error("Error generating insights and notifications:", error);
		res.status(500).json({
			message: "Server error generating insights and notifications",
		});
	}
});

// Quick daily summary endpoint
router.get("/daily-summary/:userId", authenticateToken, async (req, res) => {
	try {
		const { userId } = req.params;

		// Ensure user can only access their own daily summary
		if (userId !== req.user.id.toString()) {
			return res.status(403).json({
				message: "Cannot access another user's daily summary",
			});
		}

		// Fetch user's emissions
		const emissions = await req.db
			.collection("emissions")
			.find({ userId: new ObjectId(userId) })
			.sort({ timestamp: -1 })
			.toArray();

		const today = new Date();
		const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

		// Today's data
		const todayEmissions = emissions.filter((e) => {
			const date = new Date(e.timestamp);
			return date.toDateString() === today.toDateString();
		});

		// Yesterday's data for comparison
		const yesterdayEmissions = emissions.filter((e) => {
			const date = new Date(e.timestamp);
			return date.toDateString() === yesterday.toDateString();
		});

		const todayTotal = todayEmissions.reduce((sum, e) => sum + e.value, 0);
		const yesterdayTotal = yesterdayEmissions.reduce(
			(sum, e) => sum + e.value,
			0
		);

		// Quick insights
		const quickInsights = generateAchievements(emissions);
		const priorityNotifications = quickInsights.notifications
			.filter((n) => n.priority === "high")
			.slice(0, 3);

		// Goal progress
		const goalComparisons = calculatePersonalGoalComparisons(
			emissions,
			today
		);

		const dailySummary = {
			today: {
				date: today.toDateString(),
				emissions: todayTotal,
				activities: todayEmissions.length,
				categories: [...new Set(todayEmissions.map((e) => e.category))],
			},
			comparison: {
				yesterdayEmissions: yesterdayTotal,
				change: todayTotal - yesterdayTotal,
				changePercentage:
					yesterdayTotal > 0
						? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
						: 0,
			},
			goals: {
				daily: goalComparisons.daily,
				weekly: {
					target: goalComparisons.weekly.target,
					current: goalComparisons.weekly.actual,
					percentage: goalComparisons.weekly.percentageOfTarget,
					status: goalComparisons.weekly.status,
					daysRemaining: goalComparisons.weekly.daysRemaining,
				},
			},
			quickInsights: {
				streak: calculateLoggingStreak(emissions, today),
				priorityNotifications,
				mood:
					todayTotal < 5
						? "excellent"
						: todayTotal < 8
						? "good"
						: todayTotal < 12
						? "moderate"
						: "needs_attention",
			},
			generatedAt: new Date(),
		};

		res.json(dailySummary);
	} catch (error) {
		console.error("Error generating daily summary:", error);
		res.status(500).json({
			message: "Server error generating daily summary",
		});
	}
});

export default router;
