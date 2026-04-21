const request = require("supertest");
const app = require("../src/index");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let accessToken = "";
let refreshToken = "";
let userId = "";
let resetToken = "";
let otpCode = "";

const testUser = {
  email: "testuser@gmail.com",
  password: "123456"
};

describe("Auth Flow", () => {

  /* ---------------- CLEANUP BEFORE ---------------- */
  beforeAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      await prisma.otp.deleteMany({ where: { user_id: user.id } });
      await prisma.refreshToken.deleteMany({ where: { user_id: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  /* ---------------- INPUT VALIDATION ---------------- */
  it("should reject invalid email on register", async () => {
    const res = await request(app)
      .post("/register")
      .send({ email: "notanemail", password: "123456" });
    expect(res.statusCode).toBe(422);
  });

  it("should reject short password on register", async () => {
    const res = await request(app)
      .post("/register")
      .send({ email: "test@gmail.com", password: "123" });
    expect(res.statusCode).toBe(422);
  });

  /* ---------------- REGISTER ---------------- */
  it("should register user", async () => {
    const res = await request(app).post("/register").send(testUser);
    expect(res.statusCode).toBe(201);
    userId = res.body.id;
  });

  it("should reject duplicate registration", async () => {
    const res = await request(app).post("/register").send(testUser);
    expect(res.statusCode).toBe(409);
  });

  /* ---------------- LOGIN ---------------- */
  it("should reject login with wrong password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: testUser.email, password: "wrongpass" });
    expect(res.statusCode).toBe(400);
  });

  it("should reject login for unknown email", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "nouser@gmail.com", password: "123456" });
    expect(res.statusCode).toBe(400);
  });

  it("should login user", async () => {
    const res = await request(app).post("/login").send(testUser);
    expect(res.statusCode).toBe(200);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  /* ---------------- PROFILE ---------------- */
  it("should access profile", async () => {
    const res = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(200);
  });

  it("should reject profile without token", async () => {
    const res = await request(app).get("/profile");
    expect(res.statusCode).toBe(401);
  });

  /* ---------------- REFRESH ---------------- */
  it("should refresh token", async () => {
    const res = await request(app)
      .post("/token/refresh")
      .send({ refreshToken });

    expect(res.statusCode).toBe(200);

    // 🔥 IMPORTANT: keep old token for reuse test
    oldRefreshToken = refreshToken;

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it("should detect refresh token reuse attack", async () => {
    const res = await request(app)
      .post("/token/refresh")
      .send({ refreshToken: oldRefreshToken });

    expect(res.statusCode).toBe(403);
  });

  it("should fail invalid refresh token", async () => {
    const res = await request(app)
      .post("/token/refresh")
      .send({ refreshToken: "invalid" });

    expect(res.statusCode).toBe(403);
  });

  /* ---------------- FORGOT PASSWORD ---------------- */
  it("should generate reset token", async () => {
    const res = await request(app)
      .post("/forgot-password")
      .send({ email: testUser.email });

    expect(res.statusCode).toBe(200);

    const record = await prisma.otp.findFirst({
      where: { user_id: userId, purpose: "forgot_password", used: false }
    });

    resetToken = record.code;
  });

  it("should reset password", async () => {
    const res = await request(app)
      .post("/reset-password")
      .send({ token: resetToken, newPassword: "newpass123" });

    expect(res.statusCode).toBe(200);
  });

  it("should reject reused reset token", async () => {
    const res = await request(app)
      .post("/reset-password")
      .send({ token: resetToken, newPassword: "again123" });

    expect(res.statusCode).toBe(400);
  });

  it("should login with new password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: testUser.email, password: "newpass123" });

    expect(res.statusCode).toBe(200);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  /* ---------------- 2FA ---------------- */
  it("should send 2FA enable OTP", async () => {
    const res = await request(app)
      .post("/2fa/enable")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);

    const record = await prisma.otp.findFirst({
      where: { user_id: userId, purpose: "enable_2fa", used: false }
    });

    otpCode = record.code;
  });

  it("should enable 2FA", async () => {
    const res = await request(app)
      .post("/2fa/verify")
      .send({ userId, otp: otpCode });

    expect(res.statusCode).toBe(200);
  });

  it("should require 2FA on login", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: testUser.email, password: "newpass123" });

    expect(res.body.requires2FA).toBe(true);

    const record = await prisma.otp.findFirst({
      where: { user_id: userId, purpose: "login", used: false }
    });

    otpCode = record.code;
  });

  it("should complete 2FA login", async () => {
    const res = await request(app)
      .post("/2fa/login/verify")
      .send({ userId, otp: otpCode });

    expect(res.statusCode).toBe(200);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  /* ---------------- LOGOUT ---------------- */
  it("should logout user", async () => {
    const res = await request(app)
      .post("/logout")
      .send({ refreshToken });

    expect(res.statusCode).toBe(200);
  });

  it("should fail refresh after logout", async () => {
    const res = await request(app)
      .post("/token/refresh")
      .send({ refreshToken });

    expect(res.statusCode).toBe(403);
  });

});

/* ---------------- CLEANUP AFTER ---------------- */
afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email: testUser.email } });

  if (user) {
    await prisma.otp.deleteMany({ where: { user_id: user.id } });
    await prisma.refreshToken.deleteMany({ where: { user_id: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  await prisma.$disconnect();
});