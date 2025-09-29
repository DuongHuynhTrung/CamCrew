const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { UserRoleEnum, UserStatusEnum } = require("../../enum/UserEnum");
const { jwtDecode } = require("jwt-decode");

//@desc Register New user
//@route POST /api/users/register
//@access public
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const registerUser = asyncHandler(async (req, res, next) => {
  try {
    const { email, password, full_name, phone_number, role } = req.body;
    if (email === undefined || password === undefined) {
      res.status(400);
      throw new Error("Tất cả các trường không được để trống!");
    }
    const userEmailAvailable = await User.findOne({ email });
    if (userEmailAvailable) {
      res.status(400);
      throw new Error("Người dùng đã đăng ký với email này!");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user với is_verify = false
    const user = await User.create({
      email,
      password: hashedPassword,
      full_name,
      phone_number,
      role_name: role || UserRoleEnum.CUSTOMER,
      is_verified: false,
    });

    if (!user) {
      res.status(400);
      throw new Error("Dữ liệu người dùng không hợp lệ!");
    }

    // Tạo token xác thực email
    const verifyToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    // Tạo link xác thực
    const verifyLink = `${process.env.CLIENT_URL || "https://camcrew.vercel.app"}/verify&upn=${verifyToken}`;

    // Đọc file verify_form.html và thay thế các thông tin
    const templatePath = path.join(__dirname, "../../views/verify_form.html");
    let emailBody = fs.readFileSync(templatePath, "utf8");
    emailBody = emailBody
      .replace(/USER_NAME/g, user.full_name || user.email)
      .replace(/VERIFY_LINK/g, verifyLink);

    // Kiểm tra biến môi trường email
    if (!process.env.EMAIL || !process.env.PASSWORD) {
      console.error("Email configuration missing: EMAIL or PASSWORD environment variables not set");
      // Vẫn trả về success nhưng log lỗi
    } else {
      // Gửi mail xác thực với cấu hình tối ưu cho Render
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587, // Sử dụng port 587 thay vì 465
        secure: false, // false cho port 587, true cho port 465
        service: "gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
        // Thêm cấu hình timeout và retry
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        // Thêm tùy chọn TLS
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: "Xác thực tài khoản CamCrew",
        html: emailBody,
      };

      // Sử dụng async/await với retry mechanism
      let retryCount = 0;
      const maxRetries = 3;
      let emailSent = false;

      while (retryCount < maxRetries && !emailSent) {
        try {
          // Verify connection trước khi gửi
          await transporter.verify();
          console.log("SMTP connection verified successfully");
          
          const info = await transporter.sendMail(mailOptions);
          console.log(`Verify email sent successfully: ${info.messageId}`);
          emailSent = true;
        } catch (emailError) {
          retryCount++;
          console.error(`Send verify email error (attempt ${retryCount}/${maxRetries}):`, emailError.message);
          
          if (retryCount < maxRetries) {
            console.log(`Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.error("Failed to send email after all retry attempts");
          }
        }
      }

      // Đóng connection
      transporter.close();
    }

    res.status(200).json({
      message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

const loginGoogle = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const googlePayload = jwtDecode(token);
  try {
    const user = await User.findOne({ email: googlePayload.email });
    if (user) {
      if (user.status === UserStatusEnum.BLOCKED) {
        throw new BadRequestException(
          "Tài khoản của bạn đã bị khóa. Hãy liên hệ với admin để mở khóa!"
        );
      }

      const accessToken = jwt.sign(
        {
          user: {
            full_name: user.full_name,
            email: user.email,
            role_name: user.role_name,
            avatar_url: user.avatar_url,
            id: user.id,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );

      res.status(200).json({ accessToken });
    } else {
      const newUser = await User.create({
        email: googlePayload.email,
        full_name: googlePayload.name,
        avatar_url: googlePayload.picture,
        role_name: UserRoleEnum.CUSTOMER,
        is_verified: true,
      });
      if (!newUser) {
        res.status(500);
        throw new Error(
          "Có lỗi xảy ra khi tạo người dùng mới. Vui lòng kiểm tra lại thông tin"
        );
      }

      const accessToken = jwt.sign(
        {
          user: {
            full_name: newUser.full_name,
            email: newUser.email,
            role_name: newUser.role_name,
            avatar_url: newUser.avatar_url,
            id: newUser.id,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.status(200).json({ accessToken });
    }
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

//@desc Login user (bằng email hoặc số điện thoại)
//@route POST /api/auth/login
//@access public
const login = asyncHandler(async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier có thể là email hoặc số điện thoại
    if (!identifier || !password) {
      res.status(400);
      throw new Error("Tất cả các trường không được để trống!");
    }

    // Tìm user theo email hoặc số điện thoại
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone_number: identifier }
      ]
    });

    if (!user) {
      res.status(404);
      throw new Error(`Không tìm thấy người dùng với email hoặc số điện thoại ${identifier}`);
    }

    // So sánh password với hashedPassword
    const matches = await bcrypt.compare(password, user.password);
    if (user && matches) {
      // Kiểm tra trạng thái tài khoản bị block
      if (user.status === "blocked" || user.status === false) {
        res.status(401);
        throw new Error(
          "Tài khoản của bạn đã bị khóa! Vui lòng liên hệ với quản trị viên!"
        );
      }
      // Kiểm tra xác thực email
      if (!user.is_verified) {
        res.status(401);
        throw new Error(
          "Tài khoản của bạn chưa được xác thực email! Vui lòng kiểm tra email để xác thực tài khoản."
        );
      }
      const accessToken = jwt.sign(
        {
          user: {
            full_name: user.full_name,
            email: user.email,
            role_name: user.role_name,
            avatar_url: user.avatar_url,
            id: user.id,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );

      const refreshToken = jwt.sign(
        {
          user: {
            full_name: user.full_name,
            email: user.email,
            role_name: user.role_name,
            avatar_url: user.avatar_url,
            id: user.id,
          },
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      // Create secure cookie with refresh token
      res.cookie("jwt", refreshToken, {
        httpOnly: true, //accessible only by web server
        secure: true, //https
        sameSite: "None", //cross-site cookie
        maxAge: 7 * 24 * 60 * 60 * 1000, //cookie expiry: set to match rT
      });

      res.status(200).json({ accessToken });
    } else {
      res.status(401);
      throw new Error("Email/Số điện thoại hoặc mật khẩu không hợp lệ!");
    }
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Verify email
// @route POST /api/auth/verify-email
// @access public
const verifyEmail = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400);
      throw new Error("Token xác thực không hợp lệ!");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      res.status(400);
      throw new Error("Token xác thực không hợp lệ hoặc đã hết hạn!");
    }

    const { email } = decoded;
    if (!email) {
      res.status(400);
      throw new Error("Không tìm thấy email trong token!");
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error("Không tìm thấy người dùng!");
    }

    if (user.is_verified) {
      // Đã xác thực rồi, trả về access_token luôn
      const accessToken = jwt.sign(
        {
          user: {
            full_name: user.full_name,
            email: user.email,
            role_name: user.role_name,
            avatar_url: user.avatar_url,
            id: user.id,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      return res.status(200).json({
        message: "Tài khoản đã được xác thực trước đó.",
        accessToken,
      });
    }

    user.is_verified = true;
    await user.save();

    const accessToken = jwt.sign(
      {
        user: {
          full_name: user.full_name,
          email: user.email,
          role_name: user.role_name,
          avatar_url: user.avatar_url,
          id: user.id,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Xác thực email thành công!",
      accessToken,
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = (req, res) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
      res.sendStatus(204);
      throw new Error("Không có nội dung!");
    }
    res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
    res.status(200).json({ message: "Cookie đã được xóa" });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
};

module.exports = { registerUser, login, loginGoogle, logout, verifyEmail };
