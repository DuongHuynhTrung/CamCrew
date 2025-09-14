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
 *       500:
 *         description: Internal Server Error
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
 *               type: object
 *               properties:
 *                 booking:
 *                   type: object
 *                   description: Created booking details
 *                 paymentUrl:
 *                   type: string
 *                   description: PayOS checkout URL
 *                 orderCode:
 *                   type: number
 *                   description: Order code for tracking
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden - Only customers can create bookings
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
 *       403:
 *         description: Forbidden - Can only access own bookings
 *       404:
 *         description: Booking not found
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
 *                   type: object
 *                   description: Updated booking details
 *       400:
 *         description: Booking cannot be completed (wrong status)
 *       403:
 *         description: Forbidden - Only cameraman can complete bookings
 *       404:
 *         description: Booking not found
 */
bookingRouter.patch("/:id/complete", validateTokenCameraman, completeBooking);

module.exports = bookingRouter;
