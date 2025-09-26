import React from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export default function NavBar() {
	const { isAuthenticated, user, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		await logout();
		navigate("/");
	};

	return (
		<>
			<div className="w-[100%] absolute top-0 bg-white">
				<div className="flex flex-row items-center justify-end md:mr-[50px] w-[100%] h-[100%] py-6 bg-amber-300 shadow-[0px_1.5px_1px_0.25px_rgba(0,0,0,1)]">
					<Link to="/">
						<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
							Home
						</div>
					</Link>

					{isAuthenticated ? (
						<>
							<Link to="/dashboard">
								<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Dashboard
								</div>
							</Link>
							<Link to="/track">
								<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Track
								</div>
							</Link>
							<Link to="/leaderboard">
								<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Leaderboard
								</div>
							</Link>
							<Link to="/analytics">
								<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Analytics
								</div>
							</Link>
							<div className="px-4 py-2 mx-2 text-black">
								Welcome, {user?.name}!
							</div>
							<button
								onClick={handleLogout}
								className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer md:mr-48"
							>
								Logout
							</button>
						</>
					) : (
						<>
							<Link to="/login">
								<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Login
								</div>
							</Link>

							<Link to="/register" className="md:mr-48">
								<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Register
								</div>
							</Link>
						</>
					)}
				</div>
			</div>
		</>
	);
}
