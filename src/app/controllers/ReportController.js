const asyncHandler = require("express-async-handler");
const Report = require("../models/Report");
const User = require("../models/User");
const ReportStatusEnum = require("../../enum/ReportEnum");
const { UserRoleEnum } = require("../../enum/UserEnum");

// Lấy tất cả báo cáo với phân trang
const getAllReports = asyncHandler(async (req, res) => {
  try {
    // Chỉ admin mới có quyền xem tất cả báo cáo
    if (req.user.roleName !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Chỉ có Admin có quyền truy xuất thông tin tất cả báo cáo");
    }

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    const total = await Report.countDocuments();
    const reports = await Report.find()
      .populate("customer_id", "full_name email avatar_url")
      .populate("cameraman_id", "full_name email avatar_url")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      data: reports,
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

// Lấy báo cáo theo ID
const getReportById = asyncHandler(async (req, res) => {
  try {
    const { report_id } = req.params;
    const report = await Report.findById(report_id)
      .populate("customer_id", "full_name email avatar_url")
      .populate("cameraman_id", "full_name email avatar_url")
      .exec();
    
    if (!report) {
      res.status(404);
      throw new Error("Không tìm thấy báo cáo với ID đã cho");
    }

    // Kiểm tra quyền truy cập (admin, người báo cáo, hoặc người bị báo cáo)
    if (req.user.roleName !== UserRoleEnum.ADMIN && 
        report.customer_id._id.toString() !== req.user.id && 
        report.cameraman_id._id.toString() !== req.user.id) {
      res.status(403);
      throw new Error("Bạn không có quyền truy cập báo cáo này");
    }
    
    res.status(200).json(report);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Lấy báo cáo theo customer_id
const getReportsByCustomer = asyncHandler(async (req, res) => {
  try {
    const { customer_id } = req.params;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    // Kiểm tra quyền truy cập
    if (req.user.roleName !== UserRoleEnum.ADMIN && req.user.id !== customer_id) {
      res.status(403);
      throw new Error("Bạn không có quyền truy cập báo cáo của người khác");
    }

    // Kiểm tra customer có tồn tại không
    const customer = await User.findById(customer_id);
    if (!customer) {
      res.status(404);
      throw new Error("Không tìm thấy khách hàng");
    }

    const total = await Report.countDocuments({ customer_id });
    const reports = await Report.find({ customer_id })
      .populate("customer_id", "full_name email avatar_url")
      .populate("cameraman_id", "full_name email avatar_url")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      data: reports,
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

// Lấy báo cáo theo cameraman_id
const getReportsByCameraman = asyncHandler(async (req, res) => {
  try {
    const { cameraman_id } = req.params;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    // Kiểm tra quyền truy cập
    if (req.user.roleName !== UserRoleEnum.ADMIN && req.user.id !== cameraman_id) {
      res.status(403);
      throw new Error("Bạn không có quyền truy cập báo cáo của người khác");
    }

    // Kiểm tra cameraman có tồn tại không
    const cameraman = await User.findById(cameraman_id);
    if (!cameraman) {
      res.status(404);
      throw new Error("Không tìm thấy thợ chụp ảnh");
    }

    const total = await Report.countDocuments({ cameraman_id });
    const reports = await Report.find({ cameraman_id })
      .populate("customer_id", "full_name email avatar_url")
      .populate("cameraman_id", "full_name email avatar_url")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      data: reports,
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

// Tạo mới báo cáo
const createReport = asyncHandler(async (req, res) => {
  try {
    const { customer_id, cameraman_id, content } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!customer_id || !cameraman_id || !content) {
      res.status(400);
      throw new Error("Vui lòng cung cấp đầy đủ thông tin báo cáo");
    }

    // Kiểm tra độ dài nội dung
    if (content.length > 1000) {
      res.status(400);
      throw new Error("Nội dung báo cáo không được vượt quá 1000 ký tự");
    }

    // Kiểm tra customer có tồn tại không
    const customer = await User.findById(customer_id);
    if (!customer) {
      res.status(404);
      throw new Error("Không tìm thấy khách hàng");
    }

    // Kiểm tra cameraman có tồn tại không
    const cameraman = await User.findById(cameraman_id);
    if (!cameraman) {
      res.status(404);
      throw new Error("Không tìm thấy thợ chụp ảnh");
    }

    // Kiểm tra quyền tạo báo cáo (chỉ customer mới được tạo báo cáo)
    if (req.user.id !== customer_id) {
      res.status(403);
      throw new Error("Bạn chỉ có thể tạo báo cáo cho chính mình");
    }

    // Kiểm tra xem customer đã báo cáo cameraman này chưa
    const existingReport = await Report.findOne({ customer_id, cameraman_id });
    if (existingReport) {
      res.status(400);
      throw new Error("Bạn đã báo cáo thợ chụp ảnh này rồi");
    }

    const report = new Report({
      customer_id,
      cameraman_id,
      content,
    });

    const createdReport = await report.save();
    
    // Populate thông tin user
    await createdReport.populate([
      { path: "customer_id", select: "full_name email avatar_url" },
      { path: "cameraman_id", select: "full_name email avatar_url" }
    ]);

    res.status(201).json(createdReport);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Cập nhật trạng thái báo cáo (chỉ admin)
const updateReportStatus = asyncHandler(async (req, res) => {
  try {
    const { report_id } = req.params;
    const { status } = req.body;

    // Chỉ admin mới có quyền cập nhật trạng thái báo cáo
    if (req.user.roleName !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Chỉ có Admin có quyền cập nhật trạng thái báo cáo");
    }

    // Kiểm tra status hợp lệ
    if (!Object.values(ReportStatusEnum).includes(status)) {
      res.status(400);
      throw new Error("Trạng thái báo cáo không hợp lệ");
    }

    const updatedReport = await Report.findByIdAndUpdate(
      report_id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("customer_id", "full_name email avatar_url")
      .populate("cameraman_id", "full_name email avatar_url")
      .exec();

    if (!updatedReport) {
      res.status(404);
      throw new Error("Không tìm thấy báo cáo để cập nhật");
    }

    res.status(200).json(updatedReport);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Xóa báo cáo theo ID
const deleteReportById = asyncHandler(async (req, res) => {
  try {
    const { report_id } = req.params;
    
    // Kiểm tra quyền xóa (chỉ admin hoặc chủ sở hữu báo cáo)
    if (req.user.roleName !== UserRoleEnum.ADMIN) {
      const report = await Report.findById(report_id);
      if (!report) {
        res.status(404);
        throw new Error("Không tìm thấy báo cáo");
      }
      
      if (report.customer_id.toString() !== req.user.id) {
        res.status(403);
        throw new Error("Bạn không có quyền xóa báo cáo này");
      }
    }

    const deletedReport = await Report.findByIdAndDelete(report_id).exec();
    if (!deletedReport) {
      res.status(404);
      throw new Error("Không tìm thấy báo cáo để xóa");
    }

    res.status(200).json({ 
      message: "Đã xóa báo cáo thành công", 
      report: deletedReport 
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Lấy thống kê báo cáo theo trạng thái
const getReportStats = asyncHandler(async (req, res) => {
  try {
    // Chỉ admin mới có quyền xem thống kê
    if (req.user.roleName !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Chỉ có Admin có quyền xem thống kê báo cáo");
    }

    const stats = await Report.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      pending: 0,
      processed: 0,
      total: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });

    res.status(200).json(result);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Lấy báo cáo theo trạng thái
const getReportsByStatus = asyncHandler(async (req, res) => {
  try {
    // Chỉ admin mới có quyền xem báo cáo theo trạng thái
    if (req.user.roleName !== UserRoleEnum.ADMIN) {
      res.status(403);
      throw new Error("Chỉ có Admin có quyền xem báo cáo theo trạng thái");
    }

    const { status } = req.params;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    // Kiểm tra status hợp lệ
    if (!Object.values(ReportStatusEnum).includes(status)) {
      res.status(400);
      throw new Error("Trạng thái báo cáo không hợp lệ");
    }

    const total = await Report.countDocuments({ status });
    const reports = await Report.find({ status })
      .populate("customer_id", "full_name email avatar_url")
      .populate("cameraman_id", "full_name email avatar_url")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      data: reports,
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

module.exports = {
  getAllReports,
  getReportById,
  getReportsByCustomer,
  getReportsByCameraman,
  createReport,
  updateReportStatus,
  deleteReportById,
  getReportStats,
  getReportsByStatus,
};
