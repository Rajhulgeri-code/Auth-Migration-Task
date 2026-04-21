const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(express.json());

/* ---------------- RATE LIMITERS ---------------- */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many requests, please try again later" }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many OTP attempts, please try again later" }
});

/* ---------------- INPUT VALIDATION ---------------- */
const validateRegister = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const validatePassword = [
  body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: errors.array()[0].msg });
    return false;
  }
  return true;
}

/* ---------------- AUTH MIDDLEWARE ---------------- */
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    req.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

/* ---------------- REGISTER ---------------- */
app.post("/register", authLimiter, validateRegister, async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password_hash }
  });

  console.log(`[AUTH] User registered: ${email}`);
  res.status(201).json({ id: user.id, email: user.email, created_at: user.created_at });
});

/* ---------------- LOGIN ---------------- */
app.post("/login", authLimiter, validateLogin, async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    console.log(`[AUTH] Failed login attempt: ${email}`);
    return res.status(400).json({ error: "Invalid password" });
  }

  console.log(`[AUTH] Login success: ${email}`);

  if (user.is_2fa_enabled) {
    const otp = generateOTP();
    await createOTP(user.id, otp, "login");
    return res.json({ requires2FA: true, userId: user.id });
  }

  return issueTokens(user.id, res);
});

/* ---------------- OTP HELPERS ---------------- */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createOTP(userId, code, purpose) {
  console.log(`[OTP] ${purpose} OTP for user ${userId}: ${code}`);

  await prisma.otp.create({
    data: {
      user_id: userId,
      code,
      purpose,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    }
  });
}

const MAX_OTP_ATTEMPTS = 5;

async function validateOTP(userId, code, purpose) {
  const record = await prisma.otp.findFirst({
    where: { user_id: userId, purpose, used: false },
    orderBy: { created_at: "desc" }
  });

  if (!record) return { valid: false, error: "Invalid OTP" };

  // Check attempts before anything else
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    return { valid: false, error: "Too many failed attempts, request a new OTP" };
  }

  // Increment attempt counter
  await prisma.otp.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } }
  });

  if (record.expires_at < new Date()) {
    return { valid: false, error: "OTP has expired" };
  }

  if (record.code !== code) {
    return { valid: false, error: "Invalid OTP" };
  }

  // Mark as used
  await prisma.otp.update({
    where: { id: record.id },
    data: { used: true }
  });

  return { valid: true };
}

/* ---------------- ENABLE 2FA ---------------- */
app.post("/2fa/enable", authMiddleware, async (req, res) => {
  const otp = generateOTP();
  await createOTP(req.user.userId, otp, "enable_2fa");
  res.json({ message: "OTP sent" });
});

/* ---------------- VERIFY 2FA ---------------- */
app.post("/2fa/verify", otpLimiter, async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) return res.status(422).json({ error: "userId and otp are required" });

  const result = await validateOTP(userId, otp, "enable_2fa");
  if (!result.valid) return res.status(400).json({ error: result.error });

  await prisma.user.update({
    where: { id: userId },
    data: { is_2fa_enabled: true }
  });

  console.log(`[AUTH] 2FA enabled for user: ${userId}`);
  res.json({ message: "2FA enabled" });
});

/* ---------------- LOGIN OTP ---------------- */
app.post("/2fa/login/verify", otpLimiter, async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) return res.status(422).json({ error: "userId and otp are required" });

  const result = await validateOTP(userId, otp, "login");
  if (!result.valid) return res.status(400).json({ error: result.error });

  return issueTokens(userId, res);
});

/* ---------------- TOKEN ISSUE + ROTATION ---------------- */
async function issueTokens(userId, res) {
  const accessToken = jwt.sign(
    { userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  const tokenHash = await bcrypt.hash(refreshToken, 10);

  await prisma.refreshToken.create({
    data: {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  console.log(`[AUTH] Tokens issued for user: ${userId}`);
  res.json({ accessToken, refreshToken });
}

/* ---------------- REFRESH (WITH ROTATION) ---------------- */
app.post("/token/refresh", authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const tokens = await prisma.refreshToken.findMany({
      where: { user_id: decoded.userId }
    });

    let matched = null;

    for (let t of tokens) {
      if (await bcrypt.compare(refreshToken, t.token_hash)) {
        matched = t;
        break;
      }
    }

    // 🔥 REUSE DETECTION (CORE CHANGE)
    if (!matched) {
      console.log(`[SECURITY] Refresh token reuse detected for user ${decoded.userId}`);

      await prisma.refreshToken.updateMany({
        where: { user_id: decoded.userId },
        data: { revoked: true }
      });

      return res.status(403).json({
        error: "Token reuse detected. All sessions revoked."
      });
    }

    if (matched.revoked) {
      console.log(`[SECURITY] Reuse of revoked token for user ${decoded.userId}`);

      await prisma.refreshToken.updateMany({
        where: { user_id: decoded.userId },
        data: { revoked: true }
      });

      return res.status(403).json({
        error: "Token reuse detected. All sessions revoked."
      });
    }

    // ✅ NORMAL ROTATION
    await prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revoked: true }
    });

    console.log(`[AUTH] Token rotated for user: ${decoded.userId}`);

    return issueTokens(decoded.userId, res);

  } catch {
    return res.status(403).json({ error: "Invalid refresh token" });
  }
});

/* ---------------- LOGOUT ---------------- */
app.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  const tokens = await prisma.refreshToken.findMany({
    where: { revoked: false }
  });

  let found = false;

  for (let t of tokens) {
    if (await bcrypt.compare(refreshToken, t.token_hash)) {
      await prisma.refreshToken.update({
        where: { id: t.id },
        data: { revoked: true }
      });
      found = true;
      break;
    }
  }

  if (!found) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  console.log(`[AUTH] User logged out, token revoked`);
  res.json({ message: "Logged out" });
});

/* ---------------- FORGOT PASSWORD ---------------- */
app.post("/forgot-password", authLimiter, [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required")
], async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: "User not found" });

  // Use crypto for cryptographically random token
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");

  await prisma.otp.create({
    data: {
      user_id: user.id,
      code: token,
      purpose: "forgot_password",
      expires_at: new Date(Date.now() + 3600000)
    }
  });

  console.log(`[AUTH] Password reset token for ${email}: ${token}`);
  res.json({ message: "Reset token generated" });
});

/* ---------------- RESET PASSWORD ---------------- */
app.post("/reset-password", [
  body("token").notEmpty().withMessage("Token is required"),
  ...validatePassword
], async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { token, newPassword } = req.body;

  const record = await prisma.otp.findFirst({
    where: { code: token, purpose: "forgot_password", used: false }
  });

  if (!record || record.expires_at < new Date()) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const password_hash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: record.user_id },
    data: { password_hash }
  });

  await prisma.otp.update({
    where: { id: record.id },
    data: { used: true }
  });

  console.log(`[AUTH] Password reset for user: ${record.user_id}`);
  res.json({ message: "Password reset successful" });
});

/* ---------------- PROTECTED PROFILE ROUTE ---------------- */
app.get("/profile", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      is_active: true,
      is_2fa_enabled: true,
      created_at: true
    }
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(user);
});

/* ---------------- SERVER ---------------- */
if (require.main === module) {
  app.listen(5000, () => console.log("Server started on port 5000"));
}

module.exports = app;