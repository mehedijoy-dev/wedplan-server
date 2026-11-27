require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { verifyJWT } = require("./middleware/auth");
const { isPremium } = require("./utils/helpers");

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Stripe webhook raw body chay, tai express.json() er AGE
app.use("/api/webhooks", require("./routes/webhooks"));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("WedPlan server is running");
});

// Token + DB role verify
app.get("/api/me", verifyJWT, (req, res) => {
  res.json({ user: { ...req.user, isPremium: isPremium(req.user) } });
});

app.use("/api/services", require("./routes/services"));
app.use("/api/vendor", require("./routes/vendor"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/payments", require("./routes/payments"));

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

// Local e listen, Vercel e export
if (require.main === module) {
  app.listen(port, (err) => {
    if (err) {
      console.error("Failed to start server:", err.message);
      return;
    }
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;
