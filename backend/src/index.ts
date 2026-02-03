import express from 'express';
import cors from 'cors';
import { serviceRouter } from './routes/serviceRouter';
import { mongodbConnect } from './lib/mongodbConnect';
import dotenv from 'dotenv';
import appointmentRouter from './routes/appointmentRouter';
import configRouter from './routes/configRouter';
dotenv.config();

const PORT = process.env.PORT || 5000;


const app = express();

// CORS configuration
app.use(cors({
    origin: '*', // Allow all origins for production testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use("/api/services", serviceRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/config", configRouter);


app.listen(PORT, () => {
    mongodbConnect();
    console.log(`Server is running on http://localhost:${PORT}`);
});