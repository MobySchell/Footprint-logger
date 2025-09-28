// Backend-specific helper functions for analysis routes
// These functions are optimized for MongoDB operations and server-side processing

import { ObjectId } from "mongodb";

/**
 * Optimized database query builders
 */
export const buildEmissionsQuery = (userId, options = {}) => {
	const query = { userId: new ObjectId(userId) };

	if (options.startDate || options.endDate) {
		query.timestamp = {};
		if (options.startDate) {
			query.timestamp.$gte = new Date(options.startDate);
		}
		if (options.endDate) {
			query.timestamp.$lt = new Date(options.endDate);
		}
	}

	if (options.category) {
		query.category = options.category;
	}

	if (options.minValue || options.maxValue) {
		query.value = {};
		if (options.minValue) {
			query.value.$gte = options.minValue;
		}
		if (options.maxValue) {
			query.value.$lte = options.maxValue;
		}
	}

	return query;
};

/**
 * MongoDB aggregation pipelines for efficient analysis
 */
export const getWeeklyAggregationPipeline = (userId, weeks = 12) => {
	const now = new Date();
	const startDate = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);

	return [
		{
			$match: {
				userId: new ObjectId(userId),
				timestamp: { $gte: startDate },
			},
		},
		{
			$addFields: {
				week: {
					$dateToString: {
						format: "%Y-W%U",
						date: "$timestamp",
					},
				},
			},
		},
		{
			$group: {
				_id: "$week",
				totalEmissions: { $sum: "$value" },
				activityCount: { $sum: 1 },
				avgEmission: { $avg: "$value" },
				categories: { $addToSet: "$category" },
				minDate: { $min: "$timestamp" },
				maxDate: { $max: "$timestamp" },
			},
		},
		{
			$sort: { _id: 1 },
		},
	];
};

export const getCategoryAggregationPipeline = (userId, days = 30) => {
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);

	return [
		{
			$match: {
				userId: new ObjectId(userId),
				timestamp: { $gte: startDate },
			},
		},
		{
			$group: {
				_id: "$category",
				totalEmissions: { $sum: "$value" },
				activityCount: { $sum: 1 },
				avgEmission: { $avg: "$value" },
				maxEmission: { $max: "$value" },
				minEmission: { $min: "$value" },
				lastActivity: { $max: "$timestamp" },
			},
		},
		{
			$sort: { totalEmissions: -1 },
		},
	];
};

export const getDailyTrendsAggregationPipeline = (userId, days = 90) => {
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);

	return [
		{
			$match: {
				userId: new ObjectId(userId),
				timestamp: { $gte: startDate },
			},
		},
		{
			$addFields: {
				day: {
					$dateToString: {
						format: "%Y-%m-%d",
						date: "$timestamp",
					},
				},
				dayOfWeek: { $dayOfWeek: "$timestamp" },
				hour: { $hour: "$timestamp" },
			},
		},
		{
			$group: {
				_id: {
					day: "$day",
					dayOfWeek: "$dayOfWeek",
				},
				totalEmissions: { $sum: "$value" },
				activityCount: { $sum: 1 },
				hourlyDistribution: {
					$push: {
						hour: "$hour",
						value: "$value",
					},
				},
			},
		},
		{
			$sort: { "_id.day": 1 },
		},
	];
};

/**
 * Cache management for expensive calculations
 */
export class AnalysisCache {
	constructor() {
		this.cache = new Map();
		this.ttl = 5 * 60 * 1000; // 5 minutes TTL
	}

	generateKey(userId, type, params = {}) {
		const paramString = JSON.stringify(params);
		return `${userId}-${type}-${paramString}`;
	}

	get(userId, type, params) {
		const key = this.generateKey(userId, type, params);
		const cached = this.cache.get(key);

		if (cached && Date.now() - cached.timestamp < this.ttl) {
			return cached.data;
		}

		this.cache.delete(key);
		return null;
	}

	set(userId, type, params, data) {
		const key = this.generateKey(userId, type, params);
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});

		// Clean up old entries periodically
		if (this.cache.size > 1000) {
			this.cleanup();
		}
	}

	cleanup() {
		const now = Date.now();
		for (const [key, value] of this.cache.entries()) {
			if (now - value.timestamp > this.ttl) {
				this.cache.delete(key);
			}
		}
	}

	clear(userId) {
		for (const key of this.cache.keys()) {
			if (key.startsWith(userId)) {
				this.cache.delete(key);
			}
		}
	}
}

// Global cache instance
export const analysisCache = new AnalysisCache();

/**
 * Optimized calculation functions
 */
export const calculateQuickStats = async (db, userId) => {
	try {
		// Simple aggregation to get user's emission statistics
		const pipeline = [
			{ $match: { userId: new ObjectId(userId) } },
			{
				$group: {
					_id: null,
					totalEmissions: { $sum: "$value" },
					totalActivities: { $sum: 1 },
					avgEmission: { $avg: "$value" },
					firstActivity: { $min: "$timestamp" },
					lastActivity: { $max: "$timestamp" },
					categories: { $addToSet: "$category" },
				},
			},
		];

		const result = await db
			.collection("emissions")
			.aggregate(pipeline)
			.toArray();

		if (result.length === 0) {
			return {
				hasData: false,
				totalEmissions: 0,
				totalActivities: 0,
				avgEmission: 0,
				categories: [],
				trackingDays: 0,
			};
		}

		const stats = result[0];

		// Calculate how many days the user has been tracking
		const trackingDays =
			stats.firstActivity && stats.lastActivity
				? Math.ceil(
						(stats.lastActivity - stats.firstActivity) /
							(1000 * 60 * 60 * 24)
				  ) + 1
				: 0;

		return {
			hasData: true,
			totalEmissions: stats.totalEmissions,
			totalActivities: stats.totalActivities,
			avgEmission: stats.avgEmission,
			categories: stats.categories,
			trackingDays,
			dailyAverage:
				trackingDays > 0 ? stats.totalEmissions / trackingDays : 0,
		};
	} catch (error) {
		console.error("Error calculating quick stats:", error);
		return { hasData: false, error: error.message };
	}
};

export const calculateWeeklyComparison = async (db, userId) => {
	try {
		const now = new Date();

		// Get current week (last 7 days) and previous week (7-14 days ago)
		const currentWeekStart = new Date(
			now.getTime() - 7 * 24 * 60 * 60 * 1000
		);
		const lastWeekStart = new Date(
			now.getTime() - 14 * 24 * 60 * 60 * 1000
		);

		// Simple aggregation to compare this week vs last week
		const pipeline = [
			{
				$match: {
					userId: new ObjectId(userId),
					timestamp: { $gte: lastWeekStart },
				},
			},
			{
				$addFields: {
					week: {
						$cond: {
							if: { $gte: ["$timestamp", currentWeekStart] },
							then: "current",
							else: "previous",
						},
					},
				},
			},
			{
				$group: {
					_id: "$week",
					totalEmissions: { $sum: "$value" },
					activityCount: { $sum: 1 },
				},
			},
		];

		const results = await db
			.collection("emissions")
			.aggregate(pipeline)
			.toArray();

		// Get current and previous week data
		const current = results.find((r) => r._id === "current") || {
			totalEmissions: 0,
			activityCount: 0,
		};
		const previous = results.find((r) => r._id === "previous") || {
			totalEmissions: 0,
			activityCount: 0,
		};

		// Calculate percentage change
		const changePercent =
			previous.totalEmissions > 0
				? ((current.totalEmissions - previous.totalEmissions) /
						previous.totalEmissions) *
				  100
				: 0;

		// Determine trend based on change
		let trend = "stable";
		if (changePercent > 5) trend = "increasing";
		if (changePercent < -5) trend = "decreasing";

		return {
			current: current.totalEmissions,
			previous: previous.totalEmissions,
			changePercent,
			trend,
			currentActivities: current.activityCount,
			previousActivities: previous.activityCount,
		};
	} catch (error) {
		console.error("Error calculating weekly comparison:", error);
		return { error: error.message };
	}
};

export const getTopEmittingActivities = async (db, userId, limit = 10) => {
	try {
		const pipeline = [
			{ $match: { userId: new ObjectId(userId) } },
			{ $sort: { value: -1 } },
			{ $limit: limit },
			{
				$project: {
					activity: 1,
					category: 1,
					value: 1,
					timestamp: 1,
					description: 1,
				},
			},
		];

		return await db.collection("emissions").aggregate(pipeline).toArray();
	} catch (error) {
		console.error("Error getting top emitting activities:", error);
		return [];
	}
};

/**
 * Real-time analytics helpers
 */
export const calculateRealtimeMetrics = (emissions) => {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const thisWeek = new Date(
		now.getTime() - now.getDay() * 24 * 60 * 60 * 1000
	);
	const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const todayEmissions = emissions.filter(
		(e) => new Date(e.timestamp) >= today
	);
	const weekEmissions = emissions.filter(
		(e) => new Date(e.timestamp) >= thisWeek
	);
	const monthEmissions = emissions.filter(
		(e) => new Date(e.timestamp) >= thisMonth
	);

	return {
		today: {
			total: todayEmissions.reduce((sum, e) => sum + e.value, 0),
			count: todayEmissions.length,
		},
		week: {
			total: weekEmissions.reduce((sum, e) => sum + e.value, 0),
			count: weekEmissions.length,
		},
		month: {
			total: monthEmissions.reduce((sum, e) => sum + e.value, 0),
			count: monthEmissions.length,
		},
	};
};

/**
 * Error handling wrapper for async analysis functions
 */
export const withErrorHandling = (fn) => {
	return async (...args) => {
		try {
			return await fn(...args);
		} catch (error) {
			console.error(`Analysis function error: ${error.message}`);
			return {
				error: true,
				message: error.message,
				stack:
					process.env.NODE_ENV === "development"
						? error.stack
						: undefined,
			};
		}
	};
};

/**
 * Rate limiting for analysis endpoints
 */
export class RateLimiter {
	constructor(maxRequests = 100, windowMs = 60000) {
		// 100 requests per minute
		this.requests = new Map();
		this.maxRequests = maxRequests;
		this.windowMs = windowMs;
	}

	isAllowed(userId) {
		const now = Date.now();
		const userRequests = this.requests.get(userId) || [];

		// Remove old requests outside the window
		const validRequests = userRequests.filter(
			(time) => now - time < this.windowMs
		);

		if (validRequests.length >= this.maxRequests) {
			return false;
		}

		validRequests.push(now);
		this.requests.set(userId, validRequests);

		return true;
	}

	cleanup() {
		const now = Date.now();
		for (const [userId, requests] of this.requests.entries()) {
			const validRequests = requests.filter(
				(time) => now - time < this.windowMs
			);
			if (validRequests.length === 0) {
				this.requests.delete(userId);
			} else {
				this.requests.set(userId, validRequests);
			}
		}
	}
}

// Global rate limiter instance
export const analysisRateLimiter = new RateLimiter();

/**
 * Data validation helpers
 */
export const validateAnalysisRequest = (req) => {
	const errors = [];

	if (!req.params.userId) {
		errors.push("User ID is required");
	}

	if (req.params.userId && !ObjectId.isValid(req.params.userId)) {
		errors.push("Invalid User ID format");
	}

	if (req.query.startDate && isNaN(Date.parse(req.query.startDate))) {
		errors.push("Invalid start date format");
	}

	if (req.query.endDate && isNaN(Date.parse(req.query.endDate))) {
		errors.push("Invalid end date format");
	}

	if (
		req.query.limit &&
		(isNaN(req.query.limit) ||
			req.query.limit < 1 ||
			req.query.limit > 1000)
	) {
		errors.push("Limit must be between 1 and 1000");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

/**
 * Response formatting helpers
 */
export const formatAnalysisResponse = (data, metadata = {}) => {
	return {
		data,
		metadata: {
			generatedAt: new Date(),
			version: "1.0",
			...metadata,
		},
		success: true,
	};
};

export const formatErrorResponse = (error, statusCode = 500) => {
	return {
		error: true,
		message: error.message || "An unexpected error occurred",
		statusCode,
		timestamp: new Date(),
	};
};

/**
 * Performance monitoring
 */
export const performanceMonitor = {
	timers: new Map(),

	start(operationId) {
		this.timers.set(operationId, Date.now());
	},

	end(operationId) {
		const start = this.timers.get(operationId);
		if (start) {
			const duration = Date.now() - start;
			this.timers.delete(operationId);
			return duration;
		}
		return null;
	},

	log(operationId, details = {}) {
		const duration = this.end(operationId);
		if (duration !== null) {
			console.log(
				`Performance: ${operationId} completed in ${duration}ms`,
				details
			);
		}
	},
};

/**
 * Batch processing for large datasets
 */
export const processBatch = async (items, processor, batchSize = 100) => {
	const results = [];

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const batchResults = await Promise.all(batch.map(processor));
		results.push(...batchResults);
	}

	return results;
};

/**
 * Simple database setup - create basic indexes for better performance
 */
export const ensureIndexes = async (db) => {
	try {
		console.log("🔧 Creating database indexes...");

		// Create simple indexes for common queries
		await db
			.collection("emissions")
			.createIndex({ userId: 1, timestamp: -1 });
		await db
			.collection("emissions")
			.createIndex({ userId: 1, category: 1 });
		await db.collection("emissions").createIndex({ timestamp: -1 });
		await db.collection("emissions").createIndex({ value: -1 });
		await db
			.collection("users")
			.createIndex({ email: 1 }, { unique: true });

		console.log("✅ Database indexes created successfully");
	} catch (error) {
		// Don't worry if indexes already exist
		if (error.message.includes("already exists")) {
			console.log("📋 Database indexes already exist");
		} else {
			console.error("❌ Error creating indexes:", error.message);
		}
	}
};
