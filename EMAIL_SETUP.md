# Hướng dẫn cấu hình Email cho Render

## Vấn đề với SMTP trên Render

Render thường chặn các port SMTP (465, 587, 25) để tránh spam, đó là lý do tại sao test SMTP của bạn không kết nối được.

## Giải pháp 1 (Khuyến nghị): Dùng Resend (không yêu cầu xác minh số điện thoại)

### 1. Tạo tài khoản Resend

1. Truy cập [Resend](https://resend.com/)
2. Đăng ký tài khoản
3. Lấy `API Key` trong Dashboard > API Keys

### 2. Xác thực Sender (không cần số điện thoại)

Chọn 1 trong 2 cách:
- Single sender: thêm email và xác thực qua link
- Domain (khuyến nghị): thêm DNS records theo hướng dẫn, không cần phone

### 3. Cấu hình trên Render

Thêm biến môi trường:
```
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_verified_sender@domain.com
```

Sau khi set, gọi `GET /test-email` để kiểm tra `resendEnabled`.

<!-- SendGrid section removed per request -->

## Cách test

### 1. Kiểm tra cấu hình
```bash
GET https://your-app.onrender.com/test-email
```

### 2. Test gửi email
```bash
POST https://your-app.onrender.com/test-email-send
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email",
  "message": "This is a test email"
}
```

## Fallback: Gmail SMTP

Nếu bạn vẫn muốn sử dụng Gmail SMTP, cần:

1. Bật 2-Factor Authentication
2. Tạo App Password
3. Sử dụng App Password thay vì mật khẩu thường

Biến môi trường:
```
EMAIL=your_gmail@gmail.com
PASSWORD=your_app_password
```

## Lưu ý quan trọng

- **Resend được khuyến nghị** cho Render (không cần số điện thoại)
- Gmail SMTP có thể bị chặn trên một số cloud platform
- Service có fallback: Resend → Gmail SMTP

## Troubleshooting

<!-- SendGrid troubleshooting removed per request -->

### Gmail SMTP không hoạt động
- Sử dụng App Password thay vì mật khẩu thường
- Kiểm tra 2FA đã được bật
- Port 587 thường hoạt động tốt hơn port 465 trên cloud
