import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(localStorage.getItem("token"));
	const [loading, setLoading] = useState(true);
	const [userAnalysis, setUserAnalysis] = useState(null);

	const API_BASE_URL = "http://localhost:5000/api";

	// Function to fetch detailed analysis data
	const fetchUserAnalysis = async () => {
		if (!user?.id || !token) return;

		try {
			const response = await fetch(
				`${API_BASE_URL}/analysis/insights/${user.id}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			if (response.ok) {
				const data = await response.json();
				setUserAnalysis(data.insights);
			} else {
				console.error("Failed to fetch user analysis");
			}
		} catch (error) {
			console.error("Error fetching user analysis:", error);
		}
	};

	// Check if user is logged in on app start
	useEffect(() => {
		const checkAuth = async () => {
			if (token) {
				try {
					const response = await fetch(`${API_BASE_URL}/auth/me`, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					});

					if (response.ok) {
						const data = await response.json();
						setUser(data.user);
					} else {
						// Token is invalid, remove it
						localStorage.removeItem("token");
						setToken(null);
					}
				} catch (error) {
					console.error("Auth check failed:", error);
					localStorage.removeItem("token");
					setToken(null);
				}
			}
			setLoading(false);
		};

		checkAuth();
	}, [token]);

	// Fetch detailed analysis when user is authenticated
	useEffect(() => {
		if (user?.id && token) {
			fetchUserAnalysis();
		}
	}, [user?.id, token]);

	const login = async (email, password) => {
		try {
			const response = await fetch(`${API_BASE_URL}/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (response.ok) {
				setToken(data.token);
				setUser(data.user);
				localStorage.setItem("token", data.token);

				// Set basic analysis data from login response
				if (data.analysis) {
					setUserAnalysis(data.analysis);
				}

				return {
					success: true,
					message: data.message,
					analysis: data.analysis,
				};
			} else {
				return { success: false, message: data.message };
			}
		} catch (error) {
			console.error("Login error:", error);
			return {
				success: false,
				message: "Network error. Please try again.",
			};
		}
	};

	const register = async (name, surname, email, password) => {
		try {
			const response = await fetch(`${API_BASE_URL}/auth/register`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name, surname, email, password }),
			});

			const data = await response.json();

			if (response.ok) {
				setToken(data.token);
				setUser(data.user);
				localStorage.setItem("token", data.token);
				return { success: true, message: data.message };
			} else {
				return { success: false, message: data.message };
			}
		} catch (error) {
			console.error("Registration error:", error);
			return {
				success: false,
				message: "Network error. Please try again.",
			};
		}
	};

	const logout = async () => {
		try {
			if (token) {
				await fetch(`${API_BASE_URL}/auth/logout`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
			}
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			setUser(null);
			setToken(null);
			setUserAnalysis(null);
			localStorage.removeItem("token");
		}
	};

	const value = {
		user,
		token,
		loading,
		userAnalysis,
		login,
		register,
		logout,
		fetchUserAnalysis,
		isAuthenticated: !!user,
	};

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
};
