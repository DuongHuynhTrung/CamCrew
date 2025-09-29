const mongoose = require("mongoose");
const { UserStatusEnum, UserMembershipEnum, UserRoleEnum } = require("../../enum/UserEnum");

const userSchema = mongoose.Schema(
  {
    email: {
      type: String,
      maxLength: 255,
    },
    password: {
      type: String,
    },
    full_name: {
      type: String,
      maxLength: 255,
    },
    avatar_url: {
      type: String,
    },
    phone_number: {
      type: String,
      maxLength: 10,
    },
    status: {
      type: String,
      default: UserStatusEnum.ACTIVE,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    avg_rating: {
      type: Number,
      default: 0,
    },
    membership_subscription: {
      type: String,
      default: UserMembershipEnum.NORMAL,
    },
    subscription_start_date: {
      type: Date,
    },
    subscription_end_date: {
      type: Date,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
    },
    description: {
      type: String,
    },
    role_name: {
      type: String,
      default: UserRoleEnum.CUSTOMER,
    },
    otp: {
      type: Number,
    },
    otpExpired: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
