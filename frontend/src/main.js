import "./style.css";

const API_URL = "http://localhost:5000/api";

let allProducts = [];
let filteredProducts = [];

let cart = JSON.parse(localStorage.getItem("cart")) || [];
let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];

let currentUser = JSON.parse(localStorage.getItem("user")) || null;
let token = localStorage.getItem("token") || null;


/* =====================================================
   DEFAULT PRODUCT IMAGES
===================================================== */

const DEFAULT_IMAGES = {
  Electronics:
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80",

  Fashion:
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80",

  Home:
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",

  default:
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
};


/* =====================================================
   HELPER FUNCTIONS
===================================================== */

function getProductImage(product) {
  if (
    product &&
    typeof product.image === "string" &&
    product.image.trim() !== ""
  ) {
    return product.image;
  }

  return (
    DEFAULT_IMAGES[product?.category] ||
    DEFAULT_IMAGES.default
  );
}


function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  updateCartCount();
  loadProducts();
});


/* =====================================================
   NAVBAR
===================================================== */

function renderNavbar() {
  const navbar = document.getElementById("navbar");

  if (!navbar) {
    return;
  }

  navbar.innerHTML = `
    <div class="navbar">

      <div
        class="logo"
        onclick="renderHomePage()"
      >
        🛍️ ShopAI
      </div>

      <div class="nav-links">

        <button onclick="renderHomePage()">
          🏠 Home
        </button>

        <button onclick="renderCart()">
          🛒 Cart
          (<span id="cart-count">0</span>)
        </button>

        <button onclick="renderWishlist()">
          ❤️ Wishlist
        </button>

        ${
          currentUser
            ? `
              <button onclick="renderOrders()">
                📦 Orders
              </button>

              <button onclick="logout()">
                🚪 Logout
              </button>
            `
            : `
              <button onclick="showLogin()">
                🔐 Login
              </button>

              <button onclick="showRegister()">
                📝 Register
              </button>
            `
        }

      </div>
    </div>
  `;

  updateCartCount();
}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {
  const oldToast = document.querySelector(".toast");

  if (oldToast) {
    oldToast.remove();
  }

  const toast = document.createElement("div");

  toast.className = "toast";
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 2500);
}


/* =====================================================
   CART STORAGE
===================================================== */

function updateCartCount() {
  const countElement =
    document.getElementById("cart-count");

  if (!countElement) {
    return;
  }

  const count = cart.reduce(
    (total, item) =>
      total + safeNumber(item.quantity, 1),
    0
  );

  countElement.textContent = count;
}


function saveCart() {
  localStorage.setItem(
    "cart",
    JSON.stringify(cart)
  );

  updateCartCount();
}


function saveWishlist() {
  localStorage.setItem(
    "wishlist",
    JSON.stringify(wishlist)
  );
}


/* =====================================================
   LOAD PRODUCTS
===================================================== */

async function loadProducts() {
  try {
    const response = await fetch(
      `${API_URL}/products`
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      allProducts = data;
    } else if (Array.isArray(data.products)) {
      allProducts = data.products;
    } else if (Array.isArray(data.data)) {
      allProducts = data.data;
    } else {
      allProducts = [];
    }

    filteredProducts = [...allProducts];

    /*
      Repair old cart data automatically.
      This prevents old cart objects from breaking checkout.
    */
    cart = cart
      .map((item) => {
        const productId =
          item.productId ||
          item.product ||
          item._id;

        const product = allProducts.find(
          (p) =>
            String(p._id) ===
            String(productId)
        );

        if (!product) {
          return null;
        }

        return {
          productId: product._id,
          name: product.name,
          price: safeNumber(product.price),
          image: product.image || "",
          quantity: Math.max(
            1,
            safeNumber(item.quantity, 1)
          ),
        };
      })
      .filter(Boolean);

    saveCart();

    renderHomePage();

  } catch (error) {
    console.error(
      "LOAD PRODUCTS ERROR:",
      error
    );

    const app =
      document.getElementById("app");

    if (app) {
      app.innerHTML = `
        <div class="container">
          <div class="error-message">

            <h2>
              ❌ Unable to load products
            </h2>

            <p>
              Please make sure the ShopAI backend
              is running on port 5000.
            </p>

            <button onclick="loadProducts()">
              🔄 Try Again
            </button>

          </div>
        </div>
      `;
    }
  }
}


/* =====================================================
   HOME PAGE
===================================================== */

function renderHomePage() {
  const app =
    document.getElementById("app");

  if (!app) {
    return;
  }

  app.innerHTML = `
    <div class="home-page">

      <section class="hero-section">

        <div class="hero-content">

          <h1>
            Welcome to ShopAI 🛍️
          </h1>

          <p>
            Smart shopping with AI-powered
            recommendations.
          </p>

          ${
            currentUser
              ? `
                <p class="welcome-user">
                  Welcome back,
                  <strong>
                    ${escapeHTML(
                      currentUser.name ||
                      "Shopper"
                    )}
                  </strong> 👋
                </p>
              `
              : ""
          }

        </div>

      </section>


      <!-- SEARCH + FILTERS -->

      <section class="search-filter-section">

        <div class="search-box">

          <input
            type="text"
            id="search-input"
            placeholder="🔍 Search products..."
          />

        </div>


        <div class="filters-row">

          <select id="category-filter">

            <option value="all">
              All Categories
            </option>

            <option value="Electronics">
              Electronics
            </option>

            <option value="Fashion">
              Fashion
            </option>

            <option value="Home">
              Home
            </option>

          </select>


          <select id="sort-filter">

            <option value="default">
              Sort By
            </option>

            <option value="price-low">
              Price: Low → High
            </option>

            <option value="price-high">
              Price: High → Low
            </option>

            <option value="rating">
              Highest Rated
            </option>

            <option value="name">
              Name: A → Z
            </option>

          </select>


          <select id="stock-filter">

            <option value="all">
              All Products
            </option>

            <option value="in-stock">
              In Stock Only
            </option>

          </select>


          <button
            id="clear-filters"
            onclick="clearFilters()"
          >
            ✖ Clear
          </button>

        </div>

        <p id="filter-result-count"></p>

      </section>


      <!-- RECOMMENDATIONS -->

      <section class="recommendation-section">

        <div class="section-heading">

          <h2>
            🤖 Recommended For You
          </h2>

          <p>
            ${
              currentUser
                ? "Based on your activity"
                : "Popular products you may like"
            }
          </p>

        </div>

        <div
          id="recommendations"
          class="products-grid"
        >
          <p>
            Loading recommendations...
          </p>
        </div>

      </section>


      <!-- ALL PRODUCTS -->

      <section class="products-section">

        <div class="section-heading">

          <h2>
            🛍️ All Products
          </h2>

        </div>

        <div
          id="products-container"
          class="products-grid"
        ></div>

      </section>

    </div>
  `;

  setupFilterEvents();
  applyProductFilters();
  loadForYouRecommendations();
}


/* =====================================================
   FILTER EVENTS
===================================================== */

function setupFilterEvents() {
  const searchInput =
    document.getElementById(
      "search-input"
    );

  const categoryFilter =
    document.getElementById(
      "category-filter"
    );

  const sortFilter =
    document.getElementById(
      "sort-filter"
    );

  const stockFilter =
    document.getElementById(
      "stock-filter"
    );

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      applyProductFilters
    );
  }

  if (categoryFilter) {
    categoryFilter.addEventListener(
      "change",
      applyProductFilters
    );
  }

  if (sortFilter) {
    sortFilter.addEventListener(
      "change",
      applyProductFilters
    );
  }

  if (stockFilter) {
    stockFilter.addEventListener(
      "change",
      applyProductFilters
    );
  }
}


/* =====================================================
   APPLY FILTERS
===================================================== */

function applyProductFilters() {
  const searchInput =
    document.getElementById(
      "search-input"
    );

  const categoryFilter =
    document.getElementById(
      "category-filter"
    );

  const sortFilter =
    document.getElementById(
      "sort-filter"
    );

  const stockFilter =
    document.getElementById(
      "stock-filter"
    );

  const searchTerm =
    searchInput?.value
      ?.trim()
      .toLowerCase() || "";

  const category =
    categoryFilter?.value || "all";

  const sort =
    sortFilter?.value || "default";

  const stock =
    stockFilter?.value || "all";

  filteredProducts =
    allProducts.filter((product) => {

      const name =
        String(product.name || "")
          .toLowerCase();

      const description =
        String(product.description || "")
          .toLowerCase();

      const productCategory =
        String(product.category || "")
          .toLowerCase();

      const matchesSearch =
        !searchTerm ||
        name.includes(searchTerm) ||
        description.includes(searchTerm) ||
        productCategory.includes(searchTerm);

      const matchesCategory =
        category === "all" ||
        product.category === category;

      const matchesStock =
        stock === "all" ||
        safeNumber(product.stock) > 0;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock
      );
    });


  if (sort === "price-low") {

    filteredProducts.sort(
      (a, b) =>
        safeNumber(a.price) -
        safeNumber(b.price)
    );

  } else if (sort === "price-high") {

    filteredProducts.sort(
      (a, b) =>
        safeNumber(b.price) -
        safeNumber(a.price)
    );

  } else if (sort === "rating") {

    filteredProducts.sort(
      (a, b) =>
        safeNumber(b.averageRating) -
        safeNumber(a.averageRating)
    );

  } else if (sort === "name") {

    filteredProducts.sort(
      (a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || "")
        )
    );
  }

  updateFilterResultCount();
  renderProducts();
}


/* =====================================================
   FILTER COUNT
===================================================== */

function updateFilterResultCount() {
  const element =
    document.getElementById(
      "filter-result-count"
    );

  if (!element) {
    return;
  }

  element.textContent =
    `${filteredProducts.length} product${
      filteredProducts.length === 1
        ? ""
        : "s"
    } found`;
}


/* =====================================================
   CLEAR FILTERS
===================================================== */

function clearFilters() {
  const searchInput =
    document.getElementById(
      "search-input"
    );

  const categoryFilter =
    document.getElementById(
      "category-filter"
    );

  const sortFilter =
    document.getElementById(
      "sort-filter"
    );

  const stockFilter =
    document.getElementById(
      "stock-filter"
    );

  if (searchInput) {
    searchInput.value = "";
  }

  if (categoryFilter) {
    categoryFilter.value = "all";
  }

  if (sortFilter) {
    sortFilter.value = "default";
  }

  if (stockFilter) {
    stockFilter.value = "all";
  }

  applyProductFilters();

  showToast("Filters cleared");
}


function filterByCategory(category) {
  const categoryFilter =
    document.getElementById(
      "category-filter"
    );

  if (categoryFilter) {
    categoryFilter.value = category;
    applyProductFilters();
  }
}


function searchProducts() {
  applyProductFilters();
}


/* =====================================================
   PRODUCT RATING
===================================================== */

function renderProductRating(product) {
  const rating =
    safeNumber(
      product.averageRating,
      0
    );

  const totalReviews =
    safeNumber(
      product.totalReviews,
      0
    );

  if (totalReviews === 0) {
    return `
      <div class="product-rating">

        <span class="stars">
          ☆☆☆☆☆
        </span>

        <span class="review-count">
          No reviews
        </span>

      </div>
    `;
  }

  const roundedRating =
    Math.round(rating);

  let stars = "";

  for (let i = 1; i <= 5; i++) {
    stars +=
      i <= roundedRating
        ? "★"
        : "☆";
  }

  return `
    <div class="product-rating">

      <span class="stars">
        ${stars}
      </span>

      <span class="rating-number">
        ${rating.toFixed(1)}
      </span>

      <span class="review-count">
        (${totalReviews})
      </span>

    </div>
  `;
}


/* =====================================================
   RENDER PRODUCTS
===================================================== */

function renderProducts() {
  const container =
    document.getElementById(
      "products-container"
    );

  if (!container) {
    return;
  }

  if (!filteredProducts.length) {
    container.innerHTML = `
      <div class="empty-state">

        <h3>
          😕 No products found
        </h3>

        <p>
          Try changing your search or filters.
        </p>

        <button onclick="clearFilters()">
          Clear Filters
        </button>

      </div>
    `;

    return;
  }

  container.innerHTML =
    filteredProducts
      .map((product) => {

        const price =
          safeNumber(product.price);

        const stock =
          safeNumber(product.stock);

        const isWishlisted =
          wishlist.some(
            (item) =>
              String(item._id) ===
              String(product._id)
          );

        return `
          <div
            class="product-card"
            onclick="renderProductDetails('${product._id}')"
          >

            <div class="product-image-container">

              <img
                src="${getProductImage(product)}"
                alt="${escapeHTML(product.name)}"
                class="product-image"
                onerror="this.src='${DEFAULT_IMAGES.default}'"
              />

            </div>


            <div class="product-info">

              <h3>
                ${escapeHTML(product.name)}
              </h3>

              <p class="product-category">
                ${escapeHTML(product.category)}
              </p>

              ${renderProductRating(product)}

              <p class="product-price">
                ₹${price.toLocaleString("en-IN")}
              </p>

              <p class="product-stock ${
                stock > 0
                  ? "in-stock"
                  : "out-of-stock"
              }">

                ${
                  stock > 0
                    ? `✅ ${stock} in stock`
                    : "❌ Out of stock"
                }

              </p>


              <div class="product-actions">

                <button
                  onclick="event.stopPropagation(); addToCart('${product._id}')"
                  ${stock <= 0 ? "disabled" : ""}
                >
                  🛒 Add to Cart
                </button>


                <button
                  class="wishlist-button ${
                    isWishlisted
                      ? "active"
                      : ""
                  }"
                  onclick="event.stopPropagation(); toggleWishlist('${product._id}')"
                >
                  ${
                    isWishlisted
                      ? "❤️"
                      : "🤍"
                  }
                </button>

              </div>

            </div>

          </div>
        `;
      })
      .join("");
}


/* =====================================================
   RECOMMENDATIONS
===================================================== */

async function loadForYouRecommendations() {
  const container =
    document.getElementById(
      "recommendations"
    );

  if (!container) {
    return;
  }

  try {
    const headers = {};

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    const response =
      await fetch(
        `${API_URL}/recommendations/for-you`,
        {
          method: "GET",
          headers,
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    const recommendations =
      Array.isArray(
        data.recommendations
      )
        ? data.recommendations
        : [];

    if (!recommendations.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>
            No recommendations available yet.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      recommendations
        .map((item) => {

          const product =
            item?.product || item;

          const price =
            safeNumber(product.price);

          const stock =
            safeNumber(product.stock);

          const rating =
            safeNumber(
              item.averageRating ??
              product.averageRating,
              0
            );

          const totalReviews =
            safeNumber(
              item.totalReviews ??
              product.totalReviews,
              0
            );

          const reasons =
            Array.isArray(
              item.recommendationReasons
            )
              ? item.recommendationReasons
              : [];

          return `
            <div
              class="product-card recommendation-card"
              onclick="renderProductDetails('${product._id}')"
            >

              <div class="product-image-container">

                <img
                  src="${getProductImage(product)}"
                  alt="${escapeHTML(product.name)}"
                  class="recommendation-image"
                  onerror="this.src='${DEFAULT_IMAGES.default}'"
                />

              </div>

              <div class="product-info">

                <h3>
                  ${escapeHTML(product.name)}
                </h3>

                <p class="product-category">
                  ${escapeHTML(product.category)}
                </p>

                ${
                  totalReviews > 0
                    ? `
                      <div class="product-rating">

                        <span class="stars">
                          ⭐
                        </span>

                        <span>
                          ${rating.toFixed(1)}
                        </span>

                        <span>
                          (${totalReviews})
                        </span>

                      </div>
                    `
                    : `
                      <div class="product-rating">
                        ☆☆☆☆☆
                        <span>
                          No reviews
                        </span>
                      </div>
                    `
                }

                <p class="product-price">
                  ₹${price.toLocaleString("en-IN")}
                </p>

                <p class="product-stock ${
                  stock > 0
                    ? "in-stock"
                    : "out-of-stock"
                }">

                  ${
                    stock > 0
                      ? "✅ In Stock"
                      : "❌ Out of Stock"
                  }

                </p>

                ${
                  reasons.length
                    ? `
                      <div class="recommendation-reasons">

                        ${reasons
                          .slice(0, 2)
                          .map(
                            (reason) =>
                              `<small>💡 ${escapeHTML(reason)}</small>`
                          )
                          .join("")}

                      </div>
                    `
                    : ""
                }

                <div class="product-actions">

                  <button
                    onclick="event.stopPropagation(); addToCart('${product._id}')"
                    ${stock <= 0 ? "disabled" : ""}
                  >
                    🛒 Add to Cart
                  </button>

                </div>

              </div>

            </div>
          `;
        })
        .join("");

  } catch (error) {

    console.error(
      "RECOMMENDATION ERROR:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">

        <p>
          Recommendations are currently unavailable.
        </p>

      </div>
    `;
  }
}


/* =====================================================
   PRODUCT DETAILS
===================================================== */

async function renderProductDetails(productId) {
  const product =
    findProduct(productId);

  if (!product) {
    showToast("Product not found");
    return;
  }

  const app =
    document.getElementById("app");

  if (!app) {
    return;
  }

  const price =
    safeNumber(product.price);

  const stock =
    safeNumber(product.stock);

  app.innerHTML = `
    <div class="container">

      <button
        class="back-button"
        onclick="renderHomePage()"
      >
        ← Back to Products
      </button>

      <div class="product-details">

        <div class="product-details-image">

          <img
            src="${getProductImage(product)}"
            alt="${escapeHTML(product.name)}"
            onerror="this.src='${DEFAULT_IMAGES.default}'"
          />

        </div>


        <div class="product-details-info">

          <p class="product-category">
            ${escapeHTML(product.category)}
          </p>

          <h1>
            ${escapeHTML(product.name)}
          </h1>

          ${renderProductRating(product)}

          <h2 class="product-details-price">
            ₹${price.toLocaleString("en-IN")}
          </h2>

          <p class="product-description">
            ${escapeHTML(product.description)}
          </p>

          <p class="${
            stock > 0
              ? "in-stock"
              : "out-of-stock"
          }">

            ${
              stock > 0
                ? `✅ ${stock} items available`
                : "❌ Currently out of stock"
            }

          </p>


          <div class="product-detail-actions">

            <button
              onclick="addToCart('${product._id}')"
              ${stock <= 0 ? "disabled" : ""}
            >
              🛒 Add to Cart
            </button>

            <button
              onclick="toggleWishlist('${product._id}')"
            >
              ❤️ Wishlist
            </button>

          </div>

        </div>

      </div>


      <!-- REVIEWS -->

      <section class="reviews-section">

        <h2>
          ⭐ Customer Reviews
        </h2>

        <div id="reviews-container">
          Loading reviews...
        </div>

        ${
          currentUser
            ? `
              <div class="review-form">

                <h3>
                  Write a Review
                </h3>

                <div
                  class="star-input"
                  id="star-input"
                >

                  ${[1, 2, 3, 4, 5]
                    .map(
                      (star) => `
                        <button
                          type="button"
                          class="review-star"
                          data-rating="${star}"
                          onclick="selectReviewRating(${star})"
                        >
                          ☆
                        </button>
                      `
                    )
                    .join("")}

                </div>

                <textarea
                  id="review-comment"
                  placeholder="Write your review..."
                  maxlength="500"
                ></textarea>

                <button
                  onclick="submitReview('${product._id}')"
                >
                  ✍️ Submit Review
                </button>

              </div>
            `
            : `
              <div class="login-review-message">

                <p>
                  Please login to write a review.
                </p>

                <button onclick="showLogin()">
                  Login
                </button>

              </div>
            `
        }

      </section>

    </div>
  `;

  window.selectedReviewRating = 0;

  loadProductReviews(productId);
}


function findProduct(productId) {
  return allProducts.find(
    (product) =>
      String(product._id) ===
      String(productId)
  );
}


/* =====================================================
   REVIEWS
===================================================== */

function selectReviewRating(rating) {
  window.selectedReviewRating = rating;

  const stars =
    document.querySelectorAll(
      ".review-star"
    );

  stars.forEach((star) => {

    const value =
      Number(
        star.dataset.rating
      );

    star.textContent =
      value <= rating
        ? "★"
        : "☆";

    star.classList.toggle(
      "selected",
      value <= rating
    );
  });
}


async function loadProductReviews(productId) {
  const container =
    document.getElementById(
      "reviews-container"
    );

  if (!container) {
    return;
  }

  try {

    const response =
      await fetch(
        `${API_URL}/reviews/product/${productId}`
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    const reviews =
      Array.isArray(data.reviews)
        ? data.reviews
        : [];

    if (!reviews.length) {

      container.innerHTML = `
        <div class="empty-state">

          <p>
            No reviews yet.
            Be the first to review!
          </p>

        </div>
      `;

      return;
    }

    container.innerHTML =
      reviews
        .map((review) => {

          const rating =
            safeNumber(review.rating);

          let stars = "";

          for (let i = 1; i <= 5; i++) {
            stars +=
              i <= rating
                ? "★"
                : "☆";
          }

          const reviewUser =
            review.user?.name ||
            review.user?.email ||
            "Customer";

          const reviewUserId =
            review.user?._id ||
            review.user?.id ||
            review.user;

          const currentUserId =
            currentUser?._id ||
            currentUser?.id;

          const isOwner =
            currentUser &&
            reviewUserId &&
            String(reviewUserId) ===
            String(currentUserId);

          return `
            <div class="review-card">

              <div class="review-header">

                <strong>
                  ${escapeHTML(reviewUser)}
                </strong>

                <span class="review-stars">
                  ${stars}
                </span>

              </div>

              <p>
                ${escapeHTML(review.comment)}
              </p>

              ${
                isOwner
                  ? `
                    <button
                      class="delete-review"
                      onclick="deleteReview('${review._id}', '${productId}')"
                    >
                      🗑️ Delete
                    </button>
                  `
                  : ""
              }

            </div>
          `;
        })
        .join("");

  } catch (error) {

    console.error(
      "LOAD REVIEWS ERROR:",
      error
    );

    container.innerHTML = `
      <p>
        Unable to load reviews.
      </p>
    `;
  }
}


async function submitReview(productId) {

  if (!currentUser || !token) {

    showToast(
      "Please login first"
    );

    showLogin();

    return;
  }

  const rating =
    safeNumber(
      window.selectedReviewRating
    );

  const commentElement =
    document.getElementById(
      "review-comment"
    );

  const comment =
    commentElement?.value
      ?.trim() || "";

  if (rating < 1 || rating > 5) {

    showToast(
      "Please select a rating"
    );

    return;
  }

  if (!comment) {

    showToast(
      "Please write a review"
    );

    return;
  }

  try {

    const response =
      await fetch(
        `${API_URL}/reviews`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            product: productId,
            rating,
            comment,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.message ||
        "Failed to submit review"
      );
    }

    showToast(
      "Review submitted successfully ⭐"
    );

    window.selectedReviewRating = 0;

    await loadProducts();

    renderProductDetails(productId);

  } catch (error) {

    console.error(
      "SUBMIT REVIEW ERROR:",
      error
    );

    showToast(
      error.message ||
      "Unable to submit review"
    );
  }
}


async function deleteReview(
  reviewId,
  productId
) {

  if (!token) {
    return;
  }

  const confirmed =
    confirm(
      "Are you sure you want to delete this review?"
    );

  if (!confirmed) {
    return;
  }

  try {

    const response =
      await fetch(
        `${API_URL}/reviews/${reviewId}`,
        {
          method: "DELETE",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.message ||
        "Failed to delete review"
      );
    }

    showToast(
      "Review deleted"
    );

    await loadProducts();

    renderProductDetails(productId);

  } catch (error) {

    console.error(
      "DELETE REVIEW ERROR:",
      error
    );

    showToast(
      error.message ||
      "Unable to delete review"
    );
  }
}


/* =====================================================
   ADD TO CART
===================================================== */

function addToCart(productId) {

  const product =
    findProduct(productId);

  if (!product) {

    showToast(
      "Product not found."
    );

    return;
  }

  const stock =
    safeNumber(product.stock);

  if (stock <= 0) {

    showToast(
      "Product is out of stock."
    );

    return;
  }

  const existing =
    cart.find(
      (item) =>
        String(
          item.productId ||
          item.product ||
          item._id
        ) ===
        String(productId)
    );

  if (existing) {

    const currentQuantity =
      safeNumber(
        existing.quantity,
        1
      );

    if (currentQuantity >= stock) {

      showToast(
        "Maximum available stock reached."
      );

      return;
    }

    existing.productId =
      product._id;

    existing.name =
      product.name;

    existing.price =
      safeNumber(product.price);

    existing.image =
      product.image || "";

    existing.quantity =
      currentQuantity + 1;

  } else {

    cart.push({
      productId:
        product._id,

      name:
        product.name,

      price:
        safeNumber(product.price),

      image:
        product.image || "",

      quantity:
        1,
    });
  }

  saveCart();

  showToast(
    `${product.name} added to cart 🛒`
  );
}


/* =====================================================
   REMOVE FROM CART
===================================================== */

function removeFromCart(productId) {

  cart =
    cart.filter(
      (item) =>
        String(
          item.productId ||
          item.product ||
          item._id
        ) !==
        String(productId)
    );

  saveCart();

  renderCart();

  showToast(
    "Product removed from cart"
  );
}


/* =====================================================
   INCREASE QUANTITY
===================================================== */

function increaseQuantity(productId) {

  const item =
    cart.find(
      (product) =>
        String(
          product.productId ||
          product.product ||
          product._id
        ) ===
        String(productId)
    );

  if (!item) {
    return;
  }

  const product =
    findProduct(productId);

  const stock =
    safeNumber(
      product?.stock,
      0
    );

  const quantity =
    safeNumber(
      item.quantity,
      1
    );

  if (
    stock > 0 &&
    quantity >= stock
  ) {

    showToast(
      "Maximum stock reached"
    );

    return;
  }

  item.quantity =
    quantity + 1;

  saveCart();

  renderCart();
}


/* =====================================================
   DECREASE QUANTITY
===================================================== */

function decreaseQuantity(productId) {

  const item =
    cart.find(
      (product) =>
        String(
          product.productId ||
          product.product ||
          product._id
        ) ===
        String(productId)
    );

  if (!item) {
    return;
  }

  const quantity =
    safeNumber(
      item.quantity,
      1
    );

  if (quantity <= 1) {

    removeFromCart(productId);

    return;
  }

  item.quantity =
    quantity - 1;

  saveCart();

  renderCart();
}


/* =====================================================
   CART PAGE
===================================================== */

function renderCart() {

  const app =
    document.getElementById(
      "app"
    );

  if (!app) {
    return;
  }

  if (!cart.length) {

    app.innerHTML = `
      <div class="container">

        <button
          class="back-button"
          onclick="renderHomePage()"
        >
          ← Continue Shopping
        </button>

        <div class="empty-state">

          <h2>
            🛒 Your Cart is Empty
          </h2>

          <p>
            Add some products to your cart.
          </p>

          <button
            onclick="renderHomePage()"
          >
            Start Shopping
          </button>

        </div>

      </div>
    `;

    updateCartCount();

    return;
  }


  let subtotal = 0;


  const cartHTML =
    cart
      .map((item) => {

        const productId =
          item.productId ||
          item.product ||
          item._id;

        const price =
          safeNumber(item.price);

        const quantity =
          safeNumber(
            item.quantity,
            1
          );

        const itemTotal =
          price * quantity;

        subtotal += itemTotal;

        return `
          <div class="cart-item">

            <img
              src="${getProductImage(item)}"
              alt="${escapeHTML(item.name)}"
              onerror="this.src='${DEFAULT_IMAGES.default}'"
            />


            <div class="cart-item-info">

              <h3>
                ${escapeHTML(item.name)}
              </h3>

              <p>
                ₹${price.toLocaleString("en-IN")}
              </p>


              <div class="quantity-controls">

                <button
                  onclick="decreaseQuantity('${productId}')"
                >
                  −
                </button>

                <span>
                  ${quantity}
                </span>

                <button
                  onclick="increaseQuantity('${productId}')"
                >
                  +
                </button>

              </div>

            </div>


            <div class="cart-item-right">

              <strong>
                ₹${itemTotal.toLocaleString("en-IN")}
              </strong>

              <button
                onclick="removeFromCart('${productId}')"
              >
                🗑️ Remove
              </button>

            </div>

          </div>
        `;
      })
      .join("");


  app.innerHTML = `
    <div class="container">

      <button
        class="back-button"
        onclick="renderHomePage()"
      >
        ← Continue Shopping
      </button>


      <section class="cart-section">

        <h1>
          🛒 Shopping Cart
        </h1>


        <div class="cart-layout">

          <div class="cart-items">
            ${cartHTML}
          </div>


          <div class="cart-summary">

            <h2>
              Order Summary
            </h2>


            <div class="summary-row">

              <span>
                Items
              </span>

              <span>
                ${cart.reduce(
                  (total, item) =>
                    total +
                    safeNumber(
                      item.quantity,
                      1
                    ),
                  0
                )}
              </span>

            </div>


            <div class="summary-row">

              <span>
                Subtotal
              </span>

              <strong>
                ₹${subtotal.toLocaleString("en-IN")}
              </strong>

            </div>


            <div class="summary-row">

              <span>
                Delivery
              </span>

              <span>
                FREE
              </span>

            </div>


            <hr />


            <div class="summary-total">

              <span>
                Total
              </span>

              <strong>
                ₹${subtotal.toLocaleString("en-IN")}
              </strong>

            </div>


            <button
              class="checkout-button"
              onclick="showCheckout()"
            >
              Proceed to Checkout →
            </button>

          </div>

        </div>

      </section>

    </div>
  `;

  updateCartCount();
}


/* =====================================================
   WISHLIST
===================================================== */

function toggleWishlist(productId) {

  const product =
    findProduct(productId);

  if (!product) {
    return;
  }

  const index =
    wishlist.findIndex(
      (item) =>
        String(item._id) ===
        String(productId)
    );

  if (index >= 0) {

    wishlist.splice(
      index,
      1
    );

    showToast(
      `${product.name} removed from wishlist`
    );

  } else {

    wishlist.push(product);

    showToast(
      `${product.name} added to wishlist ❤️`
    );
  }

  saveWishlist();

  renderHomePage();
}


function renderWishlist() {

  const app =
    document.getElementById(
      "app"
    );

  if (!app) {
    return;
  }

  if (!wishlist.length) {

    app.innerHTML = `
      <div class="container">

        <button
          class="back-button"
          onclick="renderHomePage()"
        >
          ← Home
        </button>

        <div class="empty-state">

          <h2>
            ❤️ Your Wishlist is Empty
          </h2>

          <p>
            Save products you love here.
          </p>

          <button
            onclick="renderHomePage()"
          >
            Browse Products
          </button>

        </div>

      </div>
    `;

    return;
  }


  app.innerHTML = `
    <div class="container">

      <button
        class="back-button"
        onclick="renderHomePage()"
      >
        ← Home
      </button>

      <section>

        <h1>
          ❤️ My Wishlist
        </h1>

        <div class="products-grid">

          ${wishlist
            .map((product) => {

              const price =
                safeNumber(
                  product.price
                );

              const stock =
                safeNumber(
                  product.stock
                );

              return `
                <div
                  class="product-card"
                  onclick="renderProductDetails('${product._id}')"
                >

                  <div class="product-image-container">

                    <img
                      src="${getProductImage(product)}"
                      alt="${escapeHTML(product.name)}"
                      class="product-image"
                      onerror="this.src='${DEFAULT_IMAGES.default}'"
                    />

                  </div>

                  <div class="product-info">

                    <h3>
                      ${escapeHTML(product.name)}
                    </h3>

                    <p class="product-category">
                      ${escapeHTML(product.category)}
                    </p>

                    ${renderProductRating(product)}

                    <p class="product-price">
                      ₹${price.toLocaleString("en-IN")}
                    </p>

                    <div class="product-actions">

                      <button
                        onclick="event.stopPropagation(); addToCart('${product._id}')"
                        ${stock <= 0 ? "disabled" : ""}
                      >
                        🛒 Add to Cart
                      </button>

                      <button
                        onclick="event.stopPropagation(); toggleWishlist('${product._id}')"
                      >
                        ❤️
                      </button>

                    </div>

                  </div>

                </div>
              `;
            })
            .join("")}

        </div>

      </section>

    </div>
  `;
}


/* =====================================================
   LOGIN PAGE
===================================================== */

function showLogin() {

  const app =
    document.getElementById(
      "app"
    );

  if (!app) {
    return;
  }

  app.innerHTML = `
    <div class="auth-container">

      <div class="auth-card">

        <h1>
          🔐 Login to ShopAI
        </h1>

        <form
          id="login-form"
          onsubmit="login(event)"
        >

          <input
            type="email"
            id="login-email"
            placeholder="Email"
            required
          />

          <input
            type="password"
            id="login-password"
            placeholder="Password"
            required
          />

          <button type="submit">
            Login
          </button>

        </form>


        <p>

          Don't have an account?

          <button
            class="text-button"
            onclick="showRegister()"
          >
            Register
          </button>

        </p>


        <button
          class="back-button"
          onclick="renderHomePage()"
        >
          ← Back to Home
        </button>

      </div>

    </div>
  `;
}


/* =====================================================
   LOGIN
===================================================== */

async function login(event) {

  if (event) {
    event.preventDefault();
  }

  const email =
    document.getElementById(
      "login-email"
    )?.value.trim();

  const password =
    document.getElementById(
      "login-password"
    )?.value;


  try {

    const response =
      await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            email,
            password,
          }),
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Login failed"
      );
    }


    token =
      data.token ||
      data.accessToken;

    currentUser =
      data.user ||
      data.userData;


    if (!token || !currentUser) {

      throw new Error(
        "Invalid login response from server"
      );
    }


    localStorage.setItem(
      "token",
      token
    );

    localStorage.setItem(
      "user",
      JSON.stringify(currentUser)
    );


    renderNavbar();

    showToast(
      "Login successful 🎉"
    );

    renderHomePage();

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    showToast(
      error.message ||
      "Login failed"
    );
  }
}


/* =====================================================
   REGISTER
===================================================== */

function showRegister() {

  const app =
    document.getElementById(
      "app"
    );

  if (!app) {
    return;
  }

  app.innerHTML = `
    <div class="auth-container">

      <div class="auth-card">

        <h1>
          📝 Create ShopAI Account
        </h1>

        <form
          id="register-form"
          onsubmit="register(event)"
        >

          <input
            type="text"
            id="register-name"
            placeholder="Full Name"
            required
          />

          <input
            type="email"
            id="register-email"
            placeholder="Email"
            required
          />

          <input
            type="password"
            id="register-password"
            placeholder="Password"
            minlength="6"
            required
          />

          <button type="submit">
            Create Account
          </button>

        </form>


        <p>

          Already have an account?

          <button
            class="text-button"
            onclick="showLogin()"
          >
            Login
          </button>

        </p>


        <button
          class="back-button"
          onclick="renderHomePage()"
        >
          ← Back to Home
        </button>

      </div>

    </div>
  `;
}


async function register(event) {

  if (event) {
    event.preventDefault();
  }

  const name =
    document.getElementById(
      "register-name"
    )?.value.trim();

  const email =
    document.getElementById(
      "register-email"
    )?.value.trim();

  const password =
    document.getElementById(
      "register-password"
    )?.value;


  try {

    const response =
      await fetch(
        `${API_URL}/auth/register`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Registration failed"
      );
    }


    showToast(
      "Account created successfully 🎉"
    );

    showLogin();

  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );

    showToast(
      error.message ||
      "Registration failed"
    );
  }
}


/* =====================================================
   LOGOUT
===================================================== */

function logout() {

  currentUser = null;
  token = null;

  localStorage.removeItem(
    "user"
  );

  localStorage.removeItem(
    "token"
  );

  renderNavbar();

  showToast(
    "Logged out successfully"
  );

  renderHomePage();
}


/* =====================================================
   CHECKOUT PAGE
===================================================== */

function showCheckout() {

  if (!currentUser || !token) {

    showToast(
      "Please login before checkout."
    );

    showLogin();

    return;
  }


  if (!cart.length) {

    showToast(
      "Your cart is empty."
    );

    renderCart();

    return;
  }


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        safeNumber(item.price) *
        safeNumber(
          item.quantity,
          1
        ),
      0
    );


  const app =
    document.getElementById(
      "app"
    );

  if (!app) {
    return;
  }


  app.innerHTML = `
    <section class="checkout-section">

      <button
        class="back-button"
        onclick="renderCart()"
      >
        ← Back to Cart
      </button>


      <h1>
        💳 Checkout
      </h1>


      <div class="checkout-card">

        <h2>
          Shipping Address
        </h2>


        <input
          id="fullName"
          type="text"
          placeholder="Full Name"
          required
        />


        <input
          id="address"
          type="text"
          placeholder="Address"
          required
        />


        <input
          id="city"
          type="text"
          placeholder="City"
          required
        />


        <input
          id="state"
          type="text"
          placeholder="State"
          required
        />


        <input
          id="pincode"
          type="text"
          placeholder="Pincode"
          maxlength="6"
          required
        />


        <input
          id="phone"
          type="text"
          placeholder="Phone Number"
          maxlength="10"
          required
        />


        <h2>
          Payment Method
        </h2>


        <div class="payment-options">

          <label>

            <input
              type="radio"
              name="paymentMethod"
              value="COD"
              checked
            />

            Cash on Delivery

          </label>


          <label>

            <input
              type="radio"
              name="paymentMethod"
              value="ONLINE"
            />

            Online Payment

          </label>

        </div>


        <div class="order-total">

          <h2>
            Order Total
          </h2>

          <h2>
            ₹${total.toLocaleString("en-IN")}
          </h2>

        </div>


        <button
          class="checkout-btn"
          onclick="placeOrder()"
        >
          🚀 Place Order
        </button>

      </div>

    </section>
  `;


  /*
    Optional:
    If we already know the user's name,
    put it into Full Name automatically.
  */
  const fullNameInput =
    document.getElementById(
      "fullName"
    );

  if (
    fullNameInput &&
    currentUser?.name
  ) {
    fullNameInput.value =
      currentUser.name;
  }
}


/* =====================================================
   PLACE ORDER
===================================================== */

async function placeOrder() {

  console.log(
    "PLACE ORDER BUTTON CLICKED"
  );


  if (!currentUser || !token) {

    showToast(
      "Please login first"
    );

    showLogin();

    return;
  }


  if (!cart.length) {

    showToast(
      "Cart is empty"
    );

    renderCart();

    return;
  }


  /* -----------------------------------------------
     GET SHIPPING DETAILS
  ------------------------------------------------ */

  const fullName =
    document.getElementById(
      "fullName"
    )?.value.trim() || "";


  const address =
    document.getElementById(
      "address"
    )?.value.trim() || "";


  const city =
    document.getElementById(
      "city"
    )?.value.trim() || "";


  const state =
    document.getElementById(
      "state"
    )?.value.trim() || "";


  const pincode =
    document.getElementById(
      "pincode"
    )?.value.trim() || "";


  const phone =
    document.getElementById(
      "phone"
    )?.value.trim() || "";


  /* -----------------------------------------------
     VALIDATE ADDRESS
  ------------------------------------------------ */

  if (
    !fullName ||
    !address ||
    !city ||
    !state ||
    !pincode ||
    !phone
  ) {

    showToast(
      "Please fill all shipping details."
    );

    return;
  }


  if (!/^\d{6}$/.test(pincode)) {

    showToast(
      "Please enter a valid 6-digit pincode."
    );

    return;
  }


  if (!/^\d{10}$/.test(phone)) {

    showToast(
      "Please enter a valid 10-digit phone number."
    );

    return;
  }


  /* -----------------------------------------------
     GET PAYMENT METHOD
  ------------------------------------------------ */

  const paymentElement =
    document.querySelector(
      'input[name="paymentMethod"]:checked'
    );


  const paymentMethod =
    paymentElement?.value ||
    "COD";


  /* -----------------------------------------------
     CREATE VALID ORDER ITEMS
  ------------------------------------------------ */

  const orderItems =
    cart.map((item) => {

      /*
        IMPORTANT:
        Our cart uses productId.
        Older cart data may use product/_id.
      */

      const productId =
        item.productId ||
        item.product ||
        item._id;


      const product =
        allProducts.find(
          (product) =>
            String(product._id) ===
            String(productId)
        );


      return {
        product:
          product?._id ||
          productId,

        name:
          item.name ||
          product?.name ||
          "Product",

        price:
          safeNumber(
            item.price ??
            product?.price ??
            0
          ),

        quantity:
          safeNumber(
            item.quantity,
            1
          ),

        image:
          item.image ||
          product?.image ||
          "",
      };
    });


  console.log(
    "ORDER ITEMS:",
    orderItems
  );


  /* -----------------------------------------------
     VALIDATE ORDER ITEMS
  ------------------------------------------------ */

  const invalidItem =
    orderItems.some(
      (item) =>
        !item.product ||
        !item.name ||
        item.price <= 0 ||
        item.quantity <= 0
    );


  if (invalidItem) {

    console.error(
      "INVALID ORDER ITEMS:",
      orderItems
    );

    showToast(
      "Some cart products are invalid. Please clear the cart and add them again."
    );

    return;
  }


  /* -----------------------------------------------
     CALCULATE TOTAL
  ------------------------------------------------ */

  const totalAmount =
    orderItems.reduce(
      (sum, item) =>
        sum +
        item.price *
        item.quantity,
      0
    );


  /* -----------------------------------------------
     SHIPPING ADDRESS
  ------------------------------------------------ */

  const shippingAddress = {
    fullName,
    address,
    city,
    state,
    pincode,
    phone,
  };


  /* -----------------------------------------------
     FINAL ORDER DATA
  ------------------------------------------------ */

  const orderData = {

    items:
      orderItems,

    totalAmount,

    shippingAddress,

    paymentMethod,
  };


  console.log(
    "FINAL ORDER DATA:",
    orderData
  );


  /* -----------------------------------------------
     SEND ORDER TO BACKEND
  ------------------------------------------------ */

  try {

    const response =
      await fetch(
        `${API_URL}/orders`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body:
            JSON.stringify(
              orderData
            ),
        }
      );


    const data =
      await response.json();


    console.log(
      "ORDER RESPONSE:",
      data
    );


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Failed to place order."
      );
    }


    /* -----------------------------------------------
       SUCCESS
    ------------------------------------------------ */

    cart = [];

    saveCart();


    showToast(
      "Order placed successfully 🎉"
    );


    renderNavbar();


    const orderId =
      data.order?._id ||
      data._id ||
      "Created";


    const app =
      document.getElementById(
        "app"
      );


    if (app) {

      app.innerHTML = `
        <section class="order-success">

          <div class="success-icon">
            🎉
          </div>

          <h1>
            Order Placed Successfully!
          </h1>

          <p>
            Thank you for shopping with ShopAI.
          </p>

          <p>
            Order ID:
            <strong>
              ${escapeHTML(orderId)}
            </strong>
          </p>

          <p>
            Payment:
            <strong>
              ${escapeHTML(paymentMethod)}
            </strong>
          </p>

          <p>
            Total:
            <strong>
              ₹${totalAmount.toLocaleString("en-IN")}
            </strong>
          </p>


          <button
            onclick="renderOrders()"
          >
            📦 View My Orders
          </button>


          <button
            onclick="renderHomePage()"
          >
            🛍️ Continue Shopping
          </button>

        </section>
      `;
    }

  } catch (error) {

    console.error(
      "PLACE ORDER ERROR:",
      error
    );

    showToast(
      error.message ||
      "Failed to place order"
    );
  }
}


/* =====================================================
   ORDERS
===================================================== */

async function renderOrders() {

  if (!currentUser || !token) {

    showLogin();

    return;
  }


  const app =
    document.getElementById(
      "app"
    );

  if (!app) {
    return;
  }


  app.innerHTML = `
    <div class="container">

      <button
        class="back-button"
        onclick="renderHomePage()"
      >
        ← Back to Home
      </button>

      <h1>
        📦 My Orders
      </h1>

      <div id="orders-container">
        Loading orders...
      </div>

    </div>
  `;


  try {

    const userId =
      currentUser._id ||
      currentUser.id;


    if (!userId) {

      throw new Error(
        "User ID not found."
      );
    }


    const response =
      await fetch(
        `${API_URL}/orders/user/${userId}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to load orders"
      );
    }


    const orders =
      Array.isArray(data)
        ? data
        : Array.isArray(data.orders)
          ? data.orders
          : [];


    const container =
      document.getElementById(
        "orders-container"
      );


    if (!container) {
      return;
    }


    if (!orders.length) {

      container.innerHTML = `
        <div class="empty-state">

          <h2>
            📦 No Orders Yet
          </h2>

          <p>
            Your placed orders will appear here.
          </p>

          <button
            onclick="renderHomePage()"
          >
            Start Shopping
          </button>

        </div>
      `;

      return;
    }


    container.innerHTML =
      orders
        .map((order) => {

          const total =
            safeNumber(
              order.totalAmount
            );


          const orderItems =
            Array.isArray(order.items)
              ? order.items
              : [];


          return `
            <div class="order-card">

              <div class="order-header">

                <div>

                  <strong>
                    Order #${String(
                      order._id
                    ).slice(-8)}
                  </strong>

                  <p>
                    ${
                      order.createdAt
                        ? new Date(
                            order.createdAt
                          ).toLocaleString(
                            "en-IN"
                          )
                        : ""
                    }
                  </p>

                </div>


                <span class="order-status">
                  ${escapeHTML(
                    order.orderStatus ||
                    "PLACED"
                  )}
                </span>

              </div>


              <div class="order-items">

                ${orderItems
                  .map((item) => {

                    /*
                      Order route populates product.
                      But support both populated
                      and non-populated product.
                    */

                    const product =
                      item.product &&
                      typeof item.product ===
                        "object"
                        ? item.product
                        : null;


                    const name =
                      item.name ||
                      product?.name ||
                      "Product";


                    const quantity =
                      safeNumber(
                        item.quantity,
                        1
                      );


                    const price =
                      safeNumber(
                        item.price
                      );


                    return `
                      <div class="order-item">

                        <span>
                          ${escapeHTML(name)}
                        </span>

                        <span>
                          × ${quantity}
                        </span>

                        <strong>
                          ₹${(
                            price *
                            quantity
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </strong>

                      </div>
                    `;
                  })
                  .join("")}

              </div>


              <div class="order-total">

                <span>
                  Total
                </span>

                <strong>
                  ₹${total.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>


              <div class="order-payment">

                Payment:
                <strong>
                  ${escapeHTML(
                    order.paymentMethod ||
                    "COD"
                  )}
                </strong>

              </div>

            </div>
          `;
        })
        .join("");


  } catch (error) {

    console.error(
      "ORDERS ERROR:",
      error
    );


    const container =
      document.getElementById(
        "orders-container"
      );


    if (container) {

      container.innerHTML = `
        <div class="error-message">

          <h3>
            ❌ Unable to load orders
          </h3>

          <p>
            ${escapeHTML(
              error.message
            )}
          </p>

          <button
            onclick="renderOrders()"
          >
            Try Again
          </button>

        </div>
      `;
    }
  }
}


/* =====================================================
   GLOBAL FUNCTIONS
===================================================== */

window.renderHomePage =
  renderHomePage;

window.loadProducts =
  loadProducts;

window.loadForYouRecommendations =
  loadForYouRecommendations;

window.renderProductDetails =
  renderProductDetails;

window.addToCart =
  addToCart;

window.removeFromCart =
  removeFromCart;

window.increaseQuantity =
  increaseQuantity;

window.decreaseQuantity =
  decreaseQuantity;

window.renderCart =
  renderCart;

window.toggleWishlist =
  toggleWishlist;

window.renderWishlist =
  renderWishlist;

window.showLogin =
  showLogin;

window.login =
  login;

window.showRegister =
  showRegister;

window.register =
  register;

window.logout =
  logout;

window.showCheckout =
  showCheckout;

window.placeOrder =
  placeOrder;

window.renderOrders =
  renderOrders;

window.submitReview =
  submitReview;

window.deleteReview =
  deleteReview;

window.selectReviewRating =
  selectReviewRating;

window.clearFilters =
  clearFilters;

window.filterByCategory =
  filterByCategory;

window.searchProducts =
  searchProducts;