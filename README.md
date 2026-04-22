# Auth Backend — JWT + 2FA + Forgot Password

A production-grade authentication backend built with Node.js and Express, using PostgreSQL via Prisma. All authentication logic lives in a single, well-structured `src/index.js` — covering JWT token management, two-factor authentication via OTP, refresh token rotation with reuse detection, and a complete password reset flow.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | PostgreSQL |
| ORM | Prisma + PrismaPg adapter |
| Authentication | JWT (Access + Refresh Tokens) |
| Password Hashing | bcrypt (passwords + refresh token hashes) |
| 2FA | OTP — 6-digit, time-limited, attempt-limited |
| Validation | express-validator |
| Rate Limiting | express-rate-limit |
| Testing | Jest + Supertest |

---

## Project Structure

```
auth-backend/
├── prisma/
│   ├── migrations/
│   │   ├── 20260420092345_init/migration.sql
│   │   ├── 20260420114213_otp/migration.sql
│   │   └── 20260420182850_init/migration.sql
│   ├── schema.prisma
│   └── migration_lock.toml
├── PROOF_OF_SUBMISSION/
│   ├── challenge.txt
│   ├── compute_proof.sh
│   ├── proof.txt
│   └── proof_pub.pem
├── src/
│   └── index.js            # All routes, middleware, and logic
├── tests/
│   └── auth.test.js
├── docker-compose.yml
├── .env.example
├── package.json
├── prisma.config.ts
├── CHECKLIST.md
├── SUBMISSION.md
└── README.md
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Rajhulgeri-code/Auth-Migration-Task.git
cd Auth-Migration-Task
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL

Choose the option that suits your setup:

---

#### Option A — Using Docker (recommended, no PostgreSQL installation needed)

Make sure Docker Desktop is installed and running, then:

```bash
docker-compose up db -d
```

This starts a fresh PostgreSQL instance in a container on port `5433`. Then set your `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/authdb"
ACCESS_TOKEN_SECRET="your_access_secret"
REFRESH_TOKEN_SECRET="your_refresh_secret"
```

---

#### Option B — Using your own local PostgreSQL

If PostgreSQL is already installed on your machine, create the database and point your `.env` to it:

```sql
CREATE DATABASE authdb;
```

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/authdb"
ACCESS_TOKEN_SECRET="your_access_secret"
REFRESH_TOKEN_SECRET="your_refresh_secret"
```

---

### 4. Run Tests

`npm test` automatically handles Prisma client generation and migrations before running the test suite:

```bash
npm test
```

That's it — no manual migration step needed.

### 5. Start the Server (optional, for manual testing)

```bash
node src/index.js
```

Server runs at `http://localhost:5000`

---

## API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new user |
| POST | `/login` | No | Login with email + password |
| GET | `/profile` | Yes | Access protected user profile |
| POST | `/token/refresh` | No | Rotate refresh token |
| POST | `/logout` | No | Revoke refresh token |
| POST | `/2fa/enable` | Yes | Send OTP to enable 2FA |
| POST | `/2fa/verify` | No | Verify OTP and activate 2FA |
| POST | `/2fa/login/verify` | No | Complete login with OTP |
| POST | `/forgot-password` | No | Request password reset token |
| POST | `/reset-password` | No | Reset password using token |

---

## Running Tests

```bash
npm test
```

The `pretest` script automatically runs `prisma generate` and `prisma migrate deploy` before the test suite executes. The test suite uses **Jest + Supertest** and runs a complete end-to-end flow against a real database, cleaning up before and after all tests automatically.

### What's Tested

| Area | Cases Covered |
|---|---|
| Registration | Valid input, invalid email, short password, duplicate email |
| Login | Success, wrong password, unknown email |
| Profile | Access with valid token, rejection without token |
| Refresh Token | Rotation, reuse attack detection, invalid token |
| Forgot Password | Token generation, password reset, token reuse prevention |
| 2FA | Enable OTP, verify OTP, login with OTP |
| Logout | Token revocation, refresh fails after logout |

---

## OTP & Reset Token Delivery

This project uses a **mock delivery system** — all OTPs and reset tokens are printed to the server console:

```
[OTP] enable_2fa OTP for user abc123: 847291
[AUTH] Password reset token for user@gmail.com: f3a9c1...
```

---

## Security Features

**JWT Tokens**
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Refresh tokens are **hashed with bcrypt** before storing — raw token never saved in DB
- Token rotation on every refresh — old token is revoked immediately
- Reuse detection — if an already-used refresh token is presented, **all sessions for that user are revoked**

**OTP / 2FA**
- 6-digit OTP, expires in 5 minutes
- Maximum 5 attempts per OTP — locked after limit
- OTP marked as used after successful verification — cannot be reused
- Separate OTP purposes: `enable_2fa`, `login`, `forgot_password`

**Passwords**
- Hashed with bcrypt (10 salt rounds)
- Reset tokens are cryptographically random (32 bytes via `crypto.randomBytes`)
- Reset tokens expire in 1 hour and are invalidated after use

**Rate Limiting**
- Auth endpoints: 20 requests per 15 minutes
- OTP endpoints: 10 requests per 15 minutes

---

## Bonus Features Implemented

The following optional features from the brief were implemented:

- **Refresh token reuse detection** — presenting a used refresh token immediately revokes all sessions for that user
- **OTP attempt limiting** — OTP is locked after 5 failed attempts, preventing brute force

---

## Evaluator Credentials

| Field | Value |
|---|---|
| Email | testuser@gmail.com |
| Password | 123456 |

> See `SUBMISSION.md` for full proof of submission details and exact commands run.
