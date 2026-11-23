const { ObjectId } = require("mongodb");
const { getDb } = require("../db");

const CATEGORIES = [
  "Photography & Videography",
  "Wedding Venues",
  "Decoration & Florist",
  "Catering Services",
  "Makeup & Styling",
  "Wedding Fashion",
];

const FREE_PLAN_LIMIT = 3;

// async route er error global handler e pathay
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const isPremium = (user) =>
  user.subscriptionPlan === "premium" &&
  (!user.subscriptionExpiresAt ||
    new Date(user.subscriptionExpiresAt) > new Date());

const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function validateService(body = {}) {
  const serviceName = String(body.serviceName ?? "").trim();
  const category = String(body.category ?? "");
  const description = String(body.description ?? "").trim();
  const location = String(body.location ?? "").trim();
  const price = Number(body.price);
  const images = Array.isArray(body.images) ? body.images.map(String) : [];

  if (serviceName.length < 3 || serviceName.length > 100)
    return { error: "Service name must be 3 to 100 characters" };
  if (!CATEGORIES.includes(category))
    return { error: "Please select a valid category" };
  if (description.length < 10 || description.length > 2000)
    return { error: "Description must be 10 to 2000 characters" };
  if (!Number.isFinite(price) || price <= 0)
    return { error: "Price must be a positive number" };
  if (location.length < 2 || location.length > 100)
    return { error: "Location is required" };
  if (
    images.length < 1 ||
    images.length > 5 ||
    !images.every((u) => /^https?:\/\//.test(u))
  )
    return { error: "Upload 1 to 5 valid images" };

  return {
    data: { serviceName, category, description, price, location, images },
  };
}

// services er sathe vendor er public info jure dey
async function attachVendors(services) {
  const db = await getDb();
  const ids = [...new Set(services.map((s) => s.vendorId))]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const vendors = await db
    .collection("user")
    .find({ _id: { $in: ids } })
    .toArray();

  const map = new Map(
    vendors.map((v) => [
      v._id.toString(),
      {
        name: v.name,
        image: v.image || null,
        businessName: v.businessName || null,
        isPremium: isPremium(v),
      },
    ]),
  );

  return services.map((s) => ({ ...s, vendor: map.get(s.vendorId) || null }));
}

module.exports = {
  CATEGORIES,
  FREE_PLAN_LIMIT,
  wrap,
  isPremium,
  toObjectId,
  escapeRegex,
  validateService,
  attachVendors,
};
