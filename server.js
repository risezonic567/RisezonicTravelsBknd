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
app.use(cors({
     origin: "http://localhost:5173",
     credentials: true,
}))
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

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`server running on ${PORT}`);
})
