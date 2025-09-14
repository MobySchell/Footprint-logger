import React, { useState, useEffect } from "react";
import NavBar from "./NavBar";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { name, surname, email, password } = formData;

    if (!name || !surname || !email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    const result = await register(name, surname, email, password);

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
          <div className="bg-[url('../src/assets/pebbles.jpg')] bg-auto bg-center w-[100%] h-40 rounded-t-xl"></div>
          <div className="p-6">
            <div className="font-bold text-3xl text-start">Register</div>
            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="inputContainer">
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="infoInputs w-full outline-1 px-4 py-2.5 rounded-xl border"
                  disabled={loading}
                />
              </div>
              <div className="inputContainer">
                <input
                  type="text"
                  name="surname"
                  placeholder="Surname"
                  value={formData.surname}
                  onChange={handleChange}
                  className="infoInputs w-full outline-1 px-4 py-2.5 rounded-xl border"
                  disabled={loading}
                />
              </div>
              <div className="inputContainer">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="infoInputs w-full outline-1 px-4 py-2.5 rounded-xl border"
                  disabled={loading}
                />
              </div>
              <div className="inputContainer">
                <input
                  type="password"
                  name="password"
                  placeholder="Password (min 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  className="infoInputs w-full outline-1 px-4 py-2.5 rounded-xl border"
                  disabled={loading}
                  minLength="6"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 outline-1 rounded-xl hover:bg-black text-black hover:text-white shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
            <div className="mt-4 text-center">
              <span className="text-gray-600">Already have an account? </span>
              <Link to="/login" className="text-blue-600 hover:underline">
                Login here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
