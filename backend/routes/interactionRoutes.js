const express = require("express");
const mongoose = require("mongoose");

const Interaction = require("../models/Interaction");
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// RECORD USER INTERACTION
// ==========================================

router.post("/", protect, async (req, res) => {
  try {
    const { productId, type } = req.body;

    const userId = req.user.id;

    const allowedTypes = [
      "view",
      "cart",
      "purchase",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid interaction type",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const interaction = await Interaction.create({
      user: userId,
      product: productId,
      type,
    });

    console.log(
      `Interaction recorded: ${type} → ${product.name}`
    );

    res.status(201).json({
      message: "Interaction recorded successfully",
      interaction,
    });
  } catch (error) {
    console.error("INTERACTION ERROR:", error);

    res.status(500).json({
      message: "Failed to record interaction",
      error: error.message,
    });
  }
});

// ==========================================
// GET USER INTERACTIONS
// ==========================================

router.get(
  "/user/:userId",
  protect,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.user.id.toString() !== userId.toString()) {
        return res.status(403).json({
          message: "You can only access your own interactions",
        });
      }

      const interactions = await Interaction.find({
        user: userId,
      })
        .populate("product")
        .sort({
          createdAt: -1,
        });

      res.json({
        message: "User interactions fetched successfully",
        count: interactions.length,
        interactions,
      });
    } catch (error) {
      console.error("GET INTERACTIONS ERROR:", error);

      res.status(500).json({
        message: "Failed to fetch interactions",
        error: error.message,
      });
    }
  }
);

module.exports = router;