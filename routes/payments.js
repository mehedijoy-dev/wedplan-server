const express = require("express");
const stripe = require("../utils/stripe");
const { getDb } = require("../db");
const { verifyJWT, requireRole } = require("../middleware/auth");
const { wrap, isPremium } = require("../utils/helpers");

const PREMIUM_PRICE_CENTS = 1000; // $10 / month

const router = express.Router();
router.use(verifyJWT, requireRole("vendor"));

// Checkout session toiri. vendorId token theke, client er body theke na.
router.post(
  "/create-checkout-session",
  wrap(async (req, res) => {
    if (isPremium(req.user))
      return res
        .status(400)
        .json({ message: "You are already a Premium vendor" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PREMIUM_PRICE_CENTS,
            recurring: { interval: "month" },
            product_data: {
              name: "WedPlan Premium",
              description: "Unlimited services and Premium vendor badge",
            },
          },
        },
      ],
      metadata: { vendorId: req.user.id },
      subscription_data: { metadata: { vendorId: req.user.id } },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.json({ url: session.url });
  }),
);

// Subscription cancel (billing period shesh hole Premium jabe)
router.post(
  "/cancel-subscription",
  wrap(async (req, res) => {
    const db = await getDb();
    const tx = await db.collection("transactions").findOne(
      {
        vendorId: req.user.id,
        status: "success",
        stripeSubscriptionId: { $ne: null },
      },
      { sort: { createdAt: -1 } },
    );
    if (!tx)
      return res.status(404).json({ message: "No active subscription found" });

    await stripe.subscriptions.update(tx.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    res.json({
      message: "Subscription will end at the end of the current billing period",
    });
  }),
);

module.exports = router;
