import passport from "passport";

import { Strategy as GoogleStrategy }
from "passport-google-oauth20";

import User from "../model/user.model.js";

passport.use(

  new GoogleStrategy(

    {
      clientID:
        process.env.GOOGLE_CLIENT_ID,

      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET,

      callbackURL:
        "http://localhost:5000/api/auth/google/callback",
    },

    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {

      try {

        // =========================
        // NORMALIZE EMAIL
        // =========================

        const email =
          profile.emails[0].value
          .toLowerCase()
          .trim();

        // =========================
        // FIND USER
        // =========================

        let user =
          await User.findOne({ email });

        // =========================
        // CREATE NEW USER
        // =========================

        if (!user) {

          user = await User.create({

            name:
              profile.displayName,

            email,

            googleId:
              profile.id,

            provider:
              "google",

            avatar:
              profile.photos[0].value,

            isVerified: true,

            // IMPORTANT

            otp: null,

            otpExpiry: null,

            resetPassword: null,

            resetPasswordExpiry: null,

            password: null,
          });

        }

        // =========================
        // EXISTING USER
        // =========================

        else {

          // LINK GOOGLE ACCOUNT

          user.googleId =
            profile.id;

          user.provider =
            "google";

          user.avatar =
            profile.photos[0].value;

          // VERIFY USER

          user.isVerified =
            true;

          // CLEAR OTPS

          user.otp = null;

          user.otpExpiry = null;

          user.resetPassword = null;

          user.resetPasswordExpiry =
            null;

          await user.save();
        }

        return done(null, user);

      } catch (error) {

        return done(error, null);

      }
    }
  )
);

// =========================
// SERIALIZE
// =========================

passport.serializeUser(
  (user, done) => {

    done(null, user.id);

  }
);

// =========================
// DESERIALIZE
// =========================

passport.deserializeUser(

  async (id, done) => {

    try {

      const user =
        await User.findById(id);

      done(null, user);

    } catch (error) {

      done(error, null);

    }
  }
);

export default passport;