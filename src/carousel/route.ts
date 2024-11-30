import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import dotenv from "dotenv";
import cloudinary from "cloudinary";
import streamifier from "streamifier";
import { Carousel } from "./model";
import { verifyJWT } from "../../middleware/middleware";
dotenv.config();

export const carousel = express();
const upload = multer({ storage: multer.memoryStorage() });

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface ResponseObject {
  code: string;
  status: string;
  data?: object;
  message?: string;
}

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * @swagger
 * /api/v1/carousels:
 *   get:
 *     summary: Retrieve all carousels
 *     tags: [Carousel]
 *     responses:
 *       200:
 *         description: Carousels retrieved successfully.
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: Success-00-0002
 *                 status:
 *                   type: string
 *                   example: Success
 *                 message:
 *                   type: string
 *                   example: Carousels retrieved successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       carouselId:
 *                         type: string
 *                       carouselImageUrl:
 *                         type: string
 *       500:
 *         description: Failed to retrieve carousels.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: Error-01-0004
 *                 status:
 *                   type: string
 *                   example: Error
 *                 message:
 *                   type: string
 *                   example: Failed to retrieve carousels.
 */

// Get all carousels
carousel.get("/carousels", async (req: Request, res: Response) => {
  try {
    const carousels = await Carousel.find();

    const response: ResponseObject = {
      code: "Success-00-0002",
      status: "Success",
      message: "Carousels retrieved successfully.",
      data: carousels,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error retrieving carousels:", error);
    return res.status(500).json({
      code: "Error-01-0004",
      status: "Error",
      message: "Failed to retrieve carousels.",
    });
  }
});

/**
 * @swagger
 * /api/v1/createCarousel:
 *   post:
 *     summary: Create a new carousel
 *     tags: [Carousel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               carouselImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Carousel created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: Success-00-0001
 *                 status:
 *                   type: string
 *                   example: Success
 *                 message:
 *                   type: string
 *                   example: Carousel created successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *       400:
 *         description: Missing required image file.
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
 *                   example: Missing required image file.
 *       500:
 *         description: Failed to upload image to Cloudinary.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: Error-01-0005
 *                 status:
 *                   type: string
 *                   example: Error
 *                 message:
 *                   type: string
 *                   example: Failed to upload image to Cloudinary.
 */

// Create new carousel
carousel.post(
  "/createCarousel",
  upload.single("carouselImage"),
  verifyJWT,
  async (req: MulterRequest, res: Response) => {
    const contentType = req.headers["content-type"];

    // Check for valid content type
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return res.status(400).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Invalid Headers",
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Missing required image file.",
      });
    }

    try {
      const stream = streamifier.createReadStream(file.buffer);
      const uploadResponse = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            resource_type: "image",
            public_id: `carousel_${Date.now()}`,
            folder: "CarouselImage",
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );

        stream.pipe(uploadStream);
      });

      const carouselId = uuidv4();
      const carouselData = {
        carouselId,
        carouselImageUrl: uploadResponse.secure_url,
      };

      await Carousel.collection.insertOne(carouselData);

      const response: ResponseObject = {
        code: "Success-01-0001",
        status: "Success",
        message: "Carousel created successfully.",
        // data: { imageUrl: uploadResponse.secure_url },
      };
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      return res.status(500).json({
        code: "Error-01-0005",
        status: "Error",
        message: "Failed to upload image to Cloudinary.",
      });
    }
  }
);
