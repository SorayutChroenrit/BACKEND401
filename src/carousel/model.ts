import mongoose from "mongoose";

const carouselSchema = new mongoose.Schema({
  carouselId: { type: String, required: true },
  carouselImageUrl: { type: String, required: true },
});

export const Carousel = mongoose.model("carousel", carouselSchema);
