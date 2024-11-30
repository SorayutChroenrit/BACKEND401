import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  phonenumber: { type: String, required: true },
  idcard: { type: String, required: true, unique: true },
  company: { type: String, required: true },
  password: { type: String, required: true },
  avatar: { type: String },
  trainingInfo: [
    {
      courseId: String,
      courseName: String,
      description: String,
      location: String,
      courseImage: String,
      courseDate: Date,
      hours: Number,
    },
  ],
  statusStartDate: { type: Date },
  statusEndDate: { type: Date },
  statusExpiration: { type: String },
  statusDuration: { type: String },
  status: {
    type: String,
    required: true,
  },
});

export const User = mongoose.model("users", userSchema);
