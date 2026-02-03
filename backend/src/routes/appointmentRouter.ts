import express from "express";
import {
  createAppointment,
  getAvailableSlots,
  getAppointmentsByDate,
  updateAppointmentStatus,
  deleteAppointment
} from "../controllers/appointment.controller";

const router = express.Router();

router.post("/", createAppointment);
router.get("/slots", getAvailableSlots);
router.get("/", getAppointmentsByDate);
router.put("/:id", updateAppointmentStatus);
router.delete("/:id", deleteAppointment);

export default router;
