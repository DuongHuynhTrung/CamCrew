const express = require("express");
const reportRouter = express.Router();
const {
  getAllReports,
  getReportById,
  getReportsByCustomer,
  getReportsByCameraman,
  createReport,
  updateReportStatus,
  deleteReportById,
  getReportStats,
  getReportsByStatus,
} = require("../app/controllers/ReportController");
const {
  validateToken,
  validateTokenAdmin,
} = require("../app/middleware/validateTokenHandler");

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report management API
 */

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports with filtering (Admin only)
 *     tags: [Reports]
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
 *         description: Number of reports per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by report status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by report type
 *     responses:
 *       200:
 *         description: List of reports
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal Server Error
 *   post:
 *     summary: Create a new report
 *     tags: [Reports]
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
 *               - content
 *             properties:
 *               customer_id:
 *                 type: string
 *                 description: ID of the customer making the report
 *               cameraman_id:
 *                 type: string
 *                 description: ID of the cameraman being reported
 *               content:
 *                 type: string
 *                 description: Report content (max 1000 characters)
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal Server Error
 */
reportRouter.route("/").get(validateTokenAdmin, getAllReports).post(validateToken, createReport);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details
 *       403:
 *         description: Forbidden - Can only access own reports or admin
 *       404:
 *         description: Report not found
 *   put:
 *     summary: Update report status (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Report ID
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
 *                 description: New report status
 *               admin_notes:
 *                 type: string
 *                 description: Admin notes about the report
 *     responses:
 *       200:
 *         description: Report status updated successfully
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Report not found
 *   delete:
 *     summary: Delete report by ID (Owner or Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *       403:
 *         description: Forbidden - Can only delete own reports or admin
 *       404:
 *         description: Report not found
 */
reportRouter.route("/:id").get(validateToken, getReportById).put(validateTokenAdmin, updateReportStatus).delete(validateToken, deleteReportById);

/**
 * @swagger
 * /api/reports/customer/{customer_id}:
 *   get:
 *     summary: Get reports by customer ID
 *     tags: [Reports]
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
 *         description: Number of reports per page
 *     responses:
 *       200:
 *         description: List of reports by the customer
 *       403:
 *         description: Forbidden - Can only access own reports or admin
 *       404:
 *         description: Customer not found
 */
reportRouter.get("/customer/:customer_id", validateToken, getReportsByCustomer);

/**
 * @swagger
 * /api/reports/cameraman/{cameraman_id}:
 *   get:
 *     summary: Get reports by cameraman ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
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
 *         description: Number of reports per page
 *     responses:
 *       200:
 *         description: List of reports by the cameraman
 *       403:
 *         description: Forbidden - Can only access own reports or admin
 *       404:
 *         description: Cameraman not found
 */
reportRouter.get("/cameraman/:cameraman_id", validateToken, getReportsByCameraman);

/**
 * @swagger
 * /api/reports/status/{status}:
 *   get:
 *     summary: Get reports by status (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         schema:
 *           type: string
 *         required: true
 *         description: Report status
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
 *         description: Number of reports per page
 *     responses:
 *       200:
 *         description: List of reports with the specified status
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal Server Error
 */
reportRouter.get("/status/:status", validateTokenAdmin, getReportsByStatus);

/**
 * @swagger
 * /api/reports/statistics:
 *   get:
 *     summary: Get report statistics (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReports:
 *                   type: integer
 *                 pendingReports:
 *                   type: integer
 *                 resolvedReports:
 *                   type: integer
 *                 rejectedReports:
 *                   type: integer
 *                 reportTypeDistribution:
 *                   type: object
 *                 statusDistribution:
 *                   type: object
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal Server Error
 */
reportRouter.get("/statistics", validateTokenAdmin, getReportStats);

module.exports = reportRouter;
