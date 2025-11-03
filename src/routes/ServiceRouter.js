const express = require("express");
const serviceRouter = express.Router();
const mongoose = require("mongoose");
const {
  getAllServices,
  getMyServices,
  getServiceById,
  createService,
  updateServiceById,
  disableServiceById,
  approveServiceById,
  rejectServiceById,
  getFreeSlot,
} = require("../app/controllers/ServiceController");
const {
  validateToken,
  validateTokenAdmin,
  validateTokenCameraman,
} = require("../app/middleware/validateTokenHandler");

const validateObjectId = (paramName) => (req, res, next) => {
  const value = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ message: `Invalid ${paramName}` });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Service management API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Service ID
 *         cameraman_id:
 *           type: string
 *           description: Cameraman ID
 *         title:
 *           type: string
 *           description: Service title
 *         description:
 *           type: string
 *           description: Service description
 *         amount:
 *           type: number
 *           description: Service price
 *         styles:
 *           type: array
 *           items:
 *             type: string
 *             enum: [wedding, event, yearbook, tvc, Film]
 *           description: Photography styles
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *             enum: [cinematic, traditional, highlight, bts, documentary]
 *           description: Service categories
 *         areas:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Ho Chi Minh, Binh Duong, Can Tho, Dong Nai, Ha Noi]
 *           description: Service areas
 *         video_demo_urls:
 *           type: array
 *           items:
 *             type: string
 *           description: Video demo URLs
 *         date_get_job:
 *           type: string
 *           format: date
 *           description: Available date for job
 *         time_of_day:
 *           type: array
 *           items:
 *             type: string
 *             enum: [morning, afternoon, evening]
 *           description: Available time slots
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, disabled]
 *           description: Service status
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ServiceResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Service'
 *         pagination:
 *           type: object
 *           properties:
 *             pageIndex:
 *               type: integer
 *             pageSize:
 *               type: integer
 *             totalPages:
 *               type: integer
 *             totalResults:
 *               type: integer
 *     FreeSlotsResponse:
 *       type: array
 *       items:
 *         type: string
 *       description: List of available time slots
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services with filtering and pagination
 *     tags: [Services]
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
 *         description: Number of services per page
 *       - in: query
 *         name: styles
 *         schema:
 *           type: string
 *         description: Filter by styles (comma-separated or multi)
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Filter by categories (comma-separated or multi)
 *       - in: query
 *         name: areas
 *         schema:
 *           type: string
 *         description: Filter by areas (comma-separated or multi)
 *       - in: query
 *         name: min
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: max
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by service status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: List of services
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create a new service (Cameraman only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cameraman_id
 *               - title
 *               - amount
 *               - styles
 *               - categories
 *               - areas
 *               - date_get_job
 *               - time_of_day
 *             properties:
 *               cameraman_id:
 *                 type: string
 *                 description: Cameraman ID
 *               title:
 *                 type: string
 *                 description: Service title
 *               description:
 *                 type: string
 *                 description: Service description
 *               amount:
 *                 type: number
 *                 description: Service price
 *               styles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [wedding, event, yearbook, tvc, Film]
 *                 description: Photography styles
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [cinematic, traditional, highlight, bts, documentary]
 *                 description: Service categories
 *               areas:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Ho Chi Minh, Binh Duong, Can Tho, Dong Nai, Ha Noi]
 *                 description: Service areas
 *               video_demo_urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Video demo URLs
 *               date_get_job:
 *                 type: string
 *                 format: date
 *                 description: Available date for job
 *               time_of_day:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [morning, afternoon, evening]
 *                 description: Available time slots
 *     responses:
 *       201:
 *         description: Service created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Only cameramen can create services
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
serviceRouter.route("/").get(getAllServices).post(validateTokenCameraman, createService);

/**
 * @swagger
 * /api/services/my:
 *   get:
 *     summary: Get services of logged-in cameraman
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: styles
 *         schema:
 *           type: string
 *         description: Filter by styles (comma-separated or multi)
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Filter by categories (comma-separated or multi)
 *       - in: query
 *         name: areas
 *         schema:
 *           type: string
 *         description: Filter by areas (comma-separated or multi)
 *       - in: query
 *         name: min
 *         schema:
 *           type: number
 *       - in: query
 *         name: max
 *         schema:
 *           type: number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of cameraman services
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceResponse'
 *       401:
 *         description: Unauthorized
 */
serviceRouter.get("/my", validateTokenCameraman, getMyServices);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update service by ID (Owner or Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Service title
 *               description:
 *                 type: string
 *                 description: Service description
 *               amount:
 *                 type: number
 *                 description: Service price
 *               styles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [wedding, event, yearbook, tvc, Film]
 *                 description: Photography styles
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [cinematic, traditional, highlight, bts, documentary]
 *                 description: Service categories
 *               areas:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Ho Chi Minh, Binh Duong, Can Tho, Dong Nai, Ha Noi]
 *                 description: Service areas
 *               video_demo_urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Video demo URLs
 *               date_get_job:
 *                 type: string
 *                 format: date
 *                 description: Available date for job
 *               time_of_day:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [morning, afternoon, evening]
 *                 description: Available time slots
 *     responses:
 *       200:
 *         description: Service updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Disable service by ID (Owner or Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
serviceRouter
  .route("/:id")
  .get(validateObjectId("id"), getServiceById)
  .put(validateToken, validateObjectId("id"), updateServiceById)
  .delete(validateToken, validateObjectId("id"), disableServiceById);

/**
 * @swagger
 * /api/services/{id}/approve:
 *   patch:
 *     summary: Approve service by ID (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       403:
 *         description: Forbidden - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
serviceRouter.patch("/:id/approve", validateTokenAdmin, validateObjectId("id"), approveServiceById);

/**
 * @swagger
 * /api/services/{id}/reject:
 *   patch:
 *     summary: Reject service by ID (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Service rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       400:
 *         description: Rejection reason required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
serviceRouter.patch("/:id/reject", validateTokenAdmin, validateObjectId("id"), rejectServiceById);

/**
 * @swagger
 * /api/services/free-slots:
 *   post:
 *     summary: Get free slots for a service
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_id
 *               - date_get_job
 *             properties:
 *               service_id:
 *                 type: string
 *                 description: Service ID
 *               date_get_job:
 *                 type: string
 *                 format: date
 *                 description: Date to check for free slots
 *     responses:
 *       200:
 *         description: List of free slots
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FreeSlotsResponse'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/services/free-slots:
 *   post:
 *     summary: Get free time slots for a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_id
 *               - date_get_job
 *             properties:
 *               service_id:
 *                 type: string
 *                 description: Service ID
 *               date_get_job:
 *                 type: string
 *                 format: date
 *                 description: Date to check for free slots
 *     responses:
 *       200:
 *         description: Free slots retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FreeSlotsResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
serviceRouter.post("/free-slots", getFreeSlot);

module.exports = serviceRouter;
