import mongoose from "mongoose"

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("MongoDb Connnected");
    } catch (error) {
        console.log("MongoDb Error:", error.message);
        process.exit(1);
    }
}

export default connectDB;