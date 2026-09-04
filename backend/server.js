const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes =
  require("./routes/authRoutes");

const productRoutes =
  require("./routes/productRoutes");

const orderRoutes =
  require("./routes/orderRoutes");

const recommendationRoutes =
  require("./routes/recommendationRoutes");

const interactionRoutes =
  require("./routes/interactionRoutes");

const reviewRoutes =
  require("./routes/reviewRoutes");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// =========================
// ROUTES
// =========================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/recommendations",
  recommendationRoutes
);

app.use(
  "/api/interactions",
  interactionRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

// =========================
// TEST ROUTE
// =========================

app.get(
  "/test-recommendation",
  (req, res) => {
    res.json({
      message:
        "ShopAI recommendation system is working 🤖",
    });
  }
);

// =========================
// HOME ROUTE
// =========================

app.get("/", (req, res) => {
  res.send(
    "ShopAI Backend is running 🚀"
  );
});

// =========================
// DATABASE CONNECTION
// =========================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(
      "MongoDB Connected Successfully"
    );

    const PORT =
      process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "MongoDB Connection Failed"
    );

    console.error(
      error.message
    );
  });