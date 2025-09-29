const express = require("express");
const bodyParser = require("body-parser");
const userRouter = express.Router();
userRouter.use(bodyParser.json());
const {
  getUsers,
  getCameramen,
  getUserById,
  updateUsers,
  deleteUsers,
  currentUser,
  changePassword,
  checkOldPassword,
  statisticsAccountByStatus,
  searchAccountByEmail,
  banAccountByAdmin,
  unBanAccountByAdmin,
  deleteUsersNoAuth,
  updateUserInfoForAdmin,
  forgotPassword,
  verifyOtp,
  resetPassword,
  upMembershipByAccountBalance,
  upRoleCameramanByAdmin,
  createMembershipSubscriptionPayment,
  manualCheckSubscriptions,
} = require("../app/controllers/UserController");
const {
  validateToken,
  validateTokenAdmin,
  validateTokenCameraman,
} = require("../app/middleware/validateTokenHandler");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID
 *         full_name:
 *           type: string
 *           maxLength: 255
 *           description: "User's full name"
 *         dob:
 *           type: string
 *           format: date
 *           description: "User's date of birth"
 *         email:
 *           type: string
 *           maxLength: 255
 *           description: "User's email address"
 *         phone_number:
 *           type: string
 *           maxLength: 10
 *           description: "User's phone number"
 *         country:
 *           type: string
 *           description: "User's country of residence"
 *         gender:
 *           type: string
 *           description: "User's gender"
 *         password:
 *           type: string
 *           description: "User's password"
 *         avatar_url:
 *           type: string
 *           description: "URL of the user's avatar image"
 *         rank:
 *           type: string
 *           default: "NORMAL"
 *           description: "User's rank (e.g., NORMAL, ADMIN)"
 *         role_name:
 *           type: string
 *           enum: [ADMIN, CUSTOMER, CAMERAMAN]
 *           description: "User's role in the application"
 *         status:
 *           type: string
 *           enum: [ACTIVE, BLOCKED]
 *           description: "User account status"
 *         membership:
 *           type: string
 *           enum: [NORMAL, ONE_MONTH, SIX_MONTH]
 *           description: "User's membership level"
 *         membership_expires_at:
 *           type: string
 *           format: date-time
 *           description: "Membership expiration date"
 *         account_balance:
 *           type: number
 *           description: "User's account balance"
 *         is_verified:
 *           type: boolean
 *           description: "Email verification status"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: "User account creation timestamp"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: "User account last update timestamp"
 *     UserResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
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
 *     PaymentUrlResponse:
 *       type: object
 *       properties:
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
 * /api/users/delete-no-auth/{id}:
 *   delete:
 *     summary: Delete user no auth
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRouter.route("/delete-no-auth/:id").delete(deleteUsersNoAuth);

/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *       400:
 *         description: Invalid email
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */
userRouter.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/users/resetPassword:
 *   post:
 *     summary: Reset user password with token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               newPassword:
 *                 type: string
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal Server Error
 */
userRouter.post("/resetPassword", resetPassword);

userRouter.use(validateToken);

/**
 * @swagger
 * /api/users/admin/{id}:
 *   put:
 *     summary: Update user info for admin (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 maxLength: 255
 *                 description: "User's full name"
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: "User's date of birth"
 *               email:
 *                 type: string
 *                 description: "User's email address"
 *               phone_number:
 *                 type: string
 *                 description: "User's phone number"
 *               country:
 *                 type: string
 *                 description: "User's country of residence"
 *               gender:
 *                 type: string
 *                 description: "User's gender"
 *               password:
 *                 type: string
 *                 description: "User's password"
 *               avatar_url:
 *                 type: string
 *                 description: "URL of the user's avatar image"
 *               rank:
 *                 type: string
 *                 description: "User's ranlk (e.g., Normal, Premium)"
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRouter.route("/admin/:id").put(validateTokenAdmin, updateUserInfoForAdmin);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 maxLength: 255
 *                 description: "User's full name"
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: "User's date of birth"
 *               country:
 *                 type: string
 *                 description: "User's country of residence"
 *               gender:
 *                 type: string
 *                 description: "User's gender"
 *               avatar_url:
 *                 type: string
 *                 description: "URL of the user's avatar image"
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRouter.route("/").get(getUsers).put(updateUsers);

/**
 * @swagger
 * /api/users/current:
 *   get:
 *     summary: Get current user's information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user's information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.get("/current", currentUser);

/**
 * @swagger
 * /api/users/statisticsAccount:
 *   get:
 *     summary: Get account statistics (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account statistics
 *       403:
 *         description: Forbidden
 */
userRouter
  .route("/statisticsAccount")
  .get(validateTokenAdmin, statisticsAccountByStatus);

/**
 * @swagger
 * /api/users/searchAccountByEmail:
 *   get:
 *     summary: Search accounts by email (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchEmail
 *         schema:
 *           type: string
 *         required: true
 *         description: Email to search for
 *     responses:
 *       200:
 *         description: List of matching accounts
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden
 */
userRouter
  .route("/searchAccountByEmail")
  .get(validateTokenAdmin, searchAccountByEmail);

/**
 * @swagger
 * /api/users/cameramen:
 *   get:
 *     summary: Get all cameramen with pagination
 *     tags: [Users]
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
 *         description: Number of cameramen per page
 *     responses:
 *       200:
 *         description: List of cameramen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.get("/cameramen", getCameramen);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User information
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRouter.route("/:id").get(getUserById).delete(deleteUsers);

/**
 * @swagger
 * /api/users/checkOldPassword/{id}:
 *   post:
 *     summary: Check old password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Old password is correct
 *       401:
 *         description: Old password is incorrect
 *       404:
 *         description: User not found
 */
userRouter.route("/checkOldPassword/:id").post(checkOldPassword);

/**
 * @swagger
 * /api/users/changePassword/{id}:
 *   put:
 *     summary: Change user's password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - confirmPassword
 *             properties:
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRouter.route("/changePassword/:id").put(changePassword);

/**
 * @swagger
 * /api/users/banAccountByAdmin/{account_id}:
 *   patch:
 *     summary: Ban a user account (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: account_id
 *         schema:
 *           type: string
 *         required: true
 *         description: Account ID to ban
 *     responses:
 *       200:
 *         description: Account banned successfully
 *       400:
 *         description: Cannot ban admin account
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Account not found
 */
userRouter
  .route("/banAccountByAdmin/:account_id")
  .patch(validateTokenAdmin, banAccountByAdmin);

/**
 * @swagger
 * /api/users/unBanAccountByAdmin/{account_id}:
 *   patch:
 *     summary: UnBan a user account (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: account_id
 *         schema:
 *           type: string
 *         required: true
 *         description: Account ID to unBan
 *     responses:
 *       200:
 *         description: Account unBanned successfully
 *       400:
 *         description: Cannot unBan admin account
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Account not found
 */
userRouter
  .route("/unBanAccountByAdmin/:account_id")
  .patch(validateTokenAdmin, unBanAccountByAdmin);

/**
 * @swagger
 * /api/users/upMembershipByAccountBalance:
 *   post:
 *     summary: Upgrade membership using account balance
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - membership
 *               - amount
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: User ID
 *               membership:
 *                 type: string
 *                 enum: [1month, 6month]
 *                 description: Type of membership to upgrade to
 *               amount:
 *                 type: number
 *                 description: Amount to pay for membership upgrade
 *     responses:
 *       200:
 *         description: Membership upgraded successfully
 *       400:
 *         description: Insufficient balance or invalid input
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal Server Error
 */
userRouter.post("/upMembershipByAccountBalance", upMembershipByAccountBalance);

/**
 * @swagger
 * /api/users/membership-subscription:
 *   post:
 *     summary: Create membership subscription payment URL (Cameraman only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - membership_type
 *               - amount
 *             properties:
 *               membership_type:
 *                 type: string
 *                 enum: [1month, 6month]
 *                 description: Type of membership subscription
 *               amount:
 *                 type: number
 *                 description: Amount to pay for the subscription
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
 *         description: Forbidden - Only cameramen can upgrade membership
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.post("/membership-subscription", validateTokenCameraman, createMembershipSubscriptionPayment);

/**
 * @swagger
 * /api/users/check-subscriptions:
 *   post:
 *     summary: Manually trigger subscription expiration check (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *       403:
 *         description: Forbidden - Only admin can trigger manual check
 */
userRouter.post("/check-subscriptions", validateTokenAdmin, manualCheckSubscriptions);

/**
 * @swagger
 * /api/users/cameramen:
 *   get:
 *     summary: Get all cameramen with pagination
 *     tags: [Users]
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
 *         description: Number of cameramen per page
 *     responses:
 *       200:
 *         description: List of cameramen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
 

/**
 * @swagger
 * /api/users/verify-otp:
 *   post:
 *     summary: Verify OTP for password reset
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               otp:
 *                 type: string
 *                 description: OTP code
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */
userRouter.post("/verify-otp", verifyOtp);

/**
 * @swagger
 * /api/users/up-role-cameraman/{user_id}:
 *   put:
 *     summary: Upgrade user role to cameraman (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to upgrade
 *     responses:
 *       200:
 *         description: User role upgraded to cameraman successfully
 *       400:
 *         description: User is already a cameraman or invalid request
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 */
userRouter.put("/up-role-cameraman/:user_id", validateTokenAdmin, upRoleCameramanByAdmin);

module.exports = userRouter;
