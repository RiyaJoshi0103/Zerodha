require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const { HoldingsModel } = require("./model/HoldingsModel");
const { PositionsModel } = require("./model/PositionsModel");
const { OrdersModel } = require("./model/OrdersModel");
const { UserModel } = require("./model/UserModel");

const PORT = process.env.PORT || 3002;
const uri = process.env.MONGO_URL;
const JWT_SECRET = process.env.JWT_SECRET || "zerodha_default_jwt_secret_change_in_prod";

const app = express();

// --- CORS Configuration ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://zerodha-dashboard1-16u1.onrender.com",
    ];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy violation: origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// --- Rate Limiting Middleware ---
function createRateLimiter({ windowMs, max, message }) {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || "global";
    const now = Date.now();

    const record = requests.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    requests.set(ip, record);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({ error: message || "Too many requests, please try again later." });
    }

    next();
  };
}

const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests, please try again after 15 minutes.",
});

const stockRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Stock rate limit exceeded. Please wait a minute before trying again.",
});

app.use(apiRateLimiter);

// --- JWT and Password Utilities ---
function signToken(payload, expiresInSeconds = 86400) {
  try {
    const jwt = require("jsonwebtoken");
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSeconds });
  } catch (e) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
    const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${signature}`;
  }
}

function verifyToken(token) {
  try {
    const jwt = require("jsonwebtoken");
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    const parts = (token || "").split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(":")) {
    return password === storedPassword;
  }
  const [salt, hash] = storedPassword.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === testHash;
}

// --- Authentication Middleware ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Access denied. Authentication token required." });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// --- Auth Routes ---
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email address is required" });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const existing = await UserModel.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "User already exists with this email" });
    }

    const hashedPassword = hashPassword(password);
    const user = new UserModel({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    });
    await user.save();

    const token = signToken({ userId: user._id, email: user.email });
    return res.status(201).json({ message: "User registered successfully", token });
  } catch (err) {
    return res.status(500).json({ error: "Signup error: " + err.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await UserModel.findOne({ email: email.trim().toLowerCase() });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken({ userId: user._id, email: user.email });
    return res.json({ message: "Login successful", token });
  } catch (err) {
    return res.status(500).json({ error: "Login error: " + err.message });
  }
});

// --- Protected Portfolio & Trading Routes ---
app.get("/allHoldings", authMiddleware, async (req, res) => {
  try {
    const allHoldings = await HoldingsModel.find({});
    return res.json(allHoldings);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch holdings: " + err.message });
  }
});

app.get("/allPositions", async (req, res) => {
  try {
    const allPositions = await PositionsModel.find({});
    return res.json(allPositions);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch positions: " + err.message });
  }
});

app.post("/newOrder", authMiddleware, async (req, res) => {
  const { name, qty, price, mode } = req.body;

  // Validation
  if (!name || typeof name !== "string" || !name.trim() || name.length > 20) {
    return res.status(400).json({ error: "Invalid order: name is required and must be 1-20 characters" });
  }

  const parsedQty = Number(qty);
  if (isNaN(parsedQty) || !Number.isInteger(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: "Invalid order: qty must be a positive integer" });
  }

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: "Invalid order: price must be a positive number" });
  }

  const validModes = ["BUY", "SELL"];
  if (!mode || typeof mode !== "string" || !validModes.includes(mode.toUpperCase())) {
    return res.status(400).json({ error: "Invalid order: mode must be BUY or SELL" });
  }

  try {
    const newOrder = new OrdersModel({
      name: name.trim().toUpperCase(),
      qty: parsedQty,
      price: parsedPrice,
      mode: mode.toUpperCase(),
    });

    await newOrder.save();
    return res.status(201).json({ message: "Order saved successfully", order: newOrder });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save order: " + err.message });
  }
});

// --- Stock Data with Validation and Rate Limiting ---
const STOCK_SYMBOL_REGEX = /^[A-Za-z0-9.\-_]{1,20}$/;

app.get("/stock/:symbol", stockRateLimiter, async (req, res) => {
  const symbol = req.params.symbol;

  if (!symbol || typeof symbol !== "string" || !STOCK_SYMBOL_REGEX.test(symbol.trim())) {
    return res.status(400).json({ error: "Invalid stock symbol format. Must be 1-20 alphanumeric characters." });
  }

  const cleanSymbol = symbol.trim().toUpperCase();
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "ALPHA_VANTAGE_API_KEY is not configured" });
  }

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(cleanSymbol)}&interval=5min&apikey=${apiKey}`;

  try {
    let data;
    if (typeof fetch === "function") {
      const response = await fetch(url);
      data = await response.json();
    } else {
      const axios = require("axios");
      const response = await axios.get(url);
      data = response.data;
    }
    return res.json(data);
  } catch (error) {
    console.error("Error fetching stock data:", error.message);
    return res.status(500).json({ error: "Failed to fetch stock data" });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`App started on port ${PORT}`);
    if (uri) {
      mongoose.connect(uri)
        .then(() => console.log("DB connected!"))
        .catch((err) => console.error("DB connection error:", err.message));
    }
  });
}

module.exports = app;
