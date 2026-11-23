const express = require("express");
const { getDb } = require("../db");
const { verifyJWT, requireRole } = require("../middleware/auth");
const { wrap, toObjectId, enrichBookings } = require("../utils/helpers");

const router = express.Router();
router.use(verifyJWT, requireRole("customer"));

// Overview stats
router.get(
  "/stats",
  wrap(async (req, res) => {
    const col = (await getDb()).collection("bookings");
    const customerId = req.user.id;
    const [totalBookings, pendingBookings, acceptedBookings, rejectedBookings] =
      await Promise.all([
        col.countDocuments({ customerId }),
        col.countDocuments({ customerId, status: "pending" }),
        col.countDocuments({ customerId, status: "accepted" }),
        col.countDocuments({ customerId, status: "rejected" }),
      ]);
    res.json({
      totalBookings,
      pendingBookings,
      acceptedBookings,
      rejectedBookings,
    });
  }),
);

// My bookings
router.get(
  "/",
  wrap(async (req, res) => {
    const col = (await getDb()).collection("bookings");
    const items = await col
      .find({ customerId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ bookings: await enrichBookings(items) });
  }),
);

// Create booking request
router.post(
  "/",
  wrap(async (req, res) => {
    const serviceId = toObjectId(String(req.body.serviceId ?? ""));
    const eventDate = String(req.body.eventDate ?? "");
    const eventLocation = String(req.body.eventLocation ?? "").trim();
    const message = String(req.body.message ?? "").trim();

    if (!serviceId)
      return res.status(400).json({ message: "Invalid service ID" });
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
      Number.isNaN(Date.parse(eventDate))
    )
      return res
        .status(400)
        .json({ message: "Please choose a valid event date" });
    if (eventDate < new Date().toISOString().slice(0, 10))
      return res
        .status(400)
        .json({ message: "Event date cannot be in the past" });
    if (eventLocation.length < 2 || eventLocation.length > 200)
      return res.status(400).json({ message: "Event location is required" });
    if (message.length > 1000)
      return res
        .status(400)
        .json({ message: "Message is too long (max 1000 characters)" });

    const db = await getDb();
    const service = await db
      .collection("services")
      .findOne({ _id: serviceId, status: "approved", isActive: true });
    if (!service)
      return res
        .status(404)
        .json({ message: "This service is not available for booking" });

    if (service.vendorId === req.user.id)
      return res
        .status(403)
        .json({ message: "You cannot book your own service" });

    const bookings = db.collection("bookings");
    const duplicate = await bookings.findOne({
      customerId: req.user.id,
      serviceId: serviceId.toString(),
      eventDate,
      status: { $in: ["pending", "accepted"] },
    });
    if (duplicate)
      return res.status(409).json({
        message:
          "You already have an active booking request for this service on this date",
      });

    const now = new Date();
    const result = await bookings.insertOne({
      serviceId: serviceId.toString(),
      vendorId: service.vendorId, // service theke, client theke na
      customerId: req.user.id, // token theke
      eventDate,
      eventLocation,
      message,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    res
      .status(201)
      .json({
        message: "Booking request sent to the vendor",
        id: result.insertedId,
      });
  }),
);

// Cancel (only own + only pending)
router.patch(
  "/:id/cancel",
  wrap(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: "Invalid booking ID" });

    const col = (await getDb()).collection("bookings");
    const booking = await col.findOne({ _id, customerId: req.user.id });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const result = await col.updateOne(
      { _id, customerId: req.user.id, status: "pending" },
      { $set: { status: "cancelled", updatedAt: new Date() } },
    );
    if (!result.matchedCount)
      return res.status(400).json({
        message: `Only pending bookings can be cancelled (this one is ${booking.status})`,
      });
    res.json({ message: "Booking cancelled" });
  }),
);

module.exports = router;
