const express = require("express");
const statisticRouter = express.Router();
const { validateTokenAdmin } = require("../app/middleware/validateTokenHandler");
const {
    getSummary,
    getUserDistribution,
    getServiceStatusDistribution,
    getRevenue,
    getMembershipDistribution,
} = require("../app/controllers/StatisticController");

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Statistics & analytics API
 */

/**
 * @swagger
 * /api/statistics/summary:
 *   get:
 *     summary: Get overall summary statistics
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Summary statistics returned successfully
 */
// Summary
statisticRouter.get("/summary", validateTokenAdmin, getSummary);

/**
 * @swagger
 * /api/statistics/users/distribution:
 *   get:
 *     summary: Get user distribution by role
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: User distribution returned successfully
 */
// User distribution
statisticRouter.get("/users/distribution", validateTokenAdmin, getUserDistribution);

/**
 * @swagger
 * /api/statistics/services/status-distribution:
 *   get:
 *     summary: Get service distribution by status
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Service status distribution returned successfully
 */
// Service status distribution
statisticRouter.get("/services/status-distribution", validateTokenAdmin, getServiceStatusDistribution);

/**
 * @swagger
 * /api/statistics/revenue:
 *   get:
 *     summary: Get revenue and booking statistics by time range
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         required: true
 *         description: Time range for revenue aggregation
 *     responses:
 *       200:
 *         description: Revenue series returned successfully
 *       400:
 *         description: Invalid or missing timeRange
 */
// Revenue by timeRange: week | month | year
statisticRouter.get("/revenue", validateTokenAdmin, getRevenue);

/**
 * @swagger
 * /api/statistics/membership/distribution:
 *   get:
 *     summary: Get membership distribution and revenue
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Membership distribution returned successfully
 */
// Membership distribution
statisticRouter.get("/membership/distribution", validateTokenAdmin, getMembershipDistribution);


module.exports = statisticRouter;
