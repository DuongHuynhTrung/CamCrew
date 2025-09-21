const asyncHandler = require("express-async-handler");
const Review = require("../models/Review");
const User = require("../models/User");
const { UserRoleEnum } = require("../../enum/UserEnum");
const { createAndEmitNotification } = require("./NotificationController");
const NotificationTypeEnum = require("../../enum/NotificationEnum");

// Lấy tất cả đánh giá với phân trang
const getAllReviews = asyncHandler(async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    const total = await Review.countDocuments();
    const reviews = await Review.find()
      .populate("customer_id", "full_name avatar_url")
      .populate("cameraman_id", "full_name avatar_url")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      data: reviews,
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

// Lấy đánh giá theo ID
const getReviewById = asyncHandler(async (req, res) => {
  try {
    const { review_id } = req.params;
    const review = await Review.findById(review_id)
      .populate("customer_id", "full_name avatar_url")
      .populate("cameraman_id", "full_name avatar_url")
      .exec();
    
    if (!review) {
      res.status(404);
      throw new Error("Không tìm thấy đánh giá với ID đã cho");
    }
    
    res.status(200).json(review);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Lấy đánh giá theo cameraman_id
const getReviewsByCameraman = asyncHandler(async (req, res) => {
  try {
    const { cameraman_id } = req.params;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    // Kiểm tra cameraman có tồn tại không
    const cameraman = await User.findById(cameraman_id);
    if (!cameraman) {
      res.status(404);
      throw new Error("Không tìm thấy thợ chụp ảnh");
    }

    const total = await Review.countDocuments({ cameraman_id });
    const reviews = await Review.find({ cameraman_id })
      .populate("customer_id", "full_name avatar_url")
      .populate("cameraman_id", "full_name avatar_url")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Tính điểm đánh giá trung bình
    const avgRating = await Review.aggregate([
      { $match: { cameraman_id: mongoose.Types.ObjectId(cameraman_id) } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);

    res.status(200).json({
      data: reviews,
      pagination: {
        pageIndex: page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        totalResults: total,
      },
      averageRating: avgRating.length > 0 ? avgRating[0].avgRating : 0,
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Lấy đánh giá theo customer_id
const getReviewsByCustomer = asyncHandler(async (req, res) => {
  try {
    const { customer_id } = req.params;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    // Kiểm tra customer có tồn tại không
    const customer = await User.findById(customer_id);
    if (!customer) {
      res.status(404);
      throw new Error("Không tìm thấy khách hàng");
    }

    const total = await Review.countDocuments({ customer_id });
    const reviews = await Review.find({ customer_id })
      .populate("customer_id", "full_name avatar_url")
      .populate("cameraman_id", "full_name avatar_url")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      data: reviews,
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

// Tạo mới đánh giá
const createReview = asyncHandler(async (req, res) => {
  try {
    const { customer_id, cameraman_id, rating, comment } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!customer_id || !cameraman_id || !rating) {
      res.status(400);
      throw new Error("Vui lòng cung cấp đầy đủ thông tin đánh giá");
    }

    // Kiểm tra rating hợp lệ
    if (rating < 1 || rating > 5) {
      res.status(400);
      throw new Error("Điểm đánh giá phải từ 1 đến 5");
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

    // Kiểm tra xem customer đã đánh giá cameraman này chưa
    const existingReview = await Review.findOne({ customer_id, cameraman_id });
    if (existingReview) {
      res.status(400);
      throw new Error("Bạn đã đánh giá thợ chụp ảnh này rồi");
    }

    const review = new Review({
      customer_id,
      cameraman_id,
      rating,
      comment,
    });

    const createdReview = await review.save();
    
    // Populate thông tin user
    await createdReview.populate([
      { path: "customer_id", select: "full_name avatar_url" },
      { path: "cameraman_id", select: "full_name avatar_url email" }
    ]);

    // Create notification for cameraman
    await createAndEmitNotification(
      cameraman_id,
      NotificationTypeEnum.REVIEW_NEW,
      "Có khách hàng đã để lại đánh giá dành cho bạn."
    );

    res.status(201).json(createdReview);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Cập nhật đánh giá theo ID
const updateReviewById = asyncHandler(async (req, res) => {
  try {
    const { review_id } = req.params;
    const { rating, comment } = req.body;

    // Kiểm tra rating hợp lệ nếu có cập nhật
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      res.status(400);
      throw new Error("Điểm đánh giá phải từ 1 đến 5");
    }

    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    const updatedReview = await Review.findByIdAndUpdate(
      review_id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("customer_id", "full_name avatar_url")
      .populate("cameraman_id", "full_name avatar_url")
      .exec();

    if (!updatedReview) {
      res.status(404);
      throw new Error("Không tìm thấy đánh giá để cập nhật");
    }

    res.status(200).json(updatedReview);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Xóa đánh giá theo ID
const deleteReviewById = asyncHandler(async (req, res) => {
  try {
    const { review_id } = req.params;
    
    // Kiểm tra quyền xóa (chỉ admin hoặc chủ sở hữu đánh giá)
    if (req.user.role_name !== UserRoleEnum.ADMIN) {
      const review = await Review.findById(review_id);
      if (!review) {
        res.status(404);
        throw new Error("Không tìm thấy đánh giá");
      }
      
      if (review.customer_id.toString() !== req.user.id) {
        res.status(403);
        throw new Error("Bạn không có quyền xóa đánh giá này");
      }
    }

    const deletedReview = await Review.findByIdAndDelete(review_id).exec();
    if (!deletedReview) {
      res.status(404);
      throw new Error("Không tìm thấy đánh giá để xóa");
    }

    res.status(200).json({ 
      message: "Đã xóa đánh giá thành công", 
      review: deletedReview 
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Lấy thống kê đánh giá theo cameraman
const getReviewStatsByCameraman = asyncHandler(async (req, res) => {
  try {
    const { cameraman_id } = req.params;

    const stats = await Review.aggregate([
      { $match: { cameraman_id: mongoose.Types.ObjectId(cameraman_id) } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          ratingDistribution: {
            $push: "$rating"
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.status(200).json({
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats[0].ratingDistribution.forEach(rating => {
      ratingDistribution[rating]++;
    });

    res.status(200).json({
      totalReviews: stats[0].totalReviews,
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      ratingDistribution
    });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

module.exports = {
  getAllReviews,
  getReviewById,
  getReviewsByCameraman,
  getReviewsByCustomer,
  createReview,
  updateReviewById,
  deleteReviewById,
  getReviewStatsByCameraman,
};
