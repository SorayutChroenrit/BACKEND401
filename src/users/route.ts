import express, { Request, Response } from "express";
import multer from "multer";
import cloudinary from "cloudinary";
import streamifier from "streamifier";
import dotenv from "dotenv";
import { User } from "./model";
import { verifyJWT } from "../../middleware/middleware";
import { Course } from "../course/model";
const moment = require("moment");

dotenv.config();

export const user = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

user.get("/user", verifyJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId; // This will now correctly retrieve the `userId` from the token
    // console.log("Decoded userId:", userId);

    if (!userId) {
      return res.status(400).json({
        code: "ERROR-00-0003",
        status: "error",
        message: "Invalid user ID in token",
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        code: "ERROR-00-0004",
        status: "error",
        message: "User not found",
      });
    }
    // console.log(user);

    return res.status(200).json({
      code: "Success-00-0001",
      status: "Success",
      data: user,
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      code: "ERROR-00-0005",
      status: "error",
      message: "Internal server error",
    });
  }
});

user.get("/users/:userId", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        code: "ERROR-00-0003",
        status: "error",
        message: "Invalida no user ID",
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        code: "ERROR-00-0004",
        status: "error",
        message: "User not found",
      });
    }
    // console.log(user);

    return res.status(200).json({
      code: "Success-00-0001",
      status: "Success",
      data: user,
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      code: "ERROR-00-0005",
      status: "error",
      message: "Internal server error",
    });
  }
});

user.get("/users", verifyJWT, async (req, res) => {
  try {
    const courses = await User.find();
    return res.status(200).json({
      code: "Success-00-0001",
      status: "ok",
      data: courses,
      message: "User retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      code: "Error-01-0006",
      status: "Error",
      message: "Failed to retrieve courses",
    });
  }
});

user.post("/registerCourse", verifyJWT, async (req, res) => {
  const contentType = req.headers["content-type"];

  // Validate content type
  if (!contentType || contentType !== "application/json") {
    return res.status(400).json({
      code: "Error-01-0001",
      status: "Error",
      message: "Invalid Headers",
    });
  }

  const { userId, courseId } = req.body;

  // Validate input data
  if (!userId || !courseId) {
    return res.status(400).json({
      code: "Error-02-0001",
      status: "Error",
      message: "User ID and Course ID are required",
    });
  }

  try {
    // Fetch course and user
    const course = await Course.findOne({ courseId });
    if (!course) {
      return res.status(404).json({
        code: "Error-02-0002",
        status: "Error",
        message: "Course not found",
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        code: "Error-02-0003",
        status: "Error",
        message: "User not found",
      });
    }

    // Validate application period
    const now = new Date();
    const { startDate, endDate } = course.applicationPeriod || {};
    if (!startDate || !endDate) {
      return res.status(400).json({
        code: "Error-02-0004",
        status: "Error",
        message: "Application period is not defined for this course",
      });
    }

    if (now < new Date(startDate) || now > new Date(endDate)) {
      return res.status(400).json({
        code: "Error-02-0005",
        status: "Error",
        message: "Registration is not open during this period",
      });
    }

    // Check for duplicate registration
    if (user.trainingInfo.some((info) => info.courseId === courseId)) {
      return res.status(400).json({
        code: "Error-02-0006",
        status: "Error",
        message: "Course already registered",
      });
    }

    // Check for conflicting dates
    const isConflicting = user.trainingInfo.some((info) => {
      if (!info.courseDate) return false;
      return (
        new Date(info.courseDate).getTime() ===
        new Date(course.courseDate).getTime()
      );
    });

    if (isConflicting) {
      return res.status(400).json({
        code: "Error-02-0007",
        status: "Error",
        message: "A course is already scheduled for this date and time",
      });
    }

    // Check seat availability
    if (course.currentEnrollment >= course.enrollmentLimit) {
      return res.status(400).json({
        code: "Error-02-0008",
        status: "Error",
        message: "Course is fully booked",
      });
    }

    // Register user for the course
    user.trainingInfo.push({
      _id: course._id,
      courseId: course.courseId,
      courseName: course.courseName,
      description: course.description,
      location: course.location,
      courseImage: course.imageUrl,
      courseDate: course.courseDate,
    });

    // Increment course's current enrollment
    course.currentEnrollment += 1;
    course.registeredUsers.push({
      _id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      phonenumber: user.phonenumber,
      idcard: user.idcard,
      company: user.company,
    });

    await user.save();
    await course.save();

    // Respond with updated data
    res.status(200).json({
      code: "Success-01-0001",
      status: "ok",
      message: "Register successfully",
    });
  } catch (error) {
    console.error("Error updating training info:", error);
    res.status(500).json({
      code: "Error-02-0009",
      status: "Error",
      message: "Internal server error",
    });
  }
});

user.post(
  "/user/updateUser",
  upload.single("Avatar"),
  async (req: Request, res: Response) => {
    const contentType = req.headers["content-type"];

    // Check for valid content type
    if (!contentType || contentType !== "application/json") {
      return res.status(400).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Invalid Headers",
      });
    }
    // console.log("Headers:", req.headers);
    // console.log("Body:", req.body);
    // console.log("File:", req.file);

    const { userId, ...updateFields } = req.body;

    try {
      // Validate `userId`
      if (!userId) {
        return res.status(400).json({
          code: "Error-01-0004",
          status: "Error",
          message: "User ID is required",
        });
      }

      // Update course in the database
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({
          code: "Error-01-0002",
          status: "Error",
          message: "User not found",
        });
      }

      // If an image is uploaded, handle it (e.g., upload to Cloudinary)
      if (req.file) {
        updateFields.imageUrl = req.file.path;
      }

      const updateResponse = await User.updateOne(
        { userId },
        { $set: updateFields }
      );

      return res.status(200).json({
        code: "Success-01-0001",
        status: "Success",
        message: "User updated successfully",
        data: updateResponse,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({
        code: "Error-01-0003",
        status: "Error",
        message: "Failed to update user",
      });
    }
  }
);
