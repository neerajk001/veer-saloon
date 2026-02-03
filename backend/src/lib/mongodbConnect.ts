import mongoose from "mongoose";

export const mongodbConnect  =async () =>{
    try {
         const mongoURI = process.env.MONGO_URI 
         if(!mongoURI){
            throw new Error("MONGO_URI is not defined in environment variables");
         }
         await mongoose.connect(mongoURI);
         console.log("MongoDB connected successfully");
            
    }catch(error){
        console.log("MongoDB connection error:", error);
    }
}