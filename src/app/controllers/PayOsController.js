const asyncHandler = require("express-async-handler");
const { UserRoleEnum } = require("../../enum/UserEnum");
const { BookingStatusEnum } = require("../../enum/BookingEnum");
const { PaymentStatusEnum } = require("../../enum/PaymentEnum");
const { UserMembershipEnum } = require("../../enum/UserEnum");
const NotificationTypeEnum = require("../../enum/NotificationEnum");
const PayOS = require("@payos/node");
const TempTransaction = require("../models/TempTransaction");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { createAndEmitNotification } = require("./NotificationController");
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUMS_KEY
);

const createBuyServicesPayOsUrl = asyncHandler(async (req, res) => {
  try {
    if (req.user.roleName !== UserRoleEnum.CUSTOMER) {
      res.status(403);
      throw new Error("Chỉ có khách hàng có quyền thanh toán giao dịch");
    }
    const { amount, service_id } = req.body;
    const requestData = {
      orderCode: Date.now(),
      amount: amount,
      description: `Thanh toán mua dịch vụ`,
      cancelUrl: `${process.env.CLIENT_URL || "https://camcrew.vercel.app"}`,
      returnUrl: `${process.env.CLIENT_URL || "https://camcrew.vercel.app"}`,
    };
    const paymentLinkData = await payos.createPaymentLink(requestData);
    const tempTransaction = new TempTransaction({
      orderCode: requestData.orderCode,
      user_id: req.user.id,
      service_id: service_id,
      type: "buy_service",
    });
    await tempTransaction.save();
    res.status(200).json({ paymentUrl: paymentLinkData.checkoutUrl });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

const createSchedulePayOsUrl = asyncHandler(async (req, res) => {
  try {
    const {
      customer_id,
      artist_id,
      appointment_date,
      slot,
      place,
      service_id,
      amount,
    } = req.body;

    if (
      !customer_id ||
      !artist_id ||
      !appointment_date ||
      !slot ||
      !place ||
      !service_id ||
      !amount
    ) {
      res.status(400);
      throw new Error("Vui lòng cung cấp đầy đủ thông tin lịch hẹn");
    }

    const customer = await User.findById(customer_id);
    if (!customer) {
      res.status(404);
      throw new Error("Khách hàng không tồn tại");
    }
    const artist = await User.findById(artist_id);
    if (!artist) {
      res.status(404);
      throw new Error("Thợ trang điểm không tồn tại");
    }

    const checkExist = await Schedule.findOne({
      appointment_date: appointment_date,
      slot: slot,
      artist_id: artist_id,
    });
    if (checkExist) {
      res.status(400);
      throw new Error("Thợ trang điểm đã có lịch hẹn vào thời gian này");
    }

    // Create payos url
    const requestData = {
      orderCode: Date.now(),
      amount: amount,
      description: `Thanh toán mua dịch vụ`,
      cancelUrl: `${process.env.CLIENT_URL || "https://camcrew.vercel.app"}`,
      returnUrl: `${process.env.CLIENT_URL || "https://camcrew.vercel.app"}`,
    };
    const paymentLinkData = await payos.createPaymentLink(requestData);

    // Create Temporary Transaction
    const tempTransaction = new TempTransaction({
      orderCode: requestData.orderCode,
      user_id: req.user.id,
      // Temp Schedule Data
      customer_id: customer_id,
      artist_id: artist_id,
      appointment_date: appointment_date,
      slot: slot,
      place: place,
      service_id: [service_id],
    });
    await tempTransaction.save();

    res.status(200).json({ paymentUrl: paymentLinkData.checkoutUrl });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc PayOS webhook callback
// @route POST /api/payos/callback
// @access public
const payOsCallBack = asyncHandler(async (req, res) => {
  try {
    const code = req.body.code;
    const { amount, orderCode } = req.body.data;
    
    const tempTransaction = await TempTransaction.findOne({
      orderCode: orderCode,
    });

    if (!tempTransaction) {
      res.status(404);
      throw new Error("Không tìm thấy giao dịch tạm thời");
    }

    if (code == "00") {
      // Payment successful
      if (tempTransaction.type === "buy_service") {
        // Handle service purchase
        const transaction = new Transaction({
          user_id: tempTransaction.user_id,
          service_id: tempTransaction.service_id,
          payment_method: "internet_banking",
          amount: amount,
          transaction_code: orderCode,
        });
        await transaction.save();
      } 
      else if (tempTransaction.type === "membership_subscription") {
        // Handle membership subscription
        const user = await User.findById(tempTransaction.user_id);
        if (user) {
          user.membership_subscription = tempTransaction.membership_type;
          user.subscription_start_date = new Date();
          
          // Calculate end date based on membership type
          const endDate = new Date();
          if (tempTransaction.membership_type === UserMembershipEnum.ONE_MONTH) {
            endDate.setMonth(endDate.getMonth() + 1);
          } else if (tempTransaction.membership_type === UserMembershipEnum.SIX_MONTH) {
            endDate.setMonth(endDate.getMonth() + 6);
          }
          user.subscription_end_date = endDate;
          
          await user.save();

          // Create notification for cameraman
          const planName = tempTransaction.membership_type === UserMembershipEnum.ONE_MONTH ? "1 tháng" : "6 tháng";
          const startDate = user.subscription_start_date.toLocaleDateString('vi-VN');
          const endDateStr = user.subscription_end_date.toLocaleDateString('vi-VN');
          const notificationContent = `Bạn vừa kích hoạt gói ${planName} thành công. Thời hạn: từ ${startDate} đến ${endDateStr}.`;
          await createAndEmitNotification(
            user._id,
            NotificationTypeEnum.SUBSCRIPTION_ACTIVATED,
            notificationContent
          );
        }
      }
      else if (tempTransaction.type === "booking_payment") {
        // Handle booking payment
        const booking = await Booking.findById(tempTransaction.booking_id)
          .populate('service_id', 'title')
          .populate('cameraman_id', 'email');
        const payment = await Payment.findById(tempTransaction.payment_id);
        
        if (booking && payment) {
          // Update booking status to REQUESTED
          booking.status = BookingStatusEnum.REQUESTED;
          await booking.save();
          
          // Update payment status to PAID
          payment.status = PaymentStatusEnum.PAID;
          await payment.save();

          // Create notification for cameraman
          const notificationContent = `Có Khách hàng đã đặt dịch vụ ${booking.service_id.title} vào ngày ${booking.scheduled_date.toLocaleDateString('vi-VN')} (${booking.time_of_day}) của bạn.`;
          await createAndEmitNotification(
            booking.cameraman_id._id,
            NotificationTypeEnum.BOOKING_REQUESTED,
            notificationContent
          );
        }
      }
      else {
        // Handle legacy schedule creation
        const {
          customer_id,
          artist_id,
          appointment_date,
          slot,
          place,
          service_id,
        } = tempTransaction;
        
        // create schedule
        const schedule = new Schedule({
          customer_id,
          artist_id,
          appointment_date,
          slot,
          place,
          service_id: service_id[0],
        });
        await schedule.save();

        // create transaction
        const transaction = new Transaction({
          user_id: tempTransaction.user_id,
          service_id: tempTransaction.service_id,
          payment_method: "internet_banking",
          amount: amount,
          transaction_code: orderCode,
        });
        await transaction.save();
      }
    } else {
      // Payment failed
      if (tempTransaction.type === "booking_payment") {
        const booking = await Booking.findById(tempTransaction.booking_id);
        const payment = await Payment.findById(tempTransaction.payment_id);
        
        if (booking && payment) {
          // Update booking status to PAY_CANCELLED
          booking.status = BookingStatusEnum.PAY_CANCELLED;
          await booking.save();
          
          // Update payment status to FAILED
          payment.status = PaymentStatusEnum.FAILED;
          await payment.save();
        }
      }
    }

    // Remove temp Transaction
    await tempTransaction.remove();

    res.status(200).send("Thành công");
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

module.exports = {
  createBuyServicesPayOsUrl,
  createSchedulePayOsUrl,
  payOsCallBack,
};
