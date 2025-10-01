// API Configuration
// This file centralizes API URL configuration for both development and production

const API_BASE_URL =
	import.meta.env.VITE_API_URL ||
	(import.meta.env.DEV
		? "http://localhost:5000/api"
		: "https://footprint-logger-0yry.onrender.com/api");

export { API_BASE_URL };

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
	// Remove leading slash if present to avoid double slashes
	const cleanEndpoint = endpoint.startsWith("/")
		? endpoint.slice(1)
		: endpoint;
	return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
	AUTH: {
		REGISTER: buildApiUrl("/auth/register"),
		LOGIN: buildApiUrl("/auth/login"),
		LOGOUT: buildApiUrl("/auth/logout"),
		ME: buildApiUrl("/auth/me"),
	},
	EMISSIONS: {
		BASE: buildApiUrl("/emissions"),
		USER_TOTALS: buildApiUrl("/emissions/user-totals"),
		LEADERBOARD: buildApiUrl("/emissions/leaderboard"),
		getUserEmissions: (userId) => buildApiUrl(`/emissions/${userId}`),
		getUserSummary: (userId) => buildApiUrl(`/emissions/${userId}/summary`),
		deleteEmission: (emissionId) => buildApiUrl(`/emissions/${emissionId}`),
		clearUserEmissions: (userId) => buildApiUrl(`/emissions/${userId}/all`),
	},
	ANALYSIS: {
		getInsights: (userId) => buildApiUrl(`/analysis/insights/${userId}`),
		getRecommendations: (userId) =>
			buildApiUrl(`/analysis/recommendations/${userId}`),
		getQuickStats: (userId) =>
			buildApiUrl(`/analysis/quick-stats/${userId}`),
		getWeeklyComparison: (userId) =>
			buildApiUrl(`/analysis/weekly-comparison/${userId}`),
		HEALTH: buildApiUrl("/analysis/health"),
		DB_STATUS: buildApiUrl("/analysis/db-status"),
	},
};
