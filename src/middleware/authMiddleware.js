import jwt from "jsonwebtoken"
import User from "../model/user.model.js"

const protect = async(req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if(!token){
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        console.log("TOKEN:", req.cookies);

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        )


        const user = await User.findById(decoded.id);
        if(!user){
            return res.status(401).json({
                message: "User not found",
            })
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid Token",
        })
    }
}

export default protect