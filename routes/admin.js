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

module.exports = router;
