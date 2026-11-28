require("dotenv").config();
const { getDb } = require("../db");

const img = (seed) => `https://picsum.photos/seed/wedplan-${seed}/900/650`;

const vendors = [
  { email: "lensy.studio@wedplan.demo", name: "Rafiq Ahmed", businessName: "Lensy Moments Studio", premium: true },
  { email: "royal.venues@wedplan.demo", name: "Nusrat Jahan", businessName: "Royal Garden Venues", premium: false },
  { email: "petal.bloom@wedplan.demo", name: "Tasnim Rahman", businessName: "Petal & Bloom Decor", premium: false },
  { email: "spice.route@wedplan.demo", name: "Imran Hossain", businessName: "Spice Route Catering", premium: true },
  { email: "glow.anika@wedplan.demo", name: "Anika Sultana", businessName: "Glow by Anika", premium: false },
  { email: "silk.thread@wedplan.demo", name: "Farhana Islam", businessName: "Silk & Thread Boutique", premium: false },
];

const services = [
  {
    vendor: "lensy.studio@wedplan.demo",
    serviceName: "Cinematic Wedding Photography",
    category: "Photography & Videography",
    description:
      "Full-day wedding coverage with two photographers and a cinematographer. Includes an edited highlight film, 400+ retouched photos and a premium album.",
    price: 45000,
    location: "Dhaka",
    images: [img("photo-1a"), img("photo-1b")],
  },
  {
    vendor: "lensy.studio@wedplan.demo",
    serviceName: "Pre-Wedding Photoshoot Package",
    category: "Photography & Videography",
    description:
      "A relaxed 4-hour couple shoot at a location of your choice, with outfit changes, 60 edited photos and a short teaser reel.",
    price: 25000,
    location: "Cox's Bazar",
    images: [img("photo-2a"), img("photo-2b")],
  },
  {
    vendor: "royal.venues@wedplan.demo",
    serviceName: "Grand Ballroom Wedding Hall",
    category: "Wedding Venues",
    description:
      "An air-conditioned ballroom for up to 600 guests with a stage, bridal suite, valet parking and in-house lighting. Perfect for traditional receptions.",
    price: 250000,
    location: "Dhaka",
    images: [img("venue-1a"), img("venue-1b")],
  },
  {
    vendor: "royal.venues@wedplan.demo",
    serviceName: "Lakeside Garden Venue",
    category: "Wedding Venues",
    description:
      "An open-air garden beside a quiet lake, ideal for evening ceremonies and holud events for up to 300 guests. Covered seating included.",
    price: 180000,
    location: "Sylhet",
    images: [img("venue-2a"), img("venue-2b")],
  },
  {
    vendor: "petal.bloom@wedplan.demo",
    serviceName: "Floral Stage and Entrance Decor",
    category: "Decoration & Florist",
    description:
      "Fresh flower stage backdrop, entrance arch, aisle styling and table centrepieces designed around your colour palette.",
    price: 60000,
    location: "Dhaka",
    images: [img("decor-1a"), img("decor-1b")],
  },
  {
    vendor: "petal.bloom@wedplan.demo",
    serviceName: "Holud Night Theme Decoration",
    category: "Decoration & Florist",
    description:
      "Colourful marigold and fabric decoration for holud ceremonies, including seating, photo corner and lighting.",
    price: 35000,
    location: "Chattogram",
    images: [img("decor-2a"), img("decor-2b")],
  },
  {
    vendor: "spice.route@wedplan.demo",
    serviceName: "Traditional Bengali Wedding Feast",
    category: "Catering Services",
    description:
      "A full traditional menu with kacchi biryani, roast, rezala and desserts for 100 guests. Staff and serving equipment included.",
    price: 85000,
    location: "Dhaka",
    images: [img("food-1a"), img("food-1b")],
  },
  {
    vendor: "spice.route@wedplan.demo",
    serviceName: "Premium Buffet Catering",
    category: "Catering Services",
    description:
      "A multi-cuisine buffet with live counters and a dessert station for 100 guests, served by uniformed staff.",
    price: 120000,
    location: "Chattogram",
    images: [img("food-2a"), img("food-2b")],
  },
  {
    vendor: "glow.anika@wedplan.demo",
    serviceName: "Bridal Makeup and Hair Styling",
    category: "Makeup & Styling",
    description:
      "Long-lasting HD bridal makeup, hair styling and draping by a senior artist. Includes a free trial session before the wedding.",
    price: 18000,
    location: "Dhaka",
    images: [img("makeup-1a"), img("makeup-1b")],
  },
  {
    vendor: "glow.anika@wedplan.demo",
    serviceName: "Engagement and Reception Glam",
    category: "Makeup & Styling",
    description:
      "Soft glam makeup and hairstyling for engagement and reception looks, with on-location service available.",
    price: 12000,
    location: "Sylhet",
    images: [img("makeup-2a"), img("makeup-2b")],
  },
  {
    vendor: "silk.thread@wedplan.demo",
    serviceName: "Designer Bridal Lehenga Rental",
    category: "Wedding Fashion",
    description:
      "A curated collection of handcrafted bridal lehengas and sarees for rent, with fitting sessions and alterations included.",
    price: 30000,
    location: "Dhaka",
    images: [img("fashion-1a"), img("fashion-1b")],
  },
  {
    vendor: "silk.thread@wedplan.demo",
    serviceName: "Groom Sherwani Collection",
    category: "Wedding Fashion",
    description:
      "Premium sherwanis and panjabis with matching accessories, available to rent or buy, with free tailoring adjustments.",
    price: 15000,
    location: "Chattogram",
    images: [img("fashion-2a"), img("fashion-2b")],
  },
];

(async () => {
  const db = await getDb();
  const users = db.collection("user");
  const col = db.collection("services");
  const now = new Date();

  const vendorIds = {};
  for (const v of vendors) {
    await users.updateOne(
      { email: v.email },
      {
        $setOnInsert: {
          name: v.name,
          email: v.email,
          emailVerified: true,
          image: null,
          role: "vendor",
          isBlocked: false,
          businessName: v.businessName,
          subscriptionPlan: v.premium ? "premium" : "free",
          subscriptionExpiresAt: v.premium ? new Date("2027-12-31") : null,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
    const doc = await users.findOne({ email: v.email });
    vendorIds[v.email] = doc._id.toString();
  }

  let i = 0;
  for (const s of services) {
    const { vendor, ...fields } = s;
    const vendorId = vendorIds[vendor];
    await col.updateOne(
      { vendorId, serviceName: fields.serviceName },
      {
        $setOnInsert: {
          vendorId,
          ...fields,
          status: "approved",
          isActive: true,
          createdAt: new Date(now.getTime() - i * 3600000),
          updatedAt: now,
        },
      },
      { upsert: true }
    );
    i++;
  }

  console.log(`Seeded ${vendors.length} vendors and ${services.length} services`);
  process.exit(0);
})().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});