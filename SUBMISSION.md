# Submission Guide

## Evaluator Credentials

| Field    | Value                  |
|----------|------------------------|
| Email    | testuser@gmail.com     |
| Password | 123456                 |

---

## Running Locally

### 1. Clone the Repository

```bash
git clone https://github.com/Rajhulgeri-code/Auth-Migration-Task.git
cd Auth-Migration-Task
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/authdb"
ACCESS_TOKEN_SECRET="your_access_secret"
REFRESH_TOKEN_SECRET="your_refresh_secret"
```

### 4. Set Up the Database

```bash
npx prisma migrate dev
```

### 5. Start the Server

```bash
node src/index.js
```

Server runs at `http://localhost:5000`

---

## Automated Testing (Recommended)

The project includes a complete automated test suite using **Jest** and **Supertest**.

```bash
npm test
```

### Test Coverage

**Authentication**
- User registration (valid + invalid inputs)
- Duplicate registration handling
- Login (correct + wrong credentials)

**Token System**
- Access + refresh token generation
- Refresh token rotation
- Refresh token reuse detection (security feature)
- Logout + token revocation

**2FA (OTP)**
- Enable 2FA
- OTP generation and verification
- Invalid OTP handling
- OTP reuse prevention

**Forgot Password**
- Reset token generation
- Password reset flow
- Token reuse prevention

**Protected Routes**
- Access with valid token
- Rejection with missing/invalid token

> **Tip:** Run `npm test` before manual testing to verify all flows.

---

## Manual Testing (Optional)

You can test the API manually using **Postman**, **cURL**, or any REST client.

### Finding OTP & Reset Tokens

This project uses a mock delivery system — tokens are printed to the server console:

```
[OTP] login OTP: 123456
[AUTH] Password reset token: abc123...
```

---

## API Flow

| Step | Endpoint              |
|------|-----------------------|
| 1    | `POST /register`      |
| 2    | `POST /login`         |
| 3    | `POST /2fa/enable`    |
| 4    | `POST /2fa/verify`    |
| 5    | `POST /2fa/login/verify` |
| 6    | `GET  /profile`       |
| 7    | `POST /token/refresh` |
| 8    | `POST /logout`        |
| 9    | `POST /forgot-password` |
| 10   | `POST /reset-password` |

---

## Security Features

- Password hashing with **bcrypt**
- **JWT** authentication (access + refresh tokens)
- Refresh token rotation + reuse detection
- OTP expiration and attempt limiting
- Rate limiting on auth endpoints
- Input validation with **express-validator**

---

## Proof of Submission

```
PROOF_OF_SUBMISSION/
├── challenge.txt
├── proof.txt
├── proof_pub.pem
└── compute_proof.sh
```

---

## Demo Video

*(Add video link here)*

---

## Notes

- OTP and reset tokens are logged to the console (mock delivery system)
- Designed with production-level authentication practices
