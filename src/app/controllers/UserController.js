const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const moment = require("moment/moment");
const cron = require("node-cron");
const { UserRoleEnum, UserStatusEnum, UserMembershipEnum } = require("../../enum/UserEnum");
const NotificationTypeEnum = require("../../enum/NotificationEnum");
const { createAndEmitNotification } = require("./NotificationController");
const fs = require("fs");
const path = require("path");
const TempTransaction = require("../models/TempTransaction");
const PayOS = require("@payos/node");

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUMS_KEY
);

//@desc Get all users (CUSTOMER) with pagination
//@route GET /api/users
//@access private
const getUsers = asyncHandler(async (req, res, next) => {
  try {
    if (req.user.roleName !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error(
        "Chỉ có Admin có quyền truy xuất thông tin tất cả tài khoản khách hàng"
      );
    }
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ role_name: UserRoleEnum.CUSTOMER }).skip(skip).limit(limit).exec(),
      User.countDocuments({ role_name: UserRoleEnum.CUSTOMER })
    ]);

    res.status(200).json({
      data: users,
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

//@desc Get all cameramen with pagination
//@route GET /api/users/cameramen
//@access private
const getCameramen = asyncHandler(async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ role_name: UserRoleEnum.CAMERAMAN }).skip(skip).limit(limit).exec(),
      User.countDocuments({ role_name: UserRoleEnum.CAMERAMAN })
    ]);

    res.status(200).json({
      data: users,
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

//@desc Get all users
//@route GET /api/users/current
//@access private
const currentUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng!");
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

//@desc Get user
//@route GET /api/users/:id
//@access private
const getUserById = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).exec();
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng!");
    }
    const userEmail = user.email;
    if (
      !(req.user.email === userEmail || req.user.roleName === UserRoleEnum.ADMIN)
    ) {
      res.status(403);
      throw new Error("Bạn không có quyền truy cập thông tin người dùng");
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(res.statusCode).send(error.message || "Lỗi máy chủ nội bộ");
  }
});

//@desc Update user
//@route PUT /api/users/:id
//@access private
const updateUsers = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng!");
    }

    if (req.user.email !== user.email) {
      res.status(403);
      throw new Error("Bạn không có quyền cập nhật thông tin người dùng");
    }

    // Chỉ cho phép update các field có trong User.js, loại bỏ các trường không cho phép update
    const allowedFields = [
      "full_name",
      "avatar_url",
      "phone_number",
      "dob",
      "gender"
    ];

    // Nếu có phone_number thì kiểm tra trùng
    if (req.body.phone_number && req.body.phone_number !== user.phone_number) {
      const checkExistPhone = await User.findOne({
        phone_number: req.body.phone_number,
      });
      if (
        checkExistPhone &&
        checkExistPhone._id.toString() !== req.user.id.toString()
      ) {
        res.status(400);
        throw new Error("Số điện thoại đã tồn tại!");
      }
    }

    // Chỉ lấy các field hợp lệ từ req.body
    const updateFields = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updateFields[key] = req.body[key];
      }
    }

    const updateUser = await User.findByIdAndUpdate(req.user.id, updateFields, {
      new: true,
    });

    res.status(200).json(updateUser);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

//@desc Delete user
//@route DELETE /api/users/:id
//@access private
const deleteUsers = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng!");
    }
    if (req.user.roleName !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Bạn không có quyền cập nhật thông tin người dùng");
    }
    await User.deleteOne({ _id: req.params.id });
    res.status(200).json(user);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

//@desc Delete user no auth
//@route DELETE /api/users/:id
//@access public
const deleteUsersNoAuth = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng!");
    }
    await User.deleteOne({ _id: req.params.id });
    res.status(200).json(user);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

//@desc User change password
//@route GET /api/users/checkOldPassword/:id
//@access private
const checkOldPassword = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
    const isCorrectPassword = await bcrypt.compare(password, user.password);
    if (!isCorrectPassword) {
      res.status(401);
      throw new Error("Mật khẩu cũ không chính xác");
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

//@desc User change password
//@route GET /api/users/changePassword/:id
//@access private
const changePassword = asyncHandler(async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng!");
    }
    if (req.user.id !== id) {
      res.status(403);
      throw new Error("Bạn không có quyền thay đổi mật khẩu của người khác!");
    }
    const { password, confirmPassword } = req.body;
    if (!password || !confirmPassword) {
      res.status(400);
      throw new Error("All field not be empty!");
    }
    if (password !== confirmPassword) {
      res.status(400);
      throw new Error("Mật khẩu và xác nhận mật khẩu không khớp!");
    }
    //Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    if (!hashedPassword) {
      res.status(500);
      throw new Error(
        "Có lỗi xảy ra khi mã hóa mật khẩu trong hàm changePassword!"
      );
    }
    const updatePassword = await User.findByIdAndUpdate(
      id,
      {
        password: hashedPassword,
      },
      { new: true }
    );
    if (!updatePassword) {
      res.status(500);
      throw new Error("Có lỗi xảy ra khi thay đổi mật khẩu");
    }
    res.status(200).json(updatePassword);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

const statisticsAccountByStatus = asyncHandler(async (req, res) => {
  try {
    const accounts = await User.find({ role_name: UserRoleEnum.CUSTOMER });
    if (!accounts || accounts.length === 0) {
      return null;
    }

    const tmpCountData = {
      Active: 0,
      InActive: 0,
    };

    accounts.forEach((account) => {
      if (account.status) {
        tmpCountData["Active"] = tmpCountData["Active"] + 1;
      } else {
        tmpCountData["InActive"] = tmpCountData["InActive"] + 1;
      }
    });

    const result = Object.keys(tmpCountData).map((key) => ({
      key,
      value: tmpCountData[key],
    }));
    res.status(200).json(result);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

const searchAccountByEmail = asyncHandler(async (req, res, next) => {
  try {
    const searchEmail = req.query.searchEmail;
    if (!searchEmail || searchEmail === undefined) {
      res.status(400);
      throw new Error("Không được để trống thông tin yêu cầu");
    }
    let users = await User.find({
      email: { $regex: searchEmail, $options: "i" },
      role_name: UserRoleEnum.CUSTOMER,
    });
    if (!users) {
      res.status(500);
      throw new Error("Có lỗi xảy ra khi tìm kiếm tài khoản theo email");
    }
    res.json(users);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

const banAccountByAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { account_id } = req.params;
    const user = await User.findById(account_id).exec();
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy tài khoản!");
    }
    if (user.role_name === UserRoleEnum.ADMIN) {
      res.status(400);
      throw new Error("Không thể khóa tài khoản admin");
    }
    if (!user.status) {
      res.status(400);
      throw new Error("Tài khoản đang bị khóa");
    }
    user.status = false;
    const result = await user.save();
    if (!result) {
      res.status(500);
      throw new Error("Có lỗi xảy ra khi khóa tài khoản");
    }
    res.status(200).json(result);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

const unBanAccountByAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { account_id } = req.params;
    const user = await User.findById(account_id).exec();
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy tài khoản!");
    }
    if (user.role_name === UserRoleEnum.ADMIN) {
      res.status(400);
      throw new Error("Không thể khóa tài khoản admin");
    }
    if (user.status) {
      res.status(400);
      throw new Error("Tài khoản không bị khóa");
    }
    user.status = true;
    const result = await user.save();
    if (!result) {
      res.status(500);
      throw new Error("Có lỗi xảy ra khi khóa tài khoản");
    }
    res.status(200).json(result);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

const updateUserInfoForAdmin = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  const { password } = req.body;
  if (password) {
    //Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
  }
  await user.save();
  res.status(200).json(user);
});

// 1. API gửi OTP về email (POST /api/users/forgot-password)
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error("Email không hợp lệ");
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    user.otpExpired = new Date();
    await user.save();

    // Đọc template otp.html và thay thế các thông tin
    const templatePath = path.join(__dirname, "../../views/otp.html");
    let emailBody = fs.readFileSync(templatePath, "utf8");
    emailBody = emailBody
      .replace(/USER_NAME/g, user.full_name || user.email)
      .replace(/OTP_CODE/g, otp)
      .replace(/OTP_EXPIRE_MINUTES/g, "10");

    // Gửi mail OTP
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // use SSL
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Mã OTP đặt lại mật khẩu CamCrew",
      html: emailBody,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Send OTP email error:", error);
      } else {
        console.log(`OTP email sent: ${info.response}`);
      }
    });

    res.status(200).json({ message: "OTP đã được gửi đến email" });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// 2. API kiểm tra OTP (POST /api/users/verify-otp)
const verifyOtp = asyncHandler(async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400);
      throw new Error("Email hoặc OTP không hợp lệ");
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
    if (user.otp?.toString() !== otp.toString()) {
      res.status(400);
      throw new Error("OTP sai! Vui lòng thử lại");
    }
    const currentTime = moment(new Date());
    const otpExpired = moment(user.otpExpired);
    const isExpired = currentTime.diff(otpExpired, "minutes");
    if (isExpired > 10) {
      res.status(400);
      throw new Error("OTP đã hết hạn! Vui lòng thử lại");
    }
    res.status(200).json({ message: "OTP hợp lệ" });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// 3. API đổi mật khẩu mới (POST /api/users/reset-password)
const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400);
      throw new Error("Email hoặc mật khẩu mới không hợp lệ");
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
    // Cập nhật mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    // Xóa OTP sau khi đổi mật khẩu thành công
    user.otp = undefined;
    user.otpExpired = undefined;
    await user.save();

    res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

const upMembershipByAccountBalance = asyncHandler(async (req, res) => {
  try {
    const { user_id, membership, amount } = req.body;
    const user = await User.findById(user_id);
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
    if (user.account_balance < amount) {
      res.status(400);
      throw new Error("Số dư tài khoản không đủ để nâng cấp gói thành viên");
    }
    user.membership = membership;
    user.account_balance -= amount;
    await user.save();

    // Create Notification
    const notification = new Notification({
      receiver_id: user_id,
      noti_describe: `Chúc mừng! Tài khoản của bạn đã được nâng cấp thành công lên gói thành viên ${membership}`,
      noti_title: "Tài khoản của bạn đã được nâng cấp",
      noti_type: NotificationTypeEnum.UP_MEMBERSHIP,
    });
    await notification.save();

    _io.emit(`new-noti-${user_id}`, notification);
    _io.emit(`user-info-${user_id}`, user);

    res.status(200).json(user);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

//@desc Get user
//@route GET /api/users/:id
//@access private
const upRoleCameramanByAdmin = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.params.user_id).exec();
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng!");
    }
    user.role_name = UserRoleEnum.CAMERAMAN;
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    res.status(res.statusCode).send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Create membership subscription payment URL
// @route POST /api/users/membership-subscription
// @access private (Cameraman only)
const createMembershipSubscriptionPayment = asyncHandler(async (req, res) => {
  try {
    // Check if user is cameraman
    if (req.user.roleName !== UserRoleEnum.CAMERAMAN) {
      res.status(403);
      throw new Error("Chỉ có cameraman mới có thể nâng cấp gói thành viên");
    }

    const { membership_type, amount } = req.body;

    if (!membership_type || !amount) {
      res.status(400);
      throw new Error("Vui lòng cung cấp đầy đủ thông tin gói thành viên và số tiền");
    }

    // Validate membership type
    if (![UserMembershipEnum.ONE_MONTH, UserMembershipEnum.SIX_MONTH].includes(membership_type)) {
      res.status(400);
      throw new Error("Loại gói thành viên không hợp lệ");
    }

    // Create PayOS payment link
    const requestData = {
      orderCode: Date.now(),
      amount: amount,
      description: `Nâng cấp gói thành viên ${membership_type}`,
      cancelUrl: `${process.env.CLIENT_URL || "https://camcrew.vercel.app"}/`,
      returnUrl: `${process.env.CLIENT_URL || "https://camcrew.vercel.app"}/`,
    };

    const paymentLinkData = await payos.createPaymentLink(requestData);

    // Create temporary transaction for membership subscription
    const tempTransaction = new TempTransaction({
      orderCode: requestData.orderCode,
      user_id: req.user.id,
      type: "membership_subscription",
      membership_type: membership_type,
      amount: amount,
    });

    await tempTransaction.save();

    res.status(200).json({ 
      paymentUrl: paymentLinkData.checkoutUrl,
      orderCode: requestData.orderCode 
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Check subscription expiration and send notifications
// @route CRON JOB - runs daily at 9:00 AM
const checkSubscriptionExpiration = async () => {
  try {
    const today = new Date();
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Find cameramen with active subscriptions
    const cameramen = await User.find({
      role_name: UserRoleEnum.CAMERAMAN,
      membership_subscription: { $in: [UserMembershipEnum.ONE_MONTH, UserMembershipEnum.SIX_MONTH] },
      subscription_end_date: { $exists: true, $ne: null }
    });

    for (const cameraman of cameramen) {
      const subscriptionEndDate = new Date(cameraman.subscription_end_date);
      const membershipType = cameraman.membership_subscription;
      
      // Check if subscription expires in 1 week (warning notification)
      if (subscriptionEndDate <= oneWeekFromNow && subscriptionEndDate > today) {
        const membershipTypeText = membershipType === UserMembershipEnum.ONE_MONTH ? "1 tháng" : "6 tháng";
        const endDateStr = subscriptionEndDate.toLocaleDateString('vi-VN');
        
        const notificationContent = `Gói ${membershipTypeText} của bạn sẽ hết hạn vào ngày ${endDateStr}.`;
        
        await createAndEmitNotification(
          cameraman._id,
          NotificationTypeEnum.SUBSCRIPTION_WARNING,
          notificationContent
        );
        
        console.log(`Subscription warning sent to cameraman: ${cameraman.email}`);
      }
      
      // Check if subscription has expired (expiration notification)
      if (subscriptionEndDate <= today) {
        const membershipTypeText = membershipType === UserMembershipEnum.ONE_MONTH ? "1 tháng" : "6 tháng";
        
        const notificationContent = `Gói ${membershipTypeText} của bạn đã hết hạn. Vui lòng gia hạn ngay để tiếp tục hưởng ưu đãi.`;
        
        await createAndEmitNotification(
          cameraman._id,
          NotificationTypeEnum.SUBSCRIPTION_EXPIRED,
          notificationContent
        );
        
        console.log(`Subscription expiration notification sent to cameraman: ${cameraman.email}`);
      }
    }
    
    console.log(`Subscription check completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("Error in subscription expiration check:", error);
  }
};

// @desc Start subscription monitoring cron job
// @route CRON JOB - runs daily at 00:00 AM
const startSubscriptionMonitoring = () => {
  // Run daily at 00:00 AM (midnight)
  cron.schedule('0 0 * * *', () => {
    console.log('Starting subscription expiration check...');
    checkSubscriptionExpiration();
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });
  
  console.log('Subscription monitoring cron job started - runs daily at 00:00 AM (Vietnam time)');
};

// @desc Manual trigger for subscription check (for testing)
// @route POST /api/users/check-subscriptions
// @access private (Admin only)
const manualCheckSubscriptions = asyncHandler(async (req, res) => {
  try {
    if (req.user.roleName !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Chỉ có Admin mới có thể thực hiện kiểm tra thủ công");
    }
    
    await checkSubscriptionExpiration();
    
    res.status(200).json({ 
      message: "Kiểm tra hết hạn gói thành viên đã được thực hiện thành công" 
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

module.exports = {
  getUsers,
  getCameramen,
  getUserById,
  updateUsers,
  deleteUsers,
  deleteUsersNoAuth,
  currentUser,
  checkOldPassword,
  changePassword,
  statisticsAccountByStatus,
  searchAccountByEmail,
  banAccountByAdmin,
  unBanAccountByAdmin,
  updateUserInfoForAdmin,
  forgotPassword,
  verifyOtp,
  resetPassword,
  upMembershipByAccountBalance,
  upRoleCameramanByAdmin,
  createMembershipSubscriptionPayment,
  checkSubscriptionExpiration,
  startSubscriptionMonitoring,
  manualCheckSubscriptions,
};
