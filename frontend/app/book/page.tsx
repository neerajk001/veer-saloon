"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

// --- Types ---
type Service = {
  _id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  isAcitve?: boolean;
};

type SlotItem = {
  time: string;
  available: boolean;
};

const API_URL = "/api";

export default function BookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Data State
  const [services, setServices] = useState<Service[]>([]);
  const [dates, setDates] = useState<{ day: string; date: string; fullDate: string }[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [closureReason, setClosureReason] = useState<string>("");
  const [activeClosure, setActiveClosure] = useState<any>(null);

  // Selection State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<{ day: string; date: string; fullDate: string } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "" });

  // --- 1. Fetch Services & Generate Dates on Mount ---
  useEffect(() => {
    fetchServices();
    generateDates();
    checkShopStatus();

    // Load cached user details
    const cachedDetails = localStorage.getItem('veer_user_details');
    if (cachedDetails) {
      try {
        setDetails(JSON.parse(cachedDetails));
      } catch (e) {
        console.error("Failed to parse user details", e);
      }
    }
  }, []);

  // Cache user details whenever they change
  useEffect(() => {
    if (details.name || details.phone) {
      localStorage.setItem('veer_user_details', JSON.stringify(details));
    }
  }, [details]);


  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/services/all`);
      setServices(res.data.services || []);
    } catch (err) {
      console.error("Failed to fetch services", err);
      setError("Could not load services. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkShopStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/closures`);
      const closures = res.data;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find a FULL DAY closure that covers TODAY
      const currentClosure = closures.find((c: any) => {
        if (!c.isFullDay) return false;
        const start = new Date(c.startDate);
        const end = new Date(c.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999); // ensure end of day covers
        return today >= start && today <= end;
      });

      if (currentClosure) {
        setActiveClosure(currentClosure);
      }
    } catch (err) {
      console.error("Failed to check shop status", err);
    }
  };

  const generateDates = () => {
    const today = new Date();
    const dateList = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = days[d.getDay()];
      const dateStr = `${months[d.getMonth()]} ${d.getDate()}`;
      const fullDate = d.toISOString().split("T")[0];
      dateList.push({ day: dayName, date: dateStr, fullDate });
    }
    setDates(dateList);
    setSelectedDate(dateList[0]);
  };

  // --- 2. Fetch Slots when Service or Date changes ---
  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchSlots();
    }
  }, [selectedDate, selectedService]);

  const fetchSlots = async () => {
    if (!selectedService || !selectedDate) return;
    try {
      setSlots([]);
      setClosureReason("");
      setLoadingSlots(true);
      setSelectedSlot(null); // Reset selected slot when fetching new slots
      const res = await axios.get(`${API_URL}/appointments/slots`, {
        params: {
          date: selectedDate.fullDate,
          serviceId: selectedService._id,
        },
      });

      if (res.data.reason) {
        setClosureReason(res.data.reason);
      }

      setSlots(res.data.allSlots || []);
    } catch (err) {
      console.error("Failed to fetch slots", err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedSlot(null); // Reset slot when service changes
    setError("");
  };

  const handleDateSelect = (date: { day: string; date: string; fullDate: string }) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Reset slot when date changes
    setError("");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedSlot(time);
    setError("");
  };

  const handleConfirm = async () => {
    // Validation
    if (!selectedService) {
      setError("Please select a service.");
      return;
    }
    if (!selectedSlot) {
      setError("Please select a time slot.");
      return;
    }
    if (!details.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!details.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await axios.post(`${API_URL}/appointments`, {
        customername: details.name,
        phoneNumber: details.phone,
        date: selectedDate?.fullDate,
        serviceId: selectedService._id,
        startTime: selectedSlot,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      console.error("Booking failed", err);
      if (err.response && err.response.status === 409) {
        const errorData = err.response.data;
        const isBlocked = errorData.isBlocked;
        if (isBlocked) {
          setError("This time slot is blocked by admin. Please choose another time.");
        } else {
          setError("This slot was just booked by someone else. Please choose another time.");
        }
        setSelectedSlot(null);
        fetchSlots();
      } else {
        setError("Booking failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to format ISO time to "10:00 AM"
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Check if form is complete
  const isFormComplete = selectedService && selectedSlot && details.name.trim() && details.phone.trim();

  if (activeClosure) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">We Are Currently Closed</h2>
        <div className="bg-gray-50 p-6 rounded-2xl max-w-md w-full border border-gray-100">
          <p className="text-gray-600 mb-2">We are closed from</p>
          <p className="text-xl font-bold text-gray-900 mb-4">
            {new Date(activeClosure.startDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} — {new Date(activeClosure.endDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          {activeClosure.reason && (
            <div className="inline-block bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">
              Reason: {activeClosure.reason}
            </div>
          )}
        </div>
        <Link href="/" className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500">Redirecting you to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md px-6 py-4 flex items-center border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => router.push("/")}
          className="p-2 mr-4 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Book Appointment</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 pb-32">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Section 1: Select Service */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedService ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
              {selectedService ? '✓' : '1'}
            </div>
            <h2 className="text-lg font-bold text-gray-900">Select Service</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : services.length === 0 ? (
            <p className="text-center text-gray-500 py-8 bg-gray-100 rounded-xl">No services available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {services.map((service) => {
                const isSelected = selectedService?._id === service._id;
                return (
                  <button
                    key={service._id}
                    onClick={() => handleServiceSelect(service)}
                    className={`relative bg-white rounded-xl p-4 flex flex-col items-center text-center shadow-sm transition-all border-2
                      ${isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                        : 'border-transparent hover:border-blue-200 hover:shadow-md'
                      }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <h3 className="text-sm font-bold text-gray-900 mb-1">{service.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">{service.duration} min</p>
                    <span className="text-lg font-bold text-blue-600">${service.price}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Select Date */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedDate ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {selectedDate ? '✓' : '2'}
            </div>
            <h2 className="text-lg font-bold text-gray-900">Select Date</h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
            {dates.map((d, i) => {
              const isSelected = selectedDate?.fullDate === d.fullDate;
              return (
                <button
                  key={i}
                  onClick={() => handleDateSelect(d)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all min-w-[72px]
                    ${isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                >
                  <div className="text-xs font-medium mb-1 opacity-80">{d.day}</div>
                  <div className="font-bold text-sm">{d.date}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Select Time */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedSlot ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {selectedSlot ? '✓' : '3'}
            </div>
            <h2 className="text-lg font-bold text-gray-900">Select Time <span className="text-sm font-normal text-gray-500 ml-1">(Available Slots)</span></h2>
          </div>

          {!selectedService ? (
            <div className="bg-gray-100 rounded-xl p-6 text-center text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Please select a service first
            </div>
          ) : loadingSlots ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-500">Loading available times...</span>
            </div>
          ) : closureReason ? (
            <div className="bg-red-50 rounded-xl p-6 text-center text-red-600 border border-red-100 flex flex-col items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 opacity-75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              <div>
                <div className="font-bold">Not Available</div>
                <div className="text-sm opacity-90">{closureReason}</div>
              </div>
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-gray-100 rounded-xl p-6 text-center text-gray-500">
              No slots available for this date.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-2">
              <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                <style jsx>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 4px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                  }
                `}</style>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    return (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && handleTimeSelect(slot.time)}
                        disabled={!slot.available}
                        className={`py-2 px-1 border rounded-lg text-sm font-medium transition-all
                          ${!slot.available
                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed hidden' // Hide blocked slots for cleaner look? Or Keep them? Let's keep distinct style
                            : isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                          } ${!slot.available ? 'opacity-50' : ''}`}
                      >
                        {formatTime(slot.time)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="text-center mt-2 text-xs text-gray-400 border-t border-gray-100 pt-2">
                Scroll to see more times
              </div>
            </div>
          )}
        </section>

        {/* Section 4: Your Details */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${details.name && details.phone ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {details.name && details.phone ? '✓' : '4'}
            </div>
            <h2 className="text-lg font-bold text-gray-900">Your Details</h2>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={details.name}
                onChange={(e) => setDetails({ ...details, name: e.target.value })}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={details.phone}
                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                placeholder="Enter your phone number"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </section>

        {/* Summary Card - Only show when selections are made */}
        {selectedService && (
          <section className="mb-8">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Booking Summary</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Service</span>
                  <span className="font-semibold text-gray-900">{selectedService.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-semibold text-gray-900">{selectedService.duration} min</span>
                </div>
                {selectedDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Date</span>
                    <span className="font-semibold text-gray-900">{selectedDate.day}, {selectedDate.date}</span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Time</span>
                    <span className="font-semibold text-gray-900">{formatTime(selectedSlot)}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-blue-600">${selectedService.price}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Fixed Bottom Book Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 shadow-2xl">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleConfirm}
            disabled={!isFormComplete || loading}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-2
              ${isFormComplete && !loading
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Confirming...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Book Appointment
              </>
            )}
          </button>
          {!isFormComplete && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Please complete all selections above
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
