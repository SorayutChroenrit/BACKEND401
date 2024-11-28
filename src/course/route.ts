import express, { Request, Response } from "express";
import multer from "multer";
import dotenv from "dotenv";
import cloudinary from "cloudinary";
import streamifier from "streamifier";
import { Course } from "./model";
import { Snowflake } from "@sapphire/snowflake";
import { verifyJWT } from "../../middleware/middleware";
import { User } from "../users/model";
dotenv.config();
export const course = express();

const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const upload = multer({ storage: multer.memoryStorage() });
const EPOCH = BigInt(Date.now());
const snowflake = new Snowflake(EPOCH);

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Retrieve all courses
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []  # Indicates the need for a JWT token
 *     responses:
 *       200:
 *         description: Courses retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "Success-00-0002"
 *                 status:
 *                   type: string
 *                   example: "Success"
 *                 message:
 *                   type: string
 *                   example: "Courses retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "1234abcd"
 *                       courseName:
 *                         type: string
 *                         example: "Introduction to Programming"
 *                       courseCode:
 *                         type: string
 *                         example: "CS101"
 *                       description:
 *                         type: string
 *                         example: "A beginner's course in programming"
 *                       location:
 *                         type: string
 *                         example: "Online"
 *                       enrollmentLimit:
 *                         type: integer
 *                         example: 50
 *                       courseTag:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["new course", "programming"]
 *                       courseDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-01T00:00:00Z"
 *                       applicationPeriod:
 *                         type: object
 *                         properties:
 *                           startDate:
 *                             type: string
 *                             format: date
 *                             example: "2023-12-01"
 *                           endDate:
 *                             type: string
 *                             format: date
 *                             example: "2023-12-31"
 *                       imageUrl:
 *                         type: string
 *                         example: "https://example.com/image.png"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "Error-00-0001"
 *                 status:
 *                   type: string
 *                   example: "Error"
 *                 message:
 *                   type: string
 *                   example: "Internal server error."
 */

// Get all courses
course.get("/courses", verifyJWT, async (req: Request, res: Response) => {
  try {
    // Fetch all courses from the database
    const courses = await Course.find();

    // Send a successful response
    res.status(200).json({
      code: "Success-00-0001",
      status: "Success",
      message: "Courses retrieved successfully",
      data: courses,
    });
  } catch (error) {
    console.error("Error retrieving courses:", error);

    // Send an error response
    res.status(500).json({
      code: "Error-00-0001",
      status: "Error",
      message: "Internal server error.",
    });
  }
});

// find course by id
course.get(
  "/courses/:courseId",
  verifyJWT,
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      // console.log("Fetching courseId:", courseId);
      const course = await Course.findOne({ courseId });

      if (!course) {
        return res.status(404).json({
          code: "Error-01-0007",
          status: "Error",
          message: "Course not found",
        });
      }

      res.status(200).json({
        code: "Success-00-0001",
        status: "Success",
        message: "Course retrieved successfully",
        data: course,
      });
    } catch (error) {
      return res.status(500).json({
        code: "Error-01-0006",
        status: "Error",
        message: "Failed to retrieve course",
      });
    }
  }
);

// create new course
course.post(
  "/createCourse",
  verifyJWT,
  upload.single("courseImage"),
  async (req: MulterRequest, res: Response) => {
    const contentType = req.headers["content-type"];

    console.log(req.headers);
    // // Check for valid content type
    // if (!contentType || contentType !== "multipart/form-data") {
    //   return res.status(400).json({
    //     code: "Error-01-0001",
    //     status: "Error",
    //     message: "Invalid Headers",
    //   });
    // }

    const {
      courseName,
      courseCode,
      description,
      location,
      enrollmentLimit,
      price,
      courseTag,
      hours,
      courseDate,
      applicationPeriod,
    } = req.body;

    console.log(req.body);

    console.log(hours);

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

    const hoursNumber = Number(hours);
    if (isNaN(hoursNumber) || hoursNumber < 1 || hoursNumber > 24) {
      return res.status(400).json({
        code: "Error-01-0004",
        status: "Error",
        message: "Hours  must be a valid number between 1 and 24",
      });
    }

    let parsedCourseTag;
    try {
      parsedCourseTag = JSON.parse(courseTag);
    } catch (error) {
      return res.status(400).json({
        code: "Error-01-0005",
        status: "Error",
        message: "Invalid courseTag format",
      });
    }

    // Validate applicationPeriod
    let parsedApplicationPeriod;
    try {
      parsedApplicationPeriod =
        typeof applicationPeriod === "string"
          ? JSON.parse(applicationPeriod)
          : applicationPeriod;

      const { from, to } = parsedApplicationPeriod || {};

      if (!from || !to) {
        return res.status(400).json({
          code: "Error-01-0006",
          status: "Error",
          message:
            "Both startDate and endDate are required in applicationPeriod",
        });
      }

      const startDate = new Date(from);
      const endDate = new Date(to);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          code: "Error-01-0007",
          status: "Error",
          message: "Invalid date format for startDate or endDate",
        });
      }

      if (startDate >= endDate) {
        return res.status(400).json({
          code: "Error-01-0008",
          status: "Error",
          message: "startDate must be earlier than endDate",
        });
      }

      parsedApplicationPeriod = { startDate, endDate };
    } catch (error) {
      return res.status(400).json({
        code: "Error-01-0009",
        status: "Error",
        message: "Invalid applicationPeriod format",
      });
    }

    try {
      // Upload image to Cloudinary
      const stream = streamifier.createReadStream(file.buffer);
      const uploadResponse = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            resource_type: "image",
            public_id: courseName.replace(/\s+/g, "_"),
            folder: "CourseImage",
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

      // Create a Stripe product
      const stripeProduct = await stripe.products.create({
        name: courseName,
        description,
        images: [uploadResponse.secure_url],
        metadata: {
          courseId: snowflake.generate().toString(),
          courseCode,
          location,
          enrollmentLimit: enrollmentLimitNumber.toString(),
          courseDate,
        },
      });

      // Create a price for the product in THB
      const stripePrice = await stripe.prices.create({
        unit_amount: Number(price) * 100, // Convert to satangs
        currency: "thb", // Set currency to Thai Baht
        product: stripeProduct.id,
      });

      console.log(hours);
      // Prepare course data for MongoDB
      const courseId = snowflake.generate().toString();
      const courseData = {
        courseId,
        courseName,
        courseCode,
        description,
        location,
        hours: hoursNumber,
        enrollmentLimit: enrollmentLimitNumber,
        price: stripePrice.unit_amount / 100,
        courseTag: parsedCourseTag,
        courseDate,
        applicationPeriod: parsedApplicationPeriod,
        imageUrl: uploadResponse.secure_url,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        createDate: new Date(),
        isPublished: false,
      };

      // Insert course into the database
      await Course.collection.insertOne(courseData);

      const response = {
        code: "Success-00-0001",
        status: "Success",
        message: "Course created successfully",
        data: { imageUrl: uploadResponse.secure_url, stripeProduct },
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({
        code: "Error-01-0005",
        status: "Error",
        message: "Failed to create course",
      });
    }
  }
);

course.post("/verify-id", verifyJWT, async (req: Request, res: Response) => {
  const contentType = req.headers["content-type"];

  // Check for valid content type
  if (!contentType || contentType !== "application/json") {
    return res.status(400).json({
      code: "Error-01-0001",
      status: "Error",
      message: "Invalid Headers",
    });
  }

  const { idcard } = req.body;
  if (!idcard || typeof idcard !== "string") {
    return res.status(400).json({
      code: "Error-01-0002",
      status: "Error",
      message: "Missing or invalid ID Card field.",
    });
  }

  try {
    // Query the User database for the given ID card
    const user = await User.findOne({ idcard });

    if (!user) {
      return res.status(404).json({
        code: "Error-01-0004",
        status: "Error",
        message: "ID Card not found in the system.",
      });
    }

    // If user is found, respond with success
    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "ID Card verified successfully.",
    });
  } catch (error) {
    console.error("Error during ID card verification:", error);
    res.status(500).json({
      code: "Error-01-0005",
      status: "Error",
      message: "Internal server error.",
    });
  }
});

course.post(
  "/course/updateCourse",
  verifyJWT,
  upload.single("courseImage"), // Handle file upload
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

    const { courseId, courseTag, ...updateFields } = req.body;

    let parsedCourseTag = [];
    if (courseTag) {
      try {
        parsedCourseTag = JSON.parse(courseTag);
      } catch (error) {
        return res.status(400).json({
          code: "Error-01-0005",
          status: "Error",
          message: "Invalid courseTag format",
        });
      }
    }

    try {
      // Validate `courseId`
      if (!courseId) {
        return res.status(400).json({
          code: "Error-01-0004",
          status: "Error",
          message: "Course ID is required",
        });
      }

      // Update course in the database
      const course = await Course.findOne({ courseId });
      if (!course) {
        return res.status(404).json({
          code: "Error-01-0002",
          status: "Error",
          message: "Course not found",
        });
      }

      // If an image is uploaded, handle it (e.g., upload to Cloudinary)
      if (req.file) {
        updateFields.imageUrl = req.file.path; // Adjust based on your storage solution
      }

      const updateResponse = await Course.updateOne(
        { courseId },
        { $set: updateFields }
      );

      return res.status(200).json({
        code: "Success-01-0001",
        status: "Success",
        message: "Course updated successfully",
        data: updateResponse,
      });
    } catch (error) {
      console.error("Error updating course:", error);
      return res.status(500).json({
        code: "Error-01-0003",
        status: "Error",
        message: "Failed to update course",
      });
    }
  }
);

course.post("/generateCode", verifyJWT, async (req: Request, res: Response) => {
  const { courseId } = req.body;

  try {
    // Validate input
    if (!courseId) {
      return res.status(400).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Course ID is required",
      });
    }

    // Find the course
    const course = await Course.findOne({ courseId });
    if (!course) {
      return res.status(404).json({
        code: "Error-01-0003",
        status: "Error",
        message: "Course not found",
      });
    }

    const { courseDate, hours, generatedCode, generatedCodeTimestamp } = course;

    // Validate required fields
    if (!courseDate || !hours) {
      return res.status(400).json({
        code: "Error-01-0007",
        status: "Error",
        message: "Course date and hours are required to generate a code.",
      });
    }

    // Calculate course start and end times in UTC
    const courseStartTime = new Date(courseDate);
    const courseEndTime = new Date(courseStartTime);
    courseEndTime.setHours(courseStartTime.getHours() + hours);

    // Get the current time adjusted for GMT+7
    const currentTime = new Date();
    const currentTimeGMTPlus7 = new Date(
      currentTime.getTime() + 7 * 60 * 60 * 1000 // Adjust to GMT+7
    );

    // Debugging logs
    // console.log("Current Time (UTC):", currentTime.toISOString());
    // console.log("Current Time (GMT+7):", currentTimeGMTPlus7.toISOString());
    // console.log("Course Start (UTC):", courseStartTime.toISOString());
    // console.log("Course End (UTC):", courseEndTime.toISOString());

    // Check if the current time (adjusted to GMT+7) is within the course period
    if (currentTimeGMTPlus7 < courseStartTime) {
      return res.status(400).json({
        code: "Error-01-0004",
        status: "Error",
        message: "Code cannot be generated before the course starts.",
      });
    }

    if (currentTimeGMTPlus7 > courseEndTime) {
      return res.status(400).json({
        code: "Error-01-0005",
        status: "Error",
        message: "The code generation period has expired.",
      });
    }

    // Validate if a code has already been generated within the course period
    if (generatedCode && generatedCodeTimestamp) {
      const codeTimestamp = new Date(generatedCodeTimestamp);

      // Ensure the `generatedCodeTimestamp` is within the current course period
      if (codeTimestamp >= courseStartTime && codeTimestamp <= courseEndTime) {
        return res.status(400).json({
          code: "Error-01-0006",
          status: "Error",
          message: "Code has already been generated for this course period.",
          generatedCode,
        });
      }
    }

    // Generate a new code
    const newGeneratedCode = Math.floor(1000 + Math.random() * 9000).toString();
    course.generatedCode = newGeneratedCode;
    course.generatedCodeTimestamp = currentTimeGMTPlus7.toISOString(); // Store the GMT+7 timestamp

    // Save the course with the new code
    await course.save();

    res.status(200).json({
      code: "Success-01-0002",
      status: "Success",
      message: "Code generated and saved successfully.",
      data: { generatedCode: newGeneratedCode },
    });
  } catch (error) {
    console.error("Error generating code:", error);
    res.status(500).json({
      code: "Error-01-0002",
      status: "Error",
      message: "An error occurred while generating the code.",
    });
  }
});

course.post("/validateCode", verifyJWT, async (req: Request, res: Response) => {
  const { courseId, enteredCode } = req.body;
  const user = req.user;
  try {
    // Validate input
    if (!courseId || !enteredCode) {
      return res.status(400).json({
        code: "Error-02-0001",
        status: "Error",
        message: "Course ID and entered code are required.",
      });
    }

    // Find the course
    const course = await Course.findOne({ courseId });
    if (!course) {
      return res.status(404).json({
        code: "Error-02-0002",
        status: "Error",
        message: "Course not found.",
      });
    }

    const { generatedCode, courseDate, hours } = course;

    // Validate the entered code
    if (enteredCode !== generatedCode) {
      return res.status(400).json({
        code: "Error-02-0003",
        status: "Error",
        message: "Invalid code entered.",
      });
    }

    // Validate the course timing
    const courseStartTime = new Date(courseDate);
    const courseEndTime = new Date(courseStartTime);
    courseEndTime.setHours(courseStartTime.getHours() + hours);

    const currentTime = new Date();
    const currentTimeGMTPlus7 = new Date(
      currentTime.getTime() + 7 * 60 * 60 * 1000
    );

    if (
      currentTimeGMTPlus7 < courseStartTime ||
      currentTimeGMTPlus7 > courseEndTime
    ) {
      return res.status(400).json({
        code: "Error-02-0004",
        status: "Error",
        message: "Code already expired.",
      });
    }

    // Check if user is already in the waiting list
    const isUserAlreadyInList = course.waitingForApproveList.some(
      (item: { userId: string }) => item.userId === user.userId
    );

    if (isUserAlreadyInList) {
      return res.status(400).json({
        code: "Error-02-0006",
        status: "Error",
        message: "User already in the waiting list for approval.",
      });
    }

    course.waitingForApproveList.push({
      userId: user.userId,
      name: user.email,
      timestamp: new Date().toISOString(),
    });

    await course.save();

    res.status(200).json({
      code: "Success-02-0001",
      status: "Success",
      message: "Code is valid waiting admin to approve.",
    });
  } catch (error) {
    console.error("Error validating code:", error);
    res.status(500).json({
      code: "Error-02-0005",
      status: "Error",
      message: "An error occurred while validating the code.",
    });
  }
});

course.get("/waitingList", async (req: Request, res: Response) => {
  try {
    // Fetch courses with their waitingForApproveList
    const courses = await Course.find(
      { waitingForApproveList: { $exists: true, $ne: [] } }, // Find courses with non-empty waitingForApproveList
      { courseId: 1, courseName: 1, waitingForApproveList: 1 } // Project required fields
    );
    // console.log(courses);

    if (!courses || courses.length === 0) {
      return res.status(404).json({
        code: "Error-03-0001",
        status: "Error",
        message: "No courses found.",
      });
    }

    res.status(200).json({
      code: "Success-03-0001",
      status: "Success",
      message: "Waiting list retrieved successfully.",
      data: courses,
    });
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({
      code: "Error-03-0002",
      status: "Error",
      message: "An error occurred while retrieving the waiting list.",
    });
  }
});

course.post("/action", async (req, res) => {
  const { userId, courseId, action } = req.body;

  console.log(courseId);
  if (!userId || !courseId || !["approve", "reject"].includes(action)) {
    return res.status(400).json({
      code: "Error-03-0009",
      status: "Error",
      message: "Invalid input or action. 'approve' or 'reject' is required.",
    });
  }

  try {
    const user = await User.findOne({ userId });
    const course = await Course.findOne({ courseId });

    // console.log(user);
    console.log(course);

    if (!user || !course) {
      return res.status(404).json({
        code: "Error-03-0010",
        status: "Error",
        message: "User or course not found.",
      });
    }
    if (action === "approve") {
      const now = new Date();

      // Initialize status dates if not already set
      if (!user.statusStartDate) {
        user.statusStartDate = now;
        user.statusEndDate = new Date(now);
        user.statusEndDate.setFullYear(user.statusEndDate.getFullYear() + 1);
      } else {
        // Extend the statusEndDate by 1 year, but not beyond 2 years from statusStartDate
        const maxEndDate = new Date(user.statusStartDate);
        maxEndDate.setFullYear(maxEndDate.getFullYear() + 2);

        if (!user.statusEndDate || user.statusEndDate < maxEndDate) {
          // If statusEndDate is null/undefined, initialize it to now and extend by 1 year
          user.statusEndDate = user.statusEndDate || new Date(now);
          user.statusEndDate.setFullYear(user.statusEndDate.getFullYear() + 1);

          // Ensure it doesn't exceed the maximum allowed date
          if (user.statusEndDate > maxEndDate) {
            user.statusEndDate = maxEndDate;
          }
        }
      }

      // Calculate remaining time for statusDuration and statusExpiration
      const diffTime = user.statusEndDate.getTime() - now.getTime();
      const diffDate = new Date(diffTime);
      const remainingYears = diffDate.getUTCFullYear() - 1970;
      const remainingMonths = diffDate.getUTCMonth();
      const remainingDays = diffDate.getUTCDate() - 1;

      const statusDuration = `${remainingYears} ปี ${remainingMonths} เดือน ${remainingDays} วัน`;
      const statusExpiration = statusDuration;

      user.statusDuration = statusDuration;
      user.statusExpiration = statusExpiration;

      // Add to trainingInfo if not already added
      const courseExists = user.trainingInfo.some(
        (info) => info.courseId === courseId
      );

      if (!courseExists) {
        user.trainingInfo.push({
          courseId: courseId,
          courseName: course.courseName,
          description: course.description,
          location: course.location,
          courseImage: course.courseImage,
          courseDate: course.courseDate,
          _id: course._id,
        });
      }

      await user.save();
    } else if (action === "reject") {
      // Simply remove the user from the waiting list
      await Course.updateOne(
        { courseId: courseId },
        { $pull: { waitingForApproveList: { userId } } }
      );

      return res.status(200).json({
        code: "Success-03-0003",
        status: "Success",
        message: "User rejected successfully.",
        data: user, // Optionally include user data for tracking
      });
    }

    // Remove the user from the waiting list (for both actions)
    await Course.updateOne(
      { courseId: courseId },
      { $pull: { waitingForApproveList: { userId } } }
    );

    res.status(200).json({
      code: `Success-03-000${action === "approve" ? "2" : "3"}`,
      status: "Success",
      message: `User ${action}d successfully.`,
      data: user,
    });
  } catch (error) {
    console.error("Error processing action:", error);

    res.status(500).json({
      code: "Error-03-0011",
      status: "Error",
      message: "An error occurred.",
    });
  }
});
