const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Interaction = require("../models/Interaction");
const Order = require("../models/Order");
const Review = require("../models/Review");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// HELPER: GET USER PROFILE
// =====================================================

async function getUserProfile(userId) {
  const interactions = await Interaction.find({
    user: userId,
  })
    .populate("product")
    .sort({ createdAt: -1 });

  const orders = await Order.find({
    user: userId,
  }).populate("items.product");

  const reviews = await Review.find({
    user: userId,
  }).populate("product");

  const viewedProducts = interactions.filter(
    (item) => item.type === "view"
  );

  const cartProducts = interactions.filter(
    (item) => item.type === "cart"
  );

  const purchasedProductIds = [];

  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.product?._id) {
        purchasedProductIds.push(
          item.product._id.toString()
        );
      }
    });
  });

  // ---------------------------------------------
  // CATEGORY PREFERENCES
  // ---------------------------------------------

  const categoryScores = {};

  interactions.forEach((interaction) => {
    if (!interaction.product) return;

    const category =
      interaction.product.category;

    if (!categoryScores[category]) {
      categoryScores[category] = 0;
    }

    if (interaction.type === "view") {
      categoryScores[category] += 1;
    }

    if (interaction.type === "cart") {
      categoryScores[category] += 3;
    }

    if (interaction.type === "purchase") {
      categoryScores[category] += 5;
    }
  });

  // Reviews also influence category preference
  reviews.forEach((review) => {
    if (!review.product) return;

    const category =
      review.product.category;

    if (!categoryScores[category]) {
      categoryScores[category] = 0;
    }

    if (review.rating >= 4) {
      categoryScores[category] += 4;
    }

    if (review.rating <= 2) {
      categoryScores[category] -= 2;
    }
  });

  let favoriteCategory = null;

  const categoryEntries =
    Object.entries(categoryScores);

  if (categoryEntries.length > 0) {
    categoryEntries.sort(
      (a, b) => b[1] - a[1]
    );

    favoriteCategory =
      categoryEntries[0][0];
  }

  // ---------------------------------------------
  // USER PRICE PREFERENCE
  // ---------------------------------------------

  const interactedPrices = [];

  interactions.forEach((interaction) => {
    if (interaction.product?.price) {
      interactedPrices.push(
        interaction.product.price
      );
    }
  });

  const reviewedPrices = [];

  reviews.forEach((review) => {
    if (review.product?.price) {
      reviewedPrices.push(
        review.product.price
      );
    }
  });

  const allPreferencePrices = [
    ...interactedPrices,
    ...reviewedPrices,
  ];

  const averagePrice =
    allPreferencePrices.length > 0
      ? allPreferencePrices.reduce(
          (sum, price) => sum + price,
          0
        ) /
        allPreferencePrices.length
      : null;

  return {
    interactions,
    orders,
    reviews,
    viewedProducts,
    cartProducts,
    purchasedProductIds,
    categoryScores,
    favoriteCategory,
    averagePrice,
  };
}

// =====================================================
// HELPER: RECENCY SCORE
// =====================================================

function getRecencyScore(createdAt) {
  const now = Date.now();

  const activityTime =
    new Date(createdAt).getTime();

  const daysAgo =
    (now - activityTime) /
    (1000 * 60 * 60 * 24);

  if (daysAgo <= 1) return 1.0;
  if (daysAgo <= 3) return 0.85;
  if (daysAgo <= 7) return 0.70;
  if (daysAgo <= 14) return 0.50;
  if (daysAgo <= 30) return 0.30;

  return 0.15;
}

// =====================================================
// HELPER: GET PRODUCT RATING DATA
// =====================================================

async function getRatingMap() {
  const ratingData =
    await Review.aggregate([
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

  const ratingMap = {};

  ratingData.forEach((item) => {
    ratingMap[item._id.toString()] = {
      averageRating:
        Math.round(
          item.averageRating * 10
        ) / 10,

      totalReviews:
        item.totalReviews,
    };
  });

  return ratingMap;
}

// =====================================================
// HELPER: CALCULATE RATING SCORE
// =====================================================

function calculateRatingScore(
  averageRating,
  totalReviews
) {
  if (!averageRating || !totalReviews) {
    return 0;
  }

  let score = 0;

  // ---------------------------------------------
  // STAR RATING
  // ---------------------------------------------

  if (averageRating >= 4.8) {
    score += 40;
  } else if (averageRating >= 4.5) {
    score += 35;
  } else if (averageRating >= 4.0) {
    score += 28;
  } else if (averageRating >= 3.5) {
    score += 18;
  } else if (averageRating >= 3.0) {
    score += 8;
  } else if (averageRating < 2.5) {
    score -= 15;
  }

  // ---------------------------------------------
  // REVIEW COUNT / SOCIAL PROOF
  // ---------------------------------------------

  if (totalReviews >= 20) {
    score += 15;
  } else if (totalReviews >= 10) {
    score += 10;
  } else if (totalReviews >= 5) {
    score += 6;
  } else if (totalReviews >= 2) {
    score += 3;
  }

  return score;
}

// =====================================================
// GET PERSONALIZED RECOMMENDATIONS
// =====================================================

router.get(
  "/for-you",
  async (req, res) => {
    try {
      let userProfile = null;
      let personalized = false;

      // ---------------------------------------------
      // OPTIONAL LOGIN
      // ---------------------------------------------

      const authHeader =
        req.headers.authorization;

      if (
        authHeader &&
        authHeader.startsWith("Bearer ")
      ) {
        try {
          await new Promise(
            (resolve, reject) => {
              protect(
                req,
                res,
                (error) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve();
                  }
                }
              );
            }
          );

          if (req.user?.id) {
            userProfile =
              await getUserProfile(
                req.user.id
              );

            personalized = true;
          }
        } catch (error) {
          // Invalid token = treat as guest
          userProfile = null;
          personalized = false;
        }
      }

      // ---------------------------------------------
      // GET PRODUCTS
      // ---------------------------------------------

      const products =
        await Product.find({
          stock: { $gt: 0 },
        });

      // ---------------------------------------------
      // GET RATINGS
      // ---------------------------------------------

      const ratingMap =
        await getRatingMap();

      // ---------------------------------------------
      // GUEST RECOMMENDATIONS
      // ---------------------------------------------

      if (!userProfile) {
        const guestRecommendations =
          products
            .map((product) => {
              const ratingInfo =
                ratingMap[
                  product._id.toString()
                ];

              const averageRating =
                ratingInfo?.averageRating ||
                0;

              const totalReviews =
                ratingInfo?.totalReviews ||
                0;

              const ratingScore =
                calculateRatingScore(
                  averageRating,
                  totalReviews
                );

              let score =
                ratingScore;

              const reasons = [];

              if (averageRating >= 4.5) {
                reasons.push(
                  "Highly rated by customers"
                );
              }

              if (totalReviews >= 5) {
                reasons.push(
                  "Popular with shoppers"
                );
              }

              if (product.stock > 0) {
                score += 5;
              }

              if (
                reasons.length === 0
              ) {
                reasons.push(
                  "Popular product"
                );
              }

              return {
                product,
                recommendationScore:
                  score,
                recommendationReasons:
                  reasons,
                averageRating,
                totalReviews,
              };
            })
            .sort(
              (a, b) =>
                b.recommendationScore -
                a.recommendationScore
            )
            .slice(0, 6);

        return res.json({
          message:
            "Personalized recommendations fetched successfully",

          personalized: false,

          recommendations:
            guestRecommendations,
        });
      }

      // ---------------------------------------------
      // USER DATA
      // ---------------------------------------------

      const {
        interactions,
        viewedProducts,
        cartProducts,
        purchasedProductIds,
        categoryScores,
        favoriteCategory,
        averagePrice,
      } = userProfile;

      // ---------------------------------------------
      // RECENT INTERACTION MAP
      // ---------------------------------------------

      const recentActivityMap = {};

      interactions.forEach(
        (interaction) => {
          const productId =
            interaction.product?._id?.toString();

          if (!productId) return;

          const recency =
            getRecencyScore(
              interaction.createdAt
            );

          if (
            !recentActivityMap[
              productId
            ]
          ) {
            recentActivityMap[
              productId
            ] = [];
          }

          recentActivityMap[
            productId
          ].push({
            type:
              interaction.type,

            recency,
          });
        }
      );

      // ---------------------------------------------
      // VIEWED PRODUCT IDS
      // ---------------------------------------------

      const viewedIds =
        viewedProducts
          .filter(
            (item) => item.product
          )
          .map(
            (item) =>
              item.product._id.toString()
          );

      // ---------------------------------------------
      // CART PRODUCT IDS
      // ---------------------------------------------

      const cartIds =
        cartProducts
          .filter(
            (item) => item.product
          )
          .map(
            (item) =>
              item.product._id.toString()
          );

      // ---------------------------------------------
      // SCORE PRODUCTS
      // ---------------------------------------------

      const recommendations =
        products
          .filter(
            (product) =>
              !purchasedProductIds.includes(
                product._id.toString()
              )
          )
          .map((product) => {
            const productId =
              product._id.toString();

            let score = 0;

            const reasons = [];

            // ---------------------------------------
            // CATEGORY SCORE
            // ---------------------------------------

            const category =
              product.category;

            const categoryScore =
              categoryScores[category] ||
              0;

            if (categoryScore > 0) {
              const categoryBonus =
                Math.min(
                  categoryScore * 5,
                  30
                );

              score += categoryBonus;

              reasons.push(
                `You seem interested in ${category}`
              );
            }

            // ---------------------------------------
            // FAVORITE CATEGORY
            // ---------------------------------------

            if (
              favoriteCategory &&
              category ===
                favoriteCategory
            ) {
              score += 40;

              reasons.push(
                `Matches your favorite category: ${category}`
              );
            }

            // ---------------------------------------
            // VIEWED SIGNAL
            // ---------------------------------------

            if (
              viewedIds.includes(
                productId
              )
            ) {
              score += 20;

              reasons.push(
                "You viewed this product"
              );
            }

            // ---------------------------------------
            // CART SIGNAL
            // ---------------------------------------

            if (
              cartIds.includes(
                productId
              )
            ) {
              score += 30;

              reasons.push(
                "You added this product to cart"
              );
            }

            // ---------------------------------------
            // RECENT ACTIVITY
            // ---------------------------------------

            const activity =
              recentActivityMap[
                productId
              ];

            if (activity?.length) {
              let recentBonus = 0;

              activity.forEach(
                (item) => {
                  if (
                    item.type ===
                    "view"
                  ) {
                    recentBonus +=
                      20 *
                      item.recency;
                  }

                  if (
                    item.type ===
                    "cart"
                  ) {
                    recentBonus +=
                      30 *
                      item.recency;
                  }

                  if (
                    item.type ===
                    "purchase"
                  ) {
                    recentBonus +=
                      40 *
                      item.recency;
                  }
                }
              );

              score += Math.round(
                recentBonus
              );

              reasons.push(
                "Based on your recent activity"
              );
            }

            // ---------------------------------------
            // PRICE PREFERENCE
            // ---------------------------------------

            if (
              averagePrice !== null
            ) {
              const difference =
                Math.abs(
                  product.price -
                    averagePrice
                );

              const percentageDifference =
                difference /
                averagePrice;

              if (
                percentageDifference <=
                0.10
              ) {
                score += 30;

                reasons.push(
                  "Matches your usual price range"
                );
              } else if (
                percentageDifference <=
                0.25
              ) {
                score += 20;
              } else if (
                percentageDifference <=
                0.50
              ) {
                score += 10;
              }
            }

            // ---------------------------------------
            // RATING SCORE ⭐
            // ---------------------------------------

            const ratingInfo =
              ratingMap[
                productId
              ];

            const averageRating =
              ratingInfo?.averageRating ||
              0;

            const totalReviews =
              ratingInfo?.totalReviews ||
              0;

            const ratingScore =
              calculateRatingScore(
                averageRating,
                totalReviews
              );

            score += ratingScore;

            // ---------------------------------------
            // RATING REASONS
            // ---------------------------------------

            if (
              averageRating >= 4.5
            ) {
              reasons.push(
                `Highly rated ⭐ ${averageRating}/5`
              );
            } else if (
              averageRating >= 4
            ) {
              reasons.push(
                `Good customer rating ⭐ ${averageRating}/5`
              );
            }

            if (
              totalReviews >= 5
            ) {
              reasons.push(
                `${totalReviews} customer reviews`
              );
            }

            // ---------------------------------------
            // STOCK BONUS
            // ---------------------------------------

            if (product.stock > 0) {
              score += 5;
            }

            // ---------------------------------------
            // DEFAULT REASON
            // ---------------------------------------

            if (
              reasons.length === 0
            ) {
              reasons.push(
                "Recommended for you"
              );
            }

            return {
              product,

              recommendationScore:
                Math.round(score),

              recommendationReasons:
                [
                  ...new Set(
                    reasons
                  ),
                ].slice(0, 4),

              averageRating,

              totalReviews,
            };
          })
          .sort(
            (a, b) =>
              b.recommendationScore -
              a.recommendationScore
          )
          .slice(0, 6);

      // ---------------------------------------------
      // RESPONSE
      // ---------------------------------------------

      res.json({
        message:
          "Personalized recommendations fetched successfully",

        personalized,

        basedOn: {
          favoriteCategory:
            favoriteCategory,

          averagePrice:
            averagePrice
              ? Math.round(
                  averagePrice
                )
              : null,

          viewedProducts:
            viewedIds.length,

          cartProducts:
            cartIds.length,

          purchasedProducts:
            purchasedProductIds.length,
        },

        recommendations,
      });
    } catch (error) {
      console.error(
        "FOR YOU RECOMMENDATION ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to generate personalized recommendations",

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// PRODUCT-SPECIFIC RECOMMENDATIONS
// =====================================================

router.get(
  "/:productId",
  async (req, res) => {
    try {
      const {
        productId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid product ID",
        });
      }

      const product =
        await Product.findById(
          productId
        );

      if (!product) {
        return res.status(404).json({
          message:
            "Product not found",
        });
      }

      const relatedProducts =
        await Product.find({
          _id: {
            $ne: productId,
          },

          category:
            product.category,

          stock: {
            $gt: 0,
          },
        }).limit(6);

      const ratingMap =
        await getRatingMap();

      const recommendations =
        relatedProducts.map(
          (item) => {
            const ratingInfo =
              ratingMap[
                item._id.toString()
              ];

            const averageRating =
              ratingInfo?.averageRating ||
              0;

            const totalReviews =
              ratingInfo?.totalReviews ||
              0;

            const ratingScore =
              calculateRatingScore(
                averageRating,
                totalReviews
              );

            return {
              ...item.toObject(),

              recommendationScore:
                50 +
                ratingScore,

              recommendationReasons:
                [
                  `Same category: ${item.category}`,

                  ...(averageRating >=
                  4
                    ? [
                        `Rated ⭐ ${averageRating}/5`,
                      ]
                    : []),
                ],

              averageRating,

              totalReviews,
            };
          }
        );

      res.json({
        message:
          "Recommendations fetched successfully",

        basedOn: {
          id: product._id,
          name: product.name,
          category:
            product.category,
        },

        recommendations,
      });
    } catch (error) {
      console.error(
        "PRODUCT RECOMMENDATION ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch recommendations",

        error:
          error.message,
      });
    }
  }
);

module.exports = router;
