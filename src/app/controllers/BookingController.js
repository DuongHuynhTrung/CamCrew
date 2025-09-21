const asyncHandler = require("express-async-handler");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Service = require("../models/Service");
const TempTransaction = require("../models/TempTransaction");
const { UserRoleEnum, UserMembershipEnum } = require("../../enum/UserEnum");
const { BookingStatusEnum } = require("../../enum/BookingEnum");
const { PaymentTypeEnum, PaymentStatusEnum } = require("../../enum/PaymentEnum");
const PayOS = require("@payos/node");

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUMS_KEY
);

// @desc Create booking with payment
// @route POST /api/bookings
// @access private (Customer only)
const createBooking = asyncHandler(async (req, res) => {
  try {
    // Check if user is customer
    if (req.user.role_name !== UserRoleEnum.CUSTOMER) {
      res.status(403);
      throw new Error("Chỉ có khách hàng mới có thể tạo booking");
    }

    const {
      cameraman_id,
      service_id,
      scheduled_date,
      time_of_day
    } = req.body;

    // Validate required fields
    if (!cameraman_id || !service_id || !scheduled_date || !time_of_day) {
      res.status(400);
      throw new Error("Vui lòng cung cấp đầy đủ thông tin booking");
    }

    // Check if cameraman exists
    const cameraman = await User.findById(cameraman_id);
    if (!cameraman || cameraman.role_name !== UserRoleEnum.CAMERAMAN) {
      res.status(404);
      throw new Error("Cameraman không tồn tại");
    }

    // Check if service exists
    const service = await Service.findById(service_id);
    if (!service) {
      res.status(404);
      throw new Error("Dịch vụ không tồn tại");
    }

    // Check if cameraman is available at the requested time
    const existingBooking = await Booking.findOne({
      cameraman_id: cameraman_id,
      scheduled_date: scheduled_date,
      time_of_day: time_of_day,
      status: { $in: [BookingStatusEnum.REQUESTED, BookingStatusEnum.PAYING] }
    });

    if (existingBooking) {
      res.status(400);
      throw new Error("Cameraman đã có lịch hẹn vào thời gian này");
    }

    // Create booking with PAYING status
    const booking = new Booking({
      customer_id: req.user.id,
      cameraman_id: cameraman_id,
      service_id: service_id,
      scheduled_date: scheduled_date,
      time_of_day: time_of_day,
      amount: service.amount,
      status: BookingStatusEnum.PAYING
    });

    await booking.save();

    // Create payment record with amount from service
    const payment = new Payment({
      booking_id: booking._id,
      type: PaymentTypeEnum.BOOKING,
      amount: service.amount,
      status: PaymentStatusEnum.PROCESSING
    });

    await payment.save();

    // Create PayOS payment link
    const requestData = {
      orderCode: Date.now(),
      amount: service.amount,
      description: `Thanh toán booking dịch vụ`,
      cancelUrl: `${process.env.CLIENT_URL || "https://camcrew.vercel.app"}/activity-history&tab=bookings`,
      returnUrl: `${process.env.CLIENT_URL || "https://camcrew.vercel.app"}/activity-history&tab=bookings`,
    };

    const paymentLinkData = await payos.createPaymentLink(requestData);

    // Create temporary transaction for booking payment
    const tempTransaction = new TempTransaction({
      orderCode: requestData.orderCode,
      user_id: req.user.id,
      type: "booking_payment",
      booking_id: booking._id,
      payment_id: payment._id,
    });

    await tempTransaction.save();

    res.status(200).json({
      booking: booking,
      payment: payment,
      paymentUrl: paymentLinkData.checkoutUrl,
      orderCode: requestData.orderCode
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Update booking status to completed (Cameraman only)
// @route PUT /api/bookings/:id/complete
// @access private (Cameraman only)
const completeBooking = asyncHandler(async (req, res) => {
  try {
    // Check if user is cameraman
    if (req.user.role_name !== UserRoleEnum.CAMERAMAN) {
      res.status(403);
      throw new Error("Chỉ có cameraman mới có thể hoàn thành booking");
    }

    const bookingId = req.params.id;

    // Find booking
    const booking = await Booking.findById(bookingId).populate('cameraman_id');
    
    if (!booking) {
      res.status(404);
      throw new Error("Booking không tồn tại");
    }

    // Check if the cameraman is the owner of this booking
    if (booking.cameraman_id._id.toString() !== req.user.id) {
      res.status(403);
      throw new Error("Bạn không có quyền hoàn thành booking này");
    }

    // Check if booking is in REQUESTED status
    if (booking.status !== BookingStatusEnum.REQUESTED) {
      res.status(400);
      throw new Error("Chỉ có thể hoàn thành booking đang ở trạng thái REQUESTED");
    }

    // Update booking status to completed
    booking.status = BookingStatusEnum.COMPLETED;
    await booking.save();

    res.status(200).json({
      message: "Booking đã được hoàn thành thành công",
      booking: booking
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Get bookings for current user
// @route GET /api/bookings
// @access private
const getBookings = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    let query = {};
    
    // If user is customer, get their bookings
    if (req.user.role_name === UserRoleEnum.CUSTOMER) {
      query.customer_id = req.user.id;
    }
    // If user is cameraman, get bookings for their services
    else if (req.user.role_name === UserRoleEnum.CAMERAMAN) {
      query.cameraman_id = req.user.id;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customer_id', 'full_name email phone_number')
        .populate('cameraman_id', 'full_name email phone_number')
        .populate('service_id', 'title amount')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      Booking.countDocuments(query)
    ]);

    res.status(200).json({
      data: bookings,
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

// @desc Get booking by ID
// @route GET /api/bookings/:id
// @access private
const getBookingById = asyncHandler(async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate('customer_id', 'full_name email phone_number')
      .populate('cameraman_id', 'full_name email phone_number')
      .populate('service_id', 'title amount');

    if (!booking) {
      res.status(404);
      throw new Error("Booking không tồn tại");
    }

    // Check if user has permission to view this booking
    const isCustomer = booking.customer_id._id.toString() === req.user.id;
    const isCameraman = booking.cameraman_id._id.toString() === req.user.id;
    const isAdmin = req.user.role_name === UserRoleEnum.ADMIN;

    if (!isCustomer && !isCameraman && !isAdmin) {
      res.status(403);
      throw new Error("Bạn không có quyền xem booking này");
    }

    res.status(200).json(booking);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

module.exports = {
  createBooking,
  completeBooking,
  getBookings,
  getBookingById
};
