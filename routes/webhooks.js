const express = require("express");
const stripe = require("../utils/stripe");
const { getDb } = require("../db");
const { toObjectId } = require("../utils/helpers");

const router = express.Router();

// Stripe er notun/purono API version duto-tei period end ber kore
const periodEnd = (sub) =>
  sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;

async function setPlan(vendorId, plan, expiresAt) {
  const _id = toObjectId(vendorId);
  if (!_id) return;
  const db = await getDb();
  await db
    .collection("user")
    .updateOne(
      { _id, role: "vendor" },
      { $set: { subscriptionPlan: plan, subscriptionExpiresAt: expiresAt } },
    );
}

// Raw body lagbe, tai express.json() er age mount hobe (index.js)
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Stripe signature verification failed:", err.message);
      return res.status(400).send("Webhook signature verification failed");
    }

    try {
      const db = await getDb();

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          if (session.mode !== "subscription") break;
          if (session.payment_status !== "paid") break;

          const vendorId = session.metadata?.vendorId;
          if (!vendorId) break;

          const sub = await stripe.subscriptions.retrieve(session.subscription);

          // Transaction save (ekই session duibar ashleo ekbar-i save hobe)
          await db.collection("transactions").updateOne(
            { stripeSessionId: session.id },
            {
              $setOnInsert: {
                vendorId,
                plan: "premium",
                amount: (session.amount_total ?? 0) / 100,
                currency: session.currency,
                stripeSessionId: session.id,
                stripeSubscriptionId: session.subscription,
                status: "success",
                createdAt: new Date(),
              },
            },
            { upsert: true },
          );

          await setPlan(vendorId, "premium", new Date(periodEnd(sub) * 1000));
          break;
        }

        // Renewal ba cancel-at-period-end er por status change
        case "customer.subscription.updated": {
          const sub = event.data.object;
          const vendorId = sub.metadata?.vendorId;
          if (!vendorId) break;

          if (["active", "trialing", "past_due"].includes(sub.status)) {
            await setPlan(vendorId, "premium", new Date(periodEnd(sub) * 1000));
          } else if (
            ["canceled", "unpaid", "incomplete_expired"].includes(sub.status)
          ) {
            await setPlan(vendorId, "free", null);
          }
          break;
        }

        // Subscription shesh hoye gele Premium bondho
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const vendorId = sub.metadata?.vendorId;
          if (vendorId) await setPlan(vendorId, "free", null);
          break;
        }

        default:
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      res.status(500).send("Webhook handler failed");
    }
  },
);

module.exports = router;
