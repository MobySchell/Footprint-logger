import React from "react";
import planetImage from "../assets/planet.png";
import { Link } from "react-router";

export default function Welcome() {
	return (
		<>
			<div className="grid place-content-center h-screen w-[100%] bg-amber-400">
				<div className="bg-white h-[80vh] w-[80vh] rounded-xl py-[35px] outline-1 text-black shadow-[5px_5px_0px_1px_rgba(0,0,0,15)]">
					<div className="font-bold text-3xl text-end pr-[50px]">
						WELCOME
					</div>
					<div className="font-semibold text-end pr-[50px]">
						Are you looking to track your carbon footprint?
					</div>
					<div className="font-semibold text-end pr-[50px]">
						We provide you with ways to track and improve your
						footprint.
					</div>
					<img
						className="w-[100%] h-[60%]"
						src={planetImage}
						alt="planet"
					/>
					<div className="grid grid-cols-2 mt-16">
						<div className="px-8">
							<div className="mx-5 mb-4">
								Already have an account?
							</div>
							<Link to="/login">
								<div className="mx-5 px-10 py-2 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Login
								</div>
							</Link>
						</div>
						<div className="px-8">
							<div className="mx-5 mb-4">
								Don't have one? Register with us.
							</div>

							<Link to="/register">
								<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
									Register
								</div>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
