const asyncHandler = require("express-async-handler");
const Service = require("../models/Service");
const User = require("../models/User");
const Booking = require("../models/Booking");
const { BookingStatusEnum } = require("../../enum/BookingEnum");
const { ServiceStatusEnum } = require("../../enum/ServiceEnum");
const { createAndEmitNotification } = require("./NotificationController");
const NotificationTypeEnum = require("../../enum/NotificationEnum");
const { UserRoleEnum } = require("../../enum/UserEnum");

// Helper: build filter for getAllServices
function buildServiceFilter(query) {
  const filter = {};
  if (query.styles) {
    filter.styles = { $in: Array.isArray(query.styles) ? query.styles : [query.styles] };
  }
  if (query.categories) {
    filter.categories = { $in: Array.isArray(query.categories) ? query.categories : [query.categories] };
  }
  if (query.areas) {
    filter.areas = { $in: Array.isArray(query.areas) ? query.areas : [query.areas] };
  }
  if (query.min !== undefined || query.max !== undefined) {
    filter.amount = {};
    if (query.min !== undefined) filter.amount.$gte = Number(query.min);
    if (query.max !== undefined) filter.amount.$lte = Number(query.max);
  }
  if (query.status) {
    filter.status = query.status;
  }
  return filter;
}

// Lấy tất cả dịch vụ với filter và pagination
const getAllServices = asyncHandler(async (req, res) => {
  try {
    const filter = buildServiceFilter(req.query);

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    const total = await Service.countDocuments(filter);
    const services = await Service.find(filter)
      .populate("cameraman_id")
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      data: services,
      pagination: {
        pageIndex: page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        totalResults: total,
      },
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Lấy dịch vụ theo ID
const getServiceById = asyncHandler(async (req, res) => {
  try {
    const service = await Service.findById(req.params.service_id)
      .populate("cameraman_id")
      .exec();
    if (!service) {
      res.status(404);
      throw new Error("Dịch vụ không tồn tại");
    }
    res.status(200).json(service);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Tạo mới dịch vụ - chỉ cameraman, status mặc định là pending
const createService = asyncHandler(async (req, res) => {
  try {
    const {
      cameraman_id,
      title,
      amount,
      styles,
      categories,
      areas,
      video_demo_urls,
      date_get_job,
      time_of_day,
    } = req.body;

    if (
      !cameraman_id ||
      !title ||
      amount === undefined ||
      !styles ||
      !categories ||
      !areas ||
      !date_get_job ||
      !time_of_day
    ) {
      res.status(400);
      throw new Error("Vui lòng cung cấp đầy đủ thông tin dịch vụ");
    }

    const cameraman = await User.findById(cameraman_id);
    if (!cameraman) {
      res.status(404);
      throw new Error("Người tạo dịch vụ không tồn tại");
    }
    if (cameraman.role_name !== UserRoleEnum.CAMERAMAN) {
      res.status(403);
      throw new Error("Chỉ có cameraman mới được tạo dịch vụ");
    }

    const service = new Service({
      cameraman_id,
      title,
      amount,
      styles,
      categories,
      areas,
      video_demo_urls,
      date_get_job,
      time_of_day,
      status: ServiceStatusEnum.PENDING, // default
      rejection_reason: "",
    });

    const savedService = await service.save();
    
    // Create notification for admin
    const admin = await User.findOne({ role_name: UserRoleEnum.ADMIN });
    if (admin) {
      await createAndEmitNotification(
        admin._id,
        NotificationTypeEnum.SERVICE_CONFIRM,
        "Có dịch vụ cần bạn kiểm duyệt!"
      );
    }

    res.status(201).json(savedService);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Cập nhật dịch vụ theo ID - chỉ khi status là pending
const updateServiceById = asyncHandler(async (req, res) => {
  try {
    const service = await Service.findById(req.params.service_id);
    if (!service) {
      res.status(404);
      throw new Error("Dịch vụ không tồn tại");
    }
    if (service.status !== ServiceStatusEnum.PENDING) {
      res.status(400);
      throw new Error("Chỉ được chỉnh sửa dịch vụ khi trạng thái là pending");
    }

    // Không cho update status, rejection_reason qua API này
    const updateData = { ...req.body };
    delete updateData.status;
    delete updateData.rejection_reason;

    const updatedService = await Service.findByIdAndUpdate(
      req.params.service_id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedService);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Không xóa, chỉ chuyển status sang disabled
const disableServiceById = asyncHandler(async (req, res) => {
  try {
    const service = await Service.findById(req.params.service_id);
    if (!service) {
      res.status(404);
      throw new Error("Dịch vụ không tồn tại");
    }
    if (service.status === ServiceStatusEnum.DISABLED) {
      return res.status(200).json({ message: "Dịch vụ đã bị vô hiệu hóa" });
    }
    service.status = ServiceStatusEnum.DISABLED;
    await service.save();
    res.status(200).json({ message: "Dịch vụ đã được vô hiệu hóa" });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Admin duyệt dịch vụ (approve)
const approveServiceById = asyncHandler(async (req, res) => {
  try {
    // Yêu cầu: chỉ admin mới được duyệt, kiểm tra quyền ở middleware ngoài
    const service = await Service.findById(req.params.service_id);
    if (!service) {
      res.status(404);
      throw new Error("Dịch vụ không tồn tại");
    }
    if (service.status !== ServiceStatusEnum.PENDING) {
      res.status(400);
      throw new Error("Chỉ dịch vụ ở trạng thái pending mới được duyệt");
    }
    service.status = ServiceStatusEnum.APPROVED;
    service.rejection_reason = "";
    await service.save();
    
    // Create notification for cameraman
    await createAndEmitNotification(
      service.cameraman_id,
      NotificationTypeEnum.SERVICE_APPROVED,
      `Dịch vụ ${service.title} đã được kiểm duyệt và hiện đang hiển thị cho khách hàng.`
    );
    
    res.status(200).json({ message: "Dịch vụ đã được duyệt", service });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Admin từ chối dịch vụ (reject) - phải có rejection_reason
const rejectServiceById = asyncHandler(async (req, res) => {
  try {
    // Yêu cầu: chỉ admin mới được duyệt, kiểm tra quyền ở middleware ngoài
    const { rejection_reason } = req.body;
    if (!rejection_reason) {
      res.status(400);
      throw new Error("Vui lòng cung cấp lý do từ chối");
    }
    const service = await Service.findById(req.params.id);
    if (!service) {
      res.status(404);
      throw new Error("Dịch vụ không tồn tại");
    }
    if (service.status !== ServiceStatusEnum.PENDING) {
      res.status(400);
      throw new Error("Chỉ dịch vụ ở trạng thái pending mới được từ chối");
    }
    service.status = ServiceStatusEnum.REJECTED;
    service.rejection_reason = rejection_reason;
    await service.save();
    
    // Create notification for cameraman
    await createAndEmitNotification(
      service.cameraman_id,
      NotificationTypeEnum.SERVICE_REJECTED,
      `Dịch vụ ${service.title} đã bị từ chối.`
    );
    
    res.status(200).json({ message: "Dịch vụ đã bị từ chối", service });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Lấy các khung giờ còn trống của dịch vụ theo ngày
const getFreeSlot = asyncHandler(async (req, res) => {
  try {
    const { service_id, date_get_job } = req.body;
    if (!service_id || !date_get_job) {
      res.status(400);
      throw new Error("Vui lòng cung cấp service_id và date_get_job");
    }

    const service = await Service.findById(service_id);
    if (!service) {
      res.status(404);
      throw new Error("Dịch vụ không tồn tại");
    }
    
    if (
      new Date(service.date_get_job).toISOString().slice(0, 10) !==
      new Date(date_get_job).toISOString().slice(0, 10)
    ) {
      return res.status(200).json([]);
    }

    // Lọc các khung giờ đã bị chiếm bởi booking (PAYING hoặc REQUESTED)
    const takenBookings = await Booking.find({
      cameraman_id: service.cameraman_id,
      scheduled_date: new Date(date_get_job),
      status: { $in: [BookingStatusEnum.REQUESTED, BookingStatusEnum.PAYING] }
    }).select("time_of_day");

    const takenSlots = new Set(takenBookings.map((b) => b.time_of_day));
    const freeSlots = (service.time_of_day || []).filter((slot) => !takenSlots.has(slot));

    res.status(200).json(freeSlots);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateServiceById,
  disableServiceById,
  approveServiceById,
  rejectServiceById,
  getFreeSlot,
};
