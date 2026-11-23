const dns = require("node:dns");
const { MongoClient } = require("mongodb");

// Local network e SRV DNS lookup block thakle public DNS use hobe
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.MONGODB_DB_NAME);
  }
  return db;
}

module.exports = { getDb };
