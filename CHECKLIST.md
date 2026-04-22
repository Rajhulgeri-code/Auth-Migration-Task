# Evaluation Checklist

## 1. Project Setup & Running

- [x] **Code runs with provided instructions**
  - No Docker required
  - Server starts with `node src/index.js`
  - Runs at `http://localhost:5000`
  - Full instructions in `README.md` and `SUBMISSION.md`

- [x] **Database migrations applied**
  - 3 migrations included in `prisma/migrations/`
  - Run with `npx prisma migrate dev`
  - Uses PostgreSQL via Prisma + PrismaPg adapter

- [x] **Evaluator credentials available**
  - Email: `testuser@gmail.com`
  - Password: `123456`
  - Or register a fresh user via `POST /register`

---

## 2. Authentication Flows Demonstrated

- [x] **Register** — `POST /register`
  - Validates email format and minimum password length (6 chars)
  - Hashes password with bcrypt before storing
  - Returns 409 on duplicate email

- [x] **Login** — `POST /login`
  - Validates credentials against hashed password
  - Issues access token (15min) + refresh token (7 days) on success
  - If 2FA is enabled, returns `requires2FA: true` instead of tokens

- [x] **2FA Enable** — `POST /2fa/enable` *(requires Bearer token)*
  - Generates 6-digit OTP, logs to console (mock delivery)
  - OTP expires in 5 minutes, max 5 attempts

- [x] **2FA Verify** — `POST /2fa/verify`
  - Validates OTP and sets `is_2fa_enabled: true` on user

- [x] **2FA Login** — `POST /2fa/login/verify`
  - Completes login flow when 2FA is required
  - Issues full token pair on success

---

## 3. Password Reset Flow Demonstrated

- [x] **Forgot Password** — `POST /forgot-password`
  - Generates cryptographically random 32-byte token (`crypto.randomBytes`)
  - Token expires in 1 hour
  - Token printed to server console (mock delivery)

- [x] **Reset Password** — `POST /reset-password`
  - Validates token, checks expiry
  - Updates password hash, marks token as used
  - Token cannot be reused (returns 400)

---

## 4. Token Flow Demonstrated

- [x] **Protected Route** — `GET /profile` *(requires Bearer token)*
  - Returns user profile data
  - Returns 401 with missing token
  - Returns 401 with invalid/expired token

- [x] **Refresh Token Rotation** — `POST /token/refresh`
  - Issues new access + refresh token pair
  - Old refresh token immediately revoked
  - Refresh tokens stored as **bcrypt hashes** — raw token never in DB

- [x] **Refresh Token Reuse Detection** — `POST /token/refresh`
  - If a previously used token is presented, **all sessions for that user are revoked**
  - Returns 403 on reuse attempt

- [x] **Logout** — `POST /logout`
  - Revokes the provided refresh token immediately
  - Subsequent refresh attempts with same token return 403

---

## 5. Tests

- [x] **Test suite runnable via:**
  ```bash
  npm test
  ```

- [x] **Framework:** Jest + Supertest

- [x] **Database:** Tests run against real PostgreSQL DB, auto-cleanup before and after

- [x] **Full coverage:**

  | Area | Test Cases |
  |---|---|
  | Registration | Valid, invalid email, short password, duplicate |
  | Login | Success, wrong password, unknown email |
  | Profile | Valid token access, missing token rejection |
  | Refresh Token | Rotation, reuse attack, invalid token |
  | Forgot Password | Token generation, reset, token reuse prevention |
  | 2FA | Enable, verify, login with OTP |
  | Logout | Revocation, refresh blocked after logout |

---

## 6. Proof of Submission

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

## 7. SUBMISSION.md

- [x] Included in repo root
- [x] Contains evaluator credentials
- [x] Step-by-step run instructions
- [x] Exact `git rev-parse HEAD` output
- [x] Exact `sha256sum` output
- [x] Full `compute_proof.sh` script contents
- [x] Complete API flow table
- [x] Security features documented
- [x] Files included in `PROOF_OF_SUBMISSION/` documented
