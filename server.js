import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import flightRoutes from "./src/routes/flight.routes.js"
import connectDB from "./src/config/db.js";
import cookieParser from "cookie-parser";
import userRoutes from "./src/routes/user.routes.js"
import session from "express-session";
import passport from "passport"
import "./src/config/passport.js";
// import adminMiddleware from "./src/middleware/authMiddleware.js"
dotenv.config();
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

connectDB()

const app = express();
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : [];
app.use(cors({
     origin: function (origin, callback) {
         // browser requests bina origin ke bhi ho sakti hain (like Postman or mobile apps)
         if (!origin || allowedOrigins.indexOf(origin) !== -1) {
             callback(null, true);
         } else {
             callback(new Error('Not allowed by CORS'));
         }
     },
     credentials: true,
}));
app.use(
  session({
    secret: "risezonicsecret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(cookieParser());

app.use('/api/flights',flightRoutes)
app.use('/api/auth', userRoutes)
// app.use('/api/auth', adminMiddleware )

const PORT = process.env.PORT || 7000
app.listen(PORT, () => {
    console.log(`server running on ${PORT}`);
})
