import React, { useState, useEffect, useMemo } from "react";
import NavBar from "./NavBar";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router";
import { API_ENDPOINTS } from "../config/api.js";

export default function Analytics() {
	const [emissions, setEmissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [insights, setInsights] = useState(null);
	const [comparisons, setComparisons] = useState(null);
	const [activeTab, setActiveTab] = useState("overview");
	const { user } = useAuth();

	// Load data
	useEffect(() => {
		const loadAnalyticsData = async () => {
			if (!user?.id) return;

			try {
				setLoading(true);

				// Fetch emissions
				const emissionsResponse = await fetch(
					API_ENDPOINTS.EMISSIONS.getUserEmissions(user.id),
					{
						headers: {
							Authorization: `Bearer ${localStorage.getItem(
								"token"
							)}`,
						},
					}
				);

				if (emissionsResponse.ok) {
					const emissionsData = await emissionsResponse.json();
					setEmissions(emissionsData.emissions || []);
				}

				// Fetch detailed insights
				const insightsResponse = await fetch(
					API_ENDPOINTS.ANALYSIS.getInsights(user.id),
					{
						headers: {
							Authorization: `Bearer ${localStorage.getItem(
								"token"
							)}`,
						},
					}
				);

				if (insightsResponse.ok) {
					const insightsData = await insightsResponse.json();
					setInsights(insightsData.insights);
				}

				// Fetch comparisons
				const comparisonsResponse = await fetch(
					API_ENDPOINTS.ANALYSIS.getWeeklyComparison(user.id),
					{
						headers: {
							Authorization: `Bearer ${localStorage.getItem(
								"token"
							)}`,
						},
					}
				);

				if (comparisonsResponse.ok) {
					const comparisonsData = await comparisonsResponse.json();
					setComparisons(comparisonsData.comparisons);
				}
			} catch (error) {
				console.error("Error loading analytics data:", error);
			} finally {
				setLoading(false);
			}
		};

		loadAnalyticsData();
	}, [user?.id]);

	// Calculate chart data
	const chartData = useMemo(() => {
		if (!emissions.length) return null;

		// Monthly emissions for the last 6 months
		const monthlyData = [];
		const now = new Date();

		for (let i = 5; i >= 0; i--) {
			const monthStart = new Date(
				now.getFullYear(),
				now.getMonth() - i,
				1
			);
			const monthEnd = new Date(
				now.getFullYear(),
				now.getMonth() - i + 1,
				0
			);

			const monthEmissions = emissions.filter((e) => {
				const date = new Date(e.timestamp);
				return date >= monthStart && date <= monthEnd;
			});

			const monthTotal = monthEmissions.reduce(
				(sum, e) => sum + e.value,
				0
			);

			monthlyData.push({
				month: monthStart.toLocaleDateString("en-US", {
					month: "short",
					year: "numeric",
				}),
				total: monthTotal,
				activities: monthEmissions.length,
			});
		}

		// Category breakdown
		const categoryData = emissions.reduce((acc, e) => {
			acc[e.category] = (acc[e.category] || 0) + e.value;
			return acc;
		}, {});

		// Weekly data for the last 8 weeks
		const weeklyData = [];
		for (let i = 7; i >= 0; i--) {
			const weekStart = new Date(
				now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000
			);
			const weekEnd = new Date(
				now.getTime() - i * 7 * 24 * 60 * 60 * 1000
			);

			const weekEmissions = emissions.filter((e) => {
				const date = new Date(e.timestamp);
				return date >= weekStart && date < weekEnd;
			});

			const weekTotal = weekEmissions.reduce(
				(sum, e) => sum + e.value,
				0
			);

			weeklyData.push({
				week: `Week ${8 - i}`,
				total: weekTotal,
				activities: weekEmissions.length,
			});
		}

		return {
			monthly: monthlyData,
			categories: categoryData,
			weekly: weeklyData,
		};
	}, [emissions]);

	if (loading) {
		return (
			<>
				<NavBar />
				<div className="container mx-auto px-4 mt-[120px] mb-12">
					<div className="text-center py-12">
						<div className="text-2xl font-semibold mb-4">
							Loading Analytics...
						</div>
						<div className="animate-pulse text-gray-500">
							Preparing your detailed insights
						</div>
					</div>
				</div>
			</>
		);
	}

	if (!emissions.length) {
		return (
			<>
				<NavBar />
				<div className="container mx-auto px-4 mt-[120px] mb-12">
					<div className="text-center py-12">
						<div className="text-6xl mb-4">📊</div>
						<h1 className="text-3xl font-bold mb-4">
							No Analytics Available
						</h1>
						<p className="text-gray-600 mb-8">
							Start tracking your activities to see detailed
							analytics and insights.
						</p>
						<Link
							to="/track"
							className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors font-medium"
						>
							Track Your First Activity
						</Link>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<NavBar />
			<div className="container mx-auto px-4 mt-[120px] mb-12">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-4xl font-bold mb-2">
						Analytics Dashboard
					</h1>
					<p className="text-gray-600 text-lg">
						Comprehensive insights into your carbon footprint
						journey
					</p>
				</div>

				{/* Tabs */}
				<div className="mb-8">
					<div className="flex flex-wrap gap-2 bg-gray-100 p-2 rounded-xl">
						{[
							{ id: "overview", label: "Overview", icon: "📊" },
							{ id: "trends", label: "Trends", icon: "📈" },
							{
								id: "categories",
								label: "Categories",
								icon: "🏷️",
							},
							{
								id: "comparisons",
								label: "Comparisons",
								icon: "⚖️",
							},
							{ id: "goals", label: "Goals", icon: "🎯" },
						].map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
									activeTab === tab.id
										? "bg-black text-white"
										: "bg-transparent text-gray-600 hover:bg-gray-200"
								}`}
							>
								<span>{tab.icon}</span>
								<span>{tab.label}</span>
							</button>
						))}
					</div>
				</div>

				{/* Tab Content */}
				<div className="space-y-8">
					{activeTab === "overview" && (
						<OverviewTab
							chartData={chartData}
							insights={insights}
							emissions={emissions}
						/>
					)}
					{activeTab === "trends" && (
						<TrendsTab chartData={chartData} insights={insights} />
					)}
					{activeTab === "categories" && (
						<CategoriesTab
							chartData={chartData}
							emissions={emissions}
						/>
					)}
					{activeTab === "comparisons" && (
						<ComparisonsTab comparisons={comparisons} />
					)}
					{activeTab === "goals" && (
						<GoalsTab
							comparisons={comparisons}
							insights={insights}
						/>
					)}
				</div>
			</div>
		</>
	);
}

// Overview Tab Component
function OverviewTab({ chartData, insights, emissions }) {
	const totalEmissions = emissions.reduce((sum, e) => sum + e.value, 0);
	const avgDaily =
		emissions.length > 0 ? totalEmissions / emissions.length : 0;

	return (
		<div className="space-y-8">
			{/* Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<MetricCard
					title="Total Emissions"
					value={`${totalEmissions.toFixed(1)} kg`}
					subtitle="CO₂ equivalent"
					color="red"
					icon="🌍"
				/>
				<MetricCard
					title="Activities Tracked"
					value={emissions.length}
					subtitle="total entries"
					color="blue"
					icon="📝"
				/>
				<MetricCard
					title="Daily Average"
					value={`${avgDaily.toFixed(1)} kg`}
					subtitle="CO₂ per day"
					color="green"
					icon="📅"
				/>
				<MetricCard
					title="Top Category"
					value={
						Object.entries(chartData.categories).sort(
							([, a], [, b]) => b - a
						)[0]?.[0] || "None"
					}
					subtitle="highest impact"
					color="purple"
					icon="🏆"
				/>
			</div>

			{/* Monthly Trend Chart */}
			<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
				<h3 className="text-xl font-semibold mb-4">
					6-Month Emission Trend
				</h3>
				<SimpleBarChart data={chartData.monthly} />
			</div>

			{/* Categories Pie Chart */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
					<h3 className="text-xl font-semibold mb-4">
						Category Breakdown
					</h3>
					<CategoryPieChart data={chartData.categories} />
				</div>

				{/* Recent Insights */}
				<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
					<h3 className="text-xl font-semibold mb-4">
						Latest Insights
					</h3>
					{insights && (
						<div className="space-y-3">
							{insights.achievements
								?.slice(0, 2)
								.map((achievement, index) => (
									<div
										key={index}
										className="p-3 bg-green-50 rounded-lg border border-green-200"
									>
										<div className="font-medium text-green-800">
											{achievement.title}
										</div>
										<div className="text-sm text-green-600">
											{achievement.message}
										</div>
									</div>
								))}
							{insights.recommendations
								?.slice(0, 2)
								.map((rec, index) => (
									<div
										key={index}
										className="p-3 bg-blue-50 rounded-lg border border-blue-200"
									>
										<div className="font-medium text-blue-800">
											{rec.category}
										</div>
										<div className="text-sm text-blue-600">
											{rec.message}
										</div>
									</div>
								))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// Trends Tab Component
function TrendsTab({ chartData, insights }) {
	return (
		<div className="space-y-8">
			{/* Weekly Trends */}
			<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
				<h3 className="text-xl font-semibold mb-4">
					8-Week Emission Trend
				</h3>
				<SimpleLineChart data={chartData.weekly} />
			</div>

			{/* Trend Analysis */}
			{insights?.monthlyTrend && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
						<h3 className="text-xl font-semibold mb-4">
							Monthly Trends
						</h3>
						<div className="space-y-4">
							{insights.monthlyTrend
								.slice(-3)
								.map((month, index) => (
									<div
										key={index}
										className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
									>
										<div>
											<div className="font-medium">
												{month.month}
											</div>
											<div className="text-sm text-gray-600">
												{month.activities} activities
											</div>
										</div>
										<div className="text-right">
											<div className="font-bold">
												{month.total.toFixed(1)} kg CO₂
											</div>
											{month.changePercent !== 0 && (
												<div
													className={`text-sm ${
														month.trend ===
														"increasing"
															? "text-red-600"
															: "text-green-600"
													}`}
												>
													{month.trend ===
													"increasing"
														? "↑"
														: "↓"}{" "}
													{Math.abs(
														month.changePercent
													).toFixed(1)}
													%
												</div>
											)}
										</div>
									</div>
								))}
						</div>
					</div>

					<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
						<h3 className="text-xl font-semibold mb-4">
							Improvement Patterns
						</h3>
						{insights.improvementPatterns?.hasEnoughData ? (
							<div className="space-y-4">
								<div
									className={`p-4 rounded-lg ${
										insights.improvementPatterns.trend ===
										"improving"
											? "bg-green-50 border border-green-200"
											: insights.improvementPatterns
													.trend === "worsening"
											? "bg-red-50 border border-red-200"
											: "bg-gray-50 border border-gray-200"
									}`}
								>
									<div className="font-medium mb-2">
										Overall Trend
									</div>
									<div className="text-2xl font-bold mb-1">
										{insights.improvementPatterns.improvementPercent.toFixed(
											1
										)}
										%
									</div>
									<div className="text-sm text-gray-600">
										{insights.improvementPatterns.trend ===
										"improving"
											? "Improvement"
											: insights.improvementPatterns
													.trend === "worsening"
											? "Increase"
											: "Stable"}
									</div>
								</div>

								{insights.improvementPatterns
									.bestImprovingCategory && (
									<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
										<div className="font-medium text-blue-800">
											Best Improving Category
										</div>
										<div className="text-blue-600">
											{
												insights.improvementPatterns
													.bestImprovingCategory
											}
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="text-center text-gray-500 py-8">
								<div className="text-4xl mb-2">📊</div>
								<div>
									Need more data for improvement analysis
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// Categories Tab Component
function CategoriesTab({ chartData, emissions }) {
	const categoryDetails = Object.entries(chartData.categories)
		.sort(([, a], [, b]) => b - a)
		.map(([category, total]) => {
			const categoryEmissions = emissions.filter(
				(e) => e.category === category
			);
			const avgPerActivity =
				categoryEmissions.length > 0
					? total / categoryEmissions.length
					: 0;
			const percentage =
				(total /
					Object.values(chartData.categories).reduce(
						(sum, val) => sum + val,
						0
					)) *
				100;

			return {
				category,
				total,
				activities: categoryEmissions.length,
				avgPerActivity,
				percentage,
			};
		});

	return (
		<div className="space-y-8">
			{/* Category Summary */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{categoryDetails.map((cat, index) => (
					<div
						key={cat.category}
						className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1"
					>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">
								{cat.category}
							</h3>
							<span
								className={`text-xs px-2 py-1 rounded-full font-medium ${
									index === 0
										? "bg-red-100 text-red-800"
										: index === 1
										? "bg-orange-100 text-orange-800"
										: "bg-gray-100 text-gray-800"
								}`}
							>
								#{index + 1}
							</span>
						</div>

						<div className="space-y-3">
							<div>
								<div className="text-2xl font-bold text-gray-800">
									{cat.total.toFixed(1)} kg
								</div>
								<div className="text-sm text-gray-600">
									Total CO₂
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<div className="font-medium">
										{cat.activities}
									</div>
									<div className="text-gray-600">
										Activities
									</div>
								</div>
								<div>
									<div className="font-medium">
										{cat.percentage.toFixed(1)}%
									</div>
									<div className="text-gray-600">
										Of total
									</div>
								</div>
							</div>

							<div className="pt-2 border-t">
								<div className="text-sm text-gray-600">
									Avg per activity
								</div>
								<div className="font-medium">
									{cat.avgPerActivity.toFixed(2)} kg CO₂
								</div>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Category Comparison Chart */}
			<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
				<h3 className="text-xl font-semibold mb-4">
					Category Comparison
				</h3>
				<CategoryBarChart data={categoryDetails} />
			</div>
		</div>
	);
}

// Comparisons Tab Component
function ComparisonsTab({ comparisons }) {
	if (!comparisons) {
		return (
			<div className="text-center py-12">
				<div className="text-4xl mb-4">⚖️</div>
				<div className="text-xl font-semibold mb-2">
					Loading Comparisons...
				</div>
				<div className="text-gray-600">
					Analyzing your performance data
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Time Period Comparisons */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{["weekly", "monthly", "quarterly"].map((period) => {
					const data = comparisons.timePeriods[period];
					return (
						<div
							key={period}
							className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1"
						>
							<h3 className="text-lg font-semibold mb-4 capitalize">
								{period} Comparison
							</h3>

							<div className="space-y-4">
								<div>
									<div className="text-sm text-gray-600">
										Current {period}
									</div>
									<div className="text-2xl font-bold">
										{data.current.total.toFixed(1)} kg
									</div>
								</div>

								<div>
									<div className="text-sm text-gray-600">
										Previous {period}
									</div>
									<div className="text-xl font-medium">
										{data.previous.total.toFixed(1)} kg
									</div>
								</div>

								<div
									className={`p-3 rounded-lg ${
										data.comparison.trend === "decreasing"
											? "bg-green-50 border border-green-200"
											: data.comparison.trend ===
											  "increasing"
											? "bg-red-50 border border-red-200"
											: "bg-gray-50 border border-gray-200"
									}`}
								>
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium">
											Change
										</span>
										<span
											className={`font-bold ${
												data.comparison.trend ===
												"decreasing"
													? "text-green-600"
													: data.comparison.trend ===
													  "increasing"
													? "text-red-600"
													: "text-gray-600"
											}`}
										>
											{data.comparison.trend ===
											"decreasing"
												? "↓"
												: data.comparison.trend ===
												  "increasing"
												? "↑"
												: "→"}
											{Math.abs(
												data.comparison.changePercentage
											).toFixed(1)}
											%
										</span>
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Goal Progress */}
			{comparisons.personalGoals && (
				<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
					<h3 className="text-xl font-semibold mb-6">
						Goal Progress
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{["daily", "weekly", "monthly", "yearly"].map(
							(period) => {
								const goal = comparisons.personalGoals[period];
								const percentage =
									(goal.actual / goal.target) * 100;

								return (
									<div key={period} className="space-y-3">
										<div className="flex justify-between items-center">
											<span className="font-medium capitalize">
												{period} Goal
											</span>
											<span
												className={`text-xs px-2 py-1 rounded-full font-medium ${
													goal.status === "on_track"
														? "bg-green-100 text-green-800"
														: goal.status ===
														  "close"
														? "bg-yellow-100 text-yellow-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{goal.status.replace("_", " ")}
											</span>
										</div>

										<div className="space-y-1">
											<div className="flex justify-between text-sm">
												<span>
													{goal.actual.toFixed(1)} kg
												</span>
												<span>
													{goal.target.toFixed(1)} kg
												</span>
											</div>
											<div className="w-full bg-gray-200 rounded-full h-2">
												<div
													className={`h-2 rounded-full transition-all duration-300 ${
														goal.status ===
														"on_track"
															? "bg-green-500"
															: goal.status ===
															  "close"
															? "bg-yellow-500"
															: "bg-red-500"
													}`}
													style={{
														width: `${Math.min(
															percentage,
															100
														)}%`,
													}}
												></div>
											</div>
										</div>

										<div className="text-xs text-gray-600">
											{goal.daysRemaining} days remaining
										</div>
									</div>
								);
							}
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// Goals Tab Component
function GoalsTab({ comparisons, insights }) {
	return (
		<div className="space-y-8">
			<div className="text-center py-12">
				<div className="text-6xl mb-4">🎯</div>
				<h2 className="text-3xl font-bold mb-4">
					Goal Setting & Tracking
				</h2>
				<p className="text-gray-600 mb-8">
					Set personalized emission targets and track your progress
					toward sustainability goals.
				</p>
				<div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium inline-block">
					🚧 Goal setting features coming soon!
				</div>
			</div>
		</div>
	);
}

// Simple Chart Components
function SimpleBarChart({ data }) {
	const maxValue = Math.max(...data.map((d) => d.total));

	return (
		<div className="space-y-4">
			{data.map((item, index) => (
				<div key={index} className="space-y-2">
					<div className="flex justify-between items-center text-sm">
						<span className="font-medium">{item.month}</span>
						<span className="text-gray-600">
							{item.total.toFixed(1)} kg CO₂
						</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-3">
						<div
							className="bg-blue-500 h-3 rounded-full transition-all duration-500"
							style={{
								width: `${(item.total / maxValue) * 100}%`,
							}}
						></div>
					</div>
				</div>
			))}
		</div>
	);
}

function SimpleLineChart({ data }) {
	const maxValue = Math.max(...data.map((d) => d.total));

	return (
		<div className="space-y-4">
			{data.map((item, index) => (
				<div
					key={index}
					className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
				>
					<div>
						<div className="font-medium">{item.week}</div>
						<div className="text-sm text-gray-600">
							{item.activities} activities
						</div>
					</div>
					<div className="text-right">
						<div className="font-bold">
							{item.total.toFixed(1)} kg CO₂
						</div>
						<div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
							<div
								className="bg-green-500 h-2 rounded-full transition-all duration-300"
								style={{
									width: `${(item.total / maxValue) * 100}%`,
								}}
							></div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function CategoryPieChart({ data }) {
	const total = Object.values(data).reduce((sum, val) => sum + val, 0);
	const colors = [
		"bg-red-500",
		"bg-blue-500",
		"bg-green-500",
		"bg-yellow-500",
		"bg-purple-500",
		"bg-pink-500",
	];

	return (
		<div className="space-y-3">
			{Object.entries(data)
				.sort(([, a], [, b]) => b - a)
				.map(([category, value], index) => {
					const percentage = ((value / total) * 100).toFixed(1);
					return (
						<div
							key={category}
							className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
						>
							<div className="flex items-center space-x-3">
								<div
									className={`w-4 h-4 rounded-full ${
										colors[index % colors.length]
									}`}
								></div>
								<span className="font-medium">{category}</span>
							</div>
							<div className="text-right">
								<div className="font-bold">
									{value.toFixed(1)} kg
								</div>
								<div className="text-sm text-gray-600">
									{percentage}%
								</div>
							</div>
						</div>
					);
				})}
		</div>
	);
}

function CategoryBarChart({ data }) {
	const maxValue = Math.max(...data.map((d) => d.total));

	return (
		<div className="space-y-4">
			{data.map((cat, index) => (
				<div key={cat.category} className="space-y-2">
					<div className="flex justify-between items-center">
						<span className="font-medium">{cat.category}</span>
						<span className="text-sm text-gray-600">
							{cat.total.toFixed(1)} kg CO₂
						</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-4">
						<div
							className={`h-4 rounded-full transition-all duration-500 ${
								index === 0
									? "bg-red-500"
									: index === 1
									? "bg-orange-500"
									: index === 2
									? "bg-yellow-500"
									: "bg-gray-500"
							}`}
							style={{
								width: `${(cat.total / maxValue) * 100}%`,
							}}
						></div>
					</div>
				</div>
			))}
		</div>
	);
}

function MetricCard({ title, value, subtitle, color, icon }) {
	const colorClasses = {
		red: "bg-red-50 border-red-200 text-red-800",
		blue: "bg-blue-50 border-blue-200 text-blue-800",
		green: "bg-green-50 border-green-200 text-green-800",
		purple: "bg-purple-50 border-purple-200 text-purple-800",
	};

	return (
		<div
			className={`p-6 rounded-xl border ${colorClasses[color]} shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1 bg-white`}
		>
			<div className="flex items-center justify-between mb-3">
				<span className="text-2xl">{icon}</span>
				<div className="text-right">
					<div className="text-2xl font-bold">{value}</div>
					<div className="text-sm text-gray-600">{subtitle}</div>
				</div>
			</div>
			<div className="font-medium text-gray-700">{title}</div>
		</div>
	);
}
