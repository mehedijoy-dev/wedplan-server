require("dotenv").config();
const { ObjectId } = require("mongodb");
const { getDb } = require("../db");

(async () => {
  const db = await getDb();
  const result = await db.collection("services").updateOne(
    { _id: new ObjectId("6b041bc4ea60a5dd741b2f7f") },
    {
      $set: {
        serviceName: "Wedding Videography and Highlight Film",
        category: "Photography & Videography",
        description:
          "Professional wedding videography with a two-camera setup and drone shots. You receive a 5-minute cinematic highlight film and a full-length ceremony video, edited with licensed music.",
        price: 40000,
        location: "Dhaka",
        images: [
          "https://picsum.photos/seed/wedplan-video-1a/900/650",
          "https://picsum.photos/seed/wedplan-video-1b/900/650",
        ],
        status: "approved",
        isActive: true,
        updatedAt: new Date(),
      },
    },
  );
  console.log(result.matchedCount ? "Service updated" : "Service not found");
  process.exit(0);
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
