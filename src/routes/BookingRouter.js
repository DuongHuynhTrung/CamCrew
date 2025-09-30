const express = require("express");
const bookingRouter = express.Router();
const {
  createBooking,
  completeBooking,
  getBookings,
  getBookingById,
} = require("../app/controllers/BookingController");
const {
  validateToken,
  validateTokenCustomer,
  validateTokenCameraman,
} = require("../app/middleware/validateTokenHandler");

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Booking ID
 *         customer_id:
 *           type: string
 *           description: Customer ID
 *         cameraman_id:
 *           type: string
 *           description: Cameraman ID
 *         service_id:
 *           type: string
 *           description: Service ID
 *         scheduled_date:
 *           type: string
 *           format: date
 *           description: Scheduled date
 *         time_of_day:
 *           type: string
 *           description: Time of day
 *         status:
 *           type: string
 *           enum: [paying, pay_cancelled, requested, completed]
 *           description: Booking status
 *         amount:
 *           type: number
 *           description: Booking amount
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     BookingResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Booking'
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
 *     CreateBookingResponse:
 *       type: object
 *       properties:
 *         booking:
 *           $ref: '#/components/schemas/Booking'
 *         payment:
 *           $ref: '#/components/schemas/Payment'
 *         paymentUrl:
 *           type: string
 *           description: PayOS checkout URL
 *         orderCode:
 *           type: number
 *           description: Order code for tracking
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
 * /api/bookings:
 *   get:
 *     summary: Get bookings for current user
 *     tags: [Bookings]
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
 *         description: Number of bookings per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: List of user's bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create a new booking (Customer only)
 *     tags: [Bookings]
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
 *               - service_id
 *               - scheduled_date
 *               - time_of_day
 *             properties:
 *               cameraman_id:
 *                 type: string
 *                 description: Cameraman ID
 *               service_id:
 *                 type: string
 *                 description: Service ID
 *               scheduled_date:
 *                 type: string
 *                 format: date
 *                 description: Scheduled date for the booking
 *               time_of_day:
 *                 type: string
 *                 description: Time of day (morning, afternoon, evening)
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateBookingResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Only customers can create bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.route("/").get(validateToken, getBookings).post(validateTokenCustomer, createBooking);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       403:
 *         description: Forbidden - Can only access own bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.get("/:id", validateToken, getBookingById);

/**
 * @swagger
 * /api/bookings/{id}/complete:
 *   patch:
 *     summary: Mark booking as completed (Cameraman only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking marked as completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Booking cannot be completed (wrong status)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Only cameraman can complete bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.patch("/:id/complete", validateTokenCameraman, completeBooking);

module.exports = bookingRouter;
