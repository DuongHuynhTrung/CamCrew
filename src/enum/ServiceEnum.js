const ServiceStyleEnum = {
  WEDDING: "wedding",
  EVENT: "event",
  YEARBOOK: "yearbook",
  TVC: "tvc",
  FILM: "Film"
};

const ServiceCategoryEnum = {
  CINEMATIC: "cinematic",
  TRADITIONAL: "traditional",
  HIGHLIGHT: "highlight",
  BTS: "bts",
  DOCUMENTARY: "documentary"
};

const ServiceAreaEnum = {
  HO_CHI_MINH: "Ho Chi Minh",
  BINH_DUONG: "Binh Duong",
  CAN_THO: "Can Tho",
  DONG_NAI: "Dong Nai",
  HA_NOI: "Ha Noi"
};

const ServiceTimeOfDayEnum = {
  MORNING: "morning",
  AFTERNOON: "afternoon",
  EVENING: "evening"
};

const ServiceStatusEnum = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  DISABLED: "disabled"
};

module.exports = {
  ServiceStyleEnum,
  ServiceCategoryEnum,
  ServiceAreaEnum,
  ServiceTimeOfDayEnum,
  ServiceStatusEnum
};
