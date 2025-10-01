import React, { useState, useEffect } from "react";
import NavBar from "./NavBar";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router";
import { API_ENDPOINTS } from "../config/api.js";

export default function Leaderboard() {
	const [leaderboard, setLeaderboard] = useState([]);
	const [loading, setLoading] = useState(true);
	const { user } = useAuth();

	// Load leaderboard data
	useEffect(() => {
		const loadLeaderboard = async () => {
			try {
				const response = await fetch(
					API_ENDPOINTS.EMISSIONS.USER_TOTALS
				);

				if (response.ok) {
					const data = await response.json();
					if (data.success && data.users) {
						setLeaderboard(data.users);
					} else {
						setLeaderboard([]);
					}
				} else {
					setLeaderboard([]);
				}
			} catch (error) {
				setLeaderboard([]);
			} finally {
				setLoading(false);
			}
		};

		loadLeaderboard();
	}, []);

	if (loading) {
		return (
			<>
				<NavBar />
				<div className="container mx-auto px-4 mt-[120px] mb-12">
					<div className="text-center">
						<div className="text-2xl">Loading leaderboard...</div>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<NavBar />
			<div className="container mx-auto px-4 mt-[120px] mb-12">
				<div className="mb-8">
					<h1 className="text-4xl italic font-semibold mb-2 text-center">
						🏆 Eco Champions Leaderboard
					</h1>
					<p className="text-gray-600 text-lg text-center">
						Celebrating users with the lowest carbon footprint
					</p>
				</div>

				{/* Leaderboard */}
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-xl p-8 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
						{leaderboard.length > 0 ? (
							<>
								{/* Top 3 Podium */}
								<div className="mb-8">
									<h2 className="text-2xl font-semibold mb-6 text-center">
										Top 3 Eco Champions
									</h2>
									<div className="flex justify-center items-end gap-4 mb-8">
										{leaderboard
											.slice(0, 3)
											.map((leaderboardUser, index) => {
												const position = index + 1;
												const isCurrentUser =
													leaderboardUser.userId?.toString() ===
													user?.id?.toString();
												const heights = [
													"h-32",
													"h-40",
													"h-28",
												]; // 2nd, 1st, 3rd
												const orders = [1, 0, 2]; // Display order: 2nd, 1st, 3rd
												const actualIndex =
													orders.indexOf(index);

												return (
													<div
														key={
															leaderboardUser.userId
														}
														className={`flex flex-col items-center ${
															heights[actualIndex]
														} justify-end p-4 rounded-xl transition-all ${
															isCurrentUser
																? "bg-green-100 border-2 border-green-300 transform scale-105"
																: "bg-gray-50"
														}`}
														style={{
															order: actualIndex,
														}}
													>
														<div className="text-center mb-2">
															<div
																className={`font-bold text-lg ${
																	isCurrentUser
																		? "text-green-800"
																		: "text-gray-800"
																}`}
															>
																{leaderboardUser.userName ||
																	"Anonymous"}
																{isCurrentUser && (
																	<div className="text-xs text-green-600">
																		(You!)
																	</div>
																)}
															</div>
															<div className="text-sm text-gray-600">
																{
																	leaderboardUser.activityCount
																}{" "}
																activities
															</div>
														</div>
														<div
															className={`text-center p-3 rounded-lg w-full ${
																position === 1
																	? "bg-yellow-100"
																	: position ===
																	  2
																	? "bg-gray-100"
																	: "bg-orange-100"
															}`}
														>
															<div
																className={`text-xl font-bold ${
																	isCurrentUser
																		? "text-green-700"
																		: "text-red-600"
																}`}
															>
																{
																	leaderboardUser.totalEmissions
																}{" "}
																kg CO₂
															</div>
															{position === 1 && (
																<div className="text-xs text-yellow-700 font-medium mt-1">
																	Eco
																	Champion!
																</div>
															)}
														</div>
													</div>
												);
											})}
									</div>
								</div>

								{/* Full Rankings */}
								<div>
									<h2 className="text-2xl font-semibold mb-4 text-center">
										Complete Rankings
									</h2>
									<div className="space-y-3">
										{leaderboard.map(
											(leaderboardUser, index) => {
												const isCurrentUser =
													leaderboardUser.userId?.toString() ===
													user?.id?.toString();
												const position = index + 1;

												return (
													<div
														key={
															leaderboardUser.userId
														}
														className={`flex items-center justify-between p-4 rounded-lg transition-all ${
															isCurrentUser
																? "bg-green-100 border-2 border-green-300 transform scale-102"
																: "bg-gray-50 hover:bg-gray-100"
														}`}
													>
														<div className="flex items-center gap-4">
															<div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md font-bold text-gray-700">
																{position === 1
																	? "🥇"
																	: position ===
																	  2
																	? "🥈"
																	: position ===
																	  3
																	? "🥉"
																	: position}
															</div>
															<div>
																<div
																	className={`font-semibold text-lg ${
																		isCurrentUser
																			? "text-green-800"
																			: "text-gray-800"
																	}`}
																>
																	{leaderboardUser.userName ||
																		"Anonymous"}
																	{isCurrentUser && (
																		<span className="ml-2 px-2 py-1 text-xs bg-green-200 text-green-800 rounded-full">
																			You
																		</span>
																	)}
																</div>
																<div className="text-sm text-gray-600">
																	{
																		leaderboardUser.activityCount
																	}{" "}
																	activities
																	tracked
																</div>
															</div>
														</div>
														<div className="text-right">
															<div
																className={`text-xl font-bold ${
																	isCurrentUser
																		? "text-green-700"
																		: "text-red-600"
																}`}
															>
																{
																	leaderboardUser.totalEmissions
																}{" "}
																kg CO₂
															</div>
															{position <= 3 && (
																<div className="text-xs text-green-600 font-medium">
																	{position ===
																	1
																		? "Eco Champion!"
																		: position ===
																		  2
																		? "Eco Hero!"
																		: "Eco Warrior!"}
																</div>
															)}
														</div>
													</div>
												);
											}
										)}
									</div>
								</div>

								{/* Stats Summary */}
								<div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
									<h3 className="text-lg font-semibold text-center mb-4 text-gray-800">
										🌱 Community Impact
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
										<div>
											<div className="text-2xl font-bold text-green-600">
												{leaderboard.length}
											</div>
											<div className="text-sm text-gray-600">
												Active Eco Champions
											</div>
										</div>
										<div>
											<div className="text-2xl font-bold text-blue-600">
												{leaderboard.reduce(
													(sum, user) =>
														sum +
														user.activityCount,
													0
												)}
											</div>
											<div className="text-sm text-gray-600">
												Total Activities Tracked
											</div>
										</div>
										<div>
											<div className="text-2xl font-bold text-purple-600">
												{leaderboard
													.reduce(
														(sum, user) =>
															sum +
															user.totalEmissions,
														0
													)
													.toFixed(1)}
											</div>
											<div className="text-sm text-gray-600">
												Total CO₂ Tracked (kg)
											</div>
										</div>
									</div>
								</div>
							</>
						) : (
							<div className="text-center text-gray-500 py-16">
								<div className="text-6xl mb-4">🌱</div>
								<p className="text-xl mb-2">
									No leaderboard data yet
								</p>
								<p className="text-gray-400 mb-6">
									Be the first to start tracking your carbon
									footprint!
								</p>
								<Link
									to="/track"
									className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
								>
									Start Tracking
								</Link>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
