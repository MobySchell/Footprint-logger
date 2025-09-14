import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid place-content-center h-screen w-[100%] bg-amber-400">
        <div className="bg-white p-8 rounded-xl shadow-[5px_5px_0px_1px_rgba(0,0,0,15)]">
          <div className="text-black text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
