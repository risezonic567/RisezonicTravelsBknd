import bcrypt from "bcryptjs";
import User from "../model/user.model.js";
import generateOTP from "../utils/generateOTP.js";
import sendEmail from "../utils/sendEmail.js";
import generateAccessToken from "../utils/generateAccessToken.js";
import generateRefreshToken from "../utils/generateRefreshToken.js";
import jwt from "jsonwebtoken";

// export const registerUser = async (req, res) => {
//   try {

//     const { name, email, password, number } = req.body;

//     if (!name || !email || !password || !number) {
//       return res.status(400).json({
//         message: "All fields are required",
//       });
//     }

//     const normalizedEmail = email.toLowerCase().trim();

//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

//     if(!passwordRegex.test(password)){
//       return res.status(400).json({
//         message:"Password must contain uppercase, lowercase and number",
//       });
//     }
//     // if(password.length < 8 ){
//     //     return res.status(400).json({
//     //         message : "password must be atleast 8 characters minimum"
//     //     });
//     // }

//     const existingUser = await User.findOne({
//         email : normalizedEmail
//      });

//     if (existingUser) {
//       return res.status(400).json({
//         message: "User already exists",
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);

//     const otp = generateOTP();

//     await sendEmail(
//       normalizedEmail,
//       "Verify Your Account",
//       `Your OTP is ${otp}`
//     );

//     const user = await User.create({
//       name : name.trim(),
//       email : normalizedEmail,
//       password: hashedPassword,
//       number,
//       otp,
//       otpExpiry: Date.now() + 10 * 60 * 1000,
//     });

//     res.status(201).json({
//       message: "Registration successful. Verify OTP.",
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//       },
//     });

//   } catch (error) {
//     console.log("REGISTER ERROR", error);

//     res.status(500).json({
//       error: error.message,
//     });
//   }
// };

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, number } = req.body;

    if (!name || !email || !password || !number) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // PASSWORD VALIDATION

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must contain uppercase, lowercase and number",
      });
    }

    // PHONE VALIDATION
    const cleanNumber = String(number).trim().replace(/\D/g, "");

    console.log("Original Number:", number);
    console.log("Clean Number:", cleanNumber);

    const phoneRegex = /^[6-9]\d{9}$/;

    if (!phoneRegex.test(cleanNumber)) {
      return res.status(400).json({
        message: "Invalid phone number",
      });
    }

    // CHECK EXISTING USER

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = generateOTP();

    let user;

    // UPDATE OLD UNVERIFIED USER

    if (existingUser && !existingUser.isVerified) {
      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      existingUser.number = cleanNumber;
      existingUser.otp = otp;
      existingUser.otpExpiry = Date.now() + 5 * 60 * 1000;

      await existingUser.save();

      user = existingUser;
    } else {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        number: cleanNumber,
        otp,
        otpExpiry: Date.now() + 5 * 60 * 1000,
        isVerified: false,
      });
    }

    // SEND EMAIL

    await sendEmail(
      normalizedEmail,
      "Verify Your Account",
      `Your OTP is ${otp}`,
    );

    return res.status(201).json({
      message: "Registration successful. Verify OTP.",
    });
  } catch (error) {
    console.log("REGISTER ERROR", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });
    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({
        message: "OTP Expired",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "User already verified",
      });
    }
    user.isVerified = true;

    user.otp = null;

    user.otpExpiry = null;

    await user.save();

    res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    console.log("Verified OTP Error", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

console.log("LOGIN HIT");
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password +refreshToken");

    if (!user) {
      return res.status(400).json({
        message: "Invalid Credentials",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: "Please verify your email first",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({
        message: "Invalid Credentials",
      });
    }

    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;

    user.refreshTokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await user.save();

    // Access token cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    // Refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login Successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });
    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "User already verified",
      });
    }

    // new otp
    const newOTP = generateOTP();
    user.otp = newOTP;

    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    // send email
    await sendEmail(normalizedEmail, "Resend OTP", `Your new OTP is ${newOTP}`);

    res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log("Resend OTP Error", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const user = await User.findOne({ refreshToken });

      if (user) {
        user.refreshToken = null;
        user.refreshTokenExpiry = null;
        await user.save();
      }
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      message: "Logout Successfull",
    });
  } catch (error) {
    console.log("LOGOUT ERROR", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    // GET REFRESH TOKEN

    const refreshToken = req.cookies.refreshToken;

    // TOKEN MISSING

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token missing",
      });
    }

    // VERIFY TOKEN

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // FIND USER

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // MATCH DATABASE TOKEN

    if (user.refreshToken !== refreshToken) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    // CHECK EXPIRY FROM DATABASE

    if (user.refreshTokenExpiry < Date.now()) {
      return res.status(401).json({
        message: "Refresh token expired",
      });
    }

    // GENERATE NEW ACCESS TOKEN

    const newAccessToken = generateAccessToken(user);

    // SET NEW COOKIE

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: "strict",

      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      message: "New access token generated",
    });
  } catch (error) {
    console.log("REFRESH TOKEN ERROR", error);

    res.status(401).json({
      message: "Invalid refresh token",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    res.status(200).json({
      message: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.log("Profile Error", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ================================
// FORGOT PASSWORD
// ================================

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // GENERATE OTP

    const resetOTP = generateOTP();

    // SAVE OTP

    user.resetPassword = resetOTP;

    // OTP VALID FOR 1 MINUTE

    user.resetPasswordExpiry = Date.now() + 1 * 60 * 1000;

    await user.save();

    // SEND EMAIL

    await sendEmail(
      normalizedEmail,
      "Reset Password OTP",
      `Your password reset OTP is ${resetOTP}`,
    );

    res.status(200).json({
      message: "Reset OTP sent to your mail",
    });
  } catch (error) {
    console.log("Forgot Password Error", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

// ================================
// VERIFY RESET OTP
// ================================

export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // CHECK OTP

    if (String(user.resetPassword) !== String(otp)) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    // CHECK EXPIRY

    if (user.resetPasswordExpiry < Date.now()) {
      return res.status(400).json({
        message: "OTP Expired",
      });
    }

    // IMPORTANT
    // DO NOT CLEAR OTP HERE

    res.status(200).json({
      message: "OTP Verified Successfully",
    });
  } catch (error) {
    console.log("Verify Reset OTP Error", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

// ================================
// RESET PASSWORD
// ================================
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // PASSWORD VALIDATION

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password must contain uppercase, lowercase and number",
      });
    }

    // HASH PASSWORD

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // SAVE PASSWORD

    user.password = hashedPassword;

    // CLEAR OTP

    user.resetPassword = null;

    user.resetPasswordExpiry = null;

    await user.save();

    res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.log("Reset Password Error", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const user = req.user;

    // 1. Access Token (15 minutes)
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    // 2. Refresh Token (7 days)
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    // Save refresh token to DB
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await user.save();

    // Cookes Config
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    // 3. Dynamic Redirect URL Logic
    const referer = req.headers.referer || "";
    let redirectUrl = "http://localhost:5173"; // Localhost fallback

    if (referer.includes("risezonictravel.com") || process.env.NODE_ENV === "production") {
      redirectUrl = "https://risezonictravel.com"; // Live domain fallback
    }

    console.log("Redirecting user to:", redirectUrl);
    res.redirect(`${redirectUrl}/`); // User successfully logged in!

  } catch (error) {
    console.error("Google Login Controller Error:", error);
    
    // Catch block mein json response ke badle dynamic login page par error query ke sath redirect karein
    const isProduction = process.env.NODE_ENV === "production";
    const fallbackUrl = isProduction ? "https://risezonictravel.com" : "http://localhost:5173";
    
    res.redirect(`${fallbackUrl}/login?error=auth_failed`);
  }
};
