import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import {
  registerUser,
  loginUser,
  verifyOTP,
  resendOTP,
  logoutUser,
  refreshAccessToken,
  getProfile,
  forgotPassword,
  resetPassword,
  verifyResetOTP
  
} from "../controllers/authController.js";

import protect from "../middleware/authMiddleware.js";
import authLimiter from "../middleware/rateLimiter.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post(
  "/register",
  registerUser
);

router.post(
  "/verify-otp",
  verifyOTP
);

router.post(
  "/resend-otp",
  resendOTP
);

router.post(
  "/login",
  authLimiter,
  loginUser
);

router.post(
  "/logout",
  logoutUser
);

router.post(
  "/refresh-token",
  refreshAccessToken
);

router.get(
  "/profile",
  protect,
  getProfile
);

router.post(
  "/forgot-password",
  forgotPassword
)

router.post(
  "/reset-password",
  resetPassword
)

router.post(
  "/verify-reset-otp",
  verifyResetOTP
);

router.get(
  "/admin-dashboard",
  protect,
  adminMiddleware,
  (req, res) => {
    res.status(200).json({
      message: "Welcome Admin",
    })
  }
);

router.get(
  "/google",
  passport.authenticate(
    "google",
    {
      scope:["profile", "email"],
    }
  )
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    try {
      // req.user mein Passport ne hume database ka saved user diya hai
      const token = jwt.sign(
        { id: req.user._id, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Token ko HttpOnly cookie mein save karein taaki frontend read/fetch kar sake
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      // Ab user ko home page par redirect karein
      res.redirect("http://localhost:5173/");
    } catch (error) {
      console.error("Google Callback Error:", error);
      res.redirect("http://localhost:5173/login?error=auth_failed");
    }
  }
);

export default router;