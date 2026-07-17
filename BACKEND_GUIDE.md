# Protos Treat Backend — Complete Beginner's Guide

> **Plain English with analogies.** Every file, every concept, every line of reasoning — explained
> as simply as possible so a student who just finished learning TypeScript basics can follow along.

> **Four companion docs, in the project root, go deeper on specific topics than this guide does:**
> - `ADMIN_SEEDING_EXPLAINED.md` — why/when/where the very first Admin account gets created
> - `FRONTEND_BACKEND_CONNECTION_EXPLAINED.md` — a real click, traced through the whole stack
> - `IMAGE_UPLOAD_EXPLAINED.md` — Multer + Cloudinary, front to back
> - `PAYMENT_CONTROLLER_EXPLAINED.md` — the full Paystack integration story

---

## Table of Contents

1. [What This Backend Does](#1-what-this-backend-does)
2. [The Folder Structure — Why It Is Laid Out This Way](#2-the-folder-structure)
3. [How a Request Travels Through the App](#3-how-a-request-travels)
4. [TypeScript Concepts in Action](#4-typescript-concepts-in-action)
5. [config/ — The Settings Room](#5-config)
6. [lib/ — The Database Connection](#6-lib)
7. [types/ — The Dictionary](#7-types)
8. [prisma/schema.prisma — The Database Blueprints](#8-prisma)
9. [services/ — The Specialists](#9-services)
10. [security/ — The Bouncer Team](#10-security)
11. [middleware/ — The Checkpoints](#11-middleware)
12. [utils/ — The Toolbox](#12-utils)
13. [controllers/ — The Decision Makers](#13-controllers)
14. [routes/ — The Switchboard](#14-routes)
15. [server.ts — The Entry Point](#15-serverts)
16. [How Authentication Works End to End](#16-authentication-end-to-end)
17. [How the OTP Password Reset Works](#17-otp-password-reset)
18. [How the Payment Flow Works](#18-payment-flow)
19. [How Products Are Served from the Database](#19-products-from-database)
20. [Security — What Each Layer Protects Against](#20-security-layers)
21. [Getting It Running — Step by Step](#21-getting-it-running)
22. [API Reference — Every Endpoint](#22-api-reference)

---

## 1. What This Backend Does

Think of this backend as the **kitchen of a restaurant**.

The frontend (React app) is the **dining room** — customers see it and interact with it. But all the real work — cooking the food, checking the bill, taking payment — happens in the kitchen, hidden from the customer.

This backend:
- Stores and serves **products** from a real database (MongoDB)
- Handles **user accounts** — registration, login, staying logged in
- Sends **emails** — welcome messages, 6-digit password reset codes
- Processes **payments** through Paystack (securely, using a secret key the frontend never sees)
- **Protects** all of this behind layers of security

---

## 2. The Folder Structure

```
protos-treat-backend/
├── prisma/
│   └── schema.prisma  The single blueprint for every collection (User, Product,
│                      Order, PasswordReset) — this is the ONLY place table/
│                      collection shapes are defined. Prisma reads this file
│                      and generates a matching, fully-typed client for you.
├── src/
│   ├── config/        Settings — environment variables, CORS rules, Cloudinary SDK setup
│   ├── lib/           lib/prisma.ts — the one shared Prisma client instance
│   ├── types/         TypeScript type definitions (shared by all files)
│   ├── services/      Specialist classes (Email, Paystack, Order lifecycle, Cloudinary delete, token store)
│   ├── security/      Rate limiters, input sanitization, HTTP headers
│   ├── middleware/    Checkpoint functions (auth guard, validation, errors, image upload)
│   ├── utils/         Small helper functions (token signing, OTP gen, seed.ts)
│   ├── controllers/   Request handlers — the actual business logic (auth, products, payments, admin)
│   ├── routes/        URL mapping — which URL goes to which controller
│   └── server.ts      The app entry point — boots everything up
├── docker-compose.yml  Spins up MongoDB + Redis + this API, all in containers
├── Dockerfile          How to build this API into a container image
├── .env.example        Template for your .env file
├── package.json        Dependencies list
└── tsconfig.json       TypeScript compiler settings
```

> **Note:** an older version of this project had separate `database/` and `models/` folders using a library called **Mongoose**, talking to MongoDB directly. That's gone now — **everything** in this project (Users, Products, Orders, password resets) is defined once in `prisma/schema.prisma` and read/written through the one shared Prisma client in `src/lib/prisma.ts`. One library, one way of writing a query, everywhere.

### Why separate folders?

This is called **Separation of Concerns**. Each folder has one job, like different departments in a company:

- **`prisma/schema.prisma`** knows the shape of data. It doesn't send emails or handle HTTP.
- A **service** knows how to send emails. It does not know about HTTP requests.
- A **controller** knows how to handle an HTTP request. It calls Prisma and/or a service.
- A **route** knows which URL triggers which controller (and which middleware guards it). Nothing else.

If any piece breaks, you know exactly which folder to look in. If you want to swap Nodemailer for SendGrid, you only touch `services/email.service.ts` — nothing else changes.

---

## 3. How a Request Travels Through the App

When the frontend calls `POST /auth/login`, here is the exact journey:

```
Browser (axios)
  → server.ts          (receives the request)
  → security/          (rate limiter: is this IP making too many requests?)
  → middleware/        (sanitizeBody: strip dangerous characters)
  → routes/            (auth.routes.ts: this URL goes to authController.login)
  → middleware/        (validateLogin: are email and password present?)
  → controllers/       (auth.controller.ts: check DB, compare password, sign JWT)
  → utils/             (token.utils.ts: sign the JWT)
  → lib/prisma.ts       (prisma.user.findUnique(...) — queries MongoDB)
  → services/          (would call email.service.ts if needed)
  → utils/             (response.utils.ts: format the JSON response)
  → Browser            (receives { success: true, data: { accessToken, user } })
```

If anything goes wrong at any step, the error is passed to `errorHandler` in `middleware/error.middleware.ts` which formats a clean error response.

---

## 4. TypeScript Concepts in Action

Here is where each TypeScript concept the student learned appears in the project:

### Basic types and type inference

```typescript
// src/config/env.ts
const port = Number(optional("PORT", "5001"));
//           ↑ TypeScript infers: port is a number

function optional(key: string, fallback: string): string { ... }
//                     ↑ string type    ↑ return type declared
```

### Interfaces

```typescript
// src/types/index.ts
interface JwtPayload {
  userId: string;
  email:  string;
  role:   UserRole;
}
// This interface describes the shape of the data encoded in a JWT token.
// Any file that creates or reads a JWT uses this interface.
```

### Type aliases

```typescript
// src/types/index.ts
type SortOrder  = Record<string, 1 | -1>;
type FilterQuery = Record<string, unknown>;
// Instead of writing Record<string, 1 | -1> every time, we give it a name.
```

### Enums

```typescript
// src/types/index.ts
enum PaymentStatus {
  Pending = "pending",
  Paid    = "paid",
  Failed  = "failed",
}

// Used in Order.model.ts:
paymentStatus: { type: String, enum: Object.values(PaymentStatus) }
// MongoDB will only accept "pending", "paid", or "failed" for this field.
// If you accidentally type "payed", TypeScript catches it at compile time.
```

### Classes and access modifiers

```typescript
// src/services/email.service.ts
class EmailService {
  private transporter: Transporter;  // only EmailService can use this
  
  constructor() {
    this.transporter = nodemailer.createTransport({ ... });
  }

  private async send(options: EmailOptions): Promise<void> { ... }  // internal only
  
  public async sendOtp(to: string, otp: string): Promise<void> { ... }  // called by controllers
}
```

`private` = only code inside this class can access it.
`public` = any code can call it.
The word "encapsulation" describes hiding internal details behind a public interface.

### Generics

```typescript
// src/utils/response.ts
function sendResponse<T>(res: Response, statusCode: number, success: boolean, message: string, data?: T): Response

// The <T> is a placeholder. When called:
sendResponse<PublicUser>(res, 200, true, "Login successful.", userObject)
// TypeScript knows data is a PublicUser

sendResponse<string[]>(res, 200, true, "Categories retrieved.", ["All", "Electronics"])
// TypeScript knows data is a string array

// Same function, different data types — that is the power of generics.
```

---

## 5. config/

### `config/env.ts` — The Settings Room

Imagine a house where all the important codes — Wi-Fi password, alarm code, safe combination — are written on one note in a locked room. That locked room is `env.ts`.

Instead of writing `process.env.JWT_SECRET` scattered across 10 files, everything reads it from `env.ts`. If an environment variable is missing (forgot to add it to `.env`), the `required()` function throws an error **before the server even starts**, giving a clear message about what is missing.

The `as const` at the end tells TypeScript this object's values will never change — it is a frozen settings object.

### `config/cors.ts` — Who Is Allowed In

CORS (Cross-Origin Resource Sharing) is a browser security rule. When a website on `localhost:5173` tries to call an API on `localhost:5001`, the browser asks the API: "Are you willing to talk to this website?"

`cors.ts` answers that question. It keeps a list of approved origins (frontend URLs). If the request comes from an unlisted origin, it is rejected with a CORS error before it even reaches any route.

### `config/cloudinary.ts` — Image Storage Credentials

Same "one locked room" idea as `env.ts`, but specifically for the Cloudinary SDK: reads `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` from `.env` and configures the SDK exactly once, on server startup. Every file that needs to talk to Cloudinary (the upload middleware, the delete helper in `services/cloudinary.service.ts`) imports this one already-configured instance. Full explanation of the whole image-upload pipeline: `IMAGE_UPLOAD_EXPLAINED.md` in the project root.

---

## 6. lib/ — The Database Connection

### `lib/prisma.ts` — The Database Connection

This file is like the front desk of a hotel. It creates **one** Prisma Client instance when the server starts, and every other file (controllers, services, the seed script) imports that same instance instead of creating a new one each time.

```typescript
export const prisma = new PrismaClient();
```

That's the whole file, essentially — and that simplicity is the point. Prisma manages its own connection pool to MongoDB internally; you don't configure `maxPoolSize` or timeouts by hand the way you would with a lower-level driver. It connects lazily, on the first query it needs to run, and stays connected for the life of the process.

Every model in `prisma/schema.prisma` becomes a property on this object automatically: `prisma.user`, `prisma.product`, `prisma.order`, `prisma.passwordReset`. That's what "Prisma generates a client from your schema" means in practice.

---

## 7. types/

### `types/index.ts` — The Dictionary

This is the single source of truth for all data shapes in the project. Think of it as a shared dictionary that every other file agrees on.

**Why one central file?**
If `AuthController` and `PaymentController` both need to know what a `JwtPayload` looks like, they both import from `types/index.ts`. If you ever need to add a field to `JwtPayload`, you change it in one place — TypeScript immediately tells you every file that needs updating.

Notice that `UserRole`, `PaymentStatus`, and `OrderStatus` aren't hand-written here — they're imported straight from `@prisma/client`:

```typescript
import { UserRole, PaymentStatus, OrderStatus } from "@prisma/client";
export { UserRole, PaymentStatus, OrderStatus };
```

Prisma generates these enums directly from `prisma/schema.prisma`. Re-exporting them from `types/index.ts` means the rest of the app can keep importing "from types" like everything else, while the actual definition lives in exactly one place — the schema — instead of being duplicated (and risking getting out of sync).

**Interfaces vs Type aliases:**
An interface (`interface PublicUser { ... }`) describes the shape of an object and can be extended by other interfaces. A type alias gives a new name to an existing type. Both are erased at runtime — they are only for TypeScript's benefit during development.

**Generics — the reusable container:**
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
```
The `<T>` makes this interface like a labelled box that can hold any type. `ApiResponse<PublicUser>` is a box holding a user. `ApiResponse<string[]>` is a box holding an array of strings. `ApiResponse` without `<T>` defaults to `unknown`.

---

## 8. prisma/schema.prisma — The Database Blueprints

### What Prisma Is

Prisma is like an architectural drawing for your database, plus a translator. You describe your data shapes once, in `schema.prisma`, using Prisma's own simple syntax — and Prisma generates a fully-typed JavaScript/TypeScript client from it, so every query you write is checked by TypeScript before it ever runs.

```prisma
model Product {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  price       Float
  category    String
  stock       Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([category])
}
```

Read this the way you'd read a table definition: each line is a field, its type, and any rules (`@default`, `@unique`, etc). `@@index([category])` tells MongoDB to keep a fast lookup structure for that field — like a book's index, so filtering by category doesn't mean scanning every single product.

### `User` — password hashing and account lockout

Unlike Mongoose, Prisma models don't have "instance methods" or "pre-save hooks" attached to them — a `User` record from Prisma is just a plain typed object, nothing more. So logic like "hash the password before saving" or "lock the account after 5 failed logins" lives as ordinary functions in **`services/user.service.ts`** instead of being attached to the model itself:

- `hashPassword(plain)` / `comparePassword(plain, hash)` — wrap bcrypt.
- `isLocked(user)` — returns `true` if `user.lockUntil` is set and still in the future.
- `incrementLoginAttempts(user)` — adds 1 to `loginAttempts`; once it hits 5, sets `lockUntil` to 30 minutes from now.
- `resetLoginAttempts(user)` — called after a successful login, clears both fields back to zero/null.

`auth.controller.ts` calls these explicitly, in order, during login — nothing happens "magically" behind the scenes the way a Mongoose hook would. This is arguably easier to follow as a beginner: you can read top-to-bottom exactly what happens on every login attempt.

```
User sets password: "mypassword123"
         ↓ userService.hashPassword() — called explicitly in the controller
Stored in MongoDB:  "$2b$12$xyz..." (bcrypt hash — cannot be reversed)
```

**loginAttempts and lockUntil — account lockout:**
After 5 incorrect password attempts, `lockUntil` is set to 30 minutes from now. Every login attempt checks `isLocked()` first. If the account is locked, the login is refused even with the correct password. This stops brute-force attacks where a script tries thousands of passwords.

**`isBanned`** — set by an Admin via `PATCH /admin/users/:id/ban` (`admin.controller.ts`). Checked in `auth.controller.ts`'s `login()`, before even checking the password — a banned user is refused with `403` regardless of whether their password is correct.

**`orders Order[]`** — this is the "many" side of a real Prisma relation to `Order` (see below). It's what lets `admin.controller.ts` fetch one user together with their whole order history in a single query: `prisma.user.findUnique({ where: { id }, include: ... })`-style lookups, rather than two separate round-trips glued together in application code.

### `Product`

Four fields carry `@@index(...)`: `category`, `price`, `createdAt`. These speed up the exact operations the storefront needs — filtering by category, and (if you extend it) sorting by price or recency — without Prisma/MongoDB having to scan every document in the collection.

**`imagePublicId`** — NOT shown anywhere in the UI. It's Cloudinary's internal id for the image stored in the `image` URL field, and it exists purely so the backend can tell Cloudinary exactly which file to delete when an image is replaced or the product itself is deleted (see `IMAGE_UPLOAD_EXPLAINED.md`). Without storing this, there'd be no way to clean up an old image — you'd only have the new URL, with no record of what to remove.

### `PasswordReset`

Has `@@index([email])` and `@@index([resetToken])` for fast lookups during the forgot-password flow. Expiry (`expiresAt`) is checked in application code (`otp.utils.ts` / the auth controller) rather than a database-level TTL index — a fine tradeoff for a learning project, though a MongoDB TTL index is a good thing to research and add yourself as an exercise.

### `Order`

Links a user (`userId`) to their purchased items (`OrderItem[]`, a Prisma **composite type** — a nested object shape that doesn't need its own collection, perfect for line items that only ever make sense attached to their order). The `paymentReference` field is `@unique` — no two orders can share the same Paystack reference, which prevents duplicate orders being recorded even if a webhook fires twice.

**`user User @relation(fields: [userId], references: [id])`** — this turns `userId` from a plain, disconnected string into a real Prisma relation. It's what lets the admin dashboard fetch an order together with the customer who placed it, in one query, using a nested `select`:
```typescript
prisma.order.findMany({
  select: { id: true, totalAmount: true, user: { select: { name: true, email: true } } },
});
```
Without the relation, you'd have to run one query for orders and a second separate query to look up each `userId` — and remember to manually strip the password field out of whatever you got back. The relation, combined with a `select` (rather than `include`, which would pull the *entire* User record — password hash and all — into memory), gets you exactly the safe fields you need in one round trip.

**`paymentStatus`** now includes a fourth value, `Refunded`, alongside `Pending`/`Paid`/`Failed` — set when an admin cancels an already-paid order and a Paystack refund is requested (see `order.service.ts` in §9, and `PAYMENT_CONTROLLER_EXPLAINED.md`).

**`cancelledAt`** — a timestamp set the moment an order is cancelled, alongside `paidAt` (set the moment it's paid). Having both means you can always answer "how long was this order in each state?" without guessing from `updatedAt` alone.

**Two more indexes** were added beyond the original `userId + createdAt`: `@@index([paymentStatus, paidAt])` speeds up the revenue-by-date queries in `admin.controller.ts`'s `getRevenue`, and `@@index([orderStatus])` speeds up the admin order list's `?status=` filter.

---

## 9. services/

Services are **specialist classes**. They know how to do one thing very well. Controllers call services — they do not implement the logic themselves. This is the Single Responsibility Principle.

### `services/email.service.ts`

**The singleton pattern:**
```typescript
export default new EmailService();
```
We create ONE instance of the class and export it. Every file that imports this gets the same instance. This means the email transport connection is set up once when the server starts, not once per request.

**The private `send()` helper:**
`sendOtp()`, `sendWelcome()`, and `sendOrderConfirmation()` all need to call `this.transporter.sendMail()`. Instead of writing that in every method, they all call the private `send()` helper. If Nodemailer's API ever changes, you fix it in one place.

**Fire-and-forget in controllers:**
In `auth.controller.ts`, welcome emails are sent like this:
```typescript
emailService.sendWelcome(user.email, user.name).catch(console.error);
```
There is no `await`. This means the server responds to the user immediately while the email sends in the background. If the email fails, the error is logged but the registration is not rolled back — registration should not fail because of a slow email server.

### `services/paystack.service.ts`

**Why the service exists:**
The Paystack secret key (`sk_test_...`) can never go in the frontend — it would be visible to anyone who opens browser DevTools. The service lives on the backend and holds the key as a `private readonly` field. No code outside the class can read it.

**The generic `request<T>()` helper:**
Paystack has many endpoints. Each returns a different shape of data. Instead of writing a new `axios` call for each, the private `request<T>()` method handles all of them. The `<T>` tells TypeScript what shape to expect back.

```typescript
// When verifying a transaction:
this.request<PaystackVerifyData>("GET", `/transaction/verify/${reference}`)
// TypeScript knows the return value will have .status, .reference, .amount, etc.
```

**The `get headers()` accessor:**
Instead of building the Authorization header object in every method, we define it once as a getter. Every time the code references `this.headers`, it returns a fresh object with the authorization header. This is a clean use of TypeScript's class accessor syntax.

`refundTransaction()` is the newest method here — it's what `order.service.ts` calls when an admin cancels an already-paid order. See `PAYMENT_CONTROLLER_EXPLAINED.md` for the complete Paystack integration story, including why refunds, webhooks, and verification each exist.

### `services/order.service.ts` — order lifecycle, shared by two controllers

Two different controllers both need to move an order between states: `payment.controller.ts` marks one Paid (after Paystack confirms a payment), and `admin.controller.ts` cancels one (from the admin dashboard). Rather than writing that logic twice — and having the two copies slowly drift apart — it lives here, once:

- **`markOrderPaid(reference, paidAt)`** — marks the order Paid AND decrements stock for every item in it, inside a single `prisma.$transaction(...)` so stock updates can never end up "half applied." It's **idempotent**: calling it twice for the same order (which happens in the normal case — see `PAYMENT_CONTROLLER_EXPLAINED.md` §WHY for exactly why both `/verify` and the webhook call this) only decrements stock once, thanks to a guard that checks `if (order.paymentStatus === "Paid") return order;` before doing anything.
- **`cancelOrder(orderId)`** — the logic behind the admin dashboard's "Cancel" button. Refuses to cancel an order that's already `Cancelled` or `Delivered`; requests a Paystack refund if the order was already paid for (but cancels regardless if that refund call fails — a failed refund shouldn't block the cancellation itself); restocks every item.
- **`_syncInStockFlags(productIds)`** — a private helper both of the above call afterward. `stock` (the number) and `inStock` (the boolean the storefront's badge checks) are separate fields, and Prisma's `{ increment }`/`{ decrement }` only touch the number — this keeps the two in sync using two lightweight `updateMany` calls instead of reading and rewriting every product one at a time.

### `services/cloudinary.service.ts` — deleting images

Uploading an image doesn't need a service — Multer's Cloudinary storage engine handles that entirely as middleware, before any controller code runs (see `IMAGE_UPLOAD_EXPLAINED.md`). But *deleting* one is a deliberate decision a controller makes, so it gets a small wrapper: `deleteImage(publicId)` calls `cloudinary.uploader.destroy()` and swallows any error, since a failed cleanup of an old, no-longer-used image should never block the product update/delete the admin was actually trying to do.

---

## 10. security/

### `security/rateLimiter.security.ts` — The Bouncer

A rate limiter is like a bouncer who says "You have already tried to get in 10 times in the last 15 minutes. Wait outside."

Different routes get different limits:

| Limiter | Window | Max requests | Protects Against |
|---------|--------|-------------|-----------------|
| `globalLimiter` | 15 min | 100 | General API abuse |
| `authLimiter` | 15 min | 10 | Password guessing |
| `otpLimiter` | 60 min | 5 | OTP spam |
| `paymentLimiter` | 60 min | 20 | Payment fraud attempts |

When the limit is hit, the limiter sends a `429 Too Many Requests` response with a plain message. The controller never even runs.

### `security/sanitize.security.ts` — The Metal Detector

Sanitization removes or neutralizes dangerous characters from user input.

**`sanitizeBody()`** runs on every auth route. It recursively walks the request body and calls `validator.escape()` on every string value. This converts `<script>alert('hack')</script>` into `&lt;script&gt;alert(&#x27;hack&#x27;)&lt;/script&gt;` — harmless text.

**`validateEmail()` and `validatePassword()`** are pure helper functions that return `true` or `false`. They are used by the validation middleware but can be used anywhere.

**`express-mongo-sanitize`** (in `server.ts`) strips any key that starts with `$` or contains `.` from request bodies. This prevents MongoDB injection attacks where someone sends `{ "email": { "$gt": "" } }` to bypass authentication.

### `security/helmet.security.ts` — The Armoured Glass

Helmet sets HTTP response headers that protect users in their browser:

- `Content-Security-Policy` — tells the browser which scripts and styles to trust, preventing cross-site scripting
- By disabling `crossOriginEmbedderPolicy`, we allow images from Unsplash (the product images)
- Other Helmet defaults protect against clickjacking, MIME sniffing, and more

These headers are invisible to the user but are read by browsers as security instructions.

---

## 11. middleware/

Middleware is a function that runs **between** the request arriving and the controller running. Think of it as a series of checkpoints at an airport — security, passport control, boarding gate — each one must pass before you reach the plane (the controller).

### `middleware/auth.middleware.ts` — The ID Check

```
Request → [Does the Authorization header exist?] → [Is the token valid?] → Controller
```

The `protect` function:
1. Reads `Authorization: Bearer eyJhbGci...` from the request header
2. Splits off the token after `"Bearer "`
3. Calls `verifyAccessToken()` — if the JWT was tampered with or expired, this throws
4. Attaches the decoded user data (`{ userId, email, role }`) to `req.user`
5. Calls `next()` to pass to the next middleware or the controller

**The `AuthRequest` interface:**
```typescript
export interface AuthRequest extends Request {
  user?: JwtPayload;
}
```
By default, Express's `Request` type has no `user` property. We extend it to add one. In controllers, we cast `req as AuthRequest` to access `req.user`. Without this, TypeScript would show an error.

### `authorize(...roles)` — The Role Check (the Admin/Customer gate)

`protect` only answers "is this a real, logged-in user?" It says nothing about *what* that user is allowed to do. That's a separate question, answered by a second middleware that runs right after it:

```typescript
export const authorize = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req, res, next) => {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ success: false, message: "Access denied. Please sign in." });
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
    }
    next();
  };
};
```

Used on a route like this:
```typescript
router.post("/", protect, authorize(UserRole.Admin), sanitizeBody, validateProduct, productController.create);
```

Read that middleware chain left to right — it's exactly the order the checks run in: *"First prove you're logged in (`protect`). Then prove you're an Admin (`authorize`). Then clean the input (`sanitizeBody`). Then validate it (`validateProduct`). Only then does `create` actually run."* A Customer's request gets stopped at step 2 with a `403`, and never reaches the code that would create a product — no matter what the frontend UI shows or hides.

### `middleware/error.middleware.ts` — The Safety Net

Any error thrown inside a controller with `next(err)` lands here. Without this, Express would send an ugly HTML page (or crash).

The `AppError` class extends JavaScript's built-in `Error` class:
```typescript
class AppError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);  // calls Error's constructor
    this.statusCode = statusCode;
  }
}
```
This is **inheritance** — `AppError` is a specialised version of `Error` that also carries an HTTP status code.

The handler recognises different error types:
- `AppError` → use its status code and message
- Prisma error code `P2002` → unique field violation (duplicate email, or duplicate payment reference) → 409
- Prisma error code `P2025` → record not found (e.g. updating a product that was already deleted) → 404
- Anything else → 500 Internal Server Error

### `middleware/validate.middleware.ts` — The Form Checker

Before a controller runs, the validation middleware checks the request body. If the email is missing, or the password is too short, the middleware responds immediately with a clear `400 Bad Request` message. The controller code never runs.

This is cleaner than putting `if (!email) return res.status(400)...` at the top of every controller method.

---

## 12. utils/

Utils are small, pure functions — no side effects, no database calls, no HTTP. Input goes in, output comes out.

### `utils/token.utils.ts`

`signToken(payload)` creates a JWT by combining three things:
1. A header declaring the signing algorithm (done by the library)
2. The payload — `{ userId, email, role }` — encoded as Base64
3. A signature — the payload hashed with the access/refresh token secret

The signature is what makes JWTs trustworthy. Without the secret, you cannot create a valid signature. Anyone can read the payload (it is not encrypted, only encoded), but they cannot forge a new one.

`verifyAccessToken(token)` / `verifyRefreshToken(token)` reverse the process. They check the signature against the secret. If someone tampered with the payload, the signature no longer matches — verification throws and the caller treats the token as invalid.

### `utils/otp.utils.ts`

`generateOtp()` produces a 6-digit string:
```typescript
Math.floor(100000 + Math.random() * 900000).toString()
```
- `Math.random()` gives a decimal between 0 and 1
- Multiply by 900000, floor it → integer between 0 and 899999
- Add 100000 → integer between 100000 and 999999
- `.toString()` → "482910"

`generateResetToken()` uses `crypto.randomBytes(32)` — 32 bytes of cryptographically random data, converted to a 64-character hex string. This is far more secure than using `Math.random()` for something that grants password reset access.

### `utils/response.utils.ts`

Every API response follows the same shape: `{ success, message, data? }`. The `sendResponse<T>` generic function enforces this. TypeScript verifies that the data you pass matches the declared type.

### `utils/user.utils.ts`

`toPublicUser()` converts a Prisma `User` record (which includes the hashed password, login attempts, and other internal fields) into a clean `PublicUser` object with only `id`, `name`, `email`, `role`, and `createdAt`. This is what gets sent to the frontend — the password hash never leaves the backend.

### `utils/seed.ts`

A one-time setup script — read `ADMIN_SEEDING_EXPLAINED.md` (in the project root) for the full walkthrough of why it exists and how it works. Run it once to populate MongoDB with a starter product catalogue **and** create your first Admin account:

```bash
npm run seed
```

---

## 13. controllers/

Controllers are the decision-makers. They receive a request, call Prisma and/or services, and return a response.

### `controllers/auth.controller.ts`

**`register`:**
1. Check if email already exists (`prisma.user.findUnique`) — if yes, throw `AppError(409)`
2. `userService.hashPassword(password)` then `prisma.user.create({ data: { ..., role: UserRole.Customer } })` — note the role is always hard-coded to `Customer` here, on purpose (see `ADMIN_SEEDING_EXPLAINED.md` for why)
3. `issueTokenPair()` — creates a fresh access token + refresh token for this new user
4. `emailService.sendWelcome()` — fire and forget (no await)
5. `sendResponse(res, 201, ...)` — return the access token + public user to the frontend; the refresh token goes out as an httpOnly cookie

**`login`:**
1. `prisma.user.findUnique({ where: { email } })` — Prisma doesn't have Mongoose's `.select("+password")` trick; the password field comes back by default since there's no schema-level "hide this field" option, so the controller is careful to strip it out of anything sent back to the frontend (see `toPublicUser()` in §12)
2. `userService.isLocked(user)` — account lockout check
3. `userService.comparePassword(password, user.password)` — bcrypt compare
4. On failure: `userService.incrementLoginAttempts(user)` — may lock the account
5. On success: `userService.resetLoginAttempts(user)` — clear the counter
6. `issueTokenPair()`, respond

**`refresh`:** reads the refresh token from its httpOnly cookie, verifies it, and issues a brand-new access token (and rotates the refresh token) — this is what the frontend's axios interceptor calls silently when an access token expires. See `FRONTEND_BACKEND_CONNECTION_EXPLAINED.md` §6 for the full round-trip.

**`forgotPassword`:**
1. Find user by email — but respond the **same way** whether they exist or not (security — prevents email enumeration)
2. If user exists: generate OTP, hash it with bcrypt, store it via `prisma.passwordReset.create(...)` with a 10-minute expiry, email the plain code
3. Always respond: "If that email is registered, a code has been sent"

**`verifyOtp`:**
1. Find the `PasswordReset` record — must be `used: false` and `expiresAt` must be in the future
2. `bcrypt.compare(otp, record.otpHash)` — verify the submitted code
3. Generate a `resetToken` (32 random bytes) — this is the one-time key for the next step
4. Save the resetToken to the record via `prisma.passwordReset.update(...)`, return it to the frontend

**`resetPassword`:**
1. Find the `PasswordReset` record by `resetToken` — must not be used and not expired
2. Hash the new password and `prisma.user.update(...)` it
3. Mark the record `used: true` — cannot be reused
4. Issue a new token pair — the user is now automatically logged in

### `controllers/product.controller.ts`

**`getAll`** — demonstrates building a Prisma `where` clause at runtime, only when a query parameter is actually present:
```typescript
const filterConditions: any = {};
if (search)                       filterConditions.name = { contains: search, mode: "insensitive" };
if (category && category !== "All") filterConditions.category = category;

const products = await prisma.product.findMany({ where: filterConditions });
```
`mode: "insensitive"` means `"Tomato"` and `"tomato"` both match — Prisma's equivalent of a case-insensitive `LIKE`. The filter object starts empty and fields are added only when the query parameter exists, which produces exactly the right query for whatever the frontend sends.

**Redis caching:** before running that Prisma query at all, `getAll` builds a cache key from the search/category combination and checks Redis first — `redisClient.get(cacheKey)`. If it's a hit, the cached JSON is returned immediately and Prisma/MongoDB are never touched. If it's a miss, the Prisma query runs, and the result is stored back into Redis with `EX: CACHE_TTL` (one hour) before responding. Every `create`/`update`/`delete` calls `clearProductCache()` afterward, which deletes all `products:*` keys — so the cache can never go stale after an Admin changes the catalogue.

**Note:** this project doesn't currently paginate `getAll` — it returns every matching product in one response. Fine for a learning-sized catalogue; see the "Suggested next exercises" list in `PROJECT_GUIDE.md` for adding `skip`/`take` pagination as a follow-up exercise.

### `controllers/payment.controller.ts`

**`initiate`** — creates a `Pending` order (via `prisma.order.create`) with the real cart items and shipping address attached, then calls Paystack to start the transaction. If Paystack fails, the order record sits in `Pending` and can be cleaned up later. We return Paystack's `authorization_url` to the frontend, which redirects the browser there to complete payment.

**`verify`** — the frontend can call this after the user completes payment. We call Paystack's verify endpoint server-to-server, then hand off to `orderService.markOrderPaid()` (see §9 above) to actually update the order and decrement stock. We never trust the frontend — only Paystack's verify response counts.

**`webhook`** — Paystack calls this URL automatically when a payment event happens (even if the user closed their browser). It calls the exact same `orderService.markOrderPaid()` as `verify` does — which is precisely why that function needs to be safe to call twice for one order (see §9). The HMAC signature verification proves the request genuinely came from Paystack:

```typescript
const expected = crypto
  .createHmac("sha512", env.paystack.secretKey)
  .update(JSON.stringify(req.body))
  .digest("hex");

if (signature !== expected) { reject; }
```

HMAC is a one-way mathematical operation. Paystack computes the hash of the request body using your secret key and sends the result in the header. You compute the same hash. If they match, the request is genuine — no one can fake it without knowing your secret key.

**For the full how/why/when/where/what of this file's connection to Paystack — including a request-by-request diagram — see `PAYMENT_CONTROLLER_EXPLAINED.md` in the project root.**

### `controllers/admin.controller.ts` — a separate controller, on purpose

Every method here assumes `protect` + `authorize(UserRole.Admin)` already ran (applied once, to the whole router, in `admin.routes.ts` — see §14 below) — no method needs to re-check "is this an admin?" itself.

This is a genuinely **separate** controller from `product.controller.ts` / `payment.controller.ts`, rather than more methods bolted onto those — because everything in this file has no reason to exist for a non-admin, unlike products (publicly readable) or payments (initiated by customers). A few methods worth understanding in detail:

- **`getDashboard`** — runs eight+ independent queries via `Promise.all(...)` (user counts, product counts, order counts grouped by status, every paid order's amount/date, the 5 most recent orders, and the current list of active sessions) all **concurrently** rather than one after another, since none of them depend on each other's results. It then reduces the paid-orders list in plain JavaScript to compute today's/this-month's/all-time revenue.
- **`getOnlineUsers`** — built on the Redis-backed refresh-token store that already existed for login sessions (`tokenStore.service.ts`). A user counts as "online" if they have at least one refresh token still alive in Redis; `tokenStore.listActiveSessions()` scans for all of them, and this method groups the results back down to one row per user (with a device/session count).
- **`toggleUserBan`** — flips `isBanned`, and if the result is "now banned," also calls `tokenStore.revokeAll(userId)` so the ban takes effect immediately rather than waiting for their current access token to naturally expire (up to 15 minutes later).
- **`updateUserRole`** — refuses to demote the very last remaining `Admin` — otherwise the dashboard could lock every admin out permanently, and remember (see `ADMIN_SEEDING_EXPLAINED.md`) the public register form can never create a new one to recover.
- **`cancelOrder`** / **`updateOrderStatus`** — thin wrappers around `orderService.cancelOrder()` (§9) and a direct Prisma update respectively; cancelling has its own dedicated endpoint (with refund/restock logic) specifically so it can never be triggered accidentally through the more general "update status" route.
- **`getRevenue`** — see the note about grouping in plain JavaScript vs. a MongoDB aggregation pipeline in §9 (`order.service.ts`'s docstring covers the same tradeoff).
- **`uploadProductImage`** / **`deleteUploadedImage`** — see `IMAGE_UPLOAD_EXPLAINED.md` for the complete Multer + Cloudinary story; by the time `uploadProductImage`'s controller code runs, the actual upload has already happened in middleware.

---

## 14. routes/

Routes are the switchboard. They answer one question: "Which URL should call which function?"

### Route ordering matters:

```typescript
router.get("/categories", productController.getCategories);
router.get("/:id",        productController.getOne);
```

`/categories` must come before `/:id`. Express reads routes top to bottom. If `/:id` came first, a request to `/products/categories` would match `/:id` with `id = "categories"`, then fail trying to find a MongoDB document with that ID.

### Middleware stacking on a route:

```typescript
router.post("/register", authLimiter, validateRegister, authController.register);
```

Express runs these in order, left to right:
1. `authLimiter` — is this IP over the request limit?
2. `validateRegister` — are name, email, and password present and valid?
3. `authController.register` — if both pass, run the actual logic

If any step fails, `next(err)` or `res.status(...).json(...)` is called and the chain stops.

### `routes/admin.routes.ts` — applying middleware to a whole router at once

Every other route file in this project mixes public and protected routes, so each protected route repeats `protect, authorize(UserRole.Admin)` individually (see `product.routes.ts`). `admin.routes.ts` doesn't need to, because **every single route in the file** is admin-only:

```typescript
router.use(protect, authorize(UserRole.Admin));

router.get("/dashboard", adminController.getDashboard);
router.get("/users", adminController.getUsers);
// ...every other route below runs the same two checks first
```

`router.use(...)` with no path applies that middleware to every route defined on this router **after** this line — one line instead of repeating `protect, authorize(...)` eight separate times. This is also why `/users/online` is registered *before* `/users/:id` — same reason `/categories` has to come before `/:id` in `product.routes.ts`: Express matches top to bottom, and `/:id` would otherwise swallow `/online` as if `"online"` were an ID.

---

## 15. server.ts

This is the entry point — the first file that runs. Everything is wired together here.

**Middleware order matters:**
```typescript
app.use(helmetConfig);      // first — set security headers
app.use(cors(corsOptions));  // second — allow the right origins
app.use(compression());      // third — compress responses
app.use(express.json(...));  // fourth — parse request bodies
app.use(mongoSanitize());    // fifth — clean the parsed body
app.use(globalLimiter);      // sixth — check rate limits
```

CORS must come before routes so the headers are set on every response, including errors. Body parsing must come before `mongoSanitize` because sanitize works on the already-parsed body.

**The `bootstrap()` function:**
```typescript
async function bootstrap(): Promise<void> {
  await connectRedis();   // must succeed before listening
  app.listen(env.port, ...);
}
```

We connect to Redis first — if it's not reachable, `bootstrap()` throws and `process.exit(1)` shuts down the process, rather than starting a server that would silently fail every product request. Prisma, unlike Redis here, doesn't need an explicit "connect" step in `bootstrap()` — it connects to MongoDB automatically, lazily, the moment the very first query runs.

---

## 16. Authentication End to End

```
User fills Register form → clicks Submit
  ↓
Frontend: POST /auth/register { name, email, password }
  ↓
server.ts receives the request
  ↓
authLimiter: not over 10 attempts in 15 minutes? ✓
sanitizeBody: escape HTML characters ✓
validateRegister: name ≥ 2 chars, valid email, password ≥ 8 chars? ✓
  ↓
AuthController.register:
  - prisma.user.findUnique({ where: { email } }) → null (email not taken) ✓
  - userService.hashPassword(password) → bcrypt hash
  - prisma.user.create({ data: { name, email, password: hash, role: "Customer" } })
  - issueTokenPair(user) → { accessToken: "eyJhbGci...", refreshToken: "eyJhbGci..." }
  - emailService.sendWelcome() → sends welcome email (async, no await)
  - refresh token set as an httpOnly cookie; sendResponse(res, 201, true, "Account created.", { accessToken, user })
  ↓
Frontend receives: { success: true, data: { accessToken, user } }
  - setAccessToken(accessToken) → localStorage + memory (see client.js)
  - setUser(user) → AuthContext state
  - navigate to /shop (or wherever the user was headed)
```

**On every subsequent request:**
```
Frontend adds header: Authorization: Bearer eyJhbGci...
  ↓
protect middleware:
  - reads the token
  - verifyAccessToken(token) → { userId, email, role }
  - req.user = { userId, email, role }
  - next()
  ↓
Controller has access to req.user.userId to identify who is making the request
(and, for admin-only routes, the authorize(UserRole.Admin) middleware checks
 req.user.role before the controller ever runs — see §11 middleware/)
```

---

## 17. OTP Password Reset

```
Step 1 — Request the code
  Frontend: POST /auth/forgot-password { email: "ada@example.com" }
  
  otpLimiter: not over 5 OTP requests per hour? ✓
  validateForgotPassword: valid email format? ✓
  
  AuthController.forgotPassword:
    - prisma.user.findUnique({ where: { email } }) — check if user exists
    - generateOtp() → "482910" (plain text)
    - bcrypt.hash("482910", 12) → "$2b$12$..." (hash)
    - prisma.passwordReset.create({ data: { email, otpHash, expiresAt: +10min } })
    - emailService.sendOtp("ada@example.com", "482910")
      → email shows the plain "482910", hash stays in DB
    - ALWAYS respond: "If that email is registered, a code has been sent"
    
  Why always the same response?
    If we responded differently for "email not found", attackers could
    discover which emails are registered by checking the response.
    This is called "email enumeration" and is a security vulnerability.

Step 2 — Submit the code
  Frontend: POST /auth/verify-otp { email: "ada@example.com", otp: "482910" }
  
  validateVerifyOtp: valid email? otp is exactly 6 digits? ✓
  
  AuthController.verifyOtp:
    - prisma.passwordReset.findFirst({ where: { email, used: false, expiresAt: { gt: now } } })
    - bcrypt.compare("482910", "$2b$12$...") → true ✓
    - generateResetToken() → "3f4a5b6c..." (64 random hex chars)
    - prisma.passwordReset.update({ where: { id }, data: { resetToken } })
    - respond: { resetToken: "3f4a5b6c..." }
    
  Frontend stores resetToken temporarily (in React state — NOT localStorage)

Step 3 — Set the new password
  Frontend: POST /auth/reset-password { resetToken: "3f4a5b6c...", newPassword: "NewPass99!" }
  
  validateResetPassword: resetToken present? newPassword ≥ 8 chars? ✓
  
  AuthController.resetPassword:
    - prisma.passwordReset.findFirst({ where: { resetToken, used: false, expiresAt: { gt: now } } })
    - prisma.user.findUnique({ where: { email: record.email } })
    - userService.hashPassword("NewPass99!") → new hash
    - prisma.user.update({ where: { id: user.id }, data: { password: newHash } })
    - prisma.passwordReset.update({ where: { id }, data: { used: true } }) → cannot be reused
    - issueTokenPair(user) → new access + refresh tokens
    - respond: { accessToken, user } → user is now logged in
```

---

## 18. Payment Flow

```
User clicks "Pay $109.95"
  ↓
Frontend: POST /payments/initiate
  {
    email:   "ada@example.com",
    amount:  10995,            ← $109.95 × 100 (Paystack uses cents/kobo)
    orderId: "ORD-1234567890",
    metadata: { items: [...] }
  }
  ↓
protect: JWT verified → req.user.userId = "65a3f..." ✓
paymentLimiter: not over 20 payment attempts per hour? ✓
  ↓
PaymentController.initiate:
  - reference = "PTR-ORD-1234567890-1701234567890" (unique per transaction)
  - paystackService.initializeTransaction(email, 10995, reference)
      → calls https://api.paystack.co/transaction/initialize
      → with Authorization: Bearer sk_test_...  (secret key — backend only!)
      → Paystack returns { reference, access_code, authorization_url }
  - prisma.order.create({ data: { userId, items, totalAmount: 109.95, paymentReference: reference, paymentStatus: "Pending", shippingAddress } })
  - respond: { reference, access_code, authorization_url }
  ↓
Frontend receives authorization_url and redirects the browser there —
the customer enters card details ON PAYSTACK'S SITE, never inside this app
  ↓
Paystack redirects the customer back once payment finishes.
Frontend (or a callback page) can then: GET /payments/verify/PTR-ORD-1234567890-1701234567890
  ↓
PaymentController.verify:
  - paystackService.verifyTransaction(reference)
      → calls https://api.paystack.co/transaction/verify/PTR-ORD-...
      → Paystack confirms: { status: "success", amount: 10995, paid_at: "..." }
  - prisma.order.update({ where: { paymentReference: reference }, data: { paymentStatus: "Paid", paidAt: ... } })
  - emailService.sendOrderConfirmation(user.email, user.name, reference, 109.95)
  - respond: { status: "success", reference, amount: 109.95, paid_at: ... }
  ↓
Frontend shows success screen, clears cart

Also, separately:
  Paystack calls POST /payments/webhook automatically
  (even if user closed browser)
  ↓
PaymentController.webhook:
  - HMAC signature verified ✓
  - event = "charge.success" → prisma.order.update(...) → paymentStatus: "Paid"
```

---

## 19. Products from the Database

The frontend no longer has a hardcoded product array. Here is the new flow:

**Seeding (one time):**
```bash
npm run seed
```
This runs `src/utils/seed.ts`, which connects to MongoDB (through Prisma), deletes existing products, inserts a starter catalogue of raw-food/grocery products, and creates your one Admin account. Read `ADMIN_SEEDING_EXPLAINED.md` in the project root for the full story on why this script exists and how it's different from the public register form.

**Frontend calls:**
```
GET /products                          → every product (optionally filtered below)
GET /products?category=Vegetables      → filtered by exact category match
GET /products?search=tomato            → case-insensitive name search
GET /products/categories               → ["All", "Vegetables", "Grains & Cereals", ...]
GET /products/65a3f2b1c4d5e6f7a8b9c0d1  → single product by its Prisma-generated id
```

The frontend's `src/api/products.js` builds these calls with axios (see `FRONTEND_BACKEND_CONNECTION_EXPLAINED.md` for the full request/response walkthrough). The backend reads `req.query.search` / `req.query.category` in `product.controller.ts` and builds a Prisma `where` clause dynamically — see §13 above.

Each product has a real MongoDB id (a 24-character hex string, `_id` under the hood, exposed as `id` by Prisma — e.g. `65a3f2b1c4d5e6f7a8b9c0d1`). The frontend's `ProductDetail.jsx` page uses this id in its URL: `/product/65a3f2b1...`.

---

## 20. Security Layers

| Layer | File | Attacks Blocked |
|-------|------|----------------|
| HTTP headers | `security/helmet.security.ts` | XSS, clickjacking, MIME sniffing |
| CORS | `config/cors.ts` | Requests from unauthorized origins |
| Request size limit | `server.ts` | Large payload attacks |
| MongoDB sanitization | `server.ts` (`mongoSanitize`) | NoSQL injection ($gt, $where operators) |
| Input sanitization | `security/sanitize.security.ts` | HTML/script injection |
| Validation | `middleware/validate.middleware.ts` | Missing or malformed fields |
| Rate limiting | `security/rateLimiter.security.ts` | Brute force, DDoS, OTP spam |
| Password hashing | `services/user.service.ts` | Stolen database passwords |
| Account lockout | `services/user.service.ts` | Brute force login |
| Access-token verification | `middleware/auth.middleware.ts` (`protect`) | Unauthorized access to protected routes |
| **Role-based authorization** | `middleware/auth.middleware.ts` (`authorize`) | **Customers creating/editing/deleting products** |
| Webhook signature | `controllers/payment.controller.ts` | Fake payment notifications |
| Secret key isolation | `services/paystack.service.ts` | Exposed API keys |
| Email enumeration | `controllers/auth.controller.ts` | Discovering registered emails |
| Router-wide admin gate | `routes/admin.routes.ts` (`router.use(protect, authorize(Admin))`) | Any non-admin reaching ANY `/admin/*` route |
| Account ban + session revocation | `controllers/admin.controller.ts` + `services/tokenStore.service.ts` | A banned user continuing to use an active login |
| File type + size limits | `middleware/upload.middleware.ts` | Uploading non-image files or oversized files to Cloudinary |

---

## 21. Getting It Running

### Step 1 — Get Paystack keys (test mode)

1. Sign up at [dashboard.paystack.com](https://dashboard.paystack.com)
2. Toggle to **Test Mode** (top right)
3. Go to Settings → API Keys
4. Copy the Test Secret Key (`sk_test_...`) and Test Public Key (`pk_test_...`)

### Step 2 — Set up an email account for sending mail

1. Go to your Google Account → Security → 2-Step Verification (enable it)
2. Go to Security → App passwords
3. Create a new App password for "Mail"
4. Copy the 16-character password

### Step 3 — Install and configure

```bash
cd express-ts-backend
cp .env.example .env
```

Fill in `.env`:
- `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` — any long random strings (e.g. `openssl rand -hex 32`, run twice for two different values)
- `EMAIL_USER` / `EMAIL_PASS` — your Gmail address and the app password from Step 2
- `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` — from Step 1
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — whatever you want your first Admin login to be
- `FRONTEND_URL` — `http://localhost:5173` for local dev
- `DATABASE_URL` / `REDIS_URL` — leave the defaults if you're using Docker (see below); point them at your own MongoDB/Redis if you're not

**Option A — run everything in Docker (recommended):**
```bash
docker compose up -d --build
docker compose exec api npm run seed
```
The API is now at `http://localhost:5001`.

**Option B — run Node directly, Docker just for MongoDB/Redis:**
```bash
docker compose up -d mongo-db mongo-rs-init redis
npm install
npx prisma generate
npm run seed
npm run dev
```

### Step 4 — Point the frontend at the backend

In the frontend project's `.env` (copy from `.env.example`):
```
VITE_API_URL=http://localhost:5001/api
```

Then, in the frontend folder:
```bash
npm install
npm run dev    # http://localhost:5173
```

---

## 22. API Reference

All responses follow this shape:
```json
{ "success": true, "message": "Human-readable message.", "data": { } }
```

### Auth

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/auth/register` | No | `{ name, email, password }` (always creates a `Customer`) |
| POST | `/auth/login` | No | `{ email, password }` |
| POST | `/auth/refresh` | No (uses refresh cookie) | — |
| POST | `/auth/logout` | No | — |
| GET | `/auth/me` | ✅ Access token | — |
| POST | `/auth/forgot-password` | No | `{ email }` |
| POST | `/auth/verify-otp` | No | `{ email, otp }` |
| POST | `/auth/reset-password` | No | `{ resetToken, newPassword }` |

### Products

| Method | Endpoint | Auth | Query Params / Body |
|--------|----------|------|-------------|
| GET | `/products` | No | `category`, `search` |
| GET | `/products/categories` | No | — |
| GET | `/products/:id` | No | — |
| POST | `/products` | ✅ **Admin only** | `{ name, description, price, category, image, imagePublicId, stock }` |
| PUT | `/products/:id` | ✅ **Admin only** | any subset of the same fields |
| DELETE | `/products/:id` | ✅ **Admin only** | — |

### Payments

| Method | Endpoint | Auth | Body / Params |
|--------|----------|------|--------------|
| POST | `/payments/initiate` | ✅ Access token | `{ email, amount, orderId, metadata }` |
| GET | `/payments/verify/:reference` | ✅ Access token | URL param: `reference` |
| POST | `/payments/webhook` | Paystack signature | Paystack event body |

### Admin — everything below requires `router.use(protect, authorize(Admin))`

| Method | Endpoint | Body / Params |
|--------|----------|--------------|
| GET | `/admin/dashboard` | — |
| GET | `/admin/users` | — |
| GET | `/admin/users/online` | — |
| GET | `/admin/users/:id` | — |
| PATCH | `/admin/users/:id/ban` | — (toggles) |
| PATCH | `/admin/users/:id/role` | `{ role: "Admin" \| "Customer" }` |
| GET | `/admin/orders` | Query param: `status` (optional) |
| GET | `/admin/orders/:id` | — |
| PATCH | `/admin/orders/:id/cancel` | — |
| PATCH | `/admin/orders/:id/status` | `{ orderStatus: "Shipped" \| "Delivered" }` |
| GET | `/admin/revenue` | Query param: `period` = `daily` \| `monthly` |
| POST | `/admin/upload/product-image` | multipart form-data, field name `image` |
| DELETE | `/admin/upload/product-image` | `{ publicId }` |

---

*Every folder has one job. Every file has one job. When each piece does only its own thing, the system is easy to understand, easy to fix, and easy to grow.*
