# Submission Guide

## Evaluator Credentials

| Field | Value |
|---|---|
| Email | testuser@gmail.com |
| Password | 123456 |

---

## Quick Start (Recommended)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Rajhulgeri-code/Auth-Migration-Task.git
cd Auth-Migration-Task
```

### Step 2 — Start PostgreSQL via Docker

Make sure Docker Desktop is installed and running, then:

```bash
docker-compose up db -d
```

This starts a PostgreSQL container on port `5433`. No PostgreSQL installation needed.

### Step 3 — Create your `.env` file

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/authdb"
ACCESS_TOKEN_SECRET="your_access_secret"
REFRESH_TOKEN_SECRET="your_refresh_secret"
```

### Step 4 — Install Dependencies

```bash
npm install
```

### Step 5 — Run Tests

```bash
npm test
```

The `pretest` script automatically runs `prisma generate` and `prisma migrate deploy` before tests execute. No manual migration step needed. All 22 tests should pass.

---

## Alternative — Using Your Own Local PostgreSQL

If you already have PostgreSQL installed, skip the Docker step and update your `.env`:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/authdb"
ACCESS_TOKEN_SECRET="your_access_secret"
REFRESH_TOKEN_SECRET="your_refresh_secret"
```

Then:

```bash
npm install
npm test
```

---

## Starting the Server for Manual Testing

```bash
node src/index.js
```

Server runs at `http://localhost:5000`

### Finding OTP & Reset Tokens

All OTPs and reset tokens are printed to the server console (mock delivery):

```
[OTP] enable_2fa OTP for user abc123: 847291
[AUTH] Password reset token for user@gmail.com: f3a9c1...
[AUTH] Tokens issued for user: abc123 | Device: PostmanRuntime/7.x | IP: ::ffff:127.0.0.1
```

---

## API Flow

| Step | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/register` | Register new user |
| 2 | POST | `/login` | Login — returns tokens or requires2FA |
| 3 | POST | `/2fa/enable` | Send OTP to enable 2FA (Bearer token required) |
| 4 | POST | `/2fa/verify` | Verify OTP to activate 2FA |
| 5 | POST | `/2fa/login/verify` | Complete login with OTP |
| 6 | GET | `/profile` | Get user profile + active sessions with device info |
| 7 | POST | `/token/refresh` | Rotate refresh token |
| 8 | POST | `/logout` | Revoke refresh token |
| 9 | POST | `/forgot-password` | Request password reset token |
| 10 | POST | `/reset-password` | Reset password using token |

---

## Security Features

- Password hashing with **bcrypt** (10 salt rounds)
- JWT access tokens (15 min) + refresh tokens (7 days)
- Refresh tokens **hashed with bcrypt** before storing — raw token never in DB
- Refresh token rotation + reuse detection — reuse revokes all sessions
- **Device scoping** — `User-Agent` and IP address stored per refresh token
- OTP expiration (5 min) and attempt limiting (max 5 attempts)
- Rate limiting — auth endpoints (20 req/15min), OTP endpoints (10 req/15min)
- Input validation with **express-validator**
- Cryptographically random reset tokens (`crypto.randomBytes`)

---

## Demo Video

*(Add video link here)*

---

## Proof of Submission (Critical Task)

### Step 1 — Generate `challenge.txt`

```bash
openssl rand -hex 32 > PROOF_OF_SUBMISSION/challenge.txt
cat PROOF_OF_SUBMISSION/challenge.txt
```

**Output:**
```
9388176f2d09602156c05f02361cc5bc62cca52bf1cd530a63b330d6998e47de
```

---

### Step 2 — Get the Latest Commit Hash

```bash
git rev-parse HEAD
```

**Output:**
```
38e335895c427d6eabee48906e5e1a7be0fa9ed7
```

---

### Step 3 — Compute the SHA256 Hash

```bash
echo -n "$(cat PROOF_OF_SUBMISSION/challenge.txt)$(git rev-parse HEAD)" | sha256sum
```

**Output:**
```
4e478e73a392d035b2c70a6dec0fb612d280666e87e920d4f9cc3c8d5e0486ab
```

---

### Step 4 — Run the Proof Script

```bash
cd PROOF_OF_SUBMISSION
chmod +x compute_proof.sh
./compute_proof.sh
```

**Output:**
```
Commit: 38e335895c427d6eabee48906e5e1a7be0fa9ed7
SHA256: 041d225634a84b69eee88fc068e0418de9ce9bee651b13721720a60f46ebaec1
read EC key
writing EC key
Proof generated successfully
```

---

### Final Repository Commit Hash (after push)

```bash
git rev-parse HEAD
```

**Output:**
```
aee96cf4914b0abd114da1937b08817b1b1ff2ff
```

---

### `compute_proof.sh` — Script Contents

```bash
#!/bin/bash
challenge=$(cat challenge.txt | tr -d '\n')
commit=$(git -C .. rev-parse HEAD)
echo "Commit: $commit"
data="${challenge}${commit}"
hash=$(echo -n "$data" | sha256sum | awk '{print $1}')
echo "SHA256: $hash"
openssl ecparam -genkey -name prime256v1 -noout -out private.pem
openssl ec -in private.pem -pubout -out proof_pub.pem
echo -n "$hash" | openssl dgst -sha256 -sign private.pem -out proof.txt
echo "Proof generated successfully"
```

---

### Files in `PROOF_OF_SUBMISSION/`

| File | Description |
|---|---|
| `challenge.txt` | Randomly generated 32-byte hex string |
| `compute_proof.sh` | Script that computes and signs the proof |
| `proof.txt` | ECDSA signature of the SHA256 digest (DER format) |
| `proof_pub.pem` | Public key for signature verification |

---

### Verification Notes

- `challenge.txt` was generated locally using `openssl rand -hex 32`
- SHA256 computed over exact concatenation of `challenge + commit_hash` (no whitespace)
- Signature uses ECDSA with curve **secp256r1 (prime256v1)**
- Private key (`private.pem`) generated locally and excluded from repo via `.gitignore`
- Public key `proof_pub.pem` included for evaluator verification
