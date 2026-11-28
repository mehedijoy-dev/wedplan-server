require("dotenv").config();
const { getDb } = require("../db");

const u = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=75`;

const updates = [
  // Photography & Videography
  {
    serviceName: "Cinematic Wedding Photography",
    images: [u("1546032996-6dfacbacbf3f"), u("1583939003579-730e3918a45a")],
  },
  {
    serviceName: "Pre-Wedding Photoshoot Package",
    images: [u("1532712938310-34cb3982ef74"), u("1546032996-6dfacbacbf3f")],
  },
  {
    serviceName: "Wedding Videography and Highlight Film",
    images: [u("1583939003579-730e3918a45a"), u("1532712938310-34cb3982ef74")],
  },
  // Wedding Venues
  {
    serviceName: "Grand Ballroom Wedding Hall",
    images: [u("1763429338698-439aa108e7fb"), u("1775126964424-913480443772")],
  },
  {
    serviceName: "Lakeside Garden Venue",
    images: [u("1721677337543-37b07e7e28b5"), u("1523438885200-e635ba2c371e")],
  },
  // Decoration & Florist
  {
    serviceName: "Floral Stage and Entrance Decor",
    images: [u("1670529776180-60e4132ab90c"), u("1469371670807-013ccf25f16a")],
  },
  {
    serviceName: "Holud Night Theme Decoration",
    images: [u("1607861884586-c7cfaed16290"), u("1769812344081-92b3e2ac39c0")],
  },
  // Catering Services
  {
    serviceName: "Traditional Bengali Wedding Feast",
    images: [u("1740047602722-b4993b79e4b7"), u("1576842546422-60562b9242ae")],
  },
  {
    serviceName: "Premium Buffet Catering",
    images: [u("1555244162-803834f70033"), u("1768508663341-ed48fd1e69d8")],
  },
  // Makeup & Styling
  {
    serviceName: "Bridal Makeup and Hair Styling",
    images: [u("1774814304885-bb5cc796a6c3"), u("1764269719546-afc8567db7c6")],
  },
  {
    serviceName: "Engagement and Reception Glam",
    images: [u("1773688189414-7637b9b138e1"), u("1774814305111-8298b8cde459")],
  },
  // Wedding Fashion
  {
    serviceName: "Designer Bridal Lehenga Rental",
    images: [u("1610173827043-9db50e0d8ef9"), u("1600685890506-593fdf55949b")],
  },
  {
    serviceName: "Groom Sherwani Collection",
    images: [u("1760080838961-4208536db385"), u("1744804298516-991bf12847c8")],
  },
];

(async () => {
  const col = (await getDb()).collection("services");
  let count = 0;
  for (const { serviceName, images } of updates) {
    const r = await col.updateMany({ serviceName }, { $set: { images } });
    if (!r.matchedCount) console.log("Not found:", serviceName);
    count += r.matchedCount;
  }
  console.log(`Updated images for ${count} services`);
  process.exit(0);
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
