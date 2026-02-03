
import Appointment from '../models/appointment';
import Service from '../models/service';
import SaloonConfig from '../models/saloonConfig';
import { addMinutesToDate, isOverlapping } from '../utils/time.utils';

export const createAppointment = async (req: any, res: any) => {
  try {
    const { customername, date, serviceId, phoneNumber, startTime } = req.body;
    if (!customername || !date || !serviceId || !phoneNumber || !startTime) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Fetch configuration settings
    const config = await SaloonConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: 'Saloon configuration not found' });
    }

    const start = new Date(startTime);
    const end = addMinutesToDate(start, service.duration); // No buffer time

    // Check for overlapping appointments (including blocked slots)
    const existingAppointments = await Appointment.find({
      date: new Date(date),
      status: { $in: ['scheduled', 'blocked'] }, // Check both scheduled and blocked
    });

    // Check if requested slot conflicts with any existing appointment
    for (const appointment of existingAppointments) {
      if (isOverlapping(appointment.startTime, appointment.endTime, start, end)) {
        const isBlocked = appointment.status === 'blocked';
        return res.status(409).json({
          message: isBlocked
            ? 'This time slot is blocked by admin'
            : 'This time slot is already booked',
          conflict: true,
          isBlocked
        });
      }
    }

    // Create new appointment
    const newAppointment = new Appointment({
      customername,
      date: new Date(date),
      serviceId,
      phoneNumber,
      startTime: start,
      endTime: end,
      status: req.body.status || 'scheduled' // Allow custom status (e.g., 'blocked')
    });

    await newAppointment.save();

    return res.status(201).json({
      message: 'Appointment created successfully',
      appointment: newAppointment
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}


export const getAvailableSlots = async (req: any, res: any) => {
  try {
    const { date, serviceId } = req.query;

    if (!date || !serviceId) {
      return res.status(400).json({ message: "Missing date or serviceId" });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const config = await SaloonConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: "Saloon configuration not found" });
    }

    const slotDuration = service.duration; // No buffer time
    const SLOT_INTERVAL = 5; // Generate slots every 5 minutes

    // Get appointments for the day
    const appointments = await Appointment.find({
      date: new Date(date),
      status: { $in: ["scheduled", "blocked"] }
    });

    const allSlots: Array<{ time: Date; available: boolean }> = [];
    const slots: Date[] = [];

    // Helper function to check if a service can fit in a slot
    const canFitService = (slotStart: Date): boolean => {
      const slotEnd = addMinutesToDate(slotStart, slotDuration);

      // Check if this slot + service duration overlaps with any existing appointment
      for (const appt of appointments) {
        if (isOverlapping(appt.startTime, appt.endTime, slotStart, slotEnd)) {
          return false;
        }
      }
      return true;
    };

    // Helper function to generate slots for a time window
    const generateSlotsForWindow = (startTime: string, endTime: string) => {
      // Append IST offset (+05:30) to ensure server interprets time as IST, not UTC
      const timeZoneOffset = "+05:30";
      const dayStart = new Date(`${date}T${startTime}:00${timeZoneOffset}`);
      const dayEnd = new Date(`${date}T${endTime}:00${timeZoneOffset}`);
      let current = new Date(dayStart);

      while (true) {
        // Check if service can complete before window closes
        const serviceEnd = addMinutesToDate(current, slotDuration);
        if (serviceEnd > dayEnd) break;

        const available = canFitService(current);

        allSlots.push({
          time: new Date(current),
          available
        });

        if (available) {
          slots.push(new Date(current));
        }

        // Move to next slot (every 5 minutes)
        current = addMinutesToDate(current, SLOT_INTERVAL);
      }
    };

    // Generate slots for morning window
    if (config.morningSlot) {
      generateSlotsForWindow(
        config.morningSlot.openingTime,
        config.morningSlot.closingTime
      );
    }

    // Generate slots for evening window
    if (config.eveningSlot) {
      generateSlotsForWindow(
        config.eveningSlot.openingTime,
        config.eveningSlot.closingTime
      );
    }

    res.json({
      date,
      serviceId,
      availableSlots: slots,
      allSlots
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


export const getAppointmentsByDate = async (req: any, res: any) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const appointments = await Appointment.find({
      date: new Date(date)
    })
      .sort({ startTime: 1 })
      .populate("serviceId", "name duration");

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAppointmentStatus = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = ['scheduled', 'completed', 'canceled', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("serviceId", "name duration");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({
      message: "Appointment updated successfully",
      appointment
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteAppointment = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByIdAndDelete(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
