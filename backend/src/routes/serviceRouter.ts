import express  from "express";
import { createService, getAllServices, getServiceById,deleteServiceById, updateServiceById} from "../controllers/service.controller";





const router = express.Router();

router.post("/create", createService);
router.get("/all", getAllServices);
router.get("/:id", getServiceById);
router.delete("/:id", deleteServiceById);
router.put("/:id", updateServiceById);


export {router as serviceRouter};

