require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("WedPlan server is running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
