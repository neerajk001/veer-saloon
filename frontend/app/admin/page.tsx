'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Types
interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number;
  isAcitve?: boolean;
}

interface Appointment {
  _id: string;
  customername: string;
  phoneNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceId: {
    _id: string;
    name: string;
    duration: number;
  };
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
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'services' | 'appointments' | 'settings' | 'blocked'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Services State
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });

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
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    reason: '',
  });

  // Show message helper
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === 'services') fetchServices();
    if (activeTab === 'appointments') fetchAppointments();
    if (activeTab === 'settings') fetchConfig();
    if (activeTab === 'blocked') fetchBlockedSlots();
  }, [activeTab, selectedDate]);

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
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration),
        isAcitve: true,
      });
      showMessage('success', 'Service created successfully');
      setNewService({ name: '', price: '', duration: '' });
      fetchServices();
    } catch (error) {
      console.error('Error creating service:', error);
      showMessage('error', 'Failed to create service');
    }
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

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      // Try to update - if endpoint doesn't exist, we'll handle it
      await axios.put(`${API_URL}/appointments/${id}`, { status });
      showMessage('success', `Appointment marked as ${status}`);
      fetchAppointments();
    } catch (error: any) {
      // If endpoint doesn't exist (404), create it as a workaround using direct DB update
      if (error.response?.status === 404) {
        showMessage('error', 'Update endpoint not implemented. Please add PUT /appointments/:id to backend');
      } else {
        console.error('Error updating appointment:', error);
        showMessage('error', 'Failed to update appointment');
      }
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

  // ===== BLOCKED SLOTS =====
  const fetchBlockedSlots = async () => {
    try {
      setLoading(true);
      // Fetch all appointments for today and filter blocked ones
      // In a real app, you might want a date range picker here
      const today = new Date().toISOString().split('T')[0];
      const res = await axios.get(`${API_URL}/appointments`, {
        params: { date: today },
      });

      // Filter for blocked status
      const blocked = (res.data || []).filter((apt: any) => apt.status === 'blocked');
      setBlockedSlots(blocked);
    } catch (error: any) {
      console.error('Error fetching blocked slots:', error);
      setBlockedSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const createBlockedSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedSlot.date || !newBlockedSlot.startTime || !newBlockedSlot.endTime) {
      showMessage('error', 'Please fill all required fields');
      return;
    }

    // Check if services exist
    if (!services || services.length === 0) {
      showMessage('error', 'Please create at least one service first');
      return;
    }

    try {
      // Create as a special "blocked" appointment
      const startTimeISO = new Date(`${newBlockedSlot.date}T${newBlockedSlot.startTime}:00`).toISOString();

      await axios.post(`${API_URL}/appointments`, {
        customername: 'BLOCKED',
        phoneNumber: 'ADMIN',
        date: newBlockedSlot.date,
        serviceId: services[0]._id, // Use first service
        startTime: startTimeISO,
        status: 'blocked', // Mark as blocked
      });

      showMessage('success', 'Slot blocked successfully');
      setNewBlockedSlot({ date: '', startTime: '', endTime: '', reason: '' });
      fetchBlockedSlots();
    } catch (error) {
      console.error('Error blocking slot:', error);
      showMessage('error', 'Failed to block slot');
    }
  };

  const deleteBlockedSlot = async (id: string) => {
    if (!window.confirm('Are you sure you want to unblock this slot?')) return;

    try {
      await axios.delete(`${API_URL}/appointments/${id}`);
      showMessage('success', 'Slot unblocked');
      fetchBlockedSlots();
    } catch (error) {
      console.error('Error deleting blocked slot:', error);
      showMessage('error', 'Failed to unblock slot');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
    todayAppointments: appointments.filter(a => a.status === 'scheduled').length,
    completedToday: appointments.filter(a => a.status === 'completed').length,
    blockedSlots: blockedSlots.length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
            {['dashboard', 'services', 'appointments', 'settings', 'blocked'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium capitalize transition-all duration-200 ${activeTab === tab
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200 transform scale-105'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                  }`}
              >
                {tab === 'blocked' ? 'Blocked Slots' : tab}
              </button>
            ))}
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
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Total Services</div>
                <div className="text-4xl font-extrabold text-gray-900">{stats.totalServices}</div>
                <div className="mt-2 text-xs text-gray-400">Active services offered</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Today's Appointments</div>
                <div className="text-4xl font-extrabold text-blue-600">{stats.todayAppointments}</div>
                <div className="mt-2 text-xs text-blue-400">Scheduled for today</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Completed</div>
                <div className="text-4xl font-extrabold text-green-600">{stats.completedToday}</div>
                <div className="mt-2 text-xs text-green-400">Successfully done</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Blocked Slots</div>
                <div className="text-4xl font-extrabold text-gray-600">{stats.blockedSlots}</div>
                <div className="mt-2 text-xs text-gray-400">Unavailable times</div>
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
                  type="number"
                  placeholder="Price ($)"
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
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {services.map((service) => (
                      <tr key={service._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{service.name}</td>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">${service.price}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          {service.duration} mins
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => deleteService(service._id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  <div key={service._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-900">{service.name}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">${service.price}</span>
                        <span>•</span>
                        <span>{service.duration} mins</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteService(service._id)}
                      className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100 active:scale-95 transition-all"
                      aria-label="Delete service"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Appointments */}
        {activeTab === 'appointments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                        <td className="px-6 py-4 text-sm text-gray-600">{apt.serviceId?.name || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusColor(
                              apt.status
                            )}`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {apt.status === 'scheduled' && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => updateAppointmentStatus(apt._id, 'completed')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Mark Complete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                              </button>
                              <button
                                onClick={() => updateAppointmentStatus(apt._id, 'canceled')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                              </button>
                            </div>
                          )}
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
                      <span
                        className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusColor(
                          apt.status
                        )}`}
                      >
                        {apt.status}
                      </span>
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          {apt.serviceId?.name || 'N/A'}
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
                      <input
                        type="time"
                        value={config.morningSlot.openingTime}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            morningSlot: { ...config.morningSlot, openingTime: e.target.value },
                          })
                        }
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Closes At</label>
                      <input
                        type="time"
                        value={config.morningSlot.closingTime}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            morningSlot: { ...config.morningSlot, closingTime: e.target.value },
                          })
                        }
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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
                      <input
                        type="time"
                        value={config.eveningSlot.openingTime}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            eveningSlot: { ...config.eveningSlot, openingTime: e.target.value },
                          })
                        }
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Closes At</label>
                      <input
                        type="time"
                        value={config.eveningSlot.closingTime}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            eveningSlot: { ...config.eveningSlot, closingTime: e.target.value },
                          })
                        }
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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

        {/* Blocked Slots */}
        {activeTab === 'blocked' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Blocked Slots</h2>

            {/* Add Blocked Slot Form */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Block a Time Slot</h3>
              <form onSubmit={createBlockedSlot} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                    <input
                      type="date"
                      value={newBlockedSlot.date}
                      onChange={(e) =>
                        setNewBlockedSlot({ ...newBlockedSlot, date: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={newBlockedSlot.startTime}
                      onChange={(e) =>
                        setNewBlockedSlot({ ...newBlockedSlot, startTime: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={newBlockedSlot.endTime}
                      onChange={(e) =>
                        setNewBlockedSlot({ ...newBlockedSlot, endTime: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
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
                    placeholder="e.g., Lunch break, Maintenance"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black transition-colors font-bold shadow-lg"
                >
                  Block Slot
                </button>
              </form>
            </div>

            {/* Blocked Slots List */}
            {/* Blocked Slots List - Desktop & Mobile Hybrid */}
            <div className="mt-8 space-y-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading blocked slots...</div>
              ) : blockedSlots.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">No blocked slots found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {blockedSlots.map((slot) => (
                    <div key={slot._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                            {new Date(slot.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                        <div className="text-sm text-red-500 font-medium flex items-center gap-1 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          Blocked by Admin
                        </div>
                      </div>
                      <button
                        onClick={() => deleteBlockedSlot(slot._id)}
                        className="p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors active:scale-95"
                        title="Unblock Slot"
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
      </main>
    </div>
  );
}
