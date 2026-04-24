# Evaluation Checklist

## 1. Project Setup & Running

- [x] **Code runs with provided instructions**
  - Server starts with `node src/index.js`
  - Runs at `http://localhost:5000`
  - Full instructions in `README.md` and `SUBMISSION.md`

- [x] **Docker support provided**
  - `docker-compose.yml` included — starts PostgreSQL on port `5433`
  - No PostgreSQL installation needed if Docker is available
  - Alternatively, works with any local PostgreSQL via `.env` configuration

- [x] **Database migrations applied automatically**
  - 5 migrations in `prisma/migrations/`
    - `20260420092345_init` — base users + refresh tokens
    - `20260420114213_otp` — OTP table
    - `20260420182850_init` — schema refinements
    - `20260424030015_add_device_scoping` — device_info + ip_address on refresh tokens
    - `20260424031309_add_totp_secret` — totp_secret on users
  - `pretest` script runs `prisma migrate deploy` automatically before `npm test`
  - No manual migration step needed

- [x] **Evaluator credentials**
  - Email: `testuser@gmail.com`
  - Password: `123456`
  - Tests auto-register and auto-cleanup — no manual setup needed

---

## 2. Authentication Flows Demonstrated

- [x] **Register** — `POST /register`
  - Validates email format and minimum password length (6 chars)
  - Hashes password with bcrypt (10 salt rounds) before storing
  - Returns 409 on duplicate email
  - Returns 422 on invalid input

- [x] **Login** — `POST /login`
  - Validates credentials against bcrypt hashed password
  - Issues access token (15 min) + refresh token (7 days) on success
  - Returns `requires2FA: true` and `userId` if 2FA is enabled on the account

- [x] **2FA Enable (SMS OTP)** — `POST /2fa/enable` *(requires Bearer token)*
  - Generates 6-digit OTP, logs to console (mock SMS delivery)
  - OTP expires in 5 minutes, max 5 attempts before lockout
  - OTP is single-use — marked as used after verification

- [x] **2FA Verify** — `POST /2fa/verify`
  - Validates OTP against `enable_2fa` purpose
  - Activates 2FA on the account on success

- [x] **2FA Login** — `POST /2fa/login/verify`
  - Completes login when 2FA is required
  - Issues full access + refresh token pair on success

---

## 3. TOTP — Google Authenticator (Bonus)

- [x] **TOTP Setup** — `POST /2fa/totp/setup` *(requires Bearer token)*
  - Generates a unique secret per user via `speakeasy`
  - Stores secret in DB, returns QR code as base64 PNG
  - Secret logged to console for evaluator reference

- [x] **TOTP Verify** — `POST /2fa/totp/verify` *(requires Bearer token)*
  - Verifies 6-digit TOTP code from Google Authenticator
  - `window: 1` tolerance applied for clock drift
  - Activates 2FA on success

- [x] **TOTP Login** — `POST /2fa/totp/login/verify`
  - Completes login using Google Authenticator code
  - Issues full token pair on success
  - No database lookup — verification is purely mathematical

---

## 4. Password Reset Flow Demonstrated

- [x] **Forgot Password** — `POST /forgot-password`
  - Generates cryptographically random 32-byte token (`crypto.randomBytes`)
  - Token expires in 1 hour
  - Token printed to server console (mock email delivery)

- [x] **Reset Password** — `POST /reset-password`
  - Validates token existence and checks expiry
  - Updates password hash, marks token as used
  - Token cannot be reused — returns 400 on second attempt

---

## 5. Token Flow Demonstrated

- [x] **Protected Route** — `GET /profile` *(requires Bearer token)*
  - Returns user profile data
  - Returns active sessions with `device_info` and `ip_address` per session
  - Returns 401 with missing or invalid token

- [x] **Refresh Token Rotation** — `POST /token/refresh`
  - Issues new access + refresh token pair on every call
  - Old refresh token immediately revoked
  - Refresh tokens stored as bcrypt hashes — raw token never in DB

- [x] **Refresh Token Reuse Detection** — `POST /token/refresh`
  - Presenting a used (rotated) token revokes ALL sessions for that user
  - Returns 403 on reuse attempt

- [x] **Logout** — `POST /logout`
  - Revokes the provided refresh token immediately
  - Subsequent refresh attempts with the same token return 403

---

## 6. Device Scoping (Bonus)

- [x] `User-Agent` and IP address captured on every token issuance
- [x] Stored per refresh token in `device_info` and `ip_address` columns
- [x] Active sessions with device info visible at `GET /profile`

---

## 7. Security Features

- [x] Passwords hashed with **bcrypt** (10 salt rounds)
- [x] JWT access tokens short-lived (15 min); refresh tokens long-lived (7 days)
- [x] Refresh tokens stored as **bcrypt hashes** — raw token never persisted
- [x] OTP attempt limiting — max 5 attempts, locked after limit
- [x] OTP single-use — marked `used: true` after verification
- [x] Reset tokens cryptographically random (`crypto.randomBytes(32)`)
- [x] Reset tokens expire in 1 hour and are invalidated after use
- [x] Input validation on all endpoints via **express-validator**
- [x] SQL injection prevention via **Prisma ORM** parameterized queries

---

## 8. Rate Limiting (Bonus)

- [x] Auth endpoints: 20 requests per 15 minutes
- [x] OTP endpoints: 10 requests per 15 minutes
- [x] OTP attempt limiting: max 5 attempts per OTP before lockout

---

## 9. Tests

- [x] **Test suite runnable via:**
  ```bash
  npm test
  ```

- [x] **`pretest` script handles everything automatically:**
  - Runs `prisma generate` — generates Prisma client
  - Runs `prisma migrate deploy` — applies all migrations
  - No manual setup needed before `npm test`

- [x] **Framework:** Jest + Supertest against a real PostgreSQL database

- [x] **25 tests passing** with auto-cleanup before and after all tests

- [x] **Full coverage:**

  | Area | Test Cases |
  |---|---|
  | Registration | Valid input, invalid email, short password, duplicate email |
  | Login | Success, wrong password, unknown email |
  | Profile | Valid token access, missing token rejection, active sessions with device info |
  | Refresh Token | Rotation, reuse attack detection, invalid token, re-login after revocation |
  | Forgot Password | Token generation, password reset, token reuse prevention, login with new password |
  | 2FA (SMS OTP) | Enable OTP, invalid OTP rejection, correct OTP verify, login requires 2FA, complete 2FA login |
  | Device Scoping | Active sessions contain device_info and ip_address |
  | Logout | Token revocation, refresh blocked after logout |

> TOTP flows verified manually via Postman + Google Authenticator as they require a real device.

---

## 10. Proof of Submission

- [x] **`PROOF_OF_SUBMISSION/` folder contains:**

  | File | Description |
  |---|---|
  | `challenge.txt` | Random 32-byte hex string generated with `openssl rand -hex 32` |
  | `compute_proof.sh` | Script that computes SHA256 and signs with ECDSA |
  | `proof.txt` | ECDSA signature of the SHA256 digest (DER format) |
  | `proof_pub.pem` | Public key for evaluator verification |

- [x] **Private key (`private.pem`) excluded from repo** via `.gitignore`
- [x] **Signature uses ECDSA secp256r1 (prime256v1)**
- [x] **SHA256 computed over exact concatenation:** `challenge + commit_hash` (no whitespace)

---

## 11. SUBMISSION.md

- [x] Included in repo root
- [x] Evaluator credentials documented
- [x] Quick start with Docker and local PostgreSQL options
- [x] Full API flow table (13 endpoints)
- [x] Exact `git rev-parse HEAD` output
- [x] Exact `sha256sum` output
- [x] Full `compute_proof.sh` script contents
- [x] All `PROOF_OF_SUBMISSION/` files documented
- [x] Security features documented
- [x] Demo video link

---

## 12. Bonus Features — All 4 Implemented

| Bonus Feature | Status | Details |
|---|---|---|
| Refresh token rotation + reuse detection | ✅ | Reuse revokes all sessions for that user immediately |
| Device scoping for refresh tokens | ✅ | User-Agent + IP stored per token, visible in `/profile` |
| TOTP — Google Authenticator | ✅ | Full setup + login flow via speakeasy + qrcode |
| Rate-limited endpoints + OTP attempt limiting | ✅ | 20 req/15min auth, 10 req/15min OTP, max 5 OTP attempts |
