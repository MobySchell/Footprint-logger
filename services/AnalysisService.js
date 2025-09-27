// Analysis Service - Centralized business logic for emission analysis
// This service provides a clean interface for all analysis operations

import { ObjectId } from "mongodb";
import {
	analysisCache,
	getWeeklyAggregationPipeline,
	getCategoryAggregationPipeline,
	getDailyTrendsAggregationPipeline,
	calculateQuickStats,
	calculateWeeklyComparison,
} from "../utils/backendHelpers.js";

import {
	calculateStats,
	getTimePeriods,
	filterEmissionsByDateRange,
	groupEmissionsByPeriod,
	groupEmissionsByCategory,
	calculateGroupTotals,
	getTopCategories,
	detectTrend,
	calculateCarbonScore,
	getScoreInterpretation,
	generateReductionSuggestions,
} from "../utils/analysisHelpers.js";

export class AnalysisService {
	constructor(database) {
		this.db = database;
		this.cache = analysisCache;
	}

	/**
	 * Get comprehensive user insights
	 */
	async getUserInsights(userId, options = {}) {
		const cacheKey = this.cache.get(userId, "insights", options);
		if (cacheKey) {
			return { ...cacheKey, fromCache: true };
		}

		const emissions = await this.getEmissions(userId, options);

		if (emissions.length === 0) {
			return {
				hasData: false,
				message:
					"Start tracking activities to see personalized insights!",
			};
		}

		const insights = await this.generateComprehensiveInsights(emissions);

		// Cache for 5 minutes
		this.cache.set(userId, "insights", options, insights);

		return insights;
	}

	/**
	 * Generate comprehensive insights from emissions data
	 */
	async generateComprehensiveInsights(emissions) {
		const timePeriods = getTimePeriods();

		// Basic statistics
		const emissionValues = emissions.map((e) => e.value);
		const basicStats = calculateStats(emissionValues);

		// Time-based analysis
		const weeklyData = this.getWeeklyTrendData(emissions);
		const monthlyData = this.getMonthlyTrendData(emissions);
		const dailyPatterns = this.getDailyPatterns(emissions);

		// Category analysis
		const categoryBreakdown = this.getCategoryBreakdown(emissions);
		const topCategories = getTopCategories(emissions, 5);

		// Trend analysis
		const weeklyTrend = detectTrend(weeklyData.map((w) => w.total));
		const overallTrend = detectTrend(emissionValues);

		// Performance metrics
		const carbonScore = calculateCarbonScore(
			this.getWeeklyAverage(emissions),
			35 // Global average
		);
		const scoreInterpretation = getScoreInterpretation(carbonScore);

		// Recommendations
		const reductionSuggestions = generateReductionSuggestions(
			groupEmissionsByCategory(emissions)
		);

		// Achievements and milestones
		const achievements = this.generateAchievements(emissions, basicStats);
		const milestones = this.generateMilestones(emissions, basicStats);

		return {
			hasData: true,
			summary: {
				totalEmissions: basicStats.sum,
				totalActivities: basicStats.count,
				averageEmission: basicStats.average,
				carbonScore,
				scoreInterpretation,
			},
			trends: {
				weekly: weeklyTrend,
				overall: overallTrend,
				weeklyData,
				monthlyData,
			},
			categories: {
				breakdown: categoryBreakdown,
				topCategories,
				recommendations: reductionSuggestions,
			},
			patterns: {
				daily: dailyPatterns,
				seasonal: this.getSeasonalPatterns(emissions),
			},
			performance: {
				carbonScore,
				scoreInterpretation,
				weeklyAverage: this.getWeeklyAverage(emissions),
				consistency: this.getConsistencyMetrics(emissions),
			},
			achievements,
			milestones,
			generatedAt: new Date(),
		};
	}

	/**
	 * Get emissions data with optional filtering
	 */
	async getEmissions(userId, options = {}) {
		const query = { userId: new ObjectId(userId) };

		if (options.startDate || options.endDate) {
			query.timestamp = {};
			if (options.startDate)
				query.timestamp.$gte = new Date(options.startDate);
			if (options.endDate)
				query.timestamp.$lt = new Date(options.endDate);
		}

		if (options.category) {
			query.category = options.category;
		}

		return await this.db
			.collection("emissions")
			.find(query)
			.sort({ timestamp: -1 })
			.limit(options.limit || 1000)
			.toArray();
	}

	/**
	 * Get weekly trend data
	 */
	getWeeklyTrendData(emissions, weeks = 12) {
		const weeklyGroups = groupEmissionsByPeriod(emissions, "week");
		const weeklyTotals = calculateGroupTotals(weeklyGroups);

		const now = new Date();
		const weeklyData = [];

		for (let i = weeks - 1; i >= 0; i--) {
			const weekStart = new Date(
				now.getTime() - i * 7 * 24 * 60 * 60 * 1000
			);
			weekStart.setDate(weekStart.getDate() - weekStart.getDay());
			const weekKey = weekStart.toDateString();

			const weekData = weeklyTotals[weekKey] || { total: 0, count: 0 };

			weeklyData.push({
				week: `Week ${weeks - i}`,
				startDate: weekStart,
				total: weekData.total,
				activities: weekData.count,
				average: weekData.average || 0,
			});
		}

		return weeklyData;
	}

	/**
	 * Get monthly trend data
	 */
	getMonthlyTrendData(emissions, months = 6) {
		const monthlyGroups = groupEmissionsByPeriod(emissions, "month");
		const monthlyTotals = calculateGroupTotals(monthlyGroups);

		const now = new Date();
		const monthlyData = [];

		for (let i = months - 1; i >= 0; i--) {
			const monthStart = new Date(
				now.getFullYear(),
				now.getMonth() - i,
				1
			);
			const monthKey = `${monthStart.getFullYear()}-${
				monthStart.getMonth() + 1
			}`;

			const monthData = monthlyTotals[monthKey] || { total: 0, count: 0 };

			monthlyData.push({
				month: monthStart.toLocaleDateString("en-US", {
					month: "short",
					year: "numeric",
				}),
				startDate: monthStart,
				total: monthData.total,
				activities: monthData.count,
				average: monthData.average || 0,
			});
		}

		return monthlyData;
	}

	/**
	 * Analyze daily patterns
	 */
	getDailyPatterns(emissions) {
		const dailyGroups = groupEmissionsByPeriod(emissions, "day");
		const dailyTotals = calculateGroupTotals(dailyGroups);

		// Group by day of week
		const dayOfWeekTotals = {
			Sunday: [],
			Monday: [],
			Tuesday: [],
			Wednesday: [],
			Thursday: [],
			Friday: [],
			Saturday: [],
		};

		const dayNames = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		];

		Object.entries(dailyTotals).forEach(([dateString, data]) => {
			const date = new Date(dateString);
			const dayName = dayNames[date.getDay()];
			dayOfWeekTotals[dayName].push(data.total);
		});

		// Calculate averages for each day
		const dayAverages = {};
		Object.entries(dayOfWeekTotals).forEach(([day, totals]) => {
			dayAverages[day] =
				totals.length > 0
					? totals.reduce((sum, val) => sum + val, 0) / totals.length
					: 0;
		});

		// Find patterns
		const weekdayAverage =
			(dayAverages.Monday +
				dayAverages.Tuesday +
				dayAverages.Wednesday +
				dayAverages.Thursday +
				dayAverages.Friday) /
			5;
		const weekendAverage = (dayAverages.Saturday + dayAverages.Sunday) / 2;

		return {
			dayAverages,
			weekdayAverage,
			weekendAverage,
			weekendRatio: weekendAverage / weekdayAverage || 0,
			highestDay: Object.entries(dayAverages).sort(
				([, a], [, b]) => b - a
			)[0],
			lowestDay: Object.entries(dayAverages).sort(
				([, a], [, b]) => a - b
			)[0],
		};
	}

	/**
	 * Get category breakdown with detailed analysis
	 */
	getCategoryBreakdown(emissions) {
		const categoryGroups = groupEmissionsByCategory(emissions);
		const categoryTotals = calculateGroupTotals(categoryGroups);

		const totalEmissions = Object.values(categoryTotals).reduce(
			(sum, cat) => sum + cat.total,
			0
		);

		const breakdown = Object.entries(categoryTotals)
			.sort(([, a], [, b]) => b.total - a.total)
			.map(([category, data]) => ({
				category,
				total: data.total,
				activities: data.count,
				average: data.average,
				percentage: (data.total / totalEmissions) * 100,
				trend: this.getCategoryTrend(categoryGroups[category]),
			}));

		return breakdown;
	}

	/**
	 * Get trend for a specific category
	 */
	getCategoryTrend(categoryEmissions) {
		if (!categoryEmissions || categoryEmissions.length < 3) {
			return { trend: "insufficient_data" };
		}

		// Group by week and calculate trend
		const weeklyGroups = groupEmissionsByPeriod(categoryEmissions, "week");
		const weeklyTotals = calculateGroupTotals(weeklyGroups);
		const weeklyValues = Object.values(weeklyTotals).map((w) => w.total);

		return detectTrend(weeklyValues);
	}

	/**
	 * Get seasonal patterns
	 */
	getSeasonalPatterns(emissions) {
		const seasonalGroups = {
			Spring: [],
			Summer: [],
			Fall: [],
			Winter: [],
		};

		emissions.forEach((emission) => {
			const date = new Date(emission.timestamp);
			const month = date.getMonth();

			let season;
			if (month >= 2 && month <= 4) season = "Spring";
			else if (month >= 5 && month <= 7) season = "Summer";
			else if (month >= 8 && month <= 10) season = "Fall";
			else season = "Winter";

			seasonalGroups[season].push(emission.value);
		});

		const seasonalAverages = {};
		Object.entries(seasonalGroups).forEach(([season, values]) => {
			seasonalAverages[season] =
				values.length > 0
					? values.reduce((sum, val) => sum + val, 0) / values.length
					: 0;
		});

		return seasonalAverages;
	}

	/**
	 * Calculate weekly average emissions
	 */
	getWeeklyAverage(emissions) {
		if (emissions.length === 0) return 0;

		const weeklyData = this.getWeeklyTrendData(emissions, 4); // Last 4 weeks
		const weeklyTotals = weeklyData.map((w) => w.total);

		return (
			weeklyTotals.reduce((sum, val) => sum + val, 0) /
			weeklyTotals.length
		);
	}

	/**
	 * Get consistency metrics
	 */
	getConsistencyMetrics(emissions) {
		const dailyGroups = groupEmissionsByPeriod(emissions, "day");
		const dailyTotals = Object.values(
			calculateGroupTotals(dailyGroups)
		).map((d) => d.total);

		if (dailyTotals.length === 0)
			return { consistency: 0, message: "No data" };

		const stats = calculateStats(dailyTotals);
		const coefficientOfVariation =
			stats.average > 0
				? (stats.standardDeviation / stats.average) * 100
				: 0;

		let consistency;
		if (coefficientOfVariation < 25) consistency = "Very Consistent";
		else if (coefficientOfVariation < 50)
			consistency = "Moderately Consistent";
		else if (coefficientOfVariation < 75) consistency = "Variable";
		else consistency = "Highly Variable";

		return {
			consistency,
			coefficientOfVariation,
			standardDeviation: stats.standardDeviation,
			message: `Your daily emissions are ${consistency.toLowerCase()}`,
		};
	}

	/**
	 * Generate achievement badges
	 */
	generateAchievements(emissions, stats) {
		const achievements = [];

		// Activity count achievements
		const activityMilestones = [1, 5, 10, 25, 50, 100, 250, 500];
		activityMilestones.forEach((milestone) => {
			if (stats.count >= milestone) {
				achievements.push({
					type: "activity_count",
					title: `${milestone} Activities Logged`,
					description: `You've tracked ${milestone} activities!`,
					icon: "📊",
					points: milestone * 10,
					achieved: true,
				});
			}
		});

		// Low emission achievements
		const weeklyAverage = this.getWeeklyAverage(emissions);
		if (weeklyAverage < 25) {
			achievements.push({
				type: "low_emissions",
				title: "Eco Warrior",
				description: "Weekly average below 25kg CO₂!",
				icon: "🌱",
				points: 500,
				achieved: true,
			});
		}

		// Consistency achievements
		const consistency = this.getConsistencyMetrics(emissions);
		if (consistency.consistency === "Very Consistent") {
			achievements.push({
				type: "consistency",
				title: "Steady Tracker",
				description: "Very consistent tracking habits!",
				icon: "🎯",
				points: 300,
				achieved: true,
			});
		}

		return achievements.slice(-10); // Return latest 10 achievements
	}

	/**
	 * Generate upcoming milestones
	 */
	generateMilestones(emissions, stats) {
		const milestones = [];

		// Next activity milestone
		const nextActivityMilestone = [5, 10, 25, 50, 100, 250, 500, 1000].find(
			(m) => m > stats.count
		);

		if (nextActivityMilestone) {
			const progress = (stats.count / nextActivityMilestone) * 100;
			milestones.push({
				type: "activity_count",
				title: `${nextActivityMilestone} Activities`,
				description: `${
					nextActivityMilestone - stats.count
				} activities to go!`,
				progress: {
					current: stats.count,
					target: nextActivityMilestone,
					percentage: progress,
				},
				points: nextActivityMilestone * 10,
			});
		}

		// Carbon reduction milestone
		const weeklyAverage = this.getWeeklyAverage(emissions);
		if (weeklyAverage > 25) {
			milestones.push({
				type: "carbon_reduction",
				title: "Eco Warrior Badge",
				description: "Reduce weekly average to 25kg CO₂",
				progress: {
					current: weeklyAverage,
					target: 25,
					percentage: Math.min((25 / weeklyAverage) * 100, 100),
				},
				points: 500,
			});
		}

		return milestones;
	}

	/**
	 * Get quick dashboard statistics
	 */
	async getQuickStats(userId) {
		const cached = this.cache.get(userId, "quick-stats");
		if (cached) {
			return { ...cached, fromCache: true };
		}

		const stats = await calculateQuickStats(this.db, userId);
		const weeklyComparison = await calculateWeeklyComparison(
			this.db,
			userId
		);

		const result = {
			...stats,
			weeklyComparison,
			generatedAt: new Date(),
		};

		this.cache.set(userId, "quick-stats", {}, result);
		return result;
	}

	/**
	 * Get personalized recommendations
	 */
	async getRecommendations(userId) {
		const emissions = await this.getEmissions(userId);

		if (emissions.length === 0) {
			return {
				hasData: false,
				message:
					"Start tracking activities to get personalized recommendations!",
			};
		}

		const categoryGroups = groupEmissionsByCategory(emissions);
		const reductionSuggestions =
			generateReductionSuggestions(categoryGroups);
		const topCategories = getTopCategories(emissions, 3);

		// Generate time-based recommendations
		const timePeriods = getTimePeriods();
		const thisWeekEmissions = filterEmissionsByDateRange(
			emissions,
			timePeriods.weekStart,
			new Date()
		);

		const recommendations = {
			hasData: true,
			priority: reductionSuggestions.filter((r) => r.priority === "high"),
			general: reductionSuggestions.filter(
				(r) => r.priority === "medium"
			),
			topCategories,
			thisWeek: {
				total: thisWeekEmissions.reduce((sum, e) => sum + e.value, 0),
				activities: thisWeekEmissions.length,
				averageDaily:
					thisWeekEmissions.reduce((sum, e) => sum + e.value, 0) / 7,
			},
			generatedAt: new Date(),
		};

		return recommendations;
	}

	/**
	 * Clear cache for a specific user
	 */
	clearUserCache(userId) {
		this.cache.clear(userId);
	}

	/**
	 * Get service health information
	 */
	getHealthInfo() {
		return {
			status: "healthy",
			cache: {
				size: this.cache.cache.size,
				enabled: true,
			},
			database: {
				connected: !!this.db,
			},
			timestamp: new Date(),
		};
	}
}
