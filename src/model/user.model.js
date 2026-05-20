import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      default:null,
    },
    role: {
      type: String,
      enum: ["user", "admin", "agent"],
      default: "user",
    },
    number: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenExpiry: {
      type: Date,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    resetPassword: {
      type: String,
      default: null,
    },
    resetPasswordExpiry: {
      type: String,
      default: null,
    },
    resetOTP: {
      type: String,
    },
    resetOTP: {
      type: String,
    },
    resetPasswordOTP: {
      type: String,
    },

    resetPasswordOTPExpiry: {
      type: Date,
    },

    resetPasswordVerified: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      default:null
    },

    provider: {
      type: String,
      anum: ["local", "google", "facebook"],
      default: "local"
    },
    avatar: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default:false,
    }
  },

  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
