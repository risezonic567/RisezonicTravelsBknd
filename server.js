// import dotenv from "dotenv"
// dotenv.config();
// import express from "express"
// import cors from "cors"
// import flightRoutes from "./src/routes/flight.routes.js"
// import connectDB from "./src/config/db.js";
// import cookieParser from "cookie-parser";
// import userRoutes from "./src/routes/user.routes.js"
// import session from "express-session";
// import passport from "passport"
// import "./src/config/passport.js";
// // import adminMiddleware from "./src/middleware/authMiddleware.js"

// console.log("EMAIL_USER:", process.env.EMAIL_USER);
// console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

// connectDB()

// const app = express();
// const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : [];
// app.use(cors({
//      origin: function (origin, callback) {
//          // browser requests bina origin ke bhi ho sakti hain (like Postman or mobile apps)
//          if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//              callback(null, true);
//          } else {
//              callback(new Error('Not allowed by CORS'));
//          }
//      },
//      credentials: true,
// }));
// app.use(
//   session({
//     secret: "risezonicsecret",
//     resave: false,
//     saveUninitialized: false,
//   })
// );
// app.use(passport.initialize());
// app.use(passport.session());
// app.use(express.json());
// app.use(cookieParser());

// app.use('/api/flights',flightRoutes)
// app.use('/api/auth', userRoutes)
// // app.use('/api/auth', adminMiddleware )

// const PORT = process.env.PORT || 7000
// app.listen(PORT, () => {
//     console.log(`server running on ${PORT}`);
// })



import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import flightRoutes from "./src/routes/flight.routes.js";
import connectDB from "./src/config/db.js";
import cookieParser from "cookie-parser";
import userRoutes from "./src/routes/user.routes.js";
import session from "express-session";
import passport from "passport";
import "./src/config/passport.js";

// Database Connect
connectDB();

const app = express();

// 🔥 FIXED: .trim() lagaya taaki agar .env mein galti se space ho, toh bhi CORS fail na ho
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(",").map(url => url.trim()) 
  : [];

console.log("CORS Allowed Origins:", allowedOrigins);
console.log("EMAIL_USER:", process.env.EMAIL_USER);

// CORS Config
app.use(cors({
     origin: function (origin, callback) {
         // Browser requests bina origin ke bhi ho sakti hain (like Postman/Mobile Apps)
         if (!origin || allowedOrigins.indexOf(origin) !== -1) {
             callback(null, true);
         } else {
             console.log("Blocked by CORS. Origin was:", origin); // Live logs check karne ke liye helper
             callback(new Error('Not allowed by CORS'));
         }
     },
     credentials: true,
}));

// Express Session
app.use(
  session({
    secret: "risezonicsecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Live par secure cookie true rahegi
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());
import jwt from "jsonwebtoken"; // ensure availability if used elsewhere

app.use(express.json());
app.use(cookieParser());

// Base Route Test karne ke liye (Aap browser me api.risezonictravel.com kholkar check kar sakte hain)
app.get("/", (req, res) => {
  res.send("Risezonic Travel API is Running Successfully Live!");
});

// Routes Configuration
app.use('/api/flights', flightRoutes); // API URL: /api/flights/airports aur /api/flights/search
app.use('/api/auth', userRoutes);

// Global Error Handler (Agar CORS server crash kare toh use handle karne ke liye)
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: "CORS Error: This origin is not allowed." });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});