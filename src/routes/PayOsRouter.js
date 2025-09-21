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
 * /api/payOs/create-buy-services:
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
 *               $ref: '#/components/schemas/PaymentUrlResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Customer only
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
payOsRouter.post(
  "/create-buy-services",
  validateToken,
  createBuyServicesPayOsUrl
);

/**
 * @swagger
 * /api/payOs/create-schedule:
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
 *               $ref: '#/components/schemas/PaymentUrlResponse'
 *       400:
 *         description: Invalid input or slot already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Customer or artist not found
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
payOsRouter.post("/create-schedule", validateToken, createSchedulePayOsUrl);

payOsRouter.post("/callback", payOsCallBack);

module.exports = payOsRouter;
