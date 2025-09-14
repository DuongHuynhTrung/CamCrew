const express = require("express");
const payOsRouter = express.Router();

const {
  createBuyServicesPayOsUrl,
  payOsCallBack,
  createSchedulePayOsUrl,
} = require("../app/controllers/PayOsController");
const { validateToken } = require("../app/middleware/validateTokenHandler");

/**
 * @swagger
 * tags:
 *   name: PayOS
 *   description: PayOS payment integration API
 */

/**
 * @swagger
 * /api/payos/create-buy-services:
 *   post:
 *     summary: Create PayOS payment URL for buying services
 *     tags: [PayOS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - service_id
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               service_id:
 *                 type: string
 *                 description: Service ID
 *     responses:
 *       200:
 *         description: Payment URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 *                   description: PayOS checkout URL
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden - Customer only
 *       500:
 *         description: Internal Server Error
 */
payOsRouter.post(
  "/create-buy-services",
  validateToken,
  createBuyServicesPayOsUrl
);

/**
 * @swagger
 * /api/payos/create-schedule:
 *   post:
 *     summary: Create PayOS payment URL for scheduling services
 *     tags: [PayOS]
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
 *               - artist_id
 *               - appointment_date
 *               - slot
 *               - place
 *               - service_id
 *               - amount
 *             properties:
 *               customer_id:
 *                 type: string
 *                 description: Customer ID
 *               artist_id:
 *                 type: string
 *                 description: Artist ID
 *               appointment_date:
 *                 type: string
 *                 format: date
 *                 description: Appointment date
 *               slot:
 *                 type: string
 *                 description: Time slot
 *               place:
 *                 type: string
 *                 description: Appointment location
 *               service_id:
 *                 type: string
 *                 description: Service ID
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *     responses:
 *       200:
 *         description: Payment URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 *                   description: PayOS checkout URL
 *       400:
 *         description: Invalid input or slot already taken
 *       404:
 *         description: Customer or artist not found
 *       500:
 *         description: Internal Server Error
 */
payOsRouter.post("/create-schedule", validateToken, createSchedulePayOsUrl);

/**
 * @swagger
 * /api/payos/callback:
 *   post:
 *     summary: PayOS webhook callback for payment processing
 *     tags: [PayOS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - data
 *             properties:
 *               code:
 *                 type: string
 *                 description: Payment result code
 *               data:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                   orderCode:
 *                     type: number
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal Server Error
 */
payOsRouter.post("/callback", payOsCallBack);

module.exports = payOsRouter;
