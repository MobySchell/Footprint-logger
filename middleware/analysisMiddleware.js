// Middleware for analysis routes
// Provides common functionality like validation, caching, and error handling

import {
	validateAnalysisRequest,
	analysisRateLimiter,
	formatErrorResponse,
	performanceMonitor,
} from "../utils/backendHelpers.js";

/**
 * Middleware to validate analysis requests
 */
export const validateRequest = (req, res, next) => {
	const validation = validateAnalysisRequest(req);
	if (!validation.isValid) {
		return res
			.status(400)
			.json(
				formatErrorResponse(
					new Error(validation.errors.join(", ")),
					400
				)
			);
	}
	next();
};

/**
 * Middleware to check rate limits
 */
export const checkRateLimit = (req, res, next) => {
	const userId = req.params.userId || req.user?.id;

	if (!analysisRateLimiter.isAllowed(userId)) {
		return res
			.status(429)
			.json(
				formatErrorResponse(
					new Error("Too many requests. Please try again later."),
					429
				)
			);
	}

	next();
};

/**
 * Middleware to ensure user can only access their own data
 */
export const checkUserAccess = (req, res, next) => {
	const { userId } = req.params;

	if (userId !== req.user.id.toString()) {
		return res
			.status(403)
			.json(
				formatErrorResponse(
					new Error("Cannot access another user's data"),
					403
				)
			);
	}

	next();
};

/**
 * Middleware to start performance monitoring
 */
export const startPerformanceMonitoring = (req, res, next) => {
	const operationId = `${req.method}-${req.path}-${
		req.params.userId
	}-${Date.now()}`;
	req.operationId = operationId;
	performanceMonitor.start(operationId);
	next();
};

/**
 * Middleware to log performance metrics
 */
export const logPerformance = (req, res, next) => {
	const originalSend = res.send;

	res.send = function (data) {
		if (req.operationId) {
			performanceMonitor.log(req.operationId, {
				method: req.method,
				path: req.path,
				userId: req.params.userId,
				statusCode: res.statusCode,
			});
		}
		originalSend.call(this, data);
	};

	next();
};

/**
 * Middleware for error handling with proper formatting
 */
export const handleAnalysisError = (error, req, res, next) => {
	console.error(`Analysis error on ${req.method} ${req.path}:`, error);

	// Don't send error if response was already sent
	if (res.headersSent) {
		return next(error);
	}

	const statusCode = error.statusCode || 500;
	res.status(statusCode).json(formatErrorResponse(error, statusCode));
};

/**
 * Middleware to add CORS headers for analysis endpoints
 */
export const addCorsHeaders = (req, res, next) => {
	res.header(
		"Access-Control-Allow-Origin",
		process.env.CLIENT_URL || "http://localhost:3000"
	);
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization"
	);
	res.header(
		"Access-Control-Allow-Methods",
		"GET, POST, PUT, DELETE, OPTIONS"
	);

	if (req.method === "OPTIONS") {
		res.sendStatus(200);
	} else {
		next();
	}
};

/**
 * Middleware to add common response headers
 */
export const addResponseHeaders = (req, res, next) => {
	res.header("X-API-Version", "1.0");
	res.header("X-Response-Time", Date.now());
	next();
};

/**
 * Middleware to sanitize query parameters
 */
export const sanitizeQueryParams = (req, res, next) => {
	// Clean up common query parameters
	if (req.query.limit) {
		req.query.limit = Math.min(
			Math.max(parseInt(req.query.limit) || 10, 1),
			1000
		);
	}

	if (req.query.offset) {
		req.query.offset = Math.max(parseInt(req.query.offset) || 0, 0);
	}

	if (req.query.startDate) {
		const startDate = new Date(req.query.startDate);
		if (!isNaN(startDate.getTime())) {
			req.query.startDate = startDate;
		} else {
			delete req.query.startDate;
		}
	}

	if (req.query.endDate) {
		const endDate = new Date(req.query.endDate);
		if (!isNaN(endDate.getTime())) {
			req.query.endDate = endDate;
		} else {
			delete req.query.endDate;
		}
	}

	next();
};

/**
 * Combine multiple middleware functions for analysis routes
 */
export const analysisMiddleware = [
	addCorsHeaders,
	addResponseHeaders,
	sanitizeQueryParams,
	validateRequest,
	checkRateLimit,
	checkUserAccess,
	startPerformanceMonitoring,
	logPerformance,
];

/**
 * Lightweight middleware for health checks and public endpoints
 */
export const publicMiddleware = [addCorsHeaders, addResponseHeaders];
