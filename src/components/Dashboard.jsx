import React, { useState, useEffect, useMemo } from "react";
import NavBar from "./NavBar";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router";

export default function Dashboard() {
	const [emissions, setEmissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [insights, setInsights] = useState(null);
	const [recommendations, setRecommendations] = useState([]);
	const [insightsLoading, setInsightsLoading] = useState(false);
	const { user, userAnalysis } = useAuth();

	// Load user's emissions from database
	useEffect(() => {
		const loadUserEmissions = async () => {
			if (user?.id) {
				try {
					const response = await fetch(
						`http://localhost:5000/api/emissions/${user.id}`,
						{
							headers: {
								Authorization: `Bearer ${localStorage.getItem(
									"token"
								)}`,
							},
						}
					);

					if (response.ok) {
						const data = await response.json();
						setEmissions(data.emissions || []);
					}
				} catch (error) {
					console.error("Error loading emissions:", error);
				} finally {
					setLoading(false);
				}
			} else {
				setLoading(false);
			}
		};

		loadUserEmissions();
	}, [user?.id]);

	// Load insights and recommendations
	useEffect(() => {
		const loadInsights = async () => {
			if (user?.id && emissions.length > 0) {
				setInsightsLoading(true);
				try {
					// Fetch notifications/insights
					const insightsResponse = await fetch(
						`http://localhost:5000/api/analysis/notifications/${user.id}`,
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
						setInsights(insightsData);
					}

					// Fetch recommendations
					const recommendationsResponse = await fetch(
						`http://localhost:5000/api/analysis/recommendations/${user.id}`,
						{
							headers: {
								Authorization: `Bearer ${localStorage.getItem(
									"token"
								)}`,
							},
						}
					);

					if (recommendationsResponse.ok) {
						const recommendationsData =
							await recommendationsResponse.json();
						setRecommendations(
							recommendationsData.recommendations || []
						);
					}
				} catch (error) {
					console.error("Error loading insights:", error);
				} finally {
					setInsightsLoading(false);
				}
			}
		};

		loadInsights();
	}, [user?.id, emissions.length]);

	// Calculate summary statistics
	const summaryStats = useMemo(() => {
		const totalEmissions = emissions.reduce(
			(sum, emission) => sum + emission.value,
			0
		);
		const totalActivities = emissions.length;

		// Group by category
		const categoryTotals = emissions.reduce((acc, emission) => {
			acc[emission.category] =
				(acc[emission.category] || 0) + emission.value;
			return acc;
		}, {});

		// Find highest emitting category
		const highestCategory = Object.entries(categoryTotals).sort(
			([, a], [, b]) => b - a
		)[0];

		// Calculate this week's emissions
		const oneWeekAgo = new Date();
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
		const thisWeekEmissions = emissions
			.filter((emission) => new Date(emission.timestamp) >= oneWeekAgo)
			.reduce((sum, emission) => sum + emission.value, 0);

		// Calculate this month's emissions
		const oneMonthAgo = new Date();
		oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
		const thisMonthEmissions = emissions
			.filter((emission) => new Date(emission.timestamp) >= oneMonthAgo)
			.reduce((sum, emission) => sum + emission.value, 0);

		return {
			totalEmissions,
			totalActivities,
			categoryTotals,
			highestCategory,
			thisWeekEmissions,
			thisMonthEmissions,
		};
	}, [emissions]);

	// Get recent activities (last 10)
	const recentActivities = useMemo(() => {
		return emissions
			.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			.slice(0, 10);
	}, [emissions]);

	// Enhanced welcome message data
	const welcomeData = useMemo(() => {
		const today = new Date();
		const hour = today.getHours();

		// Time-based greeting
		let greeting = "Good morning";
		let timeEmoji = "🌅";
		if (hour >= 12 && hour < 17) {
			greeting = "Good afternoon";
			timeEmoji = "☀️";
		} else if (hour >= 17) {
			greeting = "Good evening";
			timeEmoji = "🌆";
		}

		// User journey insights
		let journeyMessage = "Ready to track your carbon footprint today?";
		let journeyEmoji = "🌱";
		let mood = "neutral";

		if (userAnalysis?.hasData) {
			// Calculate user's progress
			const thisWeek = userAnalysis.thisWeekEmissions || 0;
			const avgDaily =
				emissions.length > 0
					? summaryStats.totalEmissions / emissions.length
					: 0;

			// Determine mood and message based on data
			if (thisWeek < 20) {
				// Low emissions week
				mood = "excellent";
				journeyMessage = `Fantastic! You're having a low-impact week with only ${thisWeek.toFixed(
					1
				)}kg CO₂ so far.`;
				journeyEmoji = "🌟";
			} else if (thisWeek < 35) {
				// Moderate emissions
				mood = "good";
				journeyMessage = `You're doing well this week! ${thisWeek.toFixed(
					1
				)}kg CO₂ tracked so far.`;
				journeyEmoji = "💚";
			} else if (thisWeek < 50) {
				// Higher emissions
				mood = "attention";
				journeyMessage = `This week's at ${thisWeek.toFixed(
					1
				)}kg CO₂. Consider some eco-friendly choices today.`;
				journeyEmoji = "🌿";
			} else {
				// Very high emissions
				mood = "concern";
				journeyMessage = `High impact week (${thisWeek.toFixed(
					1
				)}kg CO₂). Let's find ways to reduce today!`;
				journeyEmoji = "⚡";
			}

			// Special messages for achievements or streaks
			if (insights?.achievements?.length > 0) {
				const recentAchievement = insights.achievements[0];
				if (recentAchievement.category === "consistency") {
					journeyMessage = `${recentAchievement.title} Keep up your tracking momentum!`;
					journeyEmoji = "🔥";
					mood = "celebration";
				}
			}

			// Special message for new users
			if (summaryStats.totalActivities <= 5) {
				journeyMessage = `Great start! You've logged ${summaryStats.totalActivities} activities. Every entry helps!`;
				journeyEmoji = "🚀";
				mood = "encouraging";
			}
		} else {
			// First-time user
			journeyMessage =
				"Welcome to your sustainability journey! Start by tracking your first activity.";
			journeyEmoji = "🌱";
			mood = "welcome";
		}

		// Current day insights
		const todayActivities = emissions.filter((e) => {
			const emissionDate = new Date(e.timestamp);
			return emissionDate.toDateString() === today.toDateString();
		});

		const todayTotal = todayActivities.reduce((sum, e) => sum + e.value, 0);
		const hasLoggedToday = todayActivities.length > 0;

		return {
			greeting,
			timeEmoji,
			journeyMessage,
			journeyEmoji,
			mood,
			todayTotal,
			hasLoggedToday,
			todayActivities: todayActivities.length,
		};
	}, [userAnalysis, summaryStats, emissions, insights]);

	// Daily tip generator
	const getDailyTip = () => {
		const tips = [
			"🚶 Try walking or cycling for trips under 2 miles today",
			"🌱 Consider a plant-based meal for lunch or dinner",
			"💡 Unplug devices you're not using to save energy",
			"♻️ Bring a reusable water bottle instead of buying plastic",
			"🚌 Use public transport for one trip today",
			"🌡️ Adjust your thermostat by 2 degrees to save energy",
			"📱 Reduce screen time by 30 minutes today",
			"🥗 Try to reduce food waste at your next meal",
			"🚗 Combine multiple errands into one efficient trip",
			"🛒 Choose items with minimal packaging when shopping",
		];

		const today = new Date();
		const tipIndex = today.getDate() % tips.length;
		return tips[tipIndex];
	};

	if (loading) {
		return (
			<>
				<NavBar />
				<div className="container mx-auto px-4 mt-[120px] outline-1 rounded-xl  ">
					<div className="text-center">
						<div className="text-2xl">
							Loading your dashboard...
						</div>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<NavBar />
			<div className="container mx-auto px-4 mt-[120px]">
				{/* Enhanced Welcome Section */}
				<div className="mb-8">
					<div
						className={`bg-gradient-to-r rounded-2xl p-6 mb-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1 ${
							welcomeData.mood === "excellent"
								? "from-green-100 to-emerald-100"
								: welcomeData.mood === "good"
								? "from-blue-100 to-cyan-100"
								: welcomeData.mood === "celebration"
								? "from-purple-100 to-pink-100"
								: welcomeData.mood === "encouraging"
								? "from-yellow-100 to-orange-100"
								: welcomeData.mood === "attention"
								? "from-orange-100 to-yellow-100"
								: welcomeData.mood === "concern"
								? "from-red-100 to-orange-100"
								: welcomeData.mood === "welcome"
								? "from-green-50 to-blue-50"
								: "from-gray-50 to-gray-100"
						}`}
					>
						<div className="flex flex-col md:flex-row justify-between items-start md:items-center">
							<div className="flex-1 mb-4 md:mb-0">
								<div className="flex items-center mb-2">
									<span className="text-2xl mr-3">
										{welcomeData.timeEmoji}
									</span>
									<h1 className="text-3xl md:text-4xl font-bold text-gray-800">
										{welcomeData.greeting}, {user?.name}!
									</h1>
								</div>
								<div className="flex items-center text-lg text-gray-700 mb-2">
									<span className="text-xl mr-2">
										{welcomeData.journeyEmoji}
									</span>
									<p>{welcomeData.journeyMessage}</p>
								</div>

								{/* Today's Quick Stats */}
								<div className="flex flex-wrap gap-4 mt-3 text-sm">
									{welcomeData.hasLoggedToday ? (
										<>
											<div className="flex items-center bg-white bg-opacity-60 px-3 py-1 rounded-full">
												<span className="text-green-600 font-semibold">
													✓ Today:
												</span>
												<span className="ml-1 font-medium">
													{welcomeData.todayTotal.toFixed(
														1
													)}
													kg CO₂
												</span>
											</div>
											<div className="flex items-center bg-white bg-opacity-60 px-3 py-1 rounded-full">
												<span className="text-blue-600 font-semibold">
													📊 Activities:
												</span>
												<span className="ml-1 font-medium">
													{
														welcomeData.todayActivities
													}
												</span>
											</div>
										</>
									) : (
										<div className="flex items-center bg-white bg-opacity-60 px-3 py-1 rounded-full">
											<span className="text-orange-600 font-semibold">
												📝 No activities logged today
											</span>
										</div>
									)}

									{userAnalysis?.topCategory && (
										<div className="flex items-center bg-white bg-opacity-60 px-3 py-1 rounded-full">
											<span className="text-purple-600 font-semibold">
												🏆 Top:
											</span>
											<span className="ml-1 font-medium">
												{userAnalysis.topCategory}
											</span>
										</div>
									)}
								</div>
							</div>

							{/* Quick Action or Insight */}
							<div className="flex flex-col items-end space-y-2">
								{!welcomeData.hasLoggedToday ? (
									<Link
										to="/track"
										className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm"
									>
										Track Today's Activities
									</Link>
								) : (
									<Link
										to="/track"
										className="bg-white bg-opacity-80 text-gray-800 px-4 py-2 rounded-xl hover:bg-opacity-100 transition-colors font-medium text-sm"
									>
										Add More Activities
									</Link>
								)}

								{/* Priority insight or notification */}
								{insights?.notifications &&
									insights.notifications.filter(
										(n) => n.priority === "high"
									).length > 0 && (
										<div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
											{
												insights.notifications.filter(
													(n) => n.priority === "high"
												).length
											}{" "}
											urgent alert
											{insights.notifications.filter(
												(n) => n.priority === "high"
											).length > 1
												? "s"
												: ""}
										</div>
									)}

								{/* Achievement notification */}
								{insights?.achievements &&
									insights.achievements.length > 0 &&
									!insights?.notifications?.filter(
										(n) => n.priority === "high"
									).length && (
										<div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
											{insights.achievements.length} new
											achievement
											{insights.achievements.length > 1
												? "s"
												: ""}
											!
										</div>
									)}

								{/* Quick tip for engaged users */}
								{!insights?.achievements?.length &&
									!insights?.notifications?.filter(
										(n) => n.priority === "high"
									).length && (
										<div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium max-w-xs text-center">
											{userAnalysis?.hasData
												? getDailyTip()
												: "💡 Check insights below for tips"}
										</div>
									)}
							</div>
						</div>

						{/* Weekly Progress Bar */}
						{userAnalysis?.hasData && (
							<div className="mt-4 pt-4 border-t border-white border-opacity-40">
								<div className="flex justify-between items-center mb-2">
									<span className="text-sm font-medium text-gray-700">
										This Week's Progress
									</span>
									<span className="text-xs text-gray-600">
										{userAnalysis.thisWeekEmissions?.toFixed(
											1
										) || "0.0"}{" "}
										/ 35.0 kg CO₂ (weekly target)
									</span>
								</div>
								<div className="w-full bg-white bg-opacity-40 rounded-full h-2">
									<div
										className={`h-2 rounded-full transition-all duration-500 ${
											(userAnalysis.thisWeekEmissions ||
												0) <= 25
												? "bg-green-500"
												: (userAnalysis.thisWeekEmissions ||
														0) <= 35
												? "bg-yellow-500"
												: "bg-red-500"
										}`}
										style={{
											width: `${Math.min(
												((userAnalysis.thisWeekEmissions ||
													0) /
													35) *
													100,
												100
											)}%`,
										}}
									></div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Summary Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					{/* Total Emissions */}
					<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
						<div className="text-center">
							<h3 className="text-lg font-semibold text-gray-700 mb-2">
								Total Emissions
							</h3>
							<p className="text-3xl font-bold text-red-600">
								{summaryStats.totalEmissions.toFixed(2)}
							</p>
							<p className="text-sm text-gray-500">kg CO₂</p>
						</div>
					</div>

					{/* Total Activities */}
					<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
						<div className="text-center">
							<h3 className="text-lg font-semibold text-gray-700 mb-2">
								Activities Tracked
							</h3>
							<p className="text-3xl font-bold text-blue-600">
								{summaryStats.totalActivities}
							</p>
							<p className="text-sm text-gray-500">
								total entries
							</p>
						</div>
					</div>

					{/* This Week */}
					<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
						<div className="text-center">
							<h3 className="text-lg font-semibold text-gray-700 mb-2">
								This Week
							</h3>
							<p className="text-3xl font-bold text-orange-600">
								{summaryStats.thisWeekEmissions.toFixed(2)}
							</p>
							<p className="text-sm text-gray-500">kg CO₂</p>
						</div>
					</div>

					{/* This Month */}
					<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
						<div className="text-center">
							<h3 className="text-lg font-semibold text-gray-700 mb-2">
								This Month
							</h3>
							<p className="text-3xl font-bold text-purple-600">
								{summaryStats.thisMonthEmissions.toFixed(2)}
							</p>
							<p className="text-sm text-gray-500">kg CO₂</p>
						</div>
					</div>
				</div>

				{/* Insights Section */}
				{insights && !insightsLoading && (
					<div className="mb-8">
						<h2 className="text-3xl font-semibold mb-6">
							Your Insights
						</h2>

						{/* Quick Stats from Basic Analysis */}
						{userAnalysis && userAnalysis.hasData && (
							<div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div className="text-center">
										<div className="text-2xl font-bold text-green-600">
											{userAnalysis.thisWeekEmissions?.toFixed(
												1
											) || "0.0"}
										</div>
										<div className="text-sm text-gray-600">
											This Week (kg CO₂)
										</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-blue-600">
											{userAnalysis.topCategory || "None"}
										</div>
										<div className="text-sm text-gray-600">
											Top Category
										</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-purple-600">
											{userAnalysis.totalActivities || 0}
										</div>
										<div className="text-sm text-gray-600">
											Total Activities
										</div>
									</div>
								</div>
							</div>
						)}

						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
							{/* Achievements */}
							{insights.achievements &&
								insights.achievements.length > 0 && (
									<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-xl font-semibold text-green-800">
												🏆 Achievements
											</h3>
											<span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
												{insights.achievements.length}
											</span>
										</div>
										<div className="space-y-3 max-h-64 overflow-y-auto">
											{insights.achievements
												.slice(0, 3)
												.map((achievement, index) => (
													<div
														key={index}
														className="p-3 bg-green-50 rounded-lg border border-green-200"
													>
														<div className="flex items-start justify-between">
															<div className="flex-1">
																<div className="font-medium text-green-800 mb-1">
																	{
																		achievement.title
																	}
																</div>
																<div className="text-sm text-green-700">
																	{
																		achievement.message
																	}
																</div>
															</div>
															{achievement.points && (
																<div className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full ml-2 font-semibold">
																	+
																	{
																		achievement.points
																	}
																</div>
															)}
														</div>
													</div>
												))}
										</div>
										{insights.achievements.length > 3 && (
											<div className="mt-3 text-center">
												<button className="text-green-600 hover:text-green-800 font-medium text-sm">
													View all{" "}
													{
														insights.achievements
															.length
													}{" "}
													achievements
												</button>
											</div>
										)}
									</div>
								)}

							{/* Warnings */}
							{insights.warnings &&
								insights.warnings.length > 0 && (
									<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-xl font-semibold text-orange-800">
												⚠️ Alerts
											</h3>
											<span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded-full">
												{insights.warnings.length}
											</span>
										</div>
										<div className="space-y-3 max-h-64 overflow-y-auto">
											{insights.warnings
												.slice(0, 2)
												.map((warning, index) => (
													<div
														key={index}
														className="p-3 bg-orange-50 rounded-lg border border-orange-200"
													>
														<div className="font-medium text-orange-800 mb-1">
															{warning.title}
														</div>
														<div className="text-sm text-orange-700 mb-2">
															{warning.message}
														</div>
														{warning.actionable && (
															<button className="text-xs bg-orange-200 text-orange-800 px-3 py-1 rounded-full hover:bg-orange-300 transition-colors">
																{warning.action}
															</button>
														)}
													</div>
												))}
										</div>
									</div>
								)}

							{/* Recommendations */}
							{recommendations.length > 0 && (
								<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-xl font-semibold text-blue-800">
											💡 Recommendations
										</h3>
										<span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
											{recommendations.length}
										</span>
									</div>
									<div className="space-y-3 max-h-64 overflow-y-auto">
										{recommendations
											.slice(0, 3)
											.map((rec, index) => (
												<div
													key={index}
													className="p-3 bg-blue-50 rounded-lg border border-blue-200"
												>
													<div className="flex items-center justify-between mb-1">
														<div className="font-medium text-blue-800">
															{rec.type ===
																"priority" &&
																"🎯 "}
															{rec.type ===
																"action" &&
																"✅ "}
															{rec.type ===
																"seasonal" &&
																"🌱 "}
															{rec.category}
														</div>
														<span
															className={`text-xs px-2 py-1 rounded-full ${
																rec.urgency ===
																"high"
																	? "bg-red-100 text-red-800"
																	: rec.urgency ===
																	  "medium"
																	? "bg-yellow-100 text-yellow-800"
																	: "bg-gray-100 text-gray-800"
															}`}
														>
															{rec.urgency}
														</span>
													</div>
													<div className="text-sm text-blue-700">
														{rec.message}
													</div>
												</div>
											))}
									</div>
									{recommendations.length > 3 && (
										<div className="mt-3 text-center">
											<button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
												View all{" "}
												{recommendations.length} tips
											</button>
										</div>
									)}
								</div>
							)}

							{/* Milestones */}
							{insights.milestones &&
								insights.milestones.length > 0 && (
									<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-xl font-semibold text-purple-800">
												🎯 Milestones
											</h3>
											<span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded-full">
												{insights.milestones.length}
											</span>
										</div>
										<div className="space-y-3 max-h-64 overflow-y-auto">
											{insights.milestones
												.slice(0, 2)
												.map((milestone, index) => (
													<div
														key={index}
														className="p-3 bg-purple-50 rounded-lg border border-purple-200"
													>
														<div className="flex items-start justify-between">
															<div className="flex-1">
																<div className="font-medium text-purple-800 mb-1">
																	{
																		milestone.title
																	}
																</div>
																<div className="text-sm text-purple-700 mb-2">
																	{
																		milestone.message
																	}
																</div>
																{milestone.progress && (
																	<div className="w-full bg-purple-200 rounded-full h-2">
																		<div
																			className="bg-purple-500 h-2 rounded-full transition-all duration-300"
																			style={{
																				width: `${milestone.progress.percentage}%`,
																			}}
																		></div>
																	</div>
																)}
															</div>
															{milestone.points && (
																<div className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full ml-2 font-semibold">
																	+
																	{
																		milestone.points
																	}
																</div>
															)}
														</div>
													</div>
												))}
										</div>
									</div>
								)}

							{/* Celebrations */}
							{insights.celebrations &&
								insights.celebrations.length > 0 && (
									<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-xl font-semibold text-pink-800">
												🎉 Celebrations
											</h3>
											<span className="bg-pink-100 text-pink-800 text-xs font-semibold px-2 py-1 rounded-full">
												{insights.celebrations.length}
											</span>
										</div>
										<div className="space-y-3 max-h-64 overflow-y-auto">
											{insights.celebrations.map(
												(celebration, index) => (
													<div
														key={index}
														className="p-3 bg-pink-50 rounded-lg border border-pink-200"
													>
														<div className="flex items-start justify-between">
															<div className="flex-1">
																<div className="font-medium text-pink-800 mb-1">
																	{
																		celebration.title
																	}
																</div>
																<div className="text-sm text-pink-700">
																	{
																		celebration.message
																	}
																</div>
															</div>
															{celebration.points && (
																<div className="text-xs bg-pink-200 text-pink-800 px-2 py-1 rounded-full ml-2 font-semibold">
																	+
																	{
																		celebration.points
																	}
																</div>
															)}
														</div>
													</div>
												)
											)}
										</div>
									</div>
								)}

							{/* Smart Notifications */}
							{insights.notifications &&
								insights.notifications.filter((n) =>
									[
										"reminder",
										"review",
										"progress",
										"motivation",
									].includes(n.type)
								).length > 0 && (
									<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-xl font-semibold text-gray-800">
												🔔 Notifications
											</h3>
											<span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-1 rounded-full">
												{
													insights.notifications.filter(
														(n) =>
															[
																"reminder",
																"review",
																"progress",
																"motivation",
															].includes(n.type)
													).length
												}
											</span>
										</div>
										<div className="space-y-3 max-h-64 overflow-y-auto">
											{insights.notifications
												.filter((n) =>
													[
														"reminder",
														"review",
														"progress",
														"motivation",
													].includes(n.type)
												)
												.slice(0, 3)
												.map((notification, index) => (
													<div
														key={index}
														className="p-3 bg-gray-50 rounded-lg border border-gray-200"
													>
														<div className="flex items-start justify-between">
															<div className="flex-1">
																<div className="font-medium text-gray-800 mb-1">
																	{
																		notification.title
																	}
																</div>
																<div className="text-sm text-gray-700">
																	{
																		notification.message
																	}
																</div>
															</div>
															<span
																className={`text-xs px-2 py-1 rounded-full ${
																	notification.priority ===
																	"high"
																		? "bg-red-100 text-red-800"
																		: notification.priority ===
																		  "medium"
																		? "bg-yellow-100 text-yellow-800"
																		: "bg-blue-100 text-blue-800"
																}`}
															>
																{
																	notification.priority
																}
															</span>
														</div>
														{notification.actionable && (
															<button className="mt-2 text-xs bg-gray-200 text-gray-800 px-3 py-1 rounded-full hover:bg-gray-300 transition-colors">
																{
																	notification.action
																}
															</button>
														)}
													</div>
												))}
										</div>
									</div>
								)}
						</div>

						{/* Summary Stats */}
						{insights.summary && (
							<div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
								<div className="flex items-center justify-between text-sm text-gray-600">
									<span>
										Total Insights:{" "}
										{insights.summary.totalInsights}
									</span>
									<div className="flex space-x-4">
										<span className="flex items-center">
											<div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
											High:{" "}
											{insights.summary.highPriority}
										</span>
										<span className="flex items-center">
											<div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
											Medium:{" "}
											{insights.summary.mediumPriority}
										</span>
										<span className="flex items-center">
											<div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
											Low: {insights.summary.lowPriority}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Loading state for insights */}
				{insightsLoading && (
					<div className="mb-8">
						<h2 className="text-3xl font-semibold mb-6">
							Your Insights
						</h2>
						<div className="bg-white rounded-xl p-8 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
							<div className="flex items-center justify-center">
								<div className="animate-pulse text-gray-500">
									Loading your personalized insights...
								</div>
							</div>
						</div>
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 rounded-xl">
					{/* Recent Activities Log */}
					<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-2xl font-semibold">
								Recent Activities
							</h2>
							<Link
								to="/track"
								className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
							>
								Add New
							</Link>
						</div>

						{recentActivities.length > 0 ? (
							<div className="space-y-3 max-h-96 overflow-y-auto">
								{recentActivities.map((emission) => (
									<div
										key={emission.id}
										className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
									>
										<div>
											<div className="font-medium text-gray-800">
												{emission.category}:{" "}
												{emission.activity}
											</div>
											<div className="text-sm text-gray-600">
												{new Date(
													emission.timestamp
												).toLocaleDateString()}{" "}
												at{" "}
												{new Date(
													emission.timestamp
												).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</div>
										<div className="text-right">
											<span className="font-bold text-red-600">
												{emission.value.toFixed(2)} kg
												CO₂
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center text-gray-500 py-8">
								<p className="text-lg">
									No activities tracked yet
								</p>
								<p className="text-sm mb-4">
									Start tracking your carbon footprint!
								</p>
								<Link
									to="/track"
									className="inline-block px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
								>
									Track Your First Activity
								</Link>
							</div>
						)}
					</div>

					{/* Category Breakdown */}
					<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
						<h2 className="text-2xl font-semibold mb-4">
							Category Breakdown
						</h2>

						{Object.keys(summaryStats.categoryTotals).length > 0 ? (
							<div className="space-y-3">
								{Object.entries(summaryStats.categoryTotals)
									.sort(([, a], [, b]) => b - a)
									.map(([category, total]) => {
										const percentage = (
											(total /
												summaryStats.totalEmissions) *
											100
										).toFixed(1);
										return (
											<div
												key={category}
												className="space-y-2"
											>
												<div className="flex justify-between items-center">
													<span className="font-medium">
														{category}
													</span>
													<span className="text-red-600 font-bold">
														{total.toFixed(2)} kg
														CO₂ ({percentage}%)
													</span>
												</div>
												<div className="w-full bg-gray-200 rounded-full h-2">
													<div
														className="bg-red-500 h-2 rounded-full transition-all duration-300"
														style={{
															width: `${percentage}%`,
														}}
													></div>
												</div>
											</div>
										);
									})}
							</div>
						) : (
							<div className="text-center text-gray-500 py-8">
								<p>No categories tracked yet</p>
							</div>
						)}

						{summaryStats.highestCategory && (
							<div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
								<h3 className="font-semibold text-red-800 mb-1">
									Highest Impact Category
								</h3>
								<p className="text-red-700">
									<span className="font-medium">
										{summaryStats.highestCategory[0]}
									</span>{" "}
									accounts for{" "}
									{summaryStats.highestCategory[1].toFixed(2)}{" "}
									kg CO₂ of your total emissions.
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Quick Actions */}
				<div className="mt-8 bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
					<h2 className="text-2xl font-semibold mb-4">
						Quick Actions
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Link
							to="/track"
							className="flex items-center justify-center p-4 bg-green-100 hover:bg-green-200 rounded-xl transition-colors"
						>
							<div className="text-center">
								<div className="text-3xl mb-2">📊</div>
								<div className="font-semibold text-green-800">
									Track Activity
								</div>
								<div className="text-sm text-green-600">
									Add new emissions
								</div>
							</div>
						</Link>

						<Link
							to="/analytics"
							className="flex items-center justify-center p-4 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors w-full"
						>
							<div className="text-center">
								<div className="text-3xl mb-2">📈</div>
								<div className="font-semibold text-blue-800">
									View Analytics
								</div>
								<div className="text-sm text-blue-600">
									See detailed charts
								</div>
							</div>
						</Link>

						<div className="flex items-center justify-center p-4 bg-yellow-100 rounded-xl">
							<div className="text-center">
								<div className="text-3xl mb-2">🎯</div>
								<div className="font-semibold text-yellow-800">
									Set Goals
								</div>
								<div className="text-sm text-yellow-600">
									Coming soon
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
