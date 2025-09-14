const BookingStatusEnum = {
  PAYING: "paying",
  PAY_CANCELLED: "pay_cancelled",
  REQUESTED: "requested",
  COMPLETED: "completed"
};

const BookingTypeEnum = {
  BOOKING_REQUESTED: "booking_requested",
  REVIEW_NEW: "review_new",
  SERVICE_CONFIRM: "service_confirm",
  SERVICE_APPROVED: "service_approved",
  SERVICE_REJECTED: "service_rejected",
  SUBSCRIPTION_ACTIVATED: "subscription_activated",
  SUBSCRIPTION_WARNING: "subscription_warning",
  SUBSCRIPTION_EXPIRED: "subscription_expired"
};

module.exports = {
  BookingStatusEnum,
  BookingTypeEnum
};
    