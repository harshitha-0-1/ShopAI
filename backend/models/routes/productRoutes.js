
const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// ==========================================
// GET ALL PRODUCTS
// GET /api/products
// ==========================================

router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});

// ==========================================
// GET SINGLE PRODUCT
// GET /api/products/:id
// ==========================================

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    console.error("Get Product Error:", error);

    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
});

// ==========================================
// SEARCH PRODUCTS
// GET /api/products/search/:keyword
// ==========================================

router.get("/search/:keyword", async (req, res) => {
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

    res.status(200).json({
      message: "Search completed successfully",
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Search Products Error:", error);

    res.status(500).json({
      message: "Product search failed",
      error: error.message,
    });
  }
});

// ==========================================
// ADD PRODUCT
// POST /api/products
// ==========================================

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

    // Validate required fields
    if (
      !name ||
      !description ||
      price === undefined ||
      !category
    ) {
      return res.status(400).json({
        message:
          "Please provide name, description, price and category",
      });
    }

    // Create product
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
    console.error("Create Product Error:", error);

    res.status(500).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE PRODUCT
// PUT /api/products/:id
// ==========================================

router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
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

    res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);

    res.status(500).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE PRODUCT
// DELETE /api/products/:id
// ==========================================

router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    console.error("Delete Product Error:", error);

    res.status(500).json({
      message: "Failed to delete product",
      error: error.message,
    });
  }
});


