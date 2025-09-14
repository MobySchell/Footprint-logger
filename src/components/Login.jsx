import React, { useState, useEffect } from "react";
import NavBar from "./NavBar";
import landscape from "../assets/landscape.png";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <>
      <NavBar />
      <div className="grid place-content-center min-h-screen w-[100%] bg-amber-400 py-4">
        <div className="bg-white w-[80vh] rounded-xl outline-1 text-black shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] overflow-hidden">
          <img
            src={landscape}
            alt="landscape"
            className="w-[100%] h-48 object-cover"
          />
          <div className="p-6">
            <div className="font-bold text-3xl text-start">LOGIN</div>
            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="inputContainer">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="infoInputs w-full outline-1 px-4 py-3 rounded-xl border"
                  disabled={loading}
                />
              </div>
              <div className="inputContainer">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="infoInputs w-full outline-1 px-4 py-3 rounded-xl border"
                  disabled={loading}
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </div>
            </form>
            <div className="mt-4 text-center">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/register" className="text-blue-600 hover:underline">
                Register here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
