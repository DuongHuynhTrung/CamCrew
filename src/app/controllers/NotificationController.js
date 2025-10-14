const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { UserRoleEnum } = require("../../enum/UserEnum");
const { BookingTypeEnum } = require("../../enum/BookingEnum");
const NotificationTypeEnum = require("../../enum/NotificationEnum");

// @desc Get all notifications for current user
// @route GET /api/notifications
// @access private
const getNotifications = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    // Build filter based on query params
    const { type, isRead } = req.query;
    const filter = { user_id: req.user.id };

    if (typeof type === "string" && type.trim() !== "") {
      // Validate against enum if available
      const allowedTypes = Object.values(NotificationTypeEnum || {});
      if (!allowedTypes.length || allowedTypes.includes(type)) {
        filter.type = type;
      }
    }

    if (typeof isRead !== "undefined") {
      if (isRead === "true" || isRead === true) filter.is_read = true;
      else if (isRead === "false" || isRead === false) filter.is_read = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('user_id')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      Notification.countDocuments(filter)
    ]);

    res.status(200).json({
      data: notifications,
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

// @desc Get notification by ID
// @route GET /api/notifications/:id
// @access private
const getNotificationById = asyncHandler(async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId)
      .populate('user_id');

    if (!notification) {
      res.status(404);
      throw new Error("Thông báo không tồn tại");
    }

    // Check if user has permission to view this notification
    if (notification.user_id._id.toString() !== req.user.id && req.user.role_name !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Bạn không có quyền xem thông báo này");
    }

    res.status(200).json(notification);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Create new notification
// @route POST /api/notifications
// @access private (Admin only)
const createNotification = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role_name !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Chỉ có Admin có quyền tạo thông báo");
    }

    const { user_id, type, content } = req.body;

    if (!user_id || !type || !content) {
      res.status(400);
      throw new Error("Vui lòng cung cấp đầy đủ thông tin thông báo");
    }

    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
      res.status(404);
      throw new Error("Người dùng không tồn tại");
    }

    const notification = new Notification({
      user_id,
      type,
      content
    });

    const createdNotification = await notification.save();
    await createdNotification.populate('user_id');

    // Emit notification to specific user
    if (global._io) {
      global._io.emit(`notification-${user.email}`, createdNotification);
    }

    res.status(201).json(createdNotification);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Update notification (mark as read)
// @route PUT /api/notifications/:id
// @access private
const updateNotification = asyncHandler(async (req, res) => {
  try {
    const notificationId = req.params.id;
    const { is_read } = req.body;

    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      res.status(404);
      throw new Error("Thông báo không tồn tại");
    }

    // Check if user has permission to update this notification
    if (notification.user_id.toString() !== req.user.id && req.user.role_name !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Bạn không có quyền cập nhật thông báo này");
    }

    // Update notification
    if (is_read !== undefined) {
      notification.is_read = is_read;
    }

    await notification.save();
    await notification.populate('user_id');

    res.status(200).json({
      message: "Cập nhật thông báo thành công",
      notification: notification
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Delete notification
// @route DELETE /api/notifications/:id
// @access private
const deleteNotification = asyncHandler(async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      res.status(404);
      throw new Error("Thông báo không tồn tại");
    }

    // Check if user has permission to delete this notification
    if (notification.user_id.toString() !== req.user.id && req.user.role_name !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Bạn không có quyền xóa thông báo này");
    }

    await Notification.findByIdAndDelete(notificationId);

    res.status(200).json({
      message: "Xóa thông báo thành công"
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Mark all notifications as read
// @route PUT /api/notifications/mark-all-read
// @access private
const markAllAsRead = asyncHandler(async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user.id, is_read: false },
      { is_read: true }
    );

    res.status(200).json({
      message: "Đã đánh dấu tất cả thông báo là đã đọc"
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// @desc Get unread notifications count
// @route GET /api/notifications/unread-count
// @access private
const getUnreadCount = asyncHandler(async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user_id: req.user.id,
      is_read: false
    });

    res.status(200).json({
      unreadCount: unreadCount
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Helper function to create and emit notification
const createAndEmitNotification = async (user_id, type, content) => {
  try {
    const notification = new Notification({
      user_id,
      type,
      content
    });

    const createdNotification = await notification.save();
    await createdNotification.populate('user_id', 'full_name email');

    // Emit notification to specific user
    if (global._io) {
      global._io.emit(`notification-${createdNotification.user_id.email}`, createdNotification);
    }

    return createdNotification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

module.exports = {
  getNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  deleteNotification,
  markAllAsRead,
  getUnreadCount,
  createAndEmitNotification
};
