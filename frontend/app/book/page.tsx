"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useSession, signIn } from "next-auth/react";

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
  const { data: session, status } = useSession();
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

    // Pre-fill user details from session if available
    if (session?.user) {
      setDetails(prev => ({
        ...prev,
        name: session.user?.name || prev.name
      }));
    } else {
      // Load cached user details if not logged in (though we will force login)
      const cachedDetails = localStorage.getItem('veer_user_details');
      if (cachedDetails) {
        try {
          setDetails(JSON.parse(cachedDetails));
        } catch (e) {
          console.error("Failed to parse user details", e);
        }
      }
    }
  }, [session]);

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

      // --- SAVE BOOKING TO LOCAL STORAGE (My Bookings) ---
      const newBooking = {
        id: Date.now().toString(),
        serviceName: selectedService.name,
        date: `${selectedDate?.day}, ${selectedDate?.date}`,
        fullDate: selectedDate?.fullDate,
        time: selectedSlot,
        customerName: details.name,
        createdAt: Date.now()
      };

      const existingBookingsStr = localStorage.getItem('veer_my_bookings');
      const existingBookings = existingBookingsStr ? JSON.parse(existingBookingsStr) : [];
      localStorage.setItem('veer_my_bookings', JSON.stringify([newBooking, ...existingBookings]));
      // ---------------------------------------------------

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-6 text-black">
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
    <div className="min-h-screen bg-white flex flex-col text-black selection:bg-orange-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md z-50 border-b border-gray-100 transition-all">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <Image src="/logo.png" alt="Veer Salon" width={100} height={35} className="object-contain grayscale brightness-0" />
          </Link>

          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="flex items-center gap-2">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    width={28}
                    height={28}
                    className="rounded-full border border-gray-200"
                  />
                )}
              </div>
            )}
            <Link
              href="/my-bookings"
              className="text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full border border-black hover:bg-black hover:text-white transition-all duration-300"
            >
              My Bookings
            </Link>
          </div>
        </div>
      </header>

      {status === 'loading' ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      ) : status === 'unauthenticated' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-gray-100">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to Book</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">To prevent spam and manage your appointments, please sign in with your Google account.</p>

            <button
              onClick={() => signIn('google')}
              className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-900 transition-all shadow-lg shadow-gray-200 active:scale-95"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.82-.15-1.82Z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      ) : (
        <main className="flex-1 max-w-2xl mx-auto w-full p-6 pb-40">
          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tighter">Book Appointment</h1>
            <p className="text-gray-500 mt-1">Select your service, date, and time.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-none border-l-4 border-red-500 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Section 1: Select Service */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${selectedService ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}>
                1
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Select Service</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : services.length === 0 ? (
              <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">No services available.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {services.map((service) => {
                  const isSelected = selectedService?._id === service._id;
                  return (
                    <button
                      key={service._id}
                      onClick={() => handleServiceSelect(service)}
                      className={`group relative w-full p-5 flex items-center justify-between text-left transition-all duration-300 border-b border-gray-100 hover:bg-gray-50
                      ${isSelected
                          ? 'bg-black text-white hover:bg-gray-900 border-transparent shadow-xl shadow-gray-200 transform scale-[1.02] rounded-xl'
                          : 'bg-white text-black'
                        }`}
                    >
                      <div className="flex flex-col">
                        <span className={`font-bold text-lg tracking-tight ${isSelected ? 'text-white' : 'text-black'}`}>{service.name}</span>
                        <span className={`text-xs uppercase tracking-widest mt-1 ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>{service.duration} mins</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-bold text-xl ${isSelected ? 'text-white' : 'text-black'}`}>{service.price}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-200'}`}>
                          {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Select Date */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${selectedDate ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}>
                2
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Select Date</h2>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar">
              {dates.map((d, i) => {
                const isSelected = selectedDate?.fullDate === d.fullDate;
                return (
                  <button
                    key={i}
                    onClick={() => handleDateSelect(d)}
                    className={`flex-shrink-0 px-6 py-4 rounded-xl border transition-all min-w-[100px] group
                    ${isSelected
                        ? 'bg-black border-black text-white shadow-lg'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-black hover:text-black'
                      }`}
                  >
                    <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isSelected ? 'text-orange-500' : 'text-gray-400 group-hover:text-black'}`}>{d.day}</div>
                    <div className="font-black text-2xl">{d.date.split(' ')[1]}</div>
                    <div className="text-[10px] uppercase font-medium">{d.date.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Select Time */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${selectedSlot ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}>
                3
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Select Time <span className="text-sm font-medium text-gray-400 normal-case ml-2">Available Slots</span></h2>
            </div>

            {!selectedService ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                Please select a service first
              </div>
            ) : loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-sm font-medium">Loading slots...</span>
              </div>
            ) : closureReason ? (
              <div className="bg-orange-50 rounded-none border-l-4 border-orange-500 p-6 text-center text-orange-800">
                <div className="font-bold uppercase tracking-wide text-sm mb-1">Not Available</div>
                <div className="text-sm opacity-80">{closureReason}</div>
              </div>
            ) : slots.length === 0 ? (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center text-gray-500 text-sm">
                No slots available for this date.
              </div>
            ) : (
              <div className="bg-white">
                <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <style jsx>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 4px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d1d5db;
                  }
                `}</style>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot === slot.time;
                      return (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && handleTimeSelect(slot.time)}
                          disabled={!slot.available}
                          className={`py-2.5 px-2 border rounded-lg text-sm font-medium transition-all
                          ${!slot.available
                              ? 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed hidden'
                              : isSelected
                                ? 'bg-black text-white border-black shadow-md'
                                : 'bg-white text-black border-gray-200 hover:border-black'
                            } ${!slot.available ? 'opacity-50' : ''}`}
                        >
                          {formatTime(slot.time)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section 4: Your Details */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${details.name && details.phone ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}>
                4
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Your Details</h2>
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 group-focus-within:text-black transition-colors">Full Name</label>
                <input
                  type="text"
                  value={details.name}
                  onChange={(e) => setDetails({ ...details, name: e.target.value })}
                  placeholder="Ex. John Doe"
                  className="w-full px-0 py-3 border-b-2 border-gray-200 focus:border-black focus:outline-none bg-transparent transition-all placeholder:text-gray-300 text-lg font-medium"
                />
              </div>
              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 group-focus-within:text-black transition-colors">Phone Number</label>
                <input
                  type="tel"
                  value={details.phone}
                  onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                  placeholder="Ex. 9876543210"
                  className="w-full px-0 py-3 border-b-2 border-gray-200 focus:border-black focus:outline-none bg-transparent transition-all placeholder:text-gray-300 text-lg font-medium"
                />
              </div>
            </div>
          </section>

          {/* Summary Card */}
          {selectedService && (
            <section className="mb-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-gray-50 p-6 rounded-none border-l-4 border-black">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Summary</h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Service</span>
                    <span className="font-bold text-black">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-bold text-black">{selectedService.duration} min</span>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="font-bold text-black">{selectedDate.day}, {selectedDate.date}</span>
                    </div>
                  )}
                  {selectedSlot && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Time</span>
                      <span className="font-bold text-black">{formatTime(selectedSlot)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-black uppercase tracking-tight text-black">Total</span>
                      <span className="text-2xl font-black text-black">
                        {selectedService.price}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {/* Fixed Bottom Book Button */}
      {status === 'authenticated' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 z-40 animate-in slide-in-from-bottom-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleConfirm}
              disabled={!isFormComplete || loading}
              className={`group w-full py-4 rounded-full text-lg font-bold transition-all flex items-center justify-center gap-2 overflow-hidden relative
              ${isFormComplete && !loading
                  ? 'bg-black text-white hover:bg-orange-600 shadow-xl shadow-black/10'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Confirming...
                </>
              ) : (
                <>
                  <span className="relative z-10">Confirm Booking</span>
                  {isFormComplete && <svg className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>}
                </>
              )}
            </button>
            {!isFormComplete && (
              <p className="text-center text-[10px] uppercase tracking-widest text-gray-400 mt-3 font-medium">
                Complete all steps to proceed
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
