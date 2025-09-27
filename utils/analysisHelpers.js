// Utility functions for analysis calculations
// These can be reused across different parts of the application

/**
 * Calculate emission factors for different activity types
 */
export const emissionFactors = {
	transport: {
		car: 0.21, // kg CO2 per km
		bus: 0.105, // kg CO2 per km
		train: 0.041, // kg CO2 per km
		plane: 0.255, // kg CO2 per km
		bike: 0, // kg CO2 per km
		walk: 0, // kg CO2 per km
	},
	food: {
		beef: 27.0, // kg CO2 per kg
		pork: 12.1, // kg CO2 per kg
		chicken: 6.9, // kg CO2 per kg
		fish: 6.1, // kg CO2 per kg
		vegetables: 2.0, // kg CO2 per kg
		dairy: 4.8, // kg CO2 per kg
	},
	energy: {
		electricity: 0.42, // kg CO2 per kWh
		naturalGas: 2.0, // kg CO2 per m³
		heating: 0.185, // kg CO2 per kWh
	},
	housing: {
		water: 0.298, // kg CO2 per L
		waste: 0.5, // kg CO2 per kg
	},
};

/**
 * Calculate basic statistics for an array of numbers
 */
export const calculateStats = (values) => {
	if (!values || values.length === 0) {
		return {
			count: 0,
			sum: 0,
			average: 0,
			min: 0,
			max: 0,
			median: 0,
		};
	}

	const sortedValues = [...values].sort((a, b) => a - b);
	const sum = values.reduce((total, val) => total + val, 0);

	return {
		count: values.length,
		sum,
		average: sum / values.length,
		min: sortedValues[0],
		max: sortedValues[sortedValues.length - 1],
		median: calculateMedian(sortedValues),
		standardDeviation: calculateStandardDeviation(
			values,
			sum / values.length
		),
	};
};

/**
 * Calculate median value from a sorted array
 */
export const calculateMedian = (sortedArray) => {
	if (sortedArray.length === 0) return 0;

	const mid = Math.floor(sortedArray.length / 2);

	if (sortedArray.length % 2 === 0) {
		return (sortedArray[mid - 1] + sortedArray[mid]) / 2;
	} else {
		return sortedArray[mid];
	}
};

/**
 * Calculate standard deviation
 */
export const calculateStandardDeviation = (values, mean) => {
	if (values.length === 0) return 0;

	const variance =
		values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
		values.length;
	return Math.sqrt(variance);
};

/**
 * Calculate percentage change between two values
 */
export const calculatePercentageChange = (newValue, oldValue) => {
	if (oldValue === 0) return newValue > 0 ? 100 : 0;
	return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Get time period boundaries
 */
export const getTimePeriods = (now = new Date()) => {
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);

	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const weekStart = new Date(today);
	weekStart.setDate(weekStart.getDate() - weekStart.getDay());

	const lastWeekStart = new Date(weekStart);
	lastWeekStart.setDate(lastWeekStart.getDate() - 7);

	const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

	const lastMonthStart = new Date(
		today.getFullYear(),
		today.getMonth() - 1,
		1
	);
	const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

	const yearStart = new Date(today.getFullYear(), 0, 1);

	return {
		today,
		yesterday,
		weekStart,
		lastWeekStart,
		monthStart,
		lastMonthStart,
		lastMonthEnd,
		yearStart,
	};
};

/**
 * Filter emissions by date range
 */
export const filterEmissionsByDateRange = (emissions, startDate, endDate) => {
	return emissions.filter((emission) => {
		const emissionDate = new Date(emission.timestamp);
		return emissionDate >= startDate && emissionDate < endDate;
	});
};

/**
 * Group emissions by time period (day, week, month)
 */
export const groupEmissionsByPeriod = (emissions, period = "day") => {
	const groups = {};

	emissions.forEach((emission) => {
		const date = new Date(emission.timestamp);
		let key;

		switch (period) {
			case "day":
				key = date.toDateString();
				break;
			case "week":
				const weekStart = new Date(date);
				weekStart.setDate(weekStart.getDate() - weekStart.getDay());
				key = weekStart.toDateString();
				break;
			case "month":
				key = `${date.getFullYear()}-${date.getMonth() + 1}`;
				break;
			case "year":
				key = date.getFullYear().toString();
				break;
			default:
				key = date.toDateString();
		}

		if (!groups[key]) {
			groups[key] = [];
		}
		groups[key].push(emission);
	});

	return groups;
};

/**
 * Group emissions by category
 */
export const groupEmissionsByCategory = (emissions) => {
	const categories = {};

	emissions.forEach((emission) => {
		const category = emission.category;

		if (!categories[category]) {
			categories[category] = [];
		}
		categories[category].push(emission);
	});

	return categories;
};

/**
 * Calculate totals for grouped emissions
 */
export const calculateGroupTotals = (groupedEmissions) => {
	const totals = {};

	Object.entries(groupedEmissions).forEach(([key, emissions]) => {
		totals[key] = {
			total: emissions.reduce((sum, e) => sum + e.value, 0),
			count: emissions.length,
			average:
				emissions.length > 0
					? emissions.reduce((sum, e) => sum + e.value, 0) /
					  emissions.length
					: 0,
		};
	});

	return totals;
};

/**
 * Find top emitting categories
 */
export const getTopCategories = (emissions, limit = 5) => {
	const categoryTotals = {};

	emissions.forEach((emission) => {
		const category = emission.category;
		categoryTotals[category] =
			(categoryTotals[category] || 0) + emission.value;
	});

	return Object.entries(categoryTotals)
		.sort(([, a], [, b]) => b - a)
		.slice(0, limit)
		.map(([category, total]) => ({
			category,
			total,
			percentage:
				(total /
					Object.values(categoryTotals).reduce(
						(sum, val) => sum + val,
						0
					)) *
				100,
		}));
};

/**
 * Calculate moving average
 */
export const calculateMovingAverage = (values, windowSize = 7) => {
	if (values.length < windowSize) return values;

	const movingAverages = [];

	for (let i = windowSize - 1; i < values.length; i++) {
		const window = values.slice(i - windowSize + 1, i + 1);
		const average = window.reduce((sum, val) => sum + val, 0) / windowSize;
		movingAverages.push(average);
	}

	return movingAverages;
};

/**
 * Detect trends in emission data
 */
export const detectTrend = (values, minDataPoints = 3) => {
	if (values.length < minDataPoints) {
		return {
			trend: "insufficient_data",
			confidence: 0,
			message: `Need at least ${minDataPoints} data points for trend analysis`,
		};
	}

	// Calculate linear regression slope
	const n = values.length;
	const sumX = (n * (n + 1)) / 2; // Sum of indices 1, 2, 3, ..., n
	const sumY = values.reduce((sum, val) => sum + val, 0);
	const sumXY = values.reduce(
		(sum, val, index) => sum + val * (index + 1),
		0
	);
	const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6; // Sum of squares of indices

	const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
	const intercept = (sumY - slope * sumX) / n;

	// Calculate correlation coefficient for confidence
	const meanX = sumX / n;
	const meanY = sumY / n;

	const numerator = values.reduce(
		(sum, val, index) => sum + (index + 1 - meanX) * (val - meanY),
		0
	);
	const denominatorX = Math.sqrt(
		values.reduce(
			(sum, val, index) => sum + Math.pow(index + 1 - meanX, 2),
			0
		)
	);
	const denominatorY = Math.sqrt(
		values.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0)
	);

	const correlation =
		denominatorX * denominatorY > 0
			? numerator / (denominatorX * denominatorY)
			: 0;
	const confidence = Math.abs(correlation) * 100;

	// Determine trend direction
	let trend;
	if (Math.abs(slope) < 0.1) {
		trend = "stable";
	} else if (slope > 0) {
		trend = "increasing";
	} else {
		trend = "decreasing";
	}

	return {
		trend,
		slope,
		intercept,
		correlation,
		confidence,
		message: getTrendMessage(trend, confidence),
	};
};

/**
 * Get human-readable trend message
 */
const getTrendMessage = (trend, confidence) => {
	const confidenceLevel =
		confidence > 80 ? "strong" : confidence > 60 ? "moderate" : "weak";

	switch (trend) {
		case "increasing":
			return `${confidenceLevel} upward trend - emissions are increasing`;
		case "decreasing":
			return `${confidenceLevel} downward trend - emissions are decreasing`;
		case "stable":
			return `${confidenceLevel} stable trend - emissions are relatively constant`;
		default:
			return "Insufficient data for trend analysis";
	}
};

/**
 * Calculate carbon footprint score (0-100 scale)
 */
export const calculateCarbonScore = (userEmissions, globalAverage = 35) => {
	// Global average weekly emissions in kg CO₂
	if (userEmissions <= 0) return 100;

	// Score is inversely related to emissions
	// Score of 100 = 0 emissions
	// Score of 50 = global average
	// Score decreases as emissions increase

	const ratio = userEmissions / globalAverage;
	let score;

	if (ratio <= 0.5) {
		// Excellent performance
		score = 100 - ratio * 20; // 100 to 90
	} else if (ratio <= 1.0) {
		// Good to average performance
		score = 90 - (ratio - 0.5) * 80; // 90 to 50
	} else if (ratio <= 2.0) {
		// Below average performance
		score = 50 - (ratio - 1.0) * 30; // 50 to 20
	} else {
		// Poor performance
		score = Math.max(0, 20 - (ratio - 2.0) * 10); // 20 to 0
	}

	return Math.round(Math.max(0, Math.min(100, score)));
};

/**
 * Get score interpretation
 */
export const getScoreInterpretation = (score) => {
	if (score >= 90)
		return {
			level: "excellent",
			message: "Outstanding carbon performance!",
			color: "green",
		};
	if (score >= 75)
		return {
			level: "good",
			message: "Good carbon performance",
			color: "blue",
		};
	if (score >= 60)
		return {
			level: "fair",
			message: "Fair carbon performance",
			color: "yellow",
		};
	if (score >= 40)
		return {
			level: "poor",
			message: "Below average carbon performance",
			color: "orange",
		};
	return {
		level: "critical",
		message: "High carbon footprint - needs improvement",
		color: "red",
	};
};

/**
 * Calculate reduction suggestions based on category analysis
 */
export const generateReductionSuggestions = (categoryData) => {
	const suggestions = [];
	const totalEmissions = Object.values(categoryData).reduce(
		(sum, val) => sum + val,
		0
	);

	Object.entries(categoryData)
		.sort(([, a], [, b]) => b - a)
		.forEach(([category, emissions]) => {
			const percentage = (emissions / totalEmissions) * 100;

			if (percentage >= 30) {
				suggestions.push({
					category,
					priority: "high",
					percentage: percentage.toFixed(1),
					suggestion: getHighImpactSuggestion(category),
					potentialReduction: emissions * 0.3, // 30% reduction potential
				});
			} else if (percentage >= 15) {
				suggestions.push({
					category,
					priority: "medium",
					percentage: percentage.toFixed(1),
					suggestion: getMediumImpactSuggestion(category),
					potentialReduction: emissions * 0.2, // 20% reduction potential
				});
			}
		});

	return suggestions;
};

/**
 * Get high impact reduction suggestions by category
 */
const getHighImpactSuggestion = (category) => {
	const suggestions = {
		transport:
			"Consider carpooling, public transport, or electric vehicles for high-emission trips",
		food: "Reduce meat consumption and choose local, seasonal produce",
		energy: "Switch to renewable energy sources and improve home insulation",
		housing:
			"Implement water-saving measures and waste reduction practices",
	};

	return (
		suggestions[category] ||
		"Focus on reducing activities in this high-impact category"
	);
};

/**
 * Get medium impact reduction suggestions by category
 */
const getMediumImpactSuggestion = (category) => {
	const suggestions = {
		transport:
			"Combine trips and choose more efficient transportation when possible",
		food: "Reduce food waste and choose lower-carbon protein sources occasionally",
		energy: "Use energy-efficient appliances and practice energy conservation",
		housing: "Reduce water usage and implement better waste sorting",
	};

	return (
		suggestions[category] ||
		"Look for opportunities to optimize this category"
	);
};

/**
 * Format large numbers with appropriate units
 */
export const formatEmissionValue = (value) => {
	if (value >= 1000) {
		return `${(value / 1000).toFixed(1)} tonnes`;
	} else if (value >= 1) {
		return `${value.toFixed(1)} kg`;
	} else {
		return `${(value * 1000).toFixed(0)} g`;
	}
};

/**
 * Calculate time until goal achievement
 */
export const calculateGoalProgress = (
	currentEmissions,
	targetEmissions,
	trend
) => {
	if (trend.trend === "increasing" || trend.slope >= 0) {
		return {
			achievable: false,
			message: "Current trend is not leading toward goal achievement",
			recommendation:
				"Consider implementing more aggressive reduction strategies",
		};
	}

	const reductionRate = Math.abs(trend.slope);
	const remainingReduction = currentEmissions - targetEmissions;

	if (remainingReduction <= 0) {
		return {
			achievable: true,
			achieved: true,
			message: "Goal already achieved!",
		};
	}

	const weeksToGoal = Math.ceil(remainingReduction / reductionRate);

	return {
		achievable: true,
		achieved: false,
		weeksToGoal,
		message: `At current rate, goal will be achieved in approximately ${weeksToGoal} weeks`,
		currentRate: reductionRate,
		remainingReduction,
	};
};

/**
 * Validate emission data
 */
export const validateEmissionData = (emission) => {
	const errors = [];

	if (!emission.category) {
		errors.push("Category is required");
	}

	if (typeof emission.value !== "number" || emission.value < 0) {
		errors.push("Value must be a positive number");
	}

	if (emission.value > 1000) {
		errors.push("Value seems unusually high - please verify");
	}

	if (!emission.timestamp) {
		errors.push("Timestamp is required");
	}

	const emissionDate = new Date(emission.timestamp);
	const now = new Date();
	const oneYearAgo = new Date(
		now.getFullYear() - 1,
		now.getMonth(),
		now.getDate()
	);

	if (emissionDate > now) {
		errors.push("Emission date cannot be in the future");
	}

	if (emissionDate < oneYearAgo) {
		errors.push("Emission date is more than one year old");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

/**
 * Generate achievement milestones
 */
export const generateAchievementMilestones = (userStats) => {
	const milestones = [];

	// Total activities milestones
	const activityMilestones = [10, 25, 50, 100, 250, 500, 1000];
	activityMilestones.forEach((milestone) => {
		if (userStats.totalActivities >= milestone) {
			milestones.push({
				type: "activity_count",
				milestone,
				achieved: true,
				title: `${milestone} Activities Tracked`,
				description: `You've logged ${milestone} activities!`,
			});
		} else if (userStats.totalActivities >= milestone * 0.8) {
			milestones.push({
				type: "activity_count",
				milestone,
				achieved: false,
				progress: (userStats.totalActivities / milestone) * 100,
				title: `${milestone} Activities`,
				description: `${
					milestone - userStats.totalActivities
				} activities to go!`,
			});
		}
	});

	// Reduction milestones
	if (userStats.improvementPercent > 0) {
		const reductionMilestones = [5, 10, 20, 30, 50];
		reductionMilestones.forEach((reduction) => {
			if (userStats.improvementPercent >= reduction) {
				milestones.push({
					type: "reduction",
					milestone: reduction,
					achieved: true,
					title: `${reduction}% Reduction Achieved`,
					description: `You've reduced emissions by ${userStats.improvementPercent.toFixed(
						1
					)}%!`,
				});
			}
		});
	}

	return milestones.slice(0, 10); // Return top 10 milestones
};
