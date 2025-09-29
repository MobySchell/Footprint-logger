import React, { useState, useEffect, useMemo } from "react";
import NavBar from "./NavBar";
import { useAuth } from "../hooks/useAuth";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

// Emission factors (kg CO2 equivalent)
const EMISSION_FACTORS = {
	// Food
	eating: 2.5,
	cooking: 1.8,
	// Transport
	driving: 0.4, // per km
	publicTransport: 0.1, // per km
	walking: 0,
	cycling: 0,
	// Energy
	electricity: 0.5, // per kWh
	heating: 2.3, // per hour
	waterHeating: 1.2, // per hour
	// Digital
	streaming: 0.15, // per hour
	// Default for custom activities
	default: 1.0,
};

const CATEGORY_EMISSIONS = {
	Food: 2.0,
	Transport: 3.5,
	Energy: 2.8,
	Waste: 1.5,
	Consumption: 2.2,
	Housing: 3.0,
	Digital: 0.8,
};

export default function Track() {
	const [selectedCategory, setSelectedCategory] = useState("");
	const [selectedActivity, setSelectedActivity] = useState("");
	const [customActivity, setCustomActivity] = useState("");
	const [emissions, setEmissions] = useState([]);
	const [totalEmissions, setTotalEmissions] = useState(0);
	const [filteredEmissions, setFilteredEmissions] = useState([]);
	const [activeFilter, setActiveFilter] = useState("");
	const { user } = useAuth();

	// Calculate total emissions whenever emissions array changes
	useEffect(() => {
		const total = emissions.reduce(
			(sum, emission) => sum + emission.value,
			0
		);
		setTotalEmissions(total);
	}, [emissions]);

	// Calculate pie chart data based on filtered emissions
	const pieChartData = useMemo(() => {
		const categoryTotals = {};
		const dataToUse =
			filteredEmissions.length > 0 ? filteredEmissions : emissions;

		// Group emissions by category
		dataToUse.forEach((emission) => {
			if (categoryTotals[emission.category]) {
				categoryTotals[emission.category] += emission.value;
			} else {
				categoryTotals[emission.category] = emission.value;
			}
		});

		const categories = Object.keys(categoryTotals);
		const values = Object.values(categoryTotals);

		// Define colors for each category
		const colors = {
			Food: "#FF6384",
			Transport: "#36A2EB",
			Energy: "#FFCE56",
			Waste: "#4BC0C0",
			Consumption: "#9966FF",
			Housing: "#FF9F40",
			Digital: "#FF8A80",
		};

		return {
			labels: categories,
			datasets: [
				{
					data: values,
					backgroundColor: categories.map(
						(cat) => colors[cat] || "#CCCCCC"
					),
					borderColor: categories.map(
						(cat) => colors[cat] || "#CCCCCC"
					),
					borderWidth: 2,
				},
			],
		};
	}, [filteredEmissions, emissions]);

	// Filter emissions when filter changes
	useEffect(() => {
		if (activeFilter === "" || activeFilter === "Clear") {
			setFilteredEmissions(emissions);
		} else {
			setFilteredEmissions(
				emissions.filter(
					(emission) => emission.category === activeFilter
				)
			);
		}
	}, [emissions, activeFilter]);

	// Load user's emissions from database on component mount
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
				}
			}
		};

		loadUserEmissions();
	}, [user?.id]);

	const calculateEmission = (activity, category) => {
		// Use specific activity emission factor if available
		if (EMISSION_FACTORS[activity]) {
			return EMISSION_FACTORS[activity];
		}
		// Otherwise use category-based emission
		if (CATEGORY_EMISSIONS[category]) {
			return CATEGORY_EMISSIONS[category];
		}
		// Default emission value
		return EMISSION_FACTORS.default;
	};

	const handleAddEmission = async () => {
		// Determine which activity to use
		const activity = selectedActivity || customActivity;

		if (!selectedCategory || !activity) {
			alert("Please select a category and activity before adding!");
			return;
		}

		// Calculate emission value
		const emissionValue = calculateEmission(activity, selectedCategory);

		// Create new emission entry
		const newEmission = {
			id: Date.now(),
			category: selectedCategory,
			activity: activity,
			value: emissionValue,
			timestamp: new Date(),
			userId: user?.id || null, // Store user ID for database retrieval
			userName: user?.name || "Anonymous",
		};

		// Add to emissions array
		setEmissions((prev) => [...prev, newEmission]);

		// Save to database
		if (user?.id) {
			try {
				await fetch("http://localhost:5000/api/emissions", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${localStorage.getItem(
							"token"
						)}`,
					},
					body: JSON.stringify(newEmission),
				});
			} catch (error) {
				console.error("Error saving emission:", error);
				// Could add user notification here
			}
		}

		// Reset form
		setSelectedCategory("");
		setSelectedActivity("");
		setCustomActivity("");

		console.log("Emission added:", newEmission);
	};

	const handleFilterClick = (filterCategory) => {
		if (filterCategory === "Clear") {
			setActiveFilter("");
		} else {
			setActiveFilter(filterCategory);
		}
	};

	const clearAllEmissions = async () => {
		if (
			window.confirm(
				"⚠️ WARNING: This will permanently delete ALL your emission data from the database. This action cannot be undone!\n\nAre you sure you want to continue?"
			)
		) {
			// Clear from database if user is logged in
			if (user?.id) {
				try {
					await fetch(
						`http://localhost:5000/api/emissions/${user.id}/all`,
						{
							method: "DELETE",
							headers: {
								Authorization: `Bearer ${localStorage.getItem(
									"token"
								)}`,
							},
						}
					);
				} catch (error) {
					console.error(
						"Error clearing emissions from database:",
						error
					);
				}
			}

			// Clear from local state
			setEmissions([]);
			setActiveFilter("");
		}
	};

	return (
		<>
			<NavBar />
			<div className="container mx-auto px-4 mb-12">
				<div className="headingAndInputArea mt-[120px]">
					<div className="text-4xl italic font-semibold">
						Track Your Footprint
					</div>

					<div className="cardArea grid outline-solid rounded-2xl px-[50px] py-[30px] mt-[50px] gap-5">
						{/* Categories */}
						<div
							id="dropdown-categories"
							className="inputContainer grid grid-rows-2"
						>
							<label
								htmlFor="categories"
								className="labels text-xl font-semibold"
							>
								Pick a category
							</label>
							<select
								name="categories"
								id="categories"
								value={selectedCategory}
								onChange={(e) =>
									setSelectedCategory(e.target.value)
								}
								className="infoInputs outline-1 px-5 py-2 rounded-xl border"
							>
								<option value="">Select Category</option>
								<option value="Food">Food</option>
								<option value="Transport">Transport</option>
								<option value="Energy">Energy</option>
								<option value="Waste">Waste</option>
								<option value="Consumption">Consumption</option>
								<option value="Housing">Housing</option>
								<option value="Digital">Digital</option>
							</select>
						</div>

						{/* Activities */}
						<div
							id="dropdown-activities"
							className="inputContainer grid grid-rows-2"
						>
							<label
								htmlFor="activities"
								className="labels text-xl font-semibold"
							>
								Add Daily Activity
							</label>
							<select
								name="activities"
								id="activities"
								value={selectedActivity}
								onChange={(e) => {
									setSelectedActivity(e.target.value);
									// Clear custom input when dropdown is used
									if (e.target.value) {
										setCustomActivity("");
									}
								}}
								className="infoInputs outline-1 px-5 py-2 rounded-xl border"
								disabled={customActivity !== ""}
							>
								<option value="">Select Activity</option>
								<option value="eating">eating</option>
								<option value="cooking">cooking</option>
								<option value="driving">driving</option>
								<option value="publicTransport">
									public transport
								</option>
								<option value="walking">walking</option>
								<option value="cycling">cycling</option>
								<option value="electricity">electricity</option>
								<option value="heating">heating</option>
								<option value="waterHeating">
									water heating
								</option>
								<option value="streaming">streaming</option>
							</select>
							{customActivity && (
								<p className="text-sm text-gray-500 mt-1">
									Clear custom input to use dropdown
								</p>
							)}
						</div>

						{/* User input */}
						<div
							id="manual-input"
							className="inputContainer grid grid-rows-2"
						>
							<label
								htmlFor="manual-input"
								className="labels text-xl font-semibold"
							>
								Can't find one? Please enter one here
							</label>
							<input
								type="text"
								placeholder="Add Daily activity"
								id="manual-input-field"
								value={customActivity}
								onChange={(e) => {
									setCustomActivity(e.target.value);
									// Clear dropdown when custom input is used
									if (e.target.value) {
										setSelectedActivity("");
									}
								}}
								className="infoInputs outline-1 px-5 py-2 rounded-xl border"
								disabled={selectedActivity !== ""}
							/>
							{selectedActivity && (
								<p className="text-sm text-gray-500 mt-1">
									Clear dropdown selection to use custom input
								</p>
							)}
						</div>

						{/* Clear Activity Selection */}
						{(selectedActivity || customActivity) && (
							<div className="flex justify-center mb-3">
								<button
									type="button"
									onClick={() => {
										setSelectedActivity("");
										setCustomActivity("");
									}}
									className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors"
								>
									Clear Activity Selection
								</button>
							</div>
						)}

						<button
							id="add-btn"
							type="button"
							onClick={handleAddEmission}
							className="justify-self-center h-[50px] w-[30%] rounded-2xl bg-black hover:bg-white text-white hover:text-black hover:outline-1 outline-1 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer"
						>
							ADD
						</button>

						{/* running total emissions */}
						<div id="running-total" className="block">
							<div className="bg-green-100 border border-green-400 rounded-xl p-4 mt-4">
								<div className="flex justify-between items-center">
									<div>
										<h3 className="text-xl font-semibold text-green-800">
											Total Emissions:{" "}
											{totalEmissions.toFixed(2)} kg CO₂
										</h3>
										<p className="text-green-600">
											{filteredEmissions.length}{" "}
											activities tracked
											{activeFilter &&
												` (filtered by ${activeFilter})`}
										</p>
									</div>
									{emissions.length > 0 && (
										<button
											onClick={clearAllEmissions}
											className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium shadow-[3px_3px_0px_1px_rgba(0,0,0,15)] transition-colors"
											title="This will permanently delete all your emission data"
										>
											🗑️ Clear All Data
										</button>
									)}
								</div>
							</div>
						</div>

						{/* Filters */}
						<div id="filters">
							<div className="text-2xl font-semibold">
								Filters
							</div>
							<div
								id="filterOptions"
								className="grid grid-cols-2 md:grid-cols-4 grid-rows-4 md:grid-rows-2 gap-5 mt-5 place-content-stretch"
							>
								{[
									"Food",
									"Transport",
									"Energy",
									"Waste",
									"Consumption",
									"Housing",
									"Digital",
								].map((category) => (
									<button
										key={category}
										onClick={() =>
											handleFilterClick(category)
										}
										className={`btn outline-1 max-w-48 h-[40px] rounded-xl shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer transition-colors ${
											activeFilter === category
												? "bg-black text-white"
												: "hover:bg-black text-black hover:text-white"
										}`}
									>
										{category}
									</button>
								))}
								<button
									onClick={() => handleFilterClick("Clear")}
									className={`btn outline-1 max-w-48 h-[40px] rounded-xl shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer transition-colors ${
										activeFilter === "" ||
										activeFilter === "Clear"
											? "bg-gray-300 text-gray-600"
											: "hover:bg-gray-200 text-black hover:text-gray-800"
									}`}
								>
									🧹 Clear Filter
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Pie Chart */}
				<div className="graphArea my-8 outline-1 rounded-xl">
					<div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)]">
						<h2 className="text-2xl font-semibold mb-4 text-center">
							Emissions by Category
							{activeFilter && ` - ${activeFilter} Filter Active`}
						</h2>

						{emissions.length > 0 ? (
							<div className="flex flex-col lg:flex-row items-center gap-8">
								<div className="w-full lg:w-1/2 max-w-md mx-auto">
									<Pie
										data={pieChartData}
										options={{
											responsive: true,
											maintainAspectRatio: true,
											plugins: {
												legend: {
													position: "bottom",
													labels: {
														padding: 20,
														usePointStyle: true,
													},
												},
												tooltip: {
													callbacks: {
														label: function (
															context
														) {
															const label =
																context.label ||
																"";
															const value =
																context.raw.toFixed(
																	2
																);
															const total =
																context.dataset.data.reduce(
																	(a, b) =>
																		a + b,
																	0
																);
															const percentage = (
																(context.raw /
																	total) *
																100
															).toFixed(1);
															return `${label}: ${value} kg CO₂ (${percentage}%)`;
														},
													},
												},
											},
										}}
									/>
								</div>

								<div className="w-full lg:w-1/2">
									<h3 className="text-lg font-semibold mb-3">
										Category Breakdown
									</h3>
									<div className="space-y-2">
										{Object.entries(
											filteredEmissions.length > 0
												? filteredEmissions.reduce(
														(acc, emission) => {
															acc[
																emission.category
															] =
																(acc[
																	emission
																		.category
																] || 0) +
																emission.value;
															return acc;
														},
														{}
												  )
												: emissions.reduce(
														(acc, emission) => {
															acc[
																emission.category
															] =
																(acc[
																	emission
																		.category
																] || 0) +
																emission.value;
															return acc;
														},
														{}
												  )
										)
											.sort(([, a], [, b]) => b - a)
											.map(([category, total]) => (
												<div
													key={category}
													className="flex justify-between items-center p-2 bg-gray-50 rounded"
												>
													<span className="font-medium">
														{category}
													</span>
													<span className="text-red-600 font-bold">
														{total.toFixed(2)} kg
														CO₂
													</span>
												</div>
											))}
									</div>
								</div>
							</div>
						) : (
							<div className="text-center text-gray-500 py-8">
								<p className="text-lg">
									No emissions data to display
								</p>
								<p className="text-sm">
									Start adding activities to see your carbon
									footprint breakdown!
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
