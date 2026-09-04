const express = require("express");
const router = express.Router();

const Product = require("../models/Product");
const Review = require("../models/Review");

// ===============================
// GET ALL PRODUCTS
// ===============================
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    // Get rating information for all products
    const ratings = await Review.aggregate([
      {
        $group: {
          _id: "$product",
          averageRating: {
            $avg: "$rating",
          },
          totalReviews: {
            $sum: 1,
          },
        },
      },
    ]);

    // Create a quick rating lookup
    const ratingMap = {};

    ratings.forEach((rating) => {
      ratingMap[rating._id.toString()] = {
        averageRating: Number(
          rating.averageRating.toFixed(1)
        ),
        totalReviews: rating.totalReviews,
      };
    });

    // Add rating information to every product
    const productsWithRatings = products.map(
      (product) => {
        const rating =
          ratingMap[product._id.toString()] || {
            averageRating: 0,
            totalReviews: 0,
          };

        return {
          ...product.toObject(),
          averageRating: rating.averageRating,
          totalReviews: rating.totalReviews,
        };
      }
    );

    res.json(productsWithRatings);
  } catch (error) {
    console.error(
      "GET PRODUCTS ERROR:",
      error.message
    );

    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});


// ===============================
// SEARCH PRODUCTS
// ===============================
router.get(
  "/search/:keyword",
  async (req, res) => {
    try {
      const keyword = req.params.keyword;

      const products = await Product.find({
        $or: [
          {
            name: {
              $regex: keyword,
              $options: "i",
            },
          },
          {
            category: {
              $regex: keyword,
              $options: "i",
            },
          },
          {
            description: {
              $regex: keyword,
              $options: "i",
            },
          },
        ],
      });

      res.json(products);
    } catch (error) {
      console.error(
        "SEARCH PRODUCTS ERROR:",
        error.message
      );

      res.status(500).json({
        message: "Failed to search products",
      });
    }
  }
);


// ===============================
// GET SINGLE PRODUCT
// ===============================
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Get rating summary
    const ratingData = await Review.aggregate([
      {
        $match: {
          product: product._id,
        },
      },
      {
        $group: {
          _id: "$product",
          averageRating: {
            $avg: "$rating",
          },
          totalReviews: {
            $sum: 1,
          },
        },
      },
    ]);

    const rating =
      ratingData.length > 0
        ? {
            averageRating: Number(
              ratingData[0].averageRating.toFixed(1)
            ),
            totalReviews:
              ratingData[0].totalReviews,
          }
        : {
            averageRating: 0,
            totalReviews: 0,
          };

    res.json({
      ...product.toObject(),
      averageRating: rating.averageRating,
      totalReviews: rating.totalReviews,
    });
  } catch (error) {
    console.error(
      "GET PRODUCT ERROR:",
      error.message
    );

    res.status(500).json({
      message: "Failed to fetch product",
    });
  }
});


// ===============================
// ADD PRODUCT
// ===============================
router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      image,
      stock,
    } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      category,
      image,
      stock,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error(
      "CREATE PRODUCT ERROR:",
      error.message
    );

    res.status(500).json({
      message: "Failed to create product",
    });
  }
});


// ===============================
// UPDATE PRODUCT
// ===============================
router.put("/:id", async (req, res) => {
  try {
    const product =
      await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error(
      "UPDATE PRODUCT ERROR:",
      error.message
    );

    res.status(500).json({
      message: "Failed to update product",
    });
  }
});


// ===============================
// DELETE PRODUCT
// ===============================
router.delete("/:id", async (req, res) => {
  try {
    const product =
      await Product.findByIdAndDelete(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Delete reviews associated with product
    await Review.deleteMany({
      product: req.params.id,
    });

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE PRODUCT ERROR:",
      error.message
    );

    res.status(500).json({
      message: "Failed to delete product",
    });
  }
});


module.exports = router;