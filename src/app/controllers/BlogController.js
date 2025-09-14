const asyncHandler = require("express-async-handler");
const Blog = require("../models/Blog");

// Lấy tất cả blog với phân trang
const getAllBlogs = asyncHandler(async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    const total = await Blog.countDocuments();
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      data: blogs,
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

// Lấy blog theo ID
const getBlogById = asyncHandler(async (req, res) => {
  try {
    const { blog_id } = req.params;
    const blog = await Blog.findById(blog_id).exec();
    if (!blog) {
      res.status(404);
      throw new Error("Không tìm thấy blog với ID đã cho");
    }
    res.status(200).json(blog);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Tạo mới blog
const createBlog = asyncHandler(async (req, res) => {
  try {
    const { title, content, cover_url } = req.body;
    if (!title || !content) {
      res.status(400);
      throw new Error("Vui lòng cung cấp đầy đủ tiêu đề và nội dung blog");
    }
    const blog = new Blog({
      title,
      content,
      cover_url,
    });
    const createdBlog = await blog.save();
    res.status(201).json(createdBlog);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Cập nhật blog theo ID
const updateBlogById = asyncHandler(async (req, res) => {
  try {
    const { blog_id } = req.params;
    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.content !== undefined) updateData.content = req.body.content;
    if (req.body.cover_url !== undefined) updateData.cover_url = req.body.cover_url;

    const updatedBlog = await Blog.findByIdAndUpdate(blog_id, updateData, {
      new: true,
      runValidators: true,
    }).exec();
    if (!updatedBlog) {
      res.status(404);
      throw new Error("Không tìm thấy blog để cập nhật");
    }
    res.status(200).json(updatedBlog);
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

// Xóa blog theo ID
const deleteBlogById = asyncHandler(async (req, res) => {
  try {
    const { blog_id } = req.params;
    const deletedBlog = await Blog.findByIdAndDelete(blog_id).exec();
    if (!deletedBlog) {
      res.status(404);
      throw new Error("Không tìm thấy blog để xóa");
    }
    res.status(200).json({ message: "Đã xóa blog thành công", blog: deletedBlog });
  } catch (error) {
    res
      .status(res.statusCode || 500)
      .send(error.message || "Lỗi máy chủ nội bộ");
  }
});

module.exports = {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlogById,
  deleteBlogById,
};
