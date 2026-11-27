const express = require("express");
const { getDb } = require("../db");
const { verifyJWT, requireRole } = require("../middleware/auth");
const {
  wrap,
  toObjectId,
  escapeRegex,
  attachVendors,
} = require("../utils/helpers");

const router = express.Router();
router.use(verifyJWT, requireRole("admin"));

router.get(
  "/stats",
  wrap(async (req, res) => {
    const db = await getDb();
    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalServices,
      pendingServices,
      totalTransactions,
    ] = await Promise.all([
      db.collection("user").countDocuments({}),
      db.collection("user").countDocuments({ role: "vendor" }),
      db.collection("user").countDocuments({ role: "customer" }),
      db.collection("services").countDocuments({}),
      db.collection("services").countDocuments({ status: "pending" }),
      db.collection("transactions").countDocuments({}),
    ]);
    res.json({
      totalUsers,
      totalVendors,
      totalCustomers,
      totalServices,
      pendingServices,
      totalTransactions,
    });
  }),
);

// All services (search + filter)
router.get(
  "/services",
  wrap(async (req, res) => {
    const { search, status, category } = req.query;
    const filter = {};
    if (search)
      filter.serviceName = {
        $regex: escapeRegex(String(search)),
        $options: "i",
      };
    if (["pending", "approved", "rejected"].includes(String(status)))
      filter.status = String(status);
    if (category) filter.category = String(category);

    const db = await getDb();
    const services = await db
      .collection("services")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ services: await attachVendors(services) });
  }),
);

// Approve / reject / set pending
router.patch(
  "/services/:id/status",
  wrap(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: "Invalid service ID" });

    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const db = await getDb();
    const result = await db
      .collection("services")
      .updateOne({ _id }, { $set: { status, updatedAt: new Date() } });
    if (!result.matchedCount)
      return res.status(404).json({ message: "Service not found" });
    res.json({ message: `Service ${status}` });
  }),
);

router.delete(
  "/services/:id",
  wrap(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: "Invalid service ID" });

    const db = await getDb();
    const result = await db.collection("services").deleteOne({ _id });
    if (!result.deletedCount)
      return res.status(404).json({ message: "Service not found" });
    res.json({ message: "Service deleted" });
  }),
);

// Transactions (read-only, admin payment record bodlate parbe na)
router.get(
  "/transactions",
  wrap(async (req, res) => {
    const db = await getDb();
    const items = await db
      .collection("transactions")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const ids = [...new Set(items.map((t) => t.vendorId))]
      .map(toObjectId)
      .filter(Boolean);
    const vendors = await db
      .collection("user")
      .find({ _id: { $in: ids } })
      .toArray();
    const map = new Map(
      vendors.map((v) => [
        v._id.toString(),
        { name: v.name, email: v.email, businessName: v.businessName || null },
      ]),
    );

    res.json({
      transactions: items.map((t) => ({
        ...t,
        vendor: map.get(t.vendorId) || null,
      })),
    });
  }),
);

const userFields = {
  name: 1,
  email: 1,
  image: 1,
  role: 1,
  isBlocked: 1,
  businessName: 1,
  subscriptionPlan: 1,
  subscriptionExpiresAt: 1,
  createdAt: 1,
};

// All users (search by name/email + role filter)
router.get(
  "/users",
  wrap(async (req, res) => {
    const { search, role } = req.query;
    const filter = {};
    if (search) {
      const rx = { $regex: escapeRegex(String(search)), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }];
    }
    if (["vendor", "customer", "admin"].includes(String(role)))
      filter.role = String(role);

    const db = await getDb();
    const users = await db
      .collection("user")
      .find(filter)
      .project(userFields)
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ users });
  }),
);

// Block / unblock
router.patch(
  "/users/:id/block",
  wrap(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: "Invalid user ID" });
    if (typeof req.body.isBlocked !== "boolean")
      return res
        .status(400)
        .json({ message: "isBlocked must be true or false" });
    if (_id.toString() === req.user.id)
      return res.status(403).json({ message: "You cannot block yourself" });

    const db = await getDb();
    const col = db.collection("user");
    const target = await col.findOne({ _id });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === "admin")
      return res
        .status(403)
        .json({ message: "Admin accounts cannot be blocked" });

    await col.updateOne({ _id }, { $set: { isBlocked: req.body.isBlocked } });
    res.json({
      message: req.body.isBlocked ? "User blocked" : "User unblocked",
    });
  }),
);

module.exports = router;
