const express = require("express");
const paymentRouter = express.Router();
const {
  getPayments,
  getMyPayments,
  getPaymentById,
  updatePaymentStatus,
  getPaymentStatistics,
} = require("../app/controllers/PaymentController");
const {
  validateToken,
  validateTokenAdmin,
} = require("../app/middleware/validateTokenHandler");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management API
 */

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all payments with filtering (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
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
 *         description: Number of payments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by payment status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by payment type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments until this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in payment details
 *     responses:
 *       200:
 *         description: List of payments
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal Server Error
 */
paymentRouter.get("/", validateTokenAdmin, getPayments);

/**
 * @swagger
 * /api/payments/my-payments:
 *   get:
 *     summary: Get current user's payments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
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
 *         description: Number of payments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by payment status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by payment type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments until this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in payment details
 *     responses:
 *       200:
 *         description: List of user's payments
 *       500:
 *         description: Internal Server Error
 */
paymentRouter.get("/my-payments", validateToken, getMyPayments);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details
 *       403:
 *         description: Forbidden - Can only access own payments or admin
 *       404:
 *         description: Payment not found
 *   put:
 *     summary: Update payment status (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 description: New payment status
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Payment not found
 */
paymentRouter.route("/:id").get(validateToken, getPaymentById).put(validateTokenAdmin, updatePaymentStatus);

/**
 * @swagger
 * /api/payments/statistics:
 *   get:
 *     summary: Get payment statistics (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Payment statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPayments:
 *                   type: integer
 *                 totalAmount:
 *                   type: number
 *                 successfulPayments:
 *                   type: integer
 *                 failedPayments:
 *                   type: integer
 *                 pendingPayments:
 *                   type: integer
 *                 averageAmount:
 *                   type: number
 *                 paymentTypeDistribution:
 *                   type: object
 *                 statusDistribution:
 *                   type: object
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal Server Error
 */
paymentRouter.get("/statistics", validateTokenAdmin, getPaymentStatistics);

module.exports = paymentRouter;
