const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.resendEnabled = !!process.env.RESEND_API_KEY;
    this.fallbackEnabled = !!(process.env.EMAIL && process.env.PASSWORD);
    this.resend = this.resendEnabled ? new Resend(process.env.RESEND_API_KEY) : null;
  }
  /**
   * Gửi email sử dụng Resend (ưu tiên nhất)
   */
  async sendWithResend(to, subject, html, from = null) {
    if (!this.resendEnabled || !this.resend) {
      throw new Error('Resend API key not configured');
    }

    const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    try {
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        html,
      });
      if (error) throw error;
      console.log('Email sent successfully via Resend:', data?.id);
      return { success: true, method: 'resend', messageId: data?.id };
    } catch (error) {
      console.error('Resend error:', error.message || error);
      throw error;
    }
  }


  // (Đã bỏ SendGrid)

  /**
   * Gửi email sử dụng Nodemailer (fallback)
   */
  async sendWithNodemailer(to, subject, html, from = null) {
    if (!this.fallbackEnabled) {
      throw new Error('Nodemailer configuration not available');
    }

    // Cấu hình email cho Render (sử dụng port 587 với TLS)
    const emailConfigs = [
      {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      },
      {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      }
    ];

    let lastError = null;

    for (let i = 0; i < emailConfigs.length; i++) {
      try {
        console.log(`Trying Nodemailer config ${i + 1}...`);
        const transporter = nodemailer.createTransport(emailConfigs[i]);

        // Verify connection
        await transporter.verify();
        console.log(`SMTP connection verified with config ${i + 1}`);

        const mailOptions = {
          from: from || process.env.EMAIL,
          to,
          subject,
          html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully via Nodemailer:', info.messageId);
        
        transporter.close();
        return { success: true, method: 'nodemailer', messageId: info.messageId };
      } catch (error) {
        console.error(`Nodemailer config ${i + 1} failed:`, error.message);
        lastError = error;
        
        if (i < emailConfigs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('All Nodemailer configurations failed');
  }

  /**
   * Gửi email với fallback tự động
   */
  async sendEmail(to, subject, html, from = null) {
    let result = null;
    let lastError = null;

    console.log(this.resendEnabled);
    // Thử Resend trước
    if (this.resendEnabled) {
      try {
        result = await this.sendWithResend(to, subject, html, from);
        return result;
      } catch (error) {
        console.error('Resend failed, trying next provider:', error.message || error);
        lastError = error;
      }
    }

    // Không dùng SendGrid nữa

    // Fallback to Nodemailer
    if (this.fallbackEnabled) {
      try {
        result = await this.sendWithNodemailer(to, subject, html, from);
        return result;
      } catch (error) {
        console.error('Nodemailer also failed:', error.message);
        lastError = error;
      }
    }

    throw lastError || new Error('No email service configured');
  }

  /**
   * Gửi email xác thực tài khoản
   */
  async sendVerificationEmail(userEmail, userName, verifyLink) {
    try {
      const templatePath = path.join(__dirname, "../views/verify_form.html");
      let emailBody = fs.readFileSync(templatePath, "utf8");
      emailBody = emailBody
        .replace(/USER_NAME/g, userName || userEmail)
        .replace(/VERIFY_LINK/g, verifyLink);

      return await this.sendEmail(
        userEmail,
        "Xác thực tài khoản CamCrew",
        emailBody
      );
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  }

  /**
   * Gửi email OTP
   */
  async sendOTPEmail(userEmail, otp) {
    try {
      const templatePath = path.join(__dirname, "../views/otp.html");
      let emailBody = fs.readFileSync(templatePath, "utf8");
      emailBody = emailBody
        .replace(/OTP_CODE/g, otp)
        .replace(/OTP_EXPIRE_MINUTES/g, "10");

      return await this.sendEmail(
        userEmail,
        "Mã OTP đặt lại mật khẩu CamCrew",
        emailBody
      );
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra trạng thái email service
   */
  getStatus() {
    return {
      resendEnabled: this.resendEnabled,
      fallbackEnabled: this.fallbackEnabled,
      hasEmailConfig: !!(process.env.EMAIL && process.env.PASSWORD),
      hasResendConfig: !!process.env.RESEND_API_KEY,
    };
  }
}

module.exports = new EmailService();
