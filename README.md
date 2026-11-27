# WedPlan Server

REST API for the WedPlan wedding planning platform, built with Express.js and MongoDB. It handles services, bookings, vendor subscriptions, admin moderation and Stripe webhooks, with JWT verification and role-based access control on every protected route.

## Live Website and Repositories

|                       | Link                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| **Live Website**      | [https://wedplan-client-kappa.vercel.app](https://wedplan-client-kappa.vercel.app)                 |
| **Live API**          | [https://wedplan-server-tawny.vercel.app](https://wedplan-server-tawny.vercel.app)                 |
| **Client Repository** | [https://github.com/mehedijoy-dev/wedplan-client](https://github.com/mehedijoy-dev/wedplan-client) |
| **Server Repository** | [https://github.com/mehedijoy-dev/wedplan-server](https://github.com/mehedijoy-dev/wedplan-server) |

## Important Features

- JWT verification (Better Auth JWKS verified with jose) and role-based middleware for Admin, Vendor and Customer
- User role and blocked status are always loaded from the database, never trusted from the client
- Public services API with search, category and location filters, price sorting and pagination
- Vendor service CRUD with ownership checks and a free plan limit of 3 active services
- Booking API with duplicate request prevention, vendor accept/reject and customer cancel rules
- Stripe Checkout session creation and a signature-verified webhook that activates and expires Premium subscriptions
- Admin APIs for users (search, filter, block/unblock), services moderation and read-only transactions
- Request validation, proper 400, 401, 403 and 404 responses and a global error handler

## Technology Stack

Node.js, Express.js, MongoDB, jose (JWT verification), Stripe, CORS, dotenv. Deployed on Vercel.

## Installation

```bash
git clone [https://github.com/mehedijoy-dev/wedplan-server.git](https://github.com/mehedijoy-dev/wedplan-server.git)
cd wedplan-server
npm install
```
