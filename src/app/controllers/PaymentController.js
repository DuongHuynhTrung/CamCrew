const asyncHandler = require("express-async-handler");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { UserRoleEnum } = require("../../enum/UserEnum");
const { PaymentTypeEnum, PaymentStatusEnum } = require("../../enum/PaymentEnum");
const { BookingStatusEnum } = require("../../enum/BookingEnum");

// @desc Get all payments with flexible query parameters
// @route GET /api/payments
// @access private (Admin only)
const getPayments = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role_name !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Chỉ có Admin có quyền xem tất cả thanh toán");
    }

    const { status, type, startDate, endDate, search } = req.query;

    // Build query object
    let query = {};

    // Add status filter if provided
    if (status && Object.values(PaymentStatusEnum).includes(status)) {
      query.status = status;
    }

    // Add type filter if provided
    if (type && Object.values(PaymentTypeEnum).includes(type)) {
      query.type = type;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Handle search functionality
    if (search) {
      // Search in related booking data
      const bookings = await Booking.find({
        $or: [
          { 'customer_id': { $regex: search, $options: 'i' } },
          { 'cameraman_id': { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const bookingIds = bookings.map(booking => booking._id);
      query.booking_id = { $in: bookingIds };
    }

    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('booking_id', 'customer_id cameraman_id service_id scheduled_date time_of_day amount status')
        .populate({
          path: 'booking_id',
          populate: [
            { path: 'customer_id', select: 'full_name email phone_number' },
            { path: 'cameraman_id', select: 'full_name email phone_number' },
            { path: 'service_id', select: 'title amount' }
          ]
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      Payment.countDocuments(query)
    ]);

    res.status(200).json({
      data: payments,
      pagination: {
        pageIndex: page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Get payments for current user with flexible query parameters
// @route GET /api/payments/my-payments
// @access private
const getMyPayments = asyncHandler(async (req, res) => {
  try {
    const { status, type, startDate, endDate, search } = req.query;

    // Build base query for user's payments
    let query = {};
    
    // If user is customer, get payments for their bookings
    if (req.user.role_name === UserRoleEnum.CUSTOMER) {
      const userBookings = await Booking.find({ customer_id: req.user.id }).select('_id');
      const bookingIds = userBookings.map(booking => booking._id);
      query.booking_id = { $in: bookingIds };
    }
    // If user is cameraman, get payments for bookings of their services
    else if (req.user.role_name === UserRoleEnum.CAMERAMAN) {
      const userBookings = await Booking.find({ cameraman_id: req.user.id }).select('_id');
      const bookingIds = userBookings.map(booking => booking._id);
      query.booking_id = { $in: bookingIds };
    }

    // Add status filter if provided
    if (status && Object.values(PaymentStatusEnum).includes(status)) {
      query.status = status;
    }

    // Add type filter if provided
    if (type && Object.values(PaymentTypeEnum).includes(type)) {
      query.type = type;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Handle search functionality
    if (search) {
      // Search in related booking data for current user
      let userBookingQuery = {};
      if (req.user.role_name === UserRoleEnum.CUSTOMER) {
        userBookingQuery = { 
          customer_id: req.user.id,
          $or: [
            { 'customer_id': { $regex: search, $options: 'i' } },
            { 'cameraman_id': { $regex: search, $options: 'i' } }
          ]
        };
      } else if (req.user.role_name === UserRoleEnum.CAMERAMAN) {
        userBookingQuery = { 
          cameraman_id: req.user.id,
          $or: [
            { 'customer_id': { $regex: search, $options: 'i' } },
            { 'cameraman_id': { $regex: search, $options: 'i' } }
          ]
        };
      }
      
      const bookings = await Booking.find(userBookingQuery).select('_id');
      const bookingIds = bookings.map(booking => booking._id);
      query.booking_id = { $in: bookingIds };
    }

    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('booking_id', 'customer_id cameraman_id service_id scheduled_date time_of_day amount status')
        .populate({
          path: 'booking_id',
          populate: [
            { path: 'customer_id', select: 'full_name email phone_number' },
            { path: 'cameraman_id', select: 'full_name email phone_number' },
            { path: 'service_id', select: 'title amount' }
          ]
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      Payment.countDocuments(query)
    ]);

    res.status(200).json({
      data: payments,
      pagination: {
        pageIndex: page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Get payment by ID
// @route GET /api/payments/:id
// @access private
const getPaymentById = asyncHandler(async (req, res) => {
  try {
    const paymentId = req.params.id;

    const payment = await Payment.findById(paymentId)
      .populate('booking_id', 'customer_id cameraman_id service_id scheduled_date time_of_day amount status')
      .populate({
        path: 'booking_id',
        populate: [
          { path: 'customer_id', select: 'full_name email phone_number' },
          { path: 'cameraman_id', select: 'full_name email phone_number' },
          { path: 'service_id', select: 'title amount' }
        ]
      });

    if (!payment) {
      res.status(404);
      throw new Error("Thanh toán không tồn tại");
    }

    // Check if user has permission to view this payment
    const booking = payment.booking_id;
    const isCustomer = booking.customer_id._id.toString() === req.user.id;
    const isCameraman = booking.cameraman_id._id.toString() === req.user.id;
    const isAdmin = req.user.role_name === UserRoleEnum.ADMIN;

    if (!isCustomer && !isCameraman && !isAdmin) {
      res.status(403);
      throw new Error("Bạn không có quyền xem thanh toán này");
    }

    res.status(200).json(payment);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});


// @desc Update payment status (Admin only)
// @route PUT /api/payments/:id/status
// @access private (Admin only)
const updatePaymentStatus = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role_name !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Chỉ có Admin có quyền cập nhật trạng thái thanh toán");
    }

    const paymentId = req.params.id;
    const { status } = req.body;

    if (!status) {
      res.status(400);
      throw new Error("Trạng thái thanh toán không được để trống");
    }

    // Validate status
    if (!Object.values(PaymentStatusEnum).includes(status)) {
      res.status(400);
      throw new Error("Trạng thái thanh toán không hợp lệ");
    }

    const payment = await Payment.findById(paymentId).populate('booking_id');
    
    if (!payment) {
      res.status(404);
      throw new Error("Thanh toán không tồn tại");
    }

    // Update payment status
    payment.status = status;
    await payment.save();

    // If payment is for booking and status changes to PAID, update booking status
    if (payment.type === PaymentTypeEnum.BOOKING && status === PaymentStatusEnum.PAID) {
      const booking = payment.booking_id;
      if (booking && booking.status === BookingStatusEnum.PAYING) {
        booking.status = BookingStatusEnum.REQUESTED;
        await booking.save();
      }
    }

    res.status(200).json({
      message: "Cập nhật trạng thái thanh toán thành công",
      payment: payment
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Get payment statistics
// @route GET /api/payments/statistics
// @access private (Admin only)
const getPaymentStatistics = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role_name !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Chỉ có Admin có quyền xem thống kê thanh toán");
    }

    const [
      totalPayments,
      paidPayments,
      failedPayments,
      processingPayments,
      bookingPayments,
      subscriptionPayments,
      totalRevenue
    ] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: PaymentStatusEnum.PAID }),
      Payment.countDocuments({ status: PaymentStatusEnum.FAILED }),
      Payment.countDocuments({ status: PaymentStatusEnum.PROCESSING }),
      Payment.countDocuments({ type: PaymentTypeEnum.BOOKING }),
      Payment.countDocuments({ type: PaymentTypeEnum.SUBSCRIPTION }),
      Payment.aggregate([
        { $match: { status: PaymentStatusEnum.PAID } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.status(200).json({
      totalPayments,
      paidPayments,
      failedPayments,
      processingPayments,
      bookingPayments,
      subscriptionPayments,
      totalRevenue: revenue,
      successRate: totalPayments > 0 ? ((paidPayments / totalPayments) * 100).toFixed(2) : 0
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});


module.exports = {
  getPayments,
  getMyPayments,
  getPaymentById,
  updatePaymentStatus,
  getPaymentStatistics
};
