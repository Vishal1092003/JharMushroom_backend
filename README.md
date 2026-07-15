# Mushroom Mart Backend

Express + MongoDB backend for the Mushroom Mart app. It provides authentication, product management, order management, and Razorpay order/payment verification APIs.

## Tech Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- bcrypt password hashing
- Razorpay server-side order creation and signature verification

## Folder Structure

```text
backend/
├── src/
│   ├── app.js                     # Express app, middleware, route mounting
│   ├── server.js                  # Loads env, connects DB, starts server
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      # Register, login, profile
│   │   ├── productController.js   # Product CRUD
│   │   └── orderController.js     # Orders and payment verification
│   ├── middlewares/
│   │   ├── authMiddleware.js      # JWT protect middleware
│   │   └── adminMiddleware.js     # Admin-only guard
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   └── orderRoutes.js
│   ├── services/
│   │   └── razorpayService.js
│   └── utils/
│       └── generateToken.js
├── package.json
├── package-lock.json
└── .gitignore
```

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file in the `backend` folder:

```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Start development server:

```bash
npm run dev
```

Start production server:

```bash
npm start
```

Health check:

```http
GET /api/v1/health
```

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `PORT` | No | Server port. Defaults to `8000`. |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign JWT tokens. |
| `RAZORPAY_KEY_ID` | For online payment | Razorpay public key ID. |
| `RAZORPAY_KEY_SECRET` | For online payment | Razorpay secret used to create orders and verify signatures. |

Do not commit `.env`. It is ignored by `.gitignore`.

## API Base URL

Local backend:

```text
http://localhost:8000/api/v1
```

Android emulator:

```text
http://10.0.2.2:8000/api/v1
```

Physical phone on same Wi-Fi:

```text
http://<your-mac-local-ip>:8000/api/v1
```

## Authentication

Authentication uses JWT Bearer tokens.

Send protected requests with:

```http
Authorization: Bearer <token>
```

### Register

```http
POST /api/v1/auth/register
```

Body:

```json
{
  "name": "Rohan",
  "email": "rohan@example.com",
  "password": "password123"
}
```

Response includes user details and JWT token.

### Login

```http
POST /api/v1/auth/login
```

Body:

```json
{
  "email": "rohan@example.com",
  "password": "password123"
}
```

### Get Profile

```http
GET /api/v1/auth/profile
```

Protected route.

## Products

### Get Products

```http
GET /api/v1/products
```

Public route. Returns available products.

### Get Product By ID

```http
GET /api/v1/products/:id
```

Public route.

### Create Product

```http
POST /api/v1/products
```

Admin-only route.

Body:

```json
{
  "name": "Button Mushroom",
  "description": "Fresh white button mushrooms",
  "pricePerUnit": 120,
  "unit": "250g pack",
  "stockQuantity": 40,
  "isAvailable": true,
  "harvestDate": "2026-07-15",
  "imageUrl": "https://example.com/image.jpg"
}
```

### Update Product

```http
PUT /api/v1/products/:id
```

Admin-only route.

### Delete Product

```http
DELETE /api/v1/products/:id
```

Admin-only route.

## Orders

All order routes require authentication.

### Create Order

```http
POST /api/v1/orders
```

Body:

```json
{
  "items": [
    {
      "product": "PRODUCT_ID",
      "name": "Button Mushroom",
      "quantity": 2,
      "pricePerUnit": 120
    }
  ],
  "deliveryAddress": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "paymentMethod": "COD",
  "subTotal": 240,
  "deliveryFee": 40,
  "totalAmount": 280
}
```

For online payment, use:

```json
{
  "paymentMethod": "ONLINE"
}
```

When `paymentMethod` is `ONLINE`, the backend creates a Razorpay order and stores `razorpayOrderId`.

### Verify Razorpay Payment

```http
POST /api/v1/orders/:id/verify
```

Body:

```json
{
  "razorpayPaymentId": "pay_xxxxx",
  "razorpaySignature": "signature_xxxxx"
}
```

If the signature is valid:

- `paymentStatus` becomes `COMPLETED`
- order `status` becomes `CONFIRMED`

### Get My Orders

```http
GET /api/v1/orders/myorders
```

Returns orders for the logged-in user.

### Get All Orders

```http
GET /api/v1/orders
```

Admin-only route.

### Update Order Status

```http
PUT /api/v1/orders/:id/status
```

Admin-only route.

Body:

```json
{
  "status": "PACKED"
}
```

Allowed statuses:

```text
PLACED
CONFIRMED
PACKED
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
```

## Data Models

### User

```text
name
email
password
role: customer | admin
resetPasswordToken
resetPasswordExpire
```

Passwords are hashed with bcrypt before saving.

### Product

```text
name
description
pricePerUnit
unit
stockQuantity
isAvailable
harvestDate
imageUrl
```

### Order

```text
user
items[]
deliveryAddress
subTotal
deliveryFee
totalAmount
paymentMethod: ONLINE | COD
paymentStatus: PENDING | COMPLETED | FAILED
razorpayOrderId
razorpayPaymentId
status
```

## Admin Access

Admin routes require:

1. Valid JWT token.
2. User role set to `admin`.

There is no seed script yet for creating an admin user. You can create a user normally, then update the role in MongoDB:

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## Current Limitations

- No request validation middleware yet.
- No centralized async error wrapper yet.
- No pagination/search for products or orders yet.
- No stock deduction logic when orders are placed.
- No refresh-token flow.
- No forgot-password email flow implemented yet, although reset fields exist in the `User` model.
- Razorpay verification exists, but the mobile app still needs to be wired to this backend flow.

## Git Notes

The backend `.gitignore` excludes:

- `.env`
- `node_modules/`
- logs
- build output
- coverage
- local editor/cache files

If `.env` or `node_modules` were committed earlier, remove them from tracking:

```bash
git rm -r --cached .env node_modules
git add .gitignore README.md
git commit -m "Remove local files from tracking and document backend"
```
