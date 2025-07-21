// server/index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

// User model
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["donor", "receiver"], default: "donor" },
});
const User = mongoose.model("User", userSchema);

// Drug model
const drugSchema = new mongoose.Schema({
  name: String,
  dosage: String,
  expiryDate: Date,
  condition: String,
  imageUrl: String,
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Drug = mongoose.model("Drug", drugSchema);

// Request model
const requestSchema = new mongoose.Schema({
  drugId: { type: mongoose.Schema.Types.ObjectId, ref: "Drug" },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "sent"],
    default: "pending",
  },
  requestedAt: { type: Date, default: Date.now },
});
const Request = mongoose.model("Request", requestSchema);

// Middleware for auth
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token, "secret");
    next();
  } catch {
    res.sendStatus(403);
  }
}

// Multer for file upload
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Auth routes
app.post("/api/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashed, role });
  await user.save();
  res.json({ message: "User registered" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ userId: user._id, role: user.role }, "secret");
  res.json({ token });
});

// Drug routes
app.post("/api/drugs", authMiddleware, async (req, res) => {
  const newDrug = new Drug({ ...req.body, donorId: req.user.userId });
  await newDrug.save();
  res.status(201).json(newDrug);
});

app.get("/api/drugs", async (req, res) => {
  const drugs = await Drug.find({ expiryDate: { $gt: new Date() }, verified: true });
  res.json(drugs);
});

app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  const drugs = await Drug.find({ name: new RegExp(q, "i") });
  res.json(drugs);
});

// Upload route
app.post("/api/upload", upload.single("file"), (req, res) => {
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// Request routes
app.post("/api/requests", authMiddleware, async (req, res) => {
  const request = new Request({ ...req.body, receiverId: req.user.userId });
  await request.save();
  res.status(201).json(request);
});

app.get("/api/requests", authMiddleware, async (req, res) => {
  const requests = await Request.find({ receiverId: req.user.userId }).populate("drugId");
  res.json(requests);
});

app.listen(5000, () => console.log("Server running on port 5000"));
dotenv.config();