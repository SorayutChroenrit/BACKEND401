import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { User } from "../users/model";
import { verifyJWT } from "../../middleware/middleware";

require("dotenv").config();
export const auth = express.Router();

// Configure Nodemailer transport with Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: Number(process.env.MAILTRAP_PORT),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phonenumber:
 *                 type: string
 *               idcard:
 *                 type: string
 *               company:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully.
 *       400:
 *         description: Email, phone number, or ID card already in use.
 *       500:
 *         description: Internal server error.
 */

// Register Route
auth.post("/register", async (req: Request, res: Response) => {
  // const contentType = req.headers["content-type"];

  // if (!contentType || contentType !== "application/json") {
  //   return res.status(401).json({
  //     code: "Error-01-0001",
  //     status: "Error",
  //     message: "Invalid Header",
  //   });
  // }
  console.log(req.headers);
  console.log(req.body);
  const { name, email, phonenumber, idcard, company, password } = req.body;

  if (!name || !email || !phonenumber || !idcard || !company || !password) {
    return res.status(401).json({
      code: "Error-01-0002",
      status: "Error",
      message: "Missing required field.",
    });
  }

  try {
    // Check if idcard, email, or phonenumber already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phonenumber }, { idcard }],
    });

    if (existingUser) {
      let conflictField = "";

      if (existingUser.email === email) {
        conflictField = "email";
      } else if (existingUser.phonenumber === phonenumber) {
        conflictField = "phonenumber";
      } else if (existingUser.idcard === idcard) {
        conflictField = "idcard";
      }

      return res.status(400).json({
        code: "Error-01-0002",
        status: "Error",
        message: `This ${conflictField} is already in use. Please check again`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = uuidv4();

    const newUser = new User({
      userId: userId,
      name,
      email,
      phonenumber,
      idcard,
      company,
      password: hashedPassword,
      role: "user",
      status: "Active",
    });

    await newUser.save();
    res.status(200).json({
      code: "Success-01-0001",
      status: "ok",
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({
      code: "Error-01-0003",
      status: "Error",
      message: "Internal server error",
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful.
 *       400:
 *         description: Invalid email or password.
 *       500:
 *         description: Internal server error.
 */

// Login Route
auth.post("/login", async (req: Request, res: Response) => {
  const contentType = req.headers["content-type"];
  // console.log(headers);
  // console.log(contentType);

  if (!contentType || contentType !== "application/json") {
    return res.status(401).json({
      code: "Error-01-0001",
      status: "Error",
      message: "Invalid Header.",
    });
  }

  // Destructure the body after verifying content-type
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({
      code: "Error-01-0002",
      status: "Error",
      message: "Missing required field.",
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        code: "Error-01-0002",
        status: "Error",
        message: "User not found.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Invalid Password.",
      });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      {
        expiresIn: "2h",
      }
    );

    res.cookie("token", token, {
      // httpOnly: true,
      secure: true,
      maxAge: 7200000, // 2 hour
      sameSite: "strict",
    });

    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Login successful",
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      code: "Error-01-0003",
      status: "Error",
      message: "Internal server error.",
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "Success-01-0001"
 *                 status:
 *                   type: string
 *                   example: "Success"
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "Error-01-0003"
 *                 status:
 *                   type: string
 *                   example: "Error"
 *                 message:
 *                   type: string
 *                   example: "Internal server error."
 */

// Logout Route
auth.post("/logout", verifyJWT, (req, res) => {
  try {
    res.clearCookie("token", {
      secure: true,
      sameSite: "strict",
    });

    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({
      code: "Error-01-0003",
      status: "Error",
      message: "Internal server error.",
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent.
 *       400:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */

// Forgot Password Route
auth.post("/forgot-password", async (req, res) => {
  const headers: any = req.headers;
  const contentType = headers["content-type"];

  // console.log(headers);
  // console.log(contentType);

  if (!contentType || contentType !== "application/json") {
    return res.status(401).json({
      code: "Error-01-0001",
      status: "Error",
      message: "Invalid Header.",
    });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(401).json({
      code: "Error-01-0002",
      status: "Error",
      message: "Invalid Body.",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        code: "Error-01-0003",
        status: "Error",
        message: "User not found",
      });
    }
    const resetToken = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      {
        expiresIn: "1h",
      }
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log("Reset URL generated:", resetUrl);
    await transporter.sendMail({
      from: "sorayutchroenrit@gmail.com",
      to: email,
      subject: "Password Reset Request",
      text: `Click the following link to reset your password: ${resetUrl}`,
    });

    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Password reset email sent",
    });
  } catch (error) {
    console.error("Error in forgot-password route:", error);
    res.status(500).json({
      code: "Error-01-0004",
      status: "Error",
      message: "An error occurred",
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful.
 *       400:
 *         description: Invalid or expired token.
 *       500:
 *         description: Internal server error.
 */

// Reset Password Route
auth.post("/reset-password", async (req, res) => {
  const contentType = req.headers["content-type"];

  // console.log(headers);
  // console.log(contentType);

  if (!contentType || contentType !== "application/json") {
    return res.status(401).json({
      code: "Error-01-0001",
      status: "Error",
      message: "Invalid Header.",
    });
  }

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(401).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Missing required field.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as jwt.JwtPayload;

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({
        code: "Error-01-0003",
        status: "Error",
        message: "Invalid or expired token",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      code: "Success-01-0003",
      status: "Success",
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Error resetting password", error);
    res.status(400).json({
      code: "Error-01-0003",
      status: "Error",
      message: "Invalid or expired token",
    });
  }
});