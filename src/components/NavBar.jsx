import React from "react";
import { Link } from "react-router";

export default function NavBar() {
	return (
		<>
			<div className="w-[100%] absolute top-0 bg-white">
				<div className="flex flex-row items-center justify-end md:mr-[50px] w-[100%] h-[100%] py-6 bg-amber-300 shadow-[0px_1.5px_1px_0.25px_rgba(0,0,0,1)]">
					<Link to="/">
						<div className="px-10 py-2 mx-5 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer">
							Home
						</div>
					</Link>

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
				</div>
			</div>
		</>
	);
}
