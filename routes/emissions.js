import express from "express";
import { ObjectId } from "mongodb";
import { authenticateToken } from "./auth.js";

const router = express.Router();

// Save emission data for a user
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { category, activity, value, timestamp, userId } = req.body;

    // Validate input
    if (!category || !activity || value === undefined) {
      return res.status(400).json({
        message: "Category, activity, and value are required",
      });
    }

    // Ensure the userId matches the authenticated user
    if (userId !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Cannot save emissions for another user",
      });
    }

    // Create emission document
    const emissionData = {
      category,
      activity,
      value: parseFloat(value),
      timestamp: new Date(timestamp),
      userId: new ObjectId(userId),
      userName: req.user.name,
      createdAt: new Date(),
    };

    const result = await req.db.collection("emissions").insertOne(emissionData);

    res.status(201).json({
      message: "Emission saved successfully",
      emissionId: result.insertedId,
    });
  } catch (error) {
    console.error("Error saving emission:", error);
    res.status(500).json({
      message: "Server error saving emission",
    });
  }
});

// Get all emissions grouped by username with totals
router.get("/user-totals", async (req, res) => {
  try {
    const db = req.db;
    const emissionsCollection = db.collection("emissions");

    // Get all emissions
    const allEmissions = await emissionsCollection.find({}).toArray();

    // Group by userName and calculate totals
    const userTotals = {};

    allEmissions.forEach((emission) => {
      const userName = emission.userName || "Unknown";
      const value = parseFloat(emission.value) || 0;

      if (!userTotals[userName]) {
        userTotals[userName] = {
          userName: userName,
          totalEmissions: 0,
          activityCount: 0,
          userId: emission.userId,
        };
      }

      userTotals[userName].totalEmissions += value;
      userTotals[userName].activityCount += 1;
    });

    // Convert to array and sort by lowest emissions
    const sortedUsers = Object.values(userTotals)
      .map((user) => ({
        ...user,
        totalEmissions: Math.round(user.totalEmissions * 100) / 100,
      }))
      .sort((a, b) => a.totalEmissions - b.totalEmissions);

    res.json({
      success: true,
      users: sortedUsers,
    });
  } catch (error) {
    console.error("Error calculating user totals:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating user totals",
    });
  }
});

// Get all emissions for a specific user
router.get("/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure the user can only access their own emissions
    if (userId !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Cannot access another user's emissions",
      });
    }

    const emissions = await req.db
      .collection("emissions")
      .find({ userId: new ObjectId(userId) })
      .sort({ timestamp: -1 }) // Most recent first
      .toArray();

    // Transform the data for frontend consumption
    const transformedEmissions = emissions.map((emission) => ({
      id: emission._id.toString(),
      category: emission.category,
      activity: emission.activity,
      value: emission.value,
      timestamp: emission.timestamp,
      userId: emission.userId.toString(),
      userName: emission.userName,
    }));

    res.json({
      message: "Emissions retrieved successfully",
      emissions: transformedEmissions,
      totalEmissions: emissions.reduce((sum, e) => sum + e.value, 0),
      count: emissions.length,
    });
  } catch (error) {
    console.error("Error retrieving emissions:", error);
    res.status(500).json({
      message: "Server error retrieving emissions",
    });
  }
});

// Get emissions summary for a user (totals by category)
router.get("/:userId/summary", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Cannot access another user's data",
      });
    }

    const summary = await req.db
      .collection("emissions")
      .aggregate([
        { $match: { userId: new ObjectId(userId) } },
        {
          $group: {
            _id: "$category",
            totalEmissions: { $sum: "$value" },
            count: { $sum: 1 },
            avgEmission: { $avg: "$value" },
          },
        },
        { $sort: { totalEmissions: -1 } },
      ])
      .toArray();

    const totalEmissions = summary.reduce(
      (sum, cat) => sum + cat.totalEmissions,
      0
    );

    res.json({
      message: "Summary retrieved successfully",
      summary,
      totalEmissions,
      categoriesTracked: summary.length,
    });
  } catch (error) {
    console.error("Error retrieving summary:", error);
    res.status(500).json({
      message: "Server error retrieving summary",
    });
  }
});

// Delete a specific emission
router.delete("/:emissionId", authenticateToken, async (req, res) => {
  try {
    const { emissionId } = req.params;

    // First, verify the emission belongs to the authenticated user
    const emission = await req.db
      .collection("emissions")
      .findOne({ _id: new ObjectId(emissionId) });

    if (!emission) {
      return res.status(404).json({ message: "Emission not found" });
    }

    if (emission.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Cannot delete another user's emission",
      });
    }

    await req.db
      .collection("emissions")
      .deleteOne({ _id: new ObjectId(emissionId) });

    res.json({ message: "Emission deleted successfully" });
  } catch (error) {
    console.error("Error deleting emission:", error);
    res.status(500).json({
      message: "Server error deleting emission",
    });
  }
});

// Clear all emissions for a user
router.delete("/:userId/all", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Cannot delete another user's emissions",
      });
    }

    const result = await req.db
      .collection("emissions")
      .deleteMany({ userId: new ObjectId(userId) });

    res.json({
      message: "All emissions cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing emissions:", error);
    res.status(500).json({
      message: "Server error clearing emissions",
    });
  }
});

// Get leaderboard (all users sorted by lowest total emissions)
router.get("/leaderboard", authenticateToken, async (req, res) => {
  console.log("=== LEADERBOARD ENDPOINT HIT ===");
  console.log("Authenticated user:", req.user);

  try {
    const db = req.db;
    const emissionsCollection = db.collection("emissions");

    console.log("=== LEADERBOARD DEBUG START ===");

    // Check if we have any emissions at all
    const totalCount = await emissionsCollection.countDocuments();
    console.log("Total emissions in database:", totalCount);

    if (totalCount === 0) {
      console.log("No emissions found in database");
      return res.json({
        success: true,
        leaderboard: [],
        message: "No emissions data found",
      });
    }

    // Get a few sample emissions to check data structure
    const samples = await emissionsCollection.find({}).limit(3).toArray();
    console.log("Sample emissions structure:");
    samples.forEach((sample, index) => {
      console.log(`Sample ${index + 1}:`, {
        userId: sample.userId,
        userIdType: typeof sample.userId,
        value: sample.value,
        valueType: typeof sample.value,
        userName: sample.userName,
        category: sample.category,
        activity: sample.activity,
      });
    });

    // Simple aggregation - group by userId (which is stored as string) and sum emissions
    const pipeline = [
      {
        $group: {
          _id: "$userId", // userId is stored as string in your data
          totalEmissions: { $sum: "$value" },
          activityCount: { $sum: 1 },
          userName: { $first: "$userName" },
        },
      },
      {
        $match: {
          totalEmissions: { $gt: 0 },
        },
      },
      {
        $sort: { totalEmissions: 1 }, // Sort by lowest emissions first
      },
      {
        $limit: 15, // Show more users
      },
      {
        $project: {
          _id: 0,
          userId: "$_id", // This will be the string userId
          totalEmissions: { $round: ["$totalEmissions", 2] },
          activityCount: 1,
          userName: 1,
        },
      },
    ];

    console.log("Running aggregation pipeline...");
    const results = await emissionsCollection.aggregate(pipeline).toArray();
    console.log("Aggregation results:", results.length, "users found");
    console.log("Results:", JSON.stringify(results, null, 2));

    console.log("=== LEADERBOARD DEBUG END ===");

    res.json({
      success: true,
      leaderboard: results,
      debug: {
        totalEmissions: totalCount,
        sampleCount: samples.length,
      },
    });
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Error getting leaderboard data",
      error: error.message,
    });
  }
});

export default router;
