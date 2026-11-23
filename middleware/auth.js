const { ObjectId } = require("mongodb");
const { getDb } = require("../db");

let joseModule;
let jwks;

const getJose = async () => (joseModule ??= await import("jose"));

async function getJwks() {
  if (!jwks) {
    const { createRemoteJWKSet } = await getJose();
    jwks = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
    );
  }
  return jwks;
}

// 1) Token verify + DB theke user (role, blocked) load
async function verifyJWT(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: token missing" });
  }

  try {
    const { jwtVerify } = await getJose();
    const { payload } = await jwtVerify(token, await getJwks(), {
      issuer: process.env.CLIENT_URL,
      audience: process.env.CLIENT_URL,
    });

    const userId = payload.sub || payload.id;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Unauthorized: invalid token" });
    }

    // Role token theke na, DB theke nibo (client er upor bharsha nai)
    const db = await getDb();
    const user = await db
      .collection("user")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: user not found" });
    }
    if (user.isBlocked) {
      return res
        .status(403)
        .json({ message: "Forbidden: your account has been blocked" });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image || null,
      role: user.role || "customer",
      subscriptionPlan: user.subscriptionPlan || "free",
      subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Unauthorized: invalid or expired token" });
  }
}

// 2) Role check (verifyJWT er por use hobe)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: you do not have access" });
    }
    next();
  };
}

module.exports = { verifyJWT, requireRole };
