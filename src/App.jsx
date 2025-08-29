import "./App.css";

function App() {
	return (
		<>
			<div className="container mx-auto px-4">
				<div className="headingAndInputArea mt-[50px]">
					<div className="text-4xl italic font-semibold">
						Footprint Logger
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
								className="infoInputs outline-1 px-5 py-2 rounded-xl"
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

						{/* Activities1 */}
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
								className="infoInputs outline-1 px-5 py-2 rounded-xl"
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
								<option value="">Not available</option>
							</select>
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
								className="infoInputs  outline-1 px-5 py-2 rounded-xl"
							/>
						</div>

						<button
							id="add-btn"
							type="submit"
							className="justify-self-center h-[50px] w-[30%] rounded-2xl bg-black hover:bg-white text-white hover:text-black hover:outline-1 outline-1 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer"
						>
							ADD
						</button>

						{/* running total emissions */}
						<div id="running-total" className="block"></div>

						{/* Filters */}
						<div id="filters">
							<div className="text-2xl font-semibold">
								Filters
							</div>
							<div
								id="filterOptions"
								className="grid grid-cols-2 md:grid-cols-4 grid-rows-4 md:grid-rows-2 gap-5 mt-5 place-content-stretch"
							>
								<button className="btn outline-1 max-w-48 h-[40px] rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Food
								</button>
								<button className="btn outline-1 max-w-48 h-[40px] rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Transport
								</button>
								<button className="btn outline-1 max-w-48 h-[40px] rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Energy
								</button>
								<button className="btn outline-1 max-w-48 h-[40px] rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Waste
								</button>
								<button className="btn outline-1 max-w-48 h-[40px] rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Consumption
								</button>
								<button className="btn outline-1 max-w-48 h-[40px] rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Housing
								</button>
								<button className="btn outline-1 max-w-48 h-[40px] rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Digital
								</button>
								<button className="btn outline-1 max-w-48 h-[40px] rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									<i className="fa-solid fa-trash"></i> Clear
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Pie Chart */}
				<div className="graphArea">
					<div id="visualRep" className="graph"></div>
				</div>
			</div>
		</>
	);
}

export default App;
