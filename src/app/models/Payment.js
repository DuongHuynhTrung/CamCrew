const mongoose = require("mongoose");
const { PaymentTypeEnum, PaymentStatusEnum } = require("../../enum/PaymentEnum");

const paymentSchema = mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(PaymentTypeEnum),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatusEnum),
      default: PaymentStatusEnum.PROCESSING,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
