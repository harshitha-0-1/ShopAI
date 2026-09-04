const express = require("express");
const mongoose = require("mongoose");

const Review = require("../models/Review");
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

/*
========================================================
GET REVIEWS FOR A PRODUCT
GET /api/reviews/product/:productId
========================================================
*/

router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

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

    const reviews = await Review.find({
      product: productId,
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;

    const averageRating =
      totalReviews === 0
        ? 0
        : reviews.reduce(
            (sum, review) => sum + review.rating,
            0
          ) / totalReviews;

    res.json({
      message: "Product reviews fetched successfully",
      productId,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      reviews,
    });
  } catch (error) {
    console.error("GET REVIEWS ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
});

/*
========================================================
ADD REVIEW
POST /api/reviews
========================================================
*/

router.post("/", protect, async (req, res) => {
  try {
    const {
      productId,
      rating,
      comment,
    } = req.body;

    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const numericRating = Number(rating);

    if (
      !numericRating ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        message: "Review comment is required",
      });
    }

    if (comment.trim().length > 500) {
      return res.status(400).json({
        message: "Review cannot exceed 500 characters",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this product",
      });
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      rating: numericRating,
      comment: comment.trim(),
    });

    const populatedReview = await Review.findById(
      review._id
    ).populate("user", "name");

    res.status(201).json({
      message: "Review added successfully",
      review: populatedReview,
    });
  } catch (error) {
    console.error("ADD REVIEW ERROR:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "You have already reviewed this product",
      });
    }

    res.status(500).json({
      message: "Failed to add review",
      error: error.message,
    });
  }
});

/*
========================================================
DELETE OWN REVIEW
DELETE /api/reviews/:id
========================================================
*/

router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid review ID",
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    if (
      review.user.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).json({
        message: "You can only delete your own review",
      });
    }

    await Review.findByIdAndDelete(id);

    res.json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("DELETE REVIEW ERROR:", error);

    res.status(500).json({
      message: "Failed to delete review",
      error: error.message,
    });
  }
});

module.exports = router;