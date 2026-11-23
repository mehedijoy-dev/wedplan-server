const express = require("express");
const { getDb } = require("../db");
const { verifyJWT, requireRole } = require("../middleware/auth");
const {
  wrap,
  isPremium,
  toObjectId,
  validateService,
  FREE_PLAN_LIMIT,
} = require("../utils/helpers");

const router = express.Router();
router.use(verifyJWT, requireRole("vendor"));

const limitMessage = `Free plan allows only ${FREE_PLAN_LIMIT} active services. Upgrade to Premium for unlimited services.`;

const countActive = (col, vendorId, excludeId) =>
  col.countDocuments({
    vendorId,
    isActive: true,
    status: { $ne: "rejected" },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });

// Overview stats
router.get(
  "/stats",
  wrap(async (req, res) => {
    const db = await getDb();
    const vendorId = req.user.id;
    const [totalServices, activeServices, pendingBookings, acceptedBookings] =
      await Promise.all([
        db.collection("services").countDocuments({ vendorId }),
        db
          .collection("services")
          .countDocuments({ vendorId, status: "approved", isActive: true }),
        db
          .collection("bookings")
          .countDocuments({ vendorId, status: "pending" }),
        db
          .collection("bookings")
          .countDocuments({ vendorId, status: "accepted" }),
      ]);

    res.json({
      totalServices,
      activeServices,
      pendingBookings,
      acceptedBookings,
      plan: isPremium(req.user) ? "premium" : "free",
    });
  }),
);

// My services
router.get(
  "/services",
  wrap(async (req, res) => {
    const db = await getDb();
    const services = await db
      .collection("services")
      .find({ vendorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ services });
  }),
);

// Single service (ownership check)
router.get(
  "/services/:id",
  wrap(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: "Invalid service ID" });

    const db = await getDb();
    const service = await db
      .collection("services")
      .findOne({ _id, vendorId: req.user.id });
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json({ service });
  }),
);

// Create
router.post(
  "/services",
  wrap(async (req, res) => {
    const { error, data } = validateService(req.body);
    if (error) return res.status(400).json({ message: error });

    const db = await getDb();
    const col = db.collection("services");

    if (!isPremium(req.user)) {
      const active = await countActive(col, req.user.id);
      if (active >= FREE_PLAN_LIMIT)
        return res.status(403).json({ message: limitMessage });
    }

    const now = new Date();
    const result = await col.insertOne({
      vendorId: req.user.id, // token theke, client er body theke na
      ...data,
      status: "pending",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    res
      .status(201)
      .json({ message: "Service submitted for review", id: result.insertedId });
  }),
);

// Update
router.patch(
  "/services/:id",
  wrap(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: "Invalid service ID" });

    const { error, data } = validateService(req.body);
    if (error) return res.status(400).json({ message: error });

    const db = await getDb();
    const result = await db
      .collection("services")
      .updateOne(
        { _id, vendorId: req.user.id },
        { $set: { ...data, updatedAt: new Date() } },
      );
    if (!result.matchedCount)
      return res.status(404).json({ message: "Service not found" });
    res.json({ message: "Service updated" });
  }),
);

// Availability on/off
router.patch(
  "/services/:id/availability",
  wrap(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: "Invalid service ID" });
    if (typeof req.body.isActive !== "boolean")
      return res
        .status(400)
        .json({ message: "isActive must be true or false" });

    const db = await getDb();
    const col = db.collection("services");
    const service = await col.findOne({ _id, vendorId: req.user.id });
    if (!service) return res.status(404).json({ message: "Service not found" });

    if (req.body.isActive && !isPremium(req.user)) {
      const active = await countActive(col, req.user.id, _id);
      if (active >= FREE_PLAN_LIMIT)
        return res.status(403).json({ message: limitMessage });
    }

    await col.updateOne(
      { _id },
      { $set: { isActive: req.body.isActive, updatedAt: new Date() } },
    );
    res.json({ message: "Availability updated" });
  }),
);

// Delete
router.delete(
  "/services/:id",
  wrap(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: "Invalid service ID" });

    const db = await getDb();
    const result = await db
      .collection("services")
      .deleteOne({ _id, vendorId: req.user.id });
    if (!result.deletedCount)
      return res.status(404).json({ message: "Service not found" });
    res.json({ message: "Service deleted" });
  }),
);

module.exports = router;
