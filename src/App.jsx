import "./App.css";
import FootprintLogger from "./components/footprintLogger";
import { Routes, Route } from "react-router";
import Welcome from "./components/Welcome";
import Login from "./components/Login";
import Register from "./components/Register";
import NavBar from "./components/NavBar";

function App() {
	return (
		<>
			<Routes>
				<Route path="/" element={<Welcome />} />
				{/* 
					TODO: 
					Create Pages for 
						- Login
						- Register
						- Leaderboard
				*/}
				<Route path="/register" element={<Register />} />
				<Route path="/login" element={<Login />} />
				<Route path="/footprint" element={<FootprintLogger />} />
			</Routes>
		</>
	);
}

export default App;
