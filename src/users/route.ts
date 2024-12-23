import express, { Request, Response } from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import cloudinary from "cloudinary";
import streamifier from "streamifier";
import dotenv from "dotenv";
import { User } from "./model";
import { verifyJWT } from "../../middleware/middleware";
import { v4 as uuidv4 } from "uuid";

const moment = require("moment");

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

dotenv.config();

export const user = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * @swagger
 * /api/v1/user:
 *   get:
 *     summary: Retrieve user details
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: Success-01-0001
 *                 status:
 *                   type: string
 *                   example: Success
 *                 message:
 *                   type: string
 *                   example: User retrieved successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid user ID in token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: Error-01-0001
 *                 status:
 *                   type: string
 *                   example: Error
 *                 message:
 *                   type: string
 *                   example: Invalid user ID in token.
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: Error-01-0002
 *                 status:
 *                   type: string
 *                   example: Error
 *                 message:
 *                   type: string
 *                   example: User not found.
 *       500:
 *         description: Internal server error.
 */

user.get("/user", verifyJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(400).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Invalid user ID in token",
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        code: "Error-01-0002",
        status: "Error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error",
    });
  }
});
/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Retrieve a user by ID
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to retrieve
 *     responses:
 *       200:
 *         description: User retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: User ID is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error.
 */

user.get("/users/:userId", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        code: "Error-01-0001",
        status: "Error",
        message: "User ID is required",
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        code: "Error-01-0002",
        status: "Error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error",
    });
  }
});

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Retrieve all users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Failed to retrieve users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */

user.get("/users", verifyJWT, async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    return res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      code: "Error-01-0004",
      status: "Error",
      message: "Failed to retrieve users",
    });
  }
});

/**
 * @swagger
 * /api/v1/user/updateUser:
 *   post:
 *     summary: Update a user's details
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user to update
 *               Avatar:
 *                 type: string
 *                 format: binary
 *                 description: The avatar image file
 *               otherFields:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *     responses:
 *       200:
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: User ID is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to update user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */

user.post(
  "/user/updateUser",
  verifyJWT,
  upload.single("avatar"),
  async (req: MulterRequest, res: Response) => {
    // Log headers to confirm content type
    console.log("Headers:", req.headers);

    const contentType = req.headers["content-type"];

    if (!contentType || !contentType.includes("multipart/form-data")) {
      return res.status(400).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Invalid Headers",
      });
    }

    // Log body and file
    // console.log("Body:", req.body);
    // console.log("File:", req.file);

    try {
      const { userId, ...updateFields } = req.body;

      if (!userId) {
        console.log("Missing userId");
        return res.status(400).json({
          code: "Error-02-0002",
          status: "Error",
          message: "User ID is required",
        });
      }

      const user = await User.findOne({ userId });
      if (!user) {
        console.log("User not found:", userId);
        return res.status(404).json({
          code: "Error-02-0003",
          status: "Error",
          message: "User not found",
        });
      }

      if (req.file) {
        try {
          const stream = streamifier.createReadStream(req.file.buffer);
          const uploadResponse = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.v2.uploader.upload_stream(
              {
                resource_type: "image",
                public_id: `${userId}_avatar`,
                folder: "UserAvatars",
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            stream.pipe(uploadStream);
          });

          console.log("File uploaded successfully:", uploadResponse.secure_url);
          updateFields.avatar = uploadResponse.secure_url;
        } catch (error) {
          console.error("Error during file upload:", error);
          return res.status(500).json({
            code: "Error-02-0004",
            status: "Error",
            message: "Failed to upload image",
          });
        }
      } else {
        console.log("No file uploaded. Skipping image upload.");
      }

      console.log("Update fields:", updateFields);

      const updateResponse = await User.updateOne(
        { userId },
        { $set: updateFields }
      );

      console.log("Update response:", updateResponse);

      if (!updateResponse.modifiedCount) {
        return res.status(400).json({
          code: "Error-02-0006",
          status: "Error",
          message: "No changes were made to the user",
        });
      }

      return res.status(200).json({
        code: "Success-01-0003",
        status: "Success",
        message: "User updated successfully",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({
        code: "Error-02-0005",
        status: "Error",
        message: "Failed to update user",
      });
    }
  }
);

// Register Route
user.post("/createAccount", async (req: Request, res: Response) => {
  const contentType = req.headers["content-type"];

  console.log(req.headers);
  console.log(req.body);

  if (!contentType || contentType !== "application/json") {
    return res.status(401).json({
      code: "Error-01-0001",
      status: "Error",
      message: "Invalid Header",
    });
  }

  const { name, email, phonenumber, idcard, company, password } = req.body;

  if (!name || !email || !phonenumber || !idcard || !company || !password) {
    return res.status(400).json({
      code: "Error-02-0001",
      status: "Error",
      message: "Missing required fields.",
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
      code: "Success-01-0002",
      status: "ok",
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error",
    });
  }
});
