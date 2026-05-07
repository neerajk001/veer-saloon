'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { isAdminEmail } from '@/lib/admin';
import { formatDuration } from '@/lib/utils';

const API_URL = '/api';

// 5-minute interval time options for block slot (00:00 to 23:55)
const TIME_OPTIONS_5MIN = (() => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

// Display time in 12-hour format (e.g. "13:00" -> "1:00 PM")
function formatTimeOption24to12(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Scrollable time dropdown so it doesn't overflow the screen on mobile
function TimeSelect({
  value,
  onChange,
  options,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);
  const display = value ? formatTimeOption24to12(value) : placeholder;
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white text-left flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>{display}</span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-[min(50vh,280px)] overflow-y-auto overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
            {options.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 active:bg-gray-100 block ${value === t ? 'bg-amber-50 text-amber-800 font-medium' : 'text-gray-900'}`}
              >
                {formatTimeOption24to12(t)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Types
interface Service {
  _id: string;
  name: string;
  price: number;
  priceMin?: number;
  priceMax?: number;
  duration: number;
  isActive?: boolean;
}

interface Appointment {
  _id: string;
  customername: string;
  phoneNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceId?: {
    _id: string;
    name: string;
    duration: number;
  };
  serviceIds?: Array<{
    _id: string;
    name: string;
    duration: number;
  }>;
}

interface SalonConfig {
  _id?: string;
  morningSlot: {
    openingTime: string;
    closingTime: string;
  };
  eveningSlot: {
    openingTime: string;
    closingTime: string;
  };
  daysOff: string[];
}

interface BlockedSlot {
  _id: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
  reason?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  blocked: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'services' | 'appointments' | 'settings' | 'blocked' | 'users'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Services State
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editService, setEditService] = useState<{ name: string; price: string; duration: string; isActive: boolean } | null>(null);

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Settings State
  const [config, setConfig] = useState<SalonConfig>({
    morningSlot: {
      openingTime: '09:00',
      closingTime: '14:00'
    },
    eveningSlot: {
      openingTime: '16:00',
      closingTime: '22:00'
    },
    daysOff: [],
  });
  const [daysOffInput, setDaysOffInput] = useState('');

  // Blocked Slots State
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [newBlockedSlot, setNewBlockedSlot] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    isFullDay: false,
    reason: '',
  });
  // Quick block time slot (single day, instant – slots disappear on booking page)
  const [quickBlockSlot, setQuickBlockSlot] = useState({
    date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })(),
    startTime: '',
    endTime: '',
    reason: '',
  });
  const [blockingSlot, setBlockingSlot] = useState(false);

  // Users State
  const [users, setUsers] = useState<User[]>([]);

  // Daily count (backend total for "how many came in a day")
  const [dailyCount, setDailyCount] = useState<{ date: string; total: number; scheduled: number; completed: number } | null>(null);
  // Monthly count (month-end sum from backend)
  const [monthlyCount, setMonthlyCount] = useState<{ date: string; total: number; scheduled: number; completed: number } | null>(null);

  // Show message helper
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Redirect if not admin
  useEffect(() => {
    if (session?.user) {
      const isAdmin = (session.user as any).role === 'admin' || isAdminEmail(session.user.email);

      if (!isAdmin) {
        // Optional: Redirect to home or show error
        // router.push('/'); // Need to import useRouter
      }
    }
  }, [session]);

  const isAdmin = (session?.user as any)?.role === 'admin' || isAdminEmail(session?.user?.email);

  if (session && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-800 p-6 rounded-2xl max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>You do not have permission to view the admin dashboard.</p>
          <Link href="/" className="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDailyCount();
      fetchMonthlyCount();
    }
    if (activeTab === 'services') fetchServices();
    if (activeTab === 'appointments') fetchAppointments();
    if (activeTab === 'settings') fetchConfig();
    if (activeTab === 'blocked') {
      fetchBlockedSlots();
      fetchConfig();
    }
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, selectedDate]);

  const fetchDailyCount = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await axios.get(`${API_URL}/appointments/daily-count`, { params: { date: today } });
      setDailyCount(res.data);
    } catch (error) {
      console.error('Error fetching daily count:', error);
      setDailyCount(null);
    }
  };

  const fetchMonthlyCount = async () => {
    try {
      const now = new Date();
      const res = await axios.get(`${API_URL}/appointments/monthly-count`, {
        params: { year: now.getFullYear(), month: now.getMonth() + 1 },
      });
      setMonthlyCount(res.data);
    } catch (error) {
      console.error('Error fetching monthly count:', error);
      setMonthlyCount(null);
    }
  };

  // ===== SERVICES =====
  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/services/all`);
      setServices(res.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      showMessage('error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const createService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.price || !newService.duration) {
      showMessage('error', 'Please fill all fields');
      return;
    }

    try {
      await axios.post(`${API_URL}/services/create`, {
        name: newService.name,
        price: newService.price,
        duration: parseInt(newService.duration),
        isActive: true,
      });
      showMessage('success', 'Service created successfully');
      setNewService({ name: '', price: '', duration: '' });
      fetchServices();
    } catch (error) {
      console.error('Error creating service:', error);
      showMessage('error', 'Failed to create service');
    }
  };

  const formatServicePrice = (service: Service): string => {
    const min = typeof service.priceMin === 'number' ? service.priceMin : undefined;
    const max = typeof service.priceMax === 'number' ? service.priceMax : undefined;
    if (min !== undefined && max !== undefined && min !== max) return `₹${min} - ₹${max}`;
    return `₹${service.price}`;
  };

  const servicePriceInput = (service: Service): string => {
    const min = typeof service.priceMin === 'number' ? service.priceMin : undefined;
    const max = typeof service.priceMax === 'number' ? service.priceMax : undefined;
    if (min !== undefined && max !== undefined && min !== max) return `${min} - ${max}`;
    return String(service.price ?? '');
  };

  const deleteService = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;

    try {
      await axios.delete(`${API_URL}/services/${id}`);
      showMessage('success', 'Service deleted successfully');
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      showMessage('error', 'Failed to delete service');
    }
  };

  const startEditService = (service: Service) => {
    setEditingServiceId(service._id);
    setEditService({
      name: service.name || '',
      price: servicePriceInput(service),
      duration: String(service.duration ?? ''),
      isActive: service.isActive !== false,
    });
  };

  const cancelEditService = () => {
    setEditingServiceId(null);
    setEditService(null);
  };

  const saveEditService = async () => {
    if (!editingServiceId || !editService) return;
    if (!editService.name.trim()) {
      showMessage('error', 'Service name is required');
      return;
    }

    if (!String(editService.price).trim()) {
      showMessage('error', 'Price is required');
      return;
    }

    const duration = Number(editService.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      showMessage('error', 'Invalid duration');
      return;
    }

    try {
      setLoading(true);
      await axios.put(`${API_URL}/services/${editingServiceId}`, {
        name: editService.name.trim(),
        price: editService.price,
        duration,
        isActive: editService.isActive,
      });
      showMessage('success', 'Service updated successfully');
      cancelEditService();
      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      showMessage('error', 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  // ===== APPOINTMENTS =====
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/appointments`, {
        params: { date: selectedDate },
      });
      setAppointments(res.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      showMessage('error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!window.confirm('Are you sure you want to completely delete this appointment?')) return;
    try {
      await axios.delete(`${API_URL}/appointments/${id}`);
      showMessage('success', 'Appointment deleted');
      fetchAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      showMessage('error', 'Failed to delete appointment');
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      // Try to update - if endpoint doesn't exist, we'll handle it
      await axios.put(`${API_URL}/appointments/${id}`, { status });
      showMessage('success', `Appointment marked as ${status}`);
      fetchAppointments();
    } catch (error: any) {
      // If endpoint doesn't exist (404), create it as a workaround using direct DB update
      if (error.response?.status === 404) {
        showMessage('error', 'Failed to update appointment. Please try again.');
      } else {
        console.error('Error updating appointment:', error);
        showMessage('error', 'Failed to update appointment');
      }
    }
  };

  const downloadBookingsCSV = async () => {
    try {
      if (!appointments || appointments.length === 0) {
        showMessage('error', 'No appointments to download for this date');
        return;
      }
      
      const headers = ['Name', 'Phone Number', 'Date', 'Start Time', 'End Time', 'Service', 'Status'];
      const rows = appointments.map((apt: any) => {
        const dateStr = apt.date ? new Date(apt.date).toLocaleDateString() : '';
        const serviceLabel = (apt.serviceIds?.length
          ? apt.serviceIds.map((s: any) => s?.name).filter(Boolean).join(' + ')
          : (apt.serviceId?.name || 'N/A'));
        return [
          `"${(apt.customername || '').replace(/"/g, '""')}"`,
          `"${apt.phoneNumber || ''}"`,
          `"${dateStr}"`,
          `"${formatTime(apt.startTime)}"`,
          `"${formatTime(apt.endTime)}"`,
          `"${String(serviceLabel).replace(/"/g, '""')}"`,
          `"${apt.status || ''}"`
        ];
      });
      
      const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bookings_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showMessage('success', 'Bookings downloaded successfully');
    } catch (error) {
      console.error('Error downloading bookings:', error);
      showMessage('error', 'Failed to download bookings');
    }
  };

  // ===== SETTINGS =====
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/config`);
      if (res.data) {
        setConfig(res.data);
        setDaysOffInput(res.data.daysOff?.join(', ') || '');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      // If config doesn't exist, use defaults
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    const daysOffArray = daysOffInput
      .split(',')
      .map((d) => d.trim())
      .filter((d) => d);

    const configData = {
      ...config,
      daysOff: daysOffArray,
    };

    try {
      // Try PUT first, if it fails try POST
      try {
        await axios.put(`${API_URL}/config`, configData);
      } catch (putError: any) {
        if (putError.response?.status === 404) {
          await axios.post(`${API_URL}/config`, configData);
        } else {
          throw putError;
        }
      }
      showMessage('success', 'Settings saved successfully');
      fetchConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      showMessage('error', 'Failed to save settings');
    }
  };

  // ===== BLOCKED SLOTS / CLOSURES =====
  const fetchBlockedSlots = async () => {
    try {
      setLoading(true);
      // Fetch closures
      const res = await axios.get(`${API_URL}/admin/closures`);
      setBlockedSlots(res.data || []);
    } catch (error: any) {
      console.error('Error fetching closures:', error);
      setBlockedSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const createBlockedSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedSlot.startDate) {
      showMessage('error', 'Please select a start date');
      return;
    }

    // Default end date to start date if empty (though state initialization handles this)
    const finalEndDate = newBlockedSlot.endDate || newBlockedSlot.startDate;

    if (!newBlockedSlot.isFullDay && (!newBlockedSlot.startTime || !newBlockedSlot.endTime)) {
      showMessage('error', 'Please provide start and end time or select Full Day');
      return;
    }

    try {
      await axios.post(`${API_URL}/admin/closures`, {
        startDate: newBlockedSlot.startDate,
        endDate: finalEndDate,
        startTime: newBlockedSlot.startTime,
        endTime: newBlockedSlot.endTime,
        isFullDay: newBlockedSlot.isFullDay,
        reason: newBlockedSlot.reason
      });

      showMessage('success', 'Closure added successfully');
      setNewBlockedSlot({
        startDate: newBlockedSlot.startDate,
        endDate: newBlockedSlot.startDate,
        startTime: '',
        endTime: '',
        isFullDay: false,
        reason: ''
      });
      fetchBlockedSlots();
    } catch (error) {
      console.error('Error blocking slot:', error);
      showMessage('error', 'Failed to block slot');
    }
  };

  const deleteBlockedSlot = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this closure?')) return;

    try {
      await axios.delete(`${API_URL}/admin/closures`, { params: { id } });
      showMessage('success', 'Closure removed');
      fetchBlockedSlots();
    } catch (error) {
      console.error('Error deleting closure:', error);
      showMessage('error', 'Failed to remove closure');
    }
  };

  const blockTimeSlotQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBlockSlot.startTime || !quickBlockSlot.endTime) {
      showMessage('error', 'Please select start and end time');
      return;
    }
    if (quickBlockSlot.startTime >= quickBlockSlot.endTime) {
      showMessage('error', 'End time must be after start time');
      return;
    }
    try {
      setBlockingSlot(true);
      await axios.post(`${API_URL}/admin/block-slot`, {
        date: quickBlockSlot.date,
        startTime: quickBlockSlot.startTime,
        endTime: quickBlockSlot.endTime,
        reason: quickBlockSlot.reason || undefined,
      });
      showMessage('success', 'Time slot blocked – users can no longer book it');
      setQuickBlockSlot(prev => ({ ...prev, startTime: '', endTime: '', reason: '' }));
      fetchBlockedSlots();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to block slot';
      showMessage('error', msg);
    } finally {
      setBlockingSlot(false);
    }
  };

  // ===== USERS =====
  const fetchUsers = async () => {
    // Safety check
    const isAdmin = (session?.user as any)?.role === 'admin' || isAdminEmail(session?.user?.email);

    if (!isAdmin) return;

    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/users`);
      setUsers(res.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showMessage('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockUser = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this user?`)) return;

    try {
      await axios.put(`${API_URL}/admin/users`, { userId, blocked: !currentStatus });
      showMessage('success', `User ${currentStatus ? 'unblocked' : 'blocked'} successfully`);
      // Update local state immediately
      setUsers(users.map(u => u._id === userId ? { ...u, blocked: !currentStatus } : u));
    } catch (error) {
      console.error('Error updating user:', error);
      showMessage('error', 'Failed to update user status');
    }
  };

  const formatTime = (dateString: string) => {
    try {
      if (dateString.includes('T') || dateString.includes('-') || dateString.length > 5) {
        return new Date(dateString).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'blocked':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    totalServices: services.length,
    // Use backend daily count when available (dashboard loads first); else fallback to appointments list
    todayAppointments: dailyCount ? dailyCount.scheduled : appointments.filter(a => a.status === 'scheduled').length,
    completedToday: dailyCount ? dailyCount.completed : appointments.filter(a => a.status === 'completed').length,
    customersToday: dailyCount ? dailyCount.total : appointments.filter(a => a.status !== 'canceled').length,
    blockedSlots: blockedSlots.length,
    totalUsers: users.length
  };

  const activeShiftTimeOptions = TIME_OPTIONS_5MIN.filter(t => {
    const { morningSlot, eveningSlot } = config;
    const inMorning = morningSlot?.openingTime && morningSlot?.closingTime && t >= morningSlot.openingTime && t <= morningSlot.closingTime;
    const inEvening = eveningSlot?.openingTime && eveningSlot?.closingTime && t >= eveningSlot.openingTime && t <= eveningSlot.closingTime;
    return inMorning || inEvening;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg flex items-center justify-center text-white font-bold">
                VS
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Veer Salon Admin</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* User Info */}
              {session?.user && (
                <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {session.user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{session.user.name || 'Admin'}</div>
                    <div className="text-xs text-gray-500">{session.user.email}</div>
                  </div>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={() => signOut({ callbackUrl: '/admin/login' })}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                <span className="hidden sm:inline">Logout</span>
                <svg className="sm:hidden w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>

              {/* Back to Site Link */}
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span className="hidden sm:inline">Back to Site</span>
                <svg className="sm:hidden w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top duration-300">
          <div
            className={`px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 ${message.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
              }`}
          >
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        </div>
      )}

      {/* Mobile-Friendly Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2 overflow-x-auto py-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {(() => {
              const isAdmin = (session?.user as any)?.role === 'admin' || isAdminEmail(session?.user?.email);

              const tabs = ['dashboard', 'services', 'appointments', 'settings', 'blocked'];
              if (isAdmin) tabs.push('users');

              return tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium capitalize transition-all duration-200 ${activeTab === tab
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 transform scale-105'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                    }`}
                >
                  {tab === 'blocked' ? 'Shop Closures' : tab}
                </button>
              ));
            })()}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Customers today</div>
                <div className="text-4xl font-extrabold text-amber-600">{stats.customersToday}</div>
                <div className="mt-2 text-xs text-amber-500">Total came in today (backend)</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">This month (total)</div>
                <div className="text-4xl font-extrabold text-violet-600">{monthlyCount?.total ?? '–'}</div>
                <div className="mt-2 text-xs text-violet-500">Month sum – all customers (backend)</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Total Services</div>
                <div className="text-4xl font-extrabold text-gray-900">{stats.totalServices}</div>
                <div className="mt-2 text-xs text-gray-400">Active services offered</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Today&apos;s Appointments</div>
                <div className="text-4xl font-extrabold text-blue-600">{stats.todayAppointments}</div>
                <div className="mt-2 text-xs text-blue-400">Scheduled for today</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Completed</div>
                <div className="text-4xl font-extrabold text-green-600">{stats.completedToday}</div>
                <div className="mt-2 text-xs text-green-400">Successfully done today</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Closures</div>
                <div className="text-4xl font-extrabold text-gray-600">{stats.blockedSlots}</div>
                <div className="mt-2 text-xs text-gray-400">Active closure rules</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Total Users</div>
                <div className="text-4xl font-extrabold text-indigo-600">{stats.totalUsers}</div>
                <div className="mt-2 text-xs text-gray-400">Registered customers</div>
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        {activeTab === 'services' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Services</h2>

            {/* Add Service Form */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                Add New Service
              </h3>
              <form onSubmit={createService} className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Service Name"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <input
                  type="text"
                  placeholder="Price (e.g., 300 or 300 - 400)"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  className="w-full md:w-32 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <input
                  type="number"
                  placeholder="Duration (min)"
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                  className="w-full md:w-40 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-lg shadow-blue-200 active:scale-95"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Services List - Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-500">Loading services...</div>
              ) : services.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No services created yet.</div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {services.map((service) => {
                        const isEditing = editingServiceId === service._id;
                        return (
                          <tr key={service._id} className="hover:bg-gray-50 transition-colors align-top">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {isEditing ? (
                                <input
                                  value={editService?.name ?? ''}
                                  onChange={(e) => setEditService((p) => p ? ({ ...p, name: e.target.value }) : p)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{service.name}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-blue-600">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editService?.price ?? ''}
                                  onChange={(e) => setEditService((p) => p ? ({ ...p, price: e.target.value }) : p)}
                                  className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                              ) : (
                                <>{formatServicePrice(service)}</>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editService?.duration ?? ''}
                                  onChange={(e) => setEditService((p) => p ? ({ ...p, duration: e.target.value }) : p)}
                                  className="w-40 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                  {formatDuration(service.duration)}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {isEditing ? (
                                <label className="inline-flex items-center gap-2 select-none">
                                  <input
                                    type="checkbox"
                                    checked={!!editService?.isActive}
                                    onChange={(e) => setEditService((p) => p ? ({ ...p, isActive: e.target.checked }) : p)}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-sm">Active</span>
                                </label>
                              ) : (
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${service.isActive === false ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'}`}>
                                  {service.isActive === false ? 'Inactive' : 'Active'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={saveEditService}
                                    disabled={loading}
                                    className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditService}
                                    className="text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEditService(service)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteService(service._id)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Services List - Mobile Cards */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : services.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-2xl">No services yet</div>
              ) : (
                services.map((service) => (
                  <div key={service._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    {editingServiceId === service._id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                          <input
                            value={editService?.name ?? ''}
                            onChange={(e) => setEditService((p) => p ? ({ ...p, name: e.target.value }) : p)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Price</label>
                            <input
                              type="text"
                              value={editService?.price ?? ''}
                              onChange={(e) => setEditService((p) => p ? ({ ...p, price: e.target.value }) : p)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Duration</label>
                            <input
                              type="number"
                              value={editService?.duration ?? ''}
                              onChange={(e) => setEditService((p) => p ? ({ ...p, duration: e.target.value }) : p)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={!!editService?.isActive}
                            onChange={(e) => setEditService((p) => p ? ({ ...p, isActive: e.target.checked }) : p)}
                            className="h-4 w-4"
                          />
                          Active
                        </label>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            type="button"
                            onClick={saveEditService}
                            disabled={loading}
                            className="py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditService}
                            className="py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{service.name}</h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                            <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{formatServicePrice(service)}</span>
                            <span>•</span>
                            <span>{formatDuration(service.duration)}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${service.isActive === false ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'}`}>
                              {service.isActive === false ? 'Inactive' : 'Active'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditService(service)}
                            className="text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 active:scale-95 transition-all text-sm font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteService(service._id)}
                            className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100 active:scale-95 transition-all"
                            aria-label="Delete service"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Appointments */}
        {activeTab === 'appointments' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadBookingsCSV}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  title="Download bookings for the selected date as CSV for Google Sheets/Excel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Export Date
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Appointments List - Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-500">Loading appointments...</div>
              ) : appointments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No appointments for this date</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appointments.map((apt) => (
                      <tr key={apt._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{apt.customername}</div>
                          <div className="text-xs text-gray-500">{apt.phoneNumber}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {(apt.serviceIds?.length
                            ? apt.serviceIds.map((s) => s.name).join(', ')
                            : (apt.serviceId?.name || 'N/A'))}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusColor(
                              apt.status
                            )}`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {apt.status === 'scheduled' && (
                              <>
                                <button
                                  onClick={() => updateAppointmentStatus(apt._id, 'completed')}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Mark Complete"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                </button>
                                <button
                                  onClick={() => updateAppointmentStatus(apt._id, 'canceled')}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Cancel"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteAppointment(apt._id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Appointment"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Appointments List - Mobile Cards */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : appointments.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-2xl">No appointments</div>
              ) : (
                appointments.map((apt) => (
                  <div key={apt._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-lg font-bold text-gray-900">{formatTime(apt.startTime)}</div>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                          to {formatTime(apt.endTime)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusColor(
                              apt.status
                            )}`}
                          >
                            {apt.status}
                          </span>
                          <button
                            onClick={() => deleteAppointment(apt._id)}
                            className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete Appointment"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{apt.customername}</div>
                          <div className="text-xs text-gray-500">{apt.phoneNumber}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          {(apt.serviceIds?.length
                            ? apt.serviceIds.map((s) => s.name).join(', ')
                            : (apt.serviceId?.name || 'N/A'))}
                        </div>
                      </div>
                    </div>

                    {apt.status === 'scheduled' && (
                      <div className="grid grid-cols-2 gap-3 mt-5">
                        <button
                          onClick={() => updateAppointmentStatus(apt._id, 'completed')}
                          className="flex items-center justify-center gap-2 py-2 text-green-700 bg-green-50 hover:bg-green-100 rounded-xl text-sm font-semibold transition-colors"
                        >
                          Mark Done
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(apt._id, 'canceled')}
                          className="flex items-center justify-center gap-2 py-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Salon Settings</h2>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 max-w-3xl">
              <form onSubmit={saveConfig} className="space-y-8">
                {/* Morning Slot */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400"></span> Morning Shift
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Opens At</label>
                      <TimeSelect
                        value={config.morningSlot.openingTime}
                        onChange={(val) =>
                          setConfig({
                            ...config,
                            morningSlot: { ...config.morningSlot, openingTime: val },
                          })
                        }
                        options={TIME_OPTIONS_5MIN}
                        placeholder="Select time"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Closes At</label>
                      <TimeSelect
                        value={config.morningSlot.closingTime}
                        onChange={(val) =>
                          setConfig({
                            ...config,
                            morningSlot: { ...config.morningSlot, closingTime: val },
                          })
                        }
                        options={TIME_OPTIONS_5MIN}
                        placeholder="Select time"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Evening Slot */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Evening Shift
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Opens At</label>
                      <TimeSelect
                        value={config.eveningSlot.openingTime}
                        onChange={(val) =>
                          setConfig({
                            ...config,
                            eveningSlot: { ...config.eveningSlot, openingTime: val },
                          })
                        }
                        options={TIME_OPTIONS_5MIN}
                        placeholder="Select time"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Closes At</label>
                      <TimeSelect
                        value={config.eveningSlot.closingTime}
                        onChange={(val) =>
                          setConfig({
                            ...config,
                            eveningSlot: { ...config.eveningSlot, closingTime: val },
                          })
                        }
                        options={TIME_OPTIONS_5MIN}
                        placeholder="Select time"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days Off
                  </label>
                  <input
                    type="text"
                    value={daysOffInput}
                    onChange={(e) => setDaysOffInput(e.target.value)}
                    placeholder="e.g., Sunday, Monday"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-400">Comma-separated list of days when the salon is closed.</p>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 transition-colors font-bold text-lg shadow-lg hover:shadow-xl transform active:scale-[0.98] duration-200"
                  >
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Blocked Slots / Closures */}
        {activeTab === 'blocked' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop Closure Rules</h2>

            {/* Quick: Block a time slot (instant – disappears on booking page) */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl shadow-sm p-6 mb-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
                Block time slot
              </h3>
              <p className="text-sm text-amber-800/80 mb-4">Block a specific time range on one day. Those slots disappear for customers immediately (e.g. lunch, meeting).</p>
              <form onSubmit={blockTimeSlotQuick} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Date</label>
                    <input
                      type="date"
                      value={quickBlockSlot.date}
                      onChange={(e) => setQuickBlockSlot({ ...quickBlockSlot, date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">From (5 min)</label>
                    <TimeSelect
                      value={quickBlockSlot.startTime}
                      onChange={(start) => {
                        const end = quickBlockSlot.endTime && start && quickBlockSlot.endTime <= start ? '' : quickBlockSlot.endTime;
                        setQuickBlockSlot({ ...quickBlockSlot, startTime: start, endTime: end });
                      }}
                      options={activeShiftTimeOptions}
                      placeholder="Select"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">To (5 min)</label>
                    <TimeSelect
                      value={quickBlockSlot.endTime}
                      onChange={(endTime) => setQuickBlockSlot({ ...quickBlockSlot, endTime })}
                      options={activeShiftTimeOptions.filter((t) => !quickBlockSlot.startTime || t > quickBlockSlot.startTime)}
                      placeholder="Select"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Reason (optional)</label>
                  <input
                    type="text"
                    value={quickBlockSlot.reason}
                    onChange={(e) => setQuickBlockSlot({ ...quickBlockSlot, reason: e.target.value })}
                    placeholder="e.g. Lunch break, Meeting"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={blockingSlot || !quickBlockSlot.startTime || !quickBlockSlot.endTime}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {blockingSlot ? 'Blocking…' : 'Block this time slot'}
                </button>
              </form>
            </div>

            {/* Add Closure Form (full day or custom range) */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Closure</h3>
              <form onSubmit={createBlockedSlot} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
                    <input
                      type="date"
                      value={newBlockedSlot.startDate}
                      onChange={(e) =>
                        setNewBlockedSlot({ ...newBlockedSlot, startDate: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
                    <input
                      type="date"
                      value={newBlockedSlot.endDate}
                      min={newBlockedSlot.startDate}
                      onChange={(e) =>
                        setNewBlockedSlot({ ...newBlockedSlot, endDate: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="fullDay"
                    checked={newBlockedSlot.isFullDay}
                    onChange={(e) => setNewBlockedSlot({ ...newBlockedSlot, isFullDay: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="fullDay" className="text-sm font-medium text-gray-700 select-none">
                    Close for the whole day
                  </label>
                </div>

                {!newBlockedSlot.isFullDay && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Start Time (5-min steps)
                      </label>
                      <TimeSelect
                        value={newBlockedSlot.startTime}
                        onChange={(start) => {
                          const end = newBlockedSlot.endTime && start && newBlockedSlot.endTime <= start ? '' : newBlockedSlot.endTime;
                          setNewBlockedSlot({ ...newBlockedSlot, startTime: start, endTime: end });
                        }}
                        options={activeShiftTimeOptions}
                        placeholder="Select start"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        End Time (5-min steps)
                      </label>
                      <TimeSelect
                        value={newBlockedSlot.endTime}
                        onChange={(endTime) => setNewBlockedSlot({ ...newBlockedSlot, endTime })}
                        options={activeShiftTimeOptions.filter((t) => !newBlockedSlot.startTime || t > newBlockedSlot.startTime)}
                        placeholder="Select end"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={newBlockedSlot.reason}
                    onChange={(e) =>
                      setNewBlockedSlot({ ...newBlockedSlot, reason: e.target.value })
                    }
                    placeholder="e.g., Public Holiday, Renovation"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black transition-colors font-bold shadow-lg"
                >
                  Set Closure
                </button>
              </form>
            </div>

            {/* Lists */}
            <div className="mt-8 space-y-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading closures...</div>
              ) : blockedSlots.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">No active closure rules</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {blockedSlots.map((slot) => (
                    <div key={slot._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                            {new Date(slot.startDate).toLocaleDateString()}
                            {slot.startDate !== slot.endDate && ` - ${new Date(slot.endDate).toLocaleDateString()}`}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {slot.isFullDay ? (
                            <span className="text-red-600">Full Day Closed</span>
                          ) : (
                            <span>{new Date(`2000-01-01T${slot.startTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - {new Date(`2000-01-01T${slot.endTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          )}
                        </div>
                        {slot.reason && (
                          <div className="text-sm text-gray-500 font-medium mt-1">
                            {slot.reason}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteBlockedSlot(slot._id)}
                        className="p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors active:scale-95"
                        title="Remove Closure"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Management */}
        {activeTab === 'users' && (
          <div className="min-w-0 overflow-x-hidden">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>

            {/* Desktop: table (hidden on mobile to avoid horizontal scroll) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No users found.</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.blocked ? (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Blocked
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => toggleBlockUser(user._id, user.blocked)}
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${user.blocked
                                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                            >
                              {user.blocked ? 'Unblock' : 'Block Access'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list only (no table = no horizontal scroll) */}
            <div className="md:hidden space-y-3 mt-4">
              {users.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">No users found.</div>
              ) : (
                users.map(user => (
                  <div key={user._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 truncate" title={user.email}>{user.email}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {user.role}
                          </span>
                          {user.blocked ? (
                            <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0"></span> Blocked
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-600 flex-shrink-0"></span> Active
                            </span>
                          )}
                        </div>
                      </div>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => toggleBlockUser(user._id, user.blocked)}
                          className={`flex-shrink-0 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors touch-manipulation ${user.blocked
                            ? 'bg-green-50 text-green-600 hover:bg-green-100 active:bg-green-200'
                            : 'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200'
                            }`}
                        >
                          {user.blocked ? 'Unblock' : 'Block'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
