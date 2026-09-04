const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Product = require("./models/Product");

dotenv.config();

// ==========================================
// PRODUCTS TO ADD
// ==========================================

const products = [
  // ==========================================
  // ELECTRONICS
  // ==========================================

  {
    name: "Bluetooth Speaker",
    description:
      "Portable Bluetooth speaker with powerful sound and long battery life",
    price: 1799,
    category: "Electronics",
    image:
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1",
    stock: 20,
  },

  {
    name: "Mechanical Keyboard",
    description:
      "RGB mechanical keyboard with comfortable keys for gaming and work",
    price: 3499,
    category: "Electronics",
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3",
    stock: 12,
  },

  {
    name: "Wireless Mouse",
    description:
      "Ergonomic wireless mouse with precise tracking and silent clicks",
    price: 999,
    category: "Electronics",
    image:
      "https://images.unsplash.com/photo-1527814050087-3793815479db",
    stock: 35,
  },

  {
    name: "Laptop Stand",
    description:
      "Adjustable aluminum laptop stand for comfortable working",
    price: 1299,
    category: "Electronics",
    image:
      "https://images.unsplash.com/photo-1618424181497-157f25b6ddd5",
    stock: 18,
  },

  // ==========================================
  // FASHION
  // ==========================================

  {
    name: "Cotton T-Shirt",
    description:
      "Soft premium cotton T-shirt suitable for everyday wear",
    price: 699,
    category: "Fashion",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
    stock: 40,
  },

  {
    name: "Casual Hoodie",
    description:
      "Comfortable casual hoodie made with soft and warm fabric",
    price: 1499,
    category: "Fashion",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7",
    stock: 25,
  },

  {
    name: "Classic Jeans",
    description:
      "Classic slim-fit jeans designed for everyday comfort",
    price: 1799,
    category: "Fashion",
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d",
    stock: 30,
  },

  {
    name: "Travel Backpack",
    description:
      "Spacious water-resistant backpack suitable for travel and college",
    price: 1899,
    category: "Fashion",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
    stock: 22,
  },

  // ==========================================
  // HOME
  // ==========================================

  {
    name: "LED Desk Lamp",
    description:
      "Adjustable LED desk lamp with multiple brightness levels",
    price: 899,
    category: "Home",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c",
    stock: 28,
  },

  {
    name: "Coffee Maker",
    description:
      "Compact coffee maker for making fresh coffee at home",
    price: 2999,
    category: "Home",
    image:
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6",
    stock: 10,
  },

  {
    name: "Stainless Steel Water Bottle",
    description:
      "Insulated stainless steel bottle that keeps drinks hot or cold",
    price: 799,
    category: "Home",
    image:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8",
    stock: 50,
  },

  {
    name: "Comfort Pillow",
    description:
      "Soft memory foam pillow designed for comfortable sleeping",
    price: 1199,
    category: "Home",
    image:
      "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2",
    stock: 20,
  },

  {
    name: "Modern Wall Clock",
    description:
      "Minimal modern wall clock for home and office decoration",
    price: 1099,
    category: "Home",
    image:
      "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c",
    stock: 15,
  },
];

// ==========================================
// SEED FUNCTION
// ==========================================

async function seedProducts() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB Connected Successfully"
    );

    let addedCount = 0;
    let skippedCount = 0;

    for (const productData of products) {
      const existingProduct =
        await Product.findOne({
          name: productData.name,
        });

      if (existingProduct) {
        console.log(
          `Skipped: ${productData.name}`
        );

        skippedCount++;

        continue;
      }

      await Product.create(
        productData
      );

      console.log(
        `Added: ${productData.name}`
      );

      addedCount++;
    }

    console.log(
      "\n=========================================="
    );

    console.log(
      "PRODUCT SEEDING COMPLETED"
    );

    console.log(
      "=========================================="
    );

    console.log(
      `Products added: ${addedCount}`
    );

    console.log(
      `Products skipped: ${skippedCount}`
    );

    console.log(
      "==========================================\n"
    );

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error(
      "PRODUCT SEEDING FAILED:"
    );

    console.error(
      error.message
    );

    await mongoose.connection.close();

    process.exit(1);
  }
}

seedProducts();