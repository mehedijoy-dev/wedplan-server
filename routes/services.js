const express = require("express");
const { getDb } = require("../db");
const {
  wrap,
  toObjectId,
  escapeRegex,
  attachVendors,
} = require("../utils/helpers");

const router = express.Router();

// GET /api/services?search=&category=&location=&sort=&page=&limit=
router.get(
  "/",
  wrap(async (req, res) => {
    const db = await getDb();
    const { search, category, location, sort } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    // Sudhu approved + active service public e dekhabe
    const filter = { status: "approved", isActive: true };
    if (search)
      filter.serviceName = {
        $regex: escapeRegex(String(search)),
        $options: "i",
      };
    if (category && category !== "all") filter.category = String(category);
    if (location)
      filter.location = {
        $regex: escapeRegex(String(location)),
        $options: "i",
      };

    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      newest: { createdAt: -1 },
    };
    const sortBy = sortMap[String(sort)] || sortMap.newest;

    const col = db.collection("services");
    const [items, total] = await Promise.all([
      col
        .find(filter)
        .sort(sortBy)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ]);

    res.json({ services: await attachVendors(items), total, page, limit });
  }),
);

// GET /api/services/:id
router.get(
  "/:id",
  wrap(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: "Invalid service ID" });

    const db = await getDb();
    const service = await db
      .collection("services")
      .findOne({ _id, status: "approved", isActive: true });

    if (!service)
      return res
        .status(404)
        .json({ message: "Service not found or unavailable" });

    const [withVendor] = await attachVendors([service]);
    res.json({ service: withVendor });
  }),
);

module.exports = router;
