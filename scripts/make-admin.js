require("dotenv").config();
const { getDb } = require("../db");

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.log("Usage: node scripts/make-admin.js <email>");
    process.exit(1);
  }
  const db = await getDb();
  const result = await db
    .collection("user")
    .updateOne({ email }, { $set: { role: "admin" } });
  console.log(result.matchedCount ? `${email} is now admin` : "User not found");
  process.exit(0);
})();
