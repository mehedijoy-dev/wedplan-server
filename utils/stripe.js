const Stripe = require("stripe");

let client;

// Key na thakle server crash korbe na, sudhu payment route e error dibe
module.exports = new Proxy(
  {},
  {
    get(_, prop) {
      if (!client) {
        if (!process.env.STRIPE_SECRET_KEY) {
          throw new Error("STRIPE_SECRET_KEY is not set");
        }
        client = new Stripe(process.env.STRIPE_SECRET_KEY);
      }
      return client[prop];
    },
  },
);
