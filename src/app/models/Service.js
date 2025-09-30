const mongoose = require("mongoose");

const serviceSchema = mongoose.Schema(
  {
    cameraman_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    styles: [
      {
        type: String,
        required: true,
      }
    ],
    categories: [
      {
        type: String,
        required: true,
      }
    ],
    areas: [
      {
        type: String,
        required: true,
      }
    ],
    video_demo_urls: [
      {
        type: String,
      }
    ],
    date_get_job: {
      type: Date,
      required: true,
    },
    time_of_day: [
      {
        type: String,
        required: true,
      }
    ],
    status: {
      type: String,
      required: true,
    },
    rejection_reason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Service", serviceSchema);
