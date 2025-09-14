const express = require("express");
const reviewRouter = express.Router();
const {
  getAllReviews,
  getReviewById,
  getReviewsByCameraman,
  getReviewsByCustomer,
  createReview,
  updateReviewById,
  deleteReviewById,
  getReviewStatsByCameraman,
} = require("../app/controllers/ReviewController");
const {
  validateToken,
  validateTokenCustomer,
} = require("../app/middleware/validateTokenHandler");

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Review management API
 */

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get all reviews with pagination and filtering
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reviews per page
 *       - in: query
 *         name: cameraman_id
 *         schema:
 *           type: string
 *         description: Filter by cameraman ID
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by rating
 *     responses:
 *       200:
 *         description: List of reviews
 *       500:
 *         description: Internal Server Error
 *   post:
 *     summary: Create a new review (Customer only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - cameraman_id
 *               - rating
 *             properties:
 *               customer_id:
 *                 type: string
 *                 description: Customer ID
 *               cameraman_id:
 *                 type: string
 *                 description: Cameraman ID
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5
 *               comment:
 *                 type: string
 *                 description: Review comment
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden - Only customers can create reviews
 */
reviewRouter.route("/").get(getAllReviews).post(validateTokenCustomer, createReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review details
 *       404:
 *         description: Review not found
 *   put:
 *     summary: Update review by ID (Owner only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       403:
 *         description: Forbidden - Can only update own reviews
 *       404:
 *         description: Review not found
 *   delete:
 *     summary: Delete review by ID (Owner only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       403:
 *         description: Forbidden - Can only delete own reviews
 *       404:
 *         description: Review not found
 */
reviewRouter.route("/:id").get(getReviewById).put(validateTokenCustomer, updateReviewById).delete(validateTokenCustomer, deleteReviewById);

/**
 * @swagger
 * /api/reviews/cameraman/{cameraman_id}:
 *   get:
 *     summary: Get reviews by cameraman ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: cameraman_id
 *         schema:
 *           type: string
 *         required: true
 *         description: Cameraman ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reviews per page
 *     responses:
 *       200:
 *         description: List of reviews for the cameraman
 *       404:
 *         description: Cameraman not found
 */
reviewRouter.get("/cameraman/:cameraman_id", getReviewsByCameraman);

/**
 * @swagger
 * /api/reviews/customer/{customer_id}:
 *   get:
 *     summary: Get reviews by customer ID
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customer_id
 *         schema:
 *           type: string
 *         required: true
 *         description: Customer ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reviews per page
 *     responses:
 *       200:
 *         description: List of reviews by the customer
 *       403:
 *         description: Forbidden - Can only access own reviews
 *       404:
 *         description: Customer not found
 */
reviewRouter.get("/customer/:customer_id", validateTokenCustomer, getReviewsByCustomer);

/**
 * @swagger
 * /api/reviews/cameraman/{cameraman_id}/stats:
 *   get:
 *     summary: Get review statistics for a cameraman
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: cameraman_id
 *         schema:
 *           type: string
 *         required: true
 *         description: Cameraman ID
 *     responses:
 *       200:
 *         description: Review statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReviews:
 *                   type: integer
 *                 averageRating:
 *                   type: number
 *                 ratingDistribution:
 *                   type: object
 *                   properties:
 *                     "1":
 *                       type: integer
 *                     "2":
 *                       type: integer
 *                     "3":
 *                       type: integer
 *                     "4":
 *                       type: integer
 *                     "5":
 *                       type: integer
 *       404:
 *         description: Cameraman not found
 */
reviewRouter.get("/cameraman/:cameraman_id/stats", getReviewStatsByCameraman);

module.exports = reviewRouter;
