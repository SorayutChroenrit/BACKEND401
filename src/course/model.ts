import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  courseId: { type: String, required: true },
  courseName: { type: String, required: true },
  courseCode: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  courseImage: { type: String },
  enrollmentLimit: {
    type: Number,
    required: true,
  },
  currentEnrollment: {
    type: Number,
    default: 0,
    required: true,
  },
  price: { type: Number, required: true },
  hours: { type: Number, required: true },
  courseTag: { type: Array, required: true },
  createDate: { type: Date, default: Date.now, required: true },
  courseDate: { type: Date, required: true },
  applicationPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  imageUrl: String,
  status: { type: String },
  isPublished: {
    type: Boolean,
    default: false,
    required: true,
  },
  registeredUsers: [],
  waitingForApproveList: [],
  generatedCode: { type: String },
  generatedCodeTimestamp: { type: String },
});

export const Course = mongoose.model("courses", courseSchema);
