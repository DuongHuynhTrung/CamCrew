const mongoose = require("mongoose");

const tempTransactionSchema = mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },

    // Temp Transaction
    orderCode: {
      type: Number,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    service_id: {
      type: [String],
    },

    // Temp Schedule (legacy)
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    artist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    appointment_date: {
      type: Date,
    },
    slot: {
      type: String,
    },
    place: {
      type: String,
    },

    // New fields for membership subscription
    membership_type: {
      type: String,
    },
    amount: {
      type: Number,
    },

    // New fields for booking payment
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TempTransaction", tempTransactionSchema);
