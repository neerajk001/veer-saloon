import SaloonConfig from "../models/saloonConfig";

/**
 * GET Saloon Config
 * Used by:
 * - Slot generation
 * - Appointment creation
 * - Admin UI (view current rules)
 */
export const getSaloonConfig = async (req: any, res: any) => {
  try {
    const config = await SaloonConfig.findOne();

    if (!config) {
      return res.status(404).json({
        message: "Saloon config not set yet"
      });
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CREATE Saloon Config
 * Should be called ONLY ONCE (initial setup)
 */
export const createSaloonConfig = async (req: any, res: any) => {
  try {
    const existingConfig = await SaloonConfig.findOne();

    if (existingConfig) {
      return res.status(400).json({
        message: "Saloon config already exists"
      });
    }

    const {
      morningSlot,
      eveningSlot,
      daysOff
    } = req.body;

    if (
      !morningSlot ||
      !eveningSlot
    ) {
      return res.status(400).json({
        message: "Morning slot and evening slot are required"
      });
    }

    const config = await SaloonConfig.create({
      morningSlot,
      eveningSlot,
      daysOff: daysOff || []
    });

    res.status(201).json(config);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * UPDATE Saloon Config
 * Used when owner changes timings or days off
 */
export const updateSaloonConfig = async (req: any, res: any) => {
  try {
    const {
      morningSlot,
      eveningSlot,
      daysOff
    } = req.body;

    const config = await SaloonConfig.findOne();

    if (!config) {
      return res.status(404).json({
        message: "Saloon config not found"
      });
    }

    if (morningSlot !== undefined) {
      config.morningSlot = morningSlot;
    }

    if (eveningSlot !== undefined) {
      config.eveningSlot = eveningSlot;
    }

    if (daysOff !== undefined) {
      config.daysOff = daysOff;
    }

    await config.save();

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
