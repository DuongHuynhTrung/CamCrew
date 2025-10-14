const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { UserRoleEnum, UserMembershipEnum } = require("../../enum/UserEnum");
const { ServiceStatusEnum } = require("../../enum/ServiceEnum");
const { PaymentStatusEnum, PaymentTypeEnum } = require("../../enum/PaymentEnum");
const { BookingStatusEnum } = require("../../enum/BookingEnum");

const toFixed1 = (num) => Number.isFinite(num) ? Number(num.toFixed(1)) : 0;

// Summary statistics
const getSummary = asyncHandler(async (req, res) => {
  const [totalUsers, customers, verifiedUsers, activeCameramen, approvedServices, pendingServices, rejectedServices, totalBookings, totalRevenueAgg] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role_name: UserRoleEnum.CUSTOMER }),
    User.countDocuments({ is_verified: true }),
    User.countDocuments({ role_name: UserRoleEnum.CAMERAMAN, status: { $ne: "blocked" } }),
    Service.countDocuments({ status: ServiceStatusEnum.APPROVED }),
    Service.countDocuments({ status: ServiceStatusEnum.PENDING }),
    Service.countDocuments({ status: ServiceStatusEnum.REJECTED }),
    Booking.countDocuments({}),
    Payment.aggregate([
      { $match: { status: PaymentStatusEnum.PAID } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ])
  ]);

  const totalRevenue = totalRevenueAgg[0]?.sum || 0;
  const verificationRate = totalUsers > 0 ? toFixed1((verifiedUsers / totalUsers) * 100) : 0;

  return res.json({
    totalUsers,
    customers,
    verificationRate,
    activeCameramen,
    approvedServices,
    pendingServices,
    rejectedServices,
    totalRevenue,
    totalBookings,
  });
});

// User distribution by role
const getUserDistribution = asyncHandler(async (req, res) => {
  const [totalUsers, cameramanCount, customerCount] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role_name: UserRoleEnum.CAMERAMAN }),
    User.countDocuments({ role_name: UserRoleEnum.CUSTOMER }),
  ]);

  const result = [
    {
      role: UserRoleEnum.CAMERAMAN,
      roleName: "Cameraman",
      count: cameramanCount,
      percentage: totalUsers ? toFixed1((cameramanCount / totalUsers) * 100) : 0,
    },
    {
      role: UserRoleEnum.CUSTOMER,
      roleName: "Khách hàng",
      count: customerCount,
      percentage: totalUsers ? toFixed1((customerCount / totalUsers) * 100) : 0,
    },
  ];

  return res.json(result);
});

// Service status distribution
const getServiceStatusDistribution = asyncHandler(async (req, res) => {
  const [totalServices, approved, pending, rejected] = await Promise.all([
    Service.countDocuments({}),
    Service.countDocuments({ status: ServiceStatusEnum.APPROVED }),
    Service.countDocuments({ status: ServiceStatusEnum.PENDING }),
    Service.countDocuments({ status: ServiceStatusEnum.REJECTED }),
  ]);

  const result = [
    {
      status: ServiceStatusEnum.APPROVED,
      statusName: "Đã duyệt",
      count: approved,
      percentage: totalServices ? toFixed1((approved / totalServices) * 100) : 0,
    },
    {
      status: ServiceStatusEnum.PENDING,
      statusName: "Chờ duyệt",
      count: pending,
      percentage: totalServices ? toFixed1((pending / totalServices) * 100) : 0,
    },
    {
      status: ServiceStatusEnum.REJECTED,
      statusName: "Từ chối",
      count: rejected,
      percentage: totalServices ? toFixed1((rejected / totalServices) * 100) : 0,
    },
  ];

  return res.json(result);
});

// Revenue by time range
const getRevenue = asyncHandler(async (req, res) => {
  const { timeRange } = req.query; // "week" | "month" | "year"
  if (!timeRange || !["week", "month", "year"].includes(timeRange)) {
    return res.status(400).json({ message: "Invalid or missing timeRange. Use week | month | year" });
  }

  const now = new Date();

  // Helper to get sum revenue and counts within range
  const aggregateForRange = async (start, end) => {
    const [paymentsAgg, bookingsAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { status: PaymentStatusEnum.PAID, createdAt: { $gte: start, $lt: end } } },
        { $group: { _id: null, revenue: { $sum: "$amount" } } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const revenue = paymentsAgg[0]?.revenue || 0;
    const counts = bookingsAgg.reduce(
      (acc, cur) => {
        acc.total += cur.count;
        if (cur._id === BookingStatusEnum.COMPLETED) acc.completed += cur.count;
        if (cur._id === BookingStatusEnum.PAY_CANCELLED) acc.canceled += cur.count;
        return acc;
      },
      { total: 0, completed: 0, canceled: 0 }
    );

    return {
      revenue,
      bookings: counts.total,
      completedBookings: counts.completed,
      canceledBookings: counts.canceled,
    };
  };

  if (timeRange === "week") {
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastOfMonth.getDate();

    // Define up to 5 weeks within the current month (1-7,8-14,15-21,22-28,29-end)
    const weekRanges = [];
    for (let i = 1; i <= daysInMonth; i += 7) {
      const start = new Date(year, month, i);
      const endDay = Math.min(i + 7, daysInMonth + 1);
      const end = new Date(year, month, endDay);
      weekRanges.push({ start, end });
    }

    const data = await Promise.all(
      weekRanges.map(async (range, index) => {
        const agg = await aggregateForRange(range.start, range.end);
        return {
          period: `Tuần ${index + 1}`,
          ...agg,
        };
      })
    );

    return res.json(data);
  }

  if (timeRange === "month") {
    // From September (9) of current year to current month (inclusive)
    const startMonth = 8; // September is 8 in JS Date (0-indexed)
    const start = new Date(now.getFullYear(), startMonth, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const months = [];
    for (let m = start.getMonth(); m <= now.getMonth(); m++) {
      const mStart = new Date(now.getFullYear(), m, 1);
      const mEnd = new Date(now.getFullYear(), m + 1, 1);
      months.push({ mStart, mEnd, mNum: m + 1, year: now.getFullYear() });
    }

    const data = await Promise.all(
      months.map(async ({ mStart, mEnd, mNum, year }) => {
        const agg = await aggregateForRange(mStart, mEnd);
        return {
          period: `Tháng ${mNum}`,
          month: mNum,
          year,
          ...agg,
        };
      })
    );

    return res.json(data);
  }

  if (timeRange === "year") {
    // From 2025 to current year
    const startYear = 2025;
    const years = [];
    for (let y = startYear; y <= now.getFullYear(); y++) {
      const yStart = new Date(y, 0, 1);
      const yEnd = new Date(y + 1, 0, 1);
      years.push({ yStart, yEnd, y });
    }

    const data = await Promise.all(
      years.map(async ({ yStart, yEnd, y }) => {
        const agg = await aggregateForRange(yStart, yEnd);
        return {
          period: `${y}`,
          year: y,
          ...agg,
        };
      })
    );

    return res.json(data);
  }
});

// Membership distribution and revenue
const getMembershipDistribution = asyncHandler(async (req, res) => {
  const [totalUsers, normalCount, oneMonthCount, sixMonthCount, paymentsAgg] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ membership_subscription: UserMembershipEnum.NORMAL }),
    User.countDocuments({ membership_subscription: UserMembershipEnum.ONE_MONTH }),
    User.countDocuments({ membership_subscription: UserMembershipEnum.SIX_MONTH }),
    Payment.aggregate([
      { $match: { status: PaymentStatusEnum.PAID, type: PaymentTypeEnum.SUBSCRIPTION } },
      { $group: { _id: "$type", revenue: { $sum: "$amount" } } },
    ]),
  ]);

  const subscriptionRevenue = paymentsAgg.reduce((sum, r) => sum + (r.revenue || 0), 0);

  const items = [
    {
      subscription: UserMembershipEnum.NORMAL,
      subscriptionName: "Thường",
      count: normalCount,
      percentage: totalUsers ? toFixed1((normalCount / totalUsers) * 100) : 0,
      revenue: 0,
    },
    {
      subscription: UserMembershipEnum.ONE_MONTH,
      subscriptionName: "1 Tháng",
      count: oneMonthCount,
      percentage: totalUsers ? toFixed1((oneMonthCount / totalUsers) * 100) : 0,
      revenue: 0,
    },
    {
      subscription: UserMembershipEnum.SIX_MONTH,
      subscriptionName: "6 Tháng",
      count: sixMonthCount,
      percentage: totalUsers ? toFixed1((sixMonthCount / totalUsers) * 100) : 0,
      revenue: 0,
    },
  ];

  // If we want to split subscription revenue by current membership types, keep it zero due to lack of linkage.
  // Alternatively, if Payment had details for membership type we could group by that. Not available here.

  // Attach total subscription revenue to the paid tiers proportionally by counts (optional). We'll distribute to 1month and 6month by ratio of counts.
  const paidCount = oneMonthCount + sixMonthCount;
  if (subscriptionRevenue > 0 && paidCount > 0) {
    const oneMonthShare = subscriptionRevenue * (oneMonthCount / paidCount);
    const sixMonthShare = subscriptionRevenue * (sixMonthCount / paidCount);
    items[1].revenue = Math.round(oneMonthShare);
    items[2].revenue = Math.round(sixMonthShare);
  }

  return res.json(items);
});

module.exports = {
  getSummary,
  getUserDistribution,
  getServiceStatusDistribution,
  getRevenue,
  getMembershipDistribution,
};


