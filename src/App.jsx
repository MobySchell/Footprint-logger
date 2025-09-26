import "./App.css";
import { Routes, Route } from "react-router";
import Welcome from "./components/Welcome";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Track from "./components/Track";
import Leaderboard from "./components/Leaderboard";
import Analytics from "./components/Analytics";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
	return (
		<AuthProvider>
			<Routes>
				<Route path="/" element={<Welcome />} />
				<Route path="/register" element={<Register />} />
				<Route path="/login" element={<Login />} />
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<Dashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/track"
					element={
						<ProtectedRoute>
							<Track />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/leaderboard"
					element={
						<ProtectedRoute>
							<Leaderboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/analytics"
					element={
						<ProtectedRoute>
							<Analytics />
						</ProtectedRoute>
					}
				/>
				{/* Legacy route redirect */}
				<Route
					path="/footprint"
					element={
						<ProtectedRoute>
							<Track />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</AuthProvider>
	);
}

export default App;
