const express = require("express");
const statisticRouter = express.Router();

const {
  validateTokenAdmin,
} = require("../app/middleware/validateTokenHandler");
const {
  statisticSales,
  statisticForMonthly,
  statisticSalesForMonth,
  statisticUsers,
} = require("../app/controllers/StatisticController");

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Statistics and analytics API
 */

/**
 * @swagger
 * /api/statistics/users:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCustomer:
 *                   type: integer
 *                   description: Total number of customers
 *                 totalArtist:
 *                   type: integer
 *                   description: Total number of artists
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal Server Error
 */
statisticRouter.get("/users", validateTokenAdmin, statisticUsers);

/**
 * @swagger
 * /api/statistics/sales:
 *   get:
 *     summary: Get daily sales statistics (Admin only)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily sales statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 income:
 *                   type: object
 *                   properties:
 *                     totalIncomeCurrent:
 *                       type: number
 *                     totalIncomePrevious:
 *                       type: number
 *                     difference:
 *                       type: number
 *                 newCustomers:
 *                   type: object
 *                   properties:
 *                     totalNewCustomerCurrent:
 *                       type: integer
 *                     totalNewCustomerPrevious:
 *                       type: integer
 *                     difference:
 *                       type: integer
 *                 newArtists:
 *                   type: object
 *                   properties:
 *                     totalNewArtistCurrent:
 *                       type: integer
 *                     totalNewArtistPrevious:
 *                       type: integer
 *                     difference:
 *                       type: integer
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal Server Error
 */
statisticRouter.get("/sales", validateTokenAdmin, statisticSales);

/**
 * @swagger
 * /api/statistics/sales/month:
 *   get:
 *     summary: Get monthly sales statistics (Admin only)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly sales statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 income:
 *                   type: object
 *                   properties:
 *                     totalIncomeCurrent:
 *                       type: number
 *                     totalIncomePrevious:
 *                       type: number
 *                     difference:
 *                       type: number
 *                 newCustomers:
 *                   type: object
 *                   properties:
 *                     totalNewCustomerCurrent:
 *                       type: integer
 *                     totalNewCustomerPrevious:
 *                       type: integer
 *                     difference:
 *                       type: integer
 *                 newArtists:
 *                   type: object
 *                   properties:
 *                     totalNewArtistCurrent:
 *                       type: integer
 *                     totalNewArtistPrevious:
 *                       type: integer
 *                     difference:
 *                       type: integer
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal Server Error
 */
statisticRouter.get("/sales/month", validateTokenAdmin, statisticSalesForMonth);

/**
 * @swagger
 * /api/statistics/monthly/{year}:
 *   get:
 *     summary: Get monthly statistics for a specific year (Admin only)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: year
 *         schema:
 *           type: integer
 *         required: true
 *         description: Year for statistics
 *     responses:
 *       200:
 *         description: Monthly statistics for the year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 countTransactions:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   description: Transaction count for each month
 *                 totalAmount:
 *                   type: array
 *                   items:
 *                     type: number
 *                   description: Total amount for each month
 *                 countCustomers:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   description: Customer count for each month
 *                 countArtists:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   description: Artist count for each month
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Internal Server Error
 */
statisticRouter.get("/monthly/:year", validateTokenAdmin, statisticForMonthly);

module.exports = statisticRouter;
