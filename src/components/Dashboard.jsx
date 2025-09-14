import React, { useState, useEffect, useMemo } from "react";
import NavBar from "./NavBar";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router";

export default function Dashboard() {
  const [emissions, setEmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load user's emissions from database
  useEffect(() => {
    const loadUserEmissions = async () => {
      if (user?.id) {
        try {
          const response = await fetch(
            `http://localhost:5000/api/emissions/${user.id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            setEmissions(data.emissions || []);
          }
        } catch (error) {
          console.error("Error loading emissions:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserEmissions();
  }, [user?.id]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalEmissions = emissions.reduce(
      (sum, emission) => sum + emission.value,
      0
    );
    const totalActivities = emissions.length;

    // Group by category
    const categoryTotals = emissions.reduce((acc, emission) => {
      acc[emission.category] = (acc[emission.category] || 0) + emission.value;
      return acc;
    }, {});

    // Find highest emitting category
    const highestCategory = Object.entries(categoryTotals).sort(
      ([, a], [, b]) => b - a
    )[0];

    // Calculate this week's emissions
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekEmissions = emissions
      .filter((emission) => new Date(emission.timestamp) >= oneWeekAgo)
      .reduce((sum, emission) => sum + emission.value, 0);

    // Calculate this month's emissions
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const thisMonthEmissions = emissions
      .filter((emission) => new Date(emission.timestamp) >= oneMonthAgo)
      .reduce((sum, emission) => sum + emission.value, 0);

    return {
      totalEmissions,
      totalActivities,
      categoryTotals,
      highestCategory,
      thisWeekEmissions,
      thisMonthEmissions,
    };
  }, [emissions]);

  // Get recent activities (last 10)
  const recentActivities = useMemo(() => {
    return emissions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [emissions]);

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="container mx-auto px-4 mt-[120px] outline-1 rounded-xl  ">
          <div className="text-center">
            <div className="text-2xl">Loading your dashboard...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 mt-[120px]">
        <div className="mb-8">
          <h1 className="text-4xl italic font-semibold mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 text-lg">
            Here's your carbon footprint overview
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Emissions */}
          <div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Total Emissions
              </h3>
              <p className="text-3xl font-bold text-red-600">
                {summaryStats.totalEmissions.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">kg CO₂</p>
            </div>
          </div>

          {/* Total Activities */}
          <div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Activities Tracked
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {summaryStats.totalActivities}
              </p>
              <p className="text-sm text-gray-500">total entries</p>
            </div>
          </div>

          {/* This Week */}
          <div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                This Week
              </h3>
              <p className="text-3xl font-bold text-orange-600">
                {summaryStats.thisWeekEmissions.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">kg CO₂</p>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                This Month
              </h3>
              <p className="text-3xl font-bold text-purple-600">
                {summaryStats.thisMonthEmissions.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">kg CO₂</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 rounded-xl">
          {/* Recent Activities Log */}
          <div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Recent Activities</h2>
              <Link
                to="/track"
                className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                Add New
              </Link>
            </div>

            {recentActivities.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivities.map((emission) => (
                  <div
                    key={emission.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-800">
                        {emission.category}: {emission.activity}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(emission.timestamp).toLocaleDateString()} at{" "}
                        {new Date(emission.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-600">
                        {emission.value.toFixed(2)} kg CO₂
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p className="text-lg">No activities tracked yet</p>
                <p className="text-sm mb-4">
                  Start tracking your carbon footprint!
                </p>
                <Link
                  to="/track"
                  className="inline-block px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Track Your First Activity
                </Link>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
            <h2 className="text-2xl font-semibold mb-4">Category Breakdown</h2>

            {Object.keys(summaryStats.categoryTotals).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(summaryStats.categoryTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, total]) => {
                    const percentage = (
                      (total / summaryStats.totalEmissions) *
                      100
                    ).toFixed(1);
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{category}</span>
                          <span className="text-red-600 font-bold">
                            {total.toFixed(2)} kg CO₂ ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No categories tracked yet</p>
              </div>
            )}

            {summaryStats.highestCategory && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-1">
                  Highest Impact Category
                </h3>
                <p className="text-red-700">
                  <span className="font-medium">
                    {summaryStats.highestCategory[0]}
                  </span>{" "}
                  accounts for {summaryStats.highestCategory[1].toFixed(2)} kg
                  CO₂ of your total emissions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-[5px_5px_0px_1px_rgba(0,0,0,15)] outline-1">
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/track"
              className="flex items-center justify-center p-4 bg-green-100 hover:bg-green-200 rounded-xl transition-colors"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="font-semibold text-green-800">
                  Track Activity
                </div>
                <div className="text-sm text-green-600">Add new emissions</div>
              </div>
            </Link>

            <Link
              to="/track"
              className="flex items-center justify-center p-4 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📈</div>
                <div className="font-semibold text-blue-800">
                  View Analytics
                </div>
                <div className="text-sm text-blue-600">See detailed charts</div>
              </div>
            </Link>

            <div className="flex items-center justify-center p-4 bg-yellow-100 rounded-xl">
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <div className="font-semibold text-yellow-800">Set Goals</div>
                <div className="text-sm text-yellow-600">Coming soon</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
