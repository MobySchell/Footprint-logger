import React from "react";
import NavBar from "./NavBar";
import landscape from "../assets/landscape.png";
import { Link } from "react-router";

export default function Login() {
	return (
		<>
			<NavBar />
			<div className="grid place-content-center h-screen w-[100%] bg-amber-400">
				<div className="bg-white h-[80vh] w-[80vh] rounded-xl outline-1 text-black shadow-[5px_5px_0px_1px_rgba(0,0,0,15)]">
					<img
						src={landscape}
						alt="landscape"
						className="w-[100%] h-[60%]"
					/>
					<div className="py-[35px] px-[50px]">
						<div className="font-bold text-3xl text-start">
							LOGIN
						</div>
						<div className="mt-5">
							<div
								id="manual-input"
								className="inputContainer grid grid-rows-2"
							>
								<input
									type="email"
									placeholder="Email"
									id="manual-input-field"
									className="infoInputs  outline-1 px-5 py-1 rounded-xl"
								/>
							</div>
							<div
								id="manual-input"
								className="inputContainer grid grid-rows-2"
							>
								<input
									type="password"
									placeholder="Password"
									id="manual-input-field"
									className="infoInputs  outline-1 px-5 py-1 rounded-xl"
								/>
							</div>
							<div>
								<Link to="/footprint">
									<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
										Login
									</div>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
