const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// CREATE ORDER
// =====================================================

router.post("/", protect, async (req, res) => {
  try {
    const {
      items,
      totalAmount,
      shippingAddress,
      paymentMethod,
    } = req.body;

    // User comes from JWT
    const user = req.user.id;

    if (!user) {
      return res.status(401).json({
        message: "User authentication failed",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(user)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (!items || !items.length) {
      return res.status(400).json({
        message: "Cart items are required",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        message: "Shipping address is required",
      });
    }

    if (!totalAmount || Number(totalAmount) <= 0) {
      return res.status(400).json({
        message: "Invalid order amount",
      });
    }

    const order = await Order.create({
      user: new mongoose.Types.ObjectId(user),
      items,
      totalAmount: Number(totalAmount),
      shippingAddress,
      paymentMethod: paymentMethod || "COD",
    });

    res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    res.status(500).json({
      message: "Failed to place order",
      error: error.message,
    });
  }
});

// =====================================================
// GET USER ORDERS
// =====================================================

router.get("/user/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (req.user.id.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only access your own orders",
      });
    }

    const orders = await Order.find({
      user: userId,
    })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.json({
      message: "Orders fetched successfully",
      orders,
    });
  } catch (error) {
    console.error("GET ORDERS ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// =====================================================
// GET SINGLE ORDER
// =====================================================

router.get("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(req.params.id)
      .populate("items.product")
      .populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      order.user._id.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).json({
        message: "You are not allowed to view this order",
      });
    }

    res.json({
      message: "Order fetched successfully",
      order,
    });
  } catch (error) {
    console.error("GET ORDER ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch order",
      error: error.message,
    });
  }
});

module.exports = router;