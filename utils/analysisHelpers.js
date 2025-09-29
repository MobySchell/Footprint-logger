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
 * Calculate simple statistics for an array of numbers
 */
export const calculateStats = (values) => {
	if (!values || values.length === 0) {
		return {
			count: 0,
			sum: 0,
			average: 0,
			min: 0,
			max: 0,
		};
	}

	const sum = values.reduce((total, val) => total + val, 0);
	const sortedValues = [...values].sort((a, b) => a - b);

	return {
		count: values.length,
		sum,
		average: sum / values.length,
		min: sortedValues[0],
		max: sortedValues[sortedValues.length - 1],
	};
};

/**
 * Simple percentage change calculation
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
 * Simple trend detection - compare first half vs second half of data
 */
export const detectTrend = (values) => {
	if (values.length < 4) {
		return {
			trend: "insufficient_data",
			message: "Need at least 4 data points for trend analysis",
		};
	}

	// Split data in half and compare averages
	const midPoint = Math.floor(values.length / 2);
	const firstHalf = values.slice(0, midPoint);
	const secondHalf = values.slice(midPoint);

	const firstAverage =
		firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
	const secondAverage =
		secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

	const change = secondAverage - firstAverage;
	const percentChange = (change / firstAverage) * 100;

	let trend;
	if (Math.abs(percentChange) < 5) {
		trend = "stable";
	} else if (change > 0) {
		trend = "increasing";
	} else {
		trend = "decreasing";
	}

	return {
		trend,
		change,
		percentChange: Math.abs(percentChange),
		message: getSimpleTrendMessage(trend, Math.abs(percentChange)),
	};
};

/**
 * Get simple trend message
 */
const getSimpleTrendMessage = (trend, percentChange) => {
	switch (trend) {
		case "increasing":
			return `Emissions increased by ${percentChange.toFixed(1)}%`;
		case "decreasing":
			return `Emissions decreased by ${percentChange.toFixed(1)}%`;
		case "stable":
			return "Emissions remained relatively stable";
		default:
			return "Not enough data for analysis";
	}
};

/**
 * Simple carbon footprint score (0-100 scale)
 */
export const calculateCarbonScore = (userEmissions, globalAverage = 35) => {
	if (userEmissions <= 0) return 100;

	// Simple scoring: lower emissions = higher score
	const ratio = userEmissions / globalAverage;

	if (ratio <= 0.5) {
		return 90; // Excellent
	} else if (ratio <= 1.0) {
		return 70; // Good
	} else if (ratio <= 1.5) {
		return 50; // Average
	} else if (ratio <= 2.0) {
		return 30; // Below average
	} else {
		return 10; // Poor
	}
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
 * Simple goal progress calculation
 */
export const calculateGoalProgress = (currentEmissions, targetEmissions) => {
	if (currentEmissions <= targetEmissions) {
		return {
			achieved: true,
			progress: 100,
			message: "Goal achieved!",
		};
	}

	const progress = (targetEmissions / currentEmissions) * 100;
	const remaining = currentEmissions - targetEmissions;

	return {
		achieved: false,
		progress: Math.round(progress),
		remaining: Math.round(remaining * 10) / 10,
		message: `${Math.round(remaining * 10) / 10} kg CO₂ to reduce`,
	};
};

/**
 * Simple validation for emission data
 */
export const validateEmissionData = (emission) => {
	const errors = [];

	// Check required fields
	if (!emission.category) errors.push("Category is required");
	if (!emission.value) errors.push("Value is required");
	if (!emission.timestamp) errors.push("Date is required");

	// Check value is a positive number
	if (emission.value && (isNaN(emission.value) || emission.value < 0)) {
		errors.push("Value must be a positive number");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

/**
 * Simple achievement system
 */
export const generateAchievementMilestones = (userStats) => {
	const milestones = [];

	// Activity milestones (simpler list)
	const targets = [5, 10, 25, 50, 100];

	for (const target of targets) {
		if (userStats.totalActivities >= target) {
			milestones.push({
				type: "activity",
				achieved: true,
				title: `${target} Activities Tracked`,
				description: `Great job logging ${target} activities!`,
			});
		} else {
			// Show next milestone to reach
			milestones.push({
				type: "activity",
				achieved: false,
				title: `${target} Activities`,
				description: `${
					target - userStats.totalActivities
				} more to go!`,
			});
			break; // Only show the next one to achieve
		}
	}

	return milestones;
};
