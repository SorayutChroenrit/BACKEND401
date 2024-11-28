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

// get all courses
carousel.get("/carousels", async (req: Request, res: Response) => {
  const carousel = await Carousel.find();

  // Send a successful response
  const response = {
    code: "Success-00-0002",
    status: "Success",
    message: "Courses retrieved successfully",
    data: carousel,
  };
  res.status(200).json(response);
});

// create new course
carousel.post(
  "/createCarousel",
  upload.single("courseImage"),
  async (req: MulterRequest, res: Response) => {
    const {
      courseName,
      courseCode,
      description,
      location,
      enrollmentLimit,
      price,
      courseTag,
      courseDate,
      applicationPeriod,
    } = req.body;

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Missing required image file",
      });
    }

    const enrollmentLimitNumber = Number(enrollmentLimit);
    if (
      isNaN(enrollmentLimitNumber) ||
      enrollmentLimitNumber < 1 ||
      enrollmentLimitNumber > 99
    ) {
      return res.status(400).json({
        code: "Error-01-0004",
        status: "Error",
        message: "Enrollment limit must be a valid number between 1 and 99",
      });
    }

    try {
      const stream = streamifier.createReadStream(file.buffer);
      const uploadResponse = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            resource_type: "image",
            public_id: courseName.replace(/\s+/g, "_"),
            folder: "CarouselImage",
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );

        // Pipe the stream to the upload stream
        stream.pipe(uploadStream);
      });

      // Create course
      const courseId = uuidv4();
      const courseData = {
        courseId,
        courseName,
        courseCode,
        description,
        location,
        enrollmentLimit: enrollmentLimitNumber,
        price,
        courseTag,
        courseDate,
        applicationPeriod,
        imageUrl: uploadResponse.secure_url,
        createDate: new Date(),
      };

      await Carousel.collection.insertOne(courseData);

      const response: ResponseObject = {
        code: "Success-00-0001",
        status: "Success",
        message: "Course created successfully",
        data: { imageUrl: uploadResponse.secure_url },
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      return res.status(500).json({
        code: "Error-01-0005",
        status: "Error",
        message: "Failed to upload image to Cloudinary",
      });
    }
  }
);

// delete course by id
carousel.delete("course/:courseId", async (req: Request, res: Response) => {
  const { carouselId } = req.params;

  try {
    const deletedCourse = await Carousel.findOneAndDelete({ carouselId });

    if (!deletedCourse) {
      return res.status(404).json({
        code: "Error-01-0008",
        status: "Error",
        message: "Course not found",
      });
    }

    const response: ResponseObject = {
      code: "Success-00-0003",
      status: "Success",
      message: "Course deleted successfully",
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error deleting course from MongoDB:", error);
    return res.status(500).json({
      code: "Error-01-0009",
      status: "Error",
      message: "Failed to delete course",
    });
  }
});
