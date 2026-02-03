import express from "express";
import {
  getSaloonConfig,
  createSaloonConfig,
  updateSaloonConfig
} from "../controllers/saloon.controller";

const router = express.Router();

router.get("/", getSaloonConfig);
router.post("/", createSaloonConfig);
router.put("/", updateSaloonConfig);

export default router;
