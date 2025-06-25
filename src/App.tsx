import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Users, BarChart3, AlertCircle, CheckCircle, Clock, Menu, X } from 'lucide-react';
import { apiService } from './services/api';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import AuthorityDashboard from './AuthorityDashboard';

// Types
interface Report {
  id: string;
  type: 'garbage' | 'drainage' | 'stagnant_water' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  image?: string;
  status: 'submitted' | 'in_progress' | 'resolved';
  timestamp: Date;
  reporter: string;
  lat: number | null;
  lng: number | null;
  resolvedImage?: string;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyDWeYaXijoWdc7SrfWuMfQktyw5W7NdB3c';

function UserApp({ onLogout }: { onLogout: () => void }) {
  const [currentView, setCurrentView] = useState<'home' | 'report' | 'community'>('home');
  const [reports, setReports] = useState<Report[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Report form state
  const [reportForm, setReportForm] = useState({
    type: 'garbage' as const,
    description: '',
    location: '',
    image: null as File | null,
    lat: null as number | null,
    lng: null as number | null
  });

  // Google Maps loader
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reportsData] = await Promise.all([
        apiService.getReports()
      ]);

      // Convert API data to local format
      const convertedReports: Report[] = reportsData.map(apiReport => ({
        id: apiReport.id.toString(),
        type: apiReport.type,
        severity: apiReport.severity,
        description: apiReport.description,
        location: apiReport.location,
        image: apiReport.image_path,
        status: apiReport.status,
        timestamp: new Date(apiReport.timestamp),
        reporter: apiReport.reporter_name || 'Anonymous',
        lat: apiReport.lat ?? null,
        lng: apiReport.lng ?? null
      }));

      setReports(convertedReports);

      // Reset form
      setReportForm({
        type: 'garbage',
        description: '',
        location: '',
        image: null,
        lat: null,
        lng: null
      });

      setToast('Report submitted successfully!');
      setTimeout(() => setToast(null), 2000);

      // Show success and redirect
      setTimeout(() => setCurrentView('community'), 1000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setToast('Error submitting report. Please try again.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportForm(prev => ({ ...prev, image: file }));
    }
  };

  // Helper to get current location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setReportForm((prev) => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            location: `Lat: ${position.coords.latitude}, Lng: ${position.coords.longitude}`
          }));
        },
        () => {
          setToast('Unable to get current location.');
        }
      );
    } else {
      setToast('Geolocation is not supported by this browser.');
    }
  };

  const submitReport = async () => {
    if (!reportForm.description || !reportForm.location) return;

    try {
      const newApiReport = await apiService.createReport({
        type: reportForm.type,
        description: reportForm.description,
        location: reportForm.location,
        image: reportForm.image || undefined,
        lat: reportForm.lat,
        lng: reportForm.lng
      });

      // Convert API report to local format
      const newReport: Report = {
        id: newApiReport.id.toString(),
        type: newApiReport.type,
        severity: newApiReport.severity,
        description: newApiReport.description,
        location: newApiReport.location,
        image: newApiReport.image_path,
        status: newApiReport.status,
        timestamp: new Date(newApiReport.timestamp),
        reporter: newApiReport.reporter_name || 'You',
        lat: newApiReport.lat ?? null,
        lng: newApiReport.lng ?? null
      };

      setReports(prev => [newReport, ...prev]);

      // Reset form
      setReportForm({
        type: 'garbage',
        description: '',
        location: '',
        image: null,
        lat: null,
        lng: null
      });

      setToast('Report submitted successfully!');
      setTimeout(() => setToast(null), 2000);

      // Show success and redirect
      setTimeout(() => setCurrentView('community'), 1000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setToast('Error submitting report. Please try again.');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <AlertCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'text-blue-600 bg-blue-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'resolved':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Navigation
  const NavButton = ({ view, icon: Icon, label }: { view: string, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view as any);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${currentView === view
        ? 'bg-green-100 text-green-700 shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
        }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
    </button>
  );

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Loading Spinner Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div>
            <span className="text-white text-lg font-semibold">Loading...</span>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg bg-green-600 text-white shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CW</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">CleanWay</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <NavButton view="home" icon={Users} label="Home" />
              <NavButton view="report" icon={Camera} label="Report Issue" />
              <NavButton view="community" icon={MapPin} label="Community" />
            </nav>

            {/* Theme Switcher */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="ml-4 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.93l-.71-.71M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" /></svg>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="ml-4 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              Logout
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <span className="ml-4 text-sm text-gray-500">Logged in as: user</span>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 dark:border-gray-700">
              <nav className="flex flex-col gap-2">
                <NavButton view="home" icon={Users} label="Home" />
                <NavButton view="report" icon={Camera} label="Report Issue" />
                <NavButton view="community" icon={MapPin} label="Community" />
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Home, Report, Community only for users */}
        {currentView === 'home' && (
          <div className="space-y-12">
            {/* Hero Section */}
            <section className="text-center py-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl text-white">
              <div className="max-w-4xl mx-auto px-6">
                <h2 className="text-4xl md:text-6xl font-bold mb-6">
                  Clean Streets, <br />Better Communities
                </h2>
                <p className="text-xl md:text-2xl mb-8 opacity-90">
                  Report sanitation issues instantly and help create cleaner, healthier neighborhoods
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setCurrentView('report')}
                    className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors duration-200 shadow-lg"
                  >
                    Report an Issue
                  </button>
                  <button
                    onClick={() => setCurrentView('community')}
                    className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-green-600 transition-colors duration-200"
                  >
                    View Community Stats
                  </button>
                </div>
              </div>
            </section>

            {/* Features */}
            <section className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                  <Camera className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Easy Reporting</h3>
                <p className="text-gray-600 leading-relaxed">
                  Snap a photo, add location, and submit. Our AI automatically categorizes issues for faster response.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Analytics</h3>
                <p className="text-gray-600 leading-relaxed">
                  ML-powered insights help authorities prioritize and predict sanitation issues before they escalate.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Community Impact</h3>
                <p className="text-gray-600 leading-relaxed">
                  Track resolution progress and see how your reports contribute to cleaner neighborhoods.
                </p>
              </div>
            </section>
          </div>
        )}
        {currentView === 'report' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Report a Sanitation Issue</h2>

              <div className="space-y-6">
                {/* Issue Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Issue Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'garbage', label: 'Garbage/Waste' },
                      { value: 'drainage', label: 'Drainage' },
                      { value: 'stagnant_water', label: 'Stagnant Water' },
                      { value: 'other', label: 'Other' }
                    ].map(type => (
                      <button
                        key={type.value}
                        onClick={() => setReportForm(prev => ({ ...prev, type: type.value as any }))}
                        className={`p-4 rounded-lg border-2 transition-colors duration-200 ${reportForm.type === type.value
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Upload Photo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors duration-200">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Take a photo or upload from gallery</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 cursor-pointer inline-block"
                    >
                      Choose Photo
                    </label>
                    {reportForm.image && (
                      <p className="mt-2 text-sm text-green-600">✓ Photo selected: {reportForm.image.name}</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Location</label>
                  <div className="relative mb-2">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={reportForm.location}
                      onChange={(e) => setReportForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter location or use map/GPS"
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                    onClick={handleUseCurrentLocation}
                  >
                    <MapPin className="w-4 h-4" />
                    Use Current Location
                  </button>
                  {/* Google Map Picker */}
                  {isMapLoaded && (
                    <div className="mt-4">
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '300px' }}
                        center={{
                          lat: reportForm.lat ?? 17.6868,
                          lng: reportForm.lng ?? 83.2185
                        }}
                        zoom={reportForm.lat && reportForm.lng ? 16 : 12}
                        onClick={(e) => {
                          if (e.latLng) {
                            setReportForm(prev => ({
                              ...prev,
                              lat: Number(e.latLng!.lat()),
                              lng: Number(e.latLng!.lng()),
                              location: `Lat: ${e.latLng!.lat()}, Lng: ${e.latLng!.lng()}`
                            }));
                          }
                        }}
                      >
                        {reportForm.lat && reportForm.lng && (
                          <Marker position={{ lat: Number(reportForm.lat), lng: Number(reportForm.lng) }} />
                        )}
                      </GoogleMap>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Description</label>
                  <textarea
                    value={reportForm.description}
                    onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Describe the issue in detail..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={submitReport}
                  disabled={!reportForm.description || !reportForm.location}
                  className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}
        {currentView === 'community' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Community Reports</h2>
            <div className="grid gap-6">
              {reports.map((report) => (
                <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(report.severity)}`}>{report.severity}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(report.status)}`}>{getStatusIcon(report.status)} {report.status.replace('_', ' ')}</span>
                    </div>
                    <div className="font-semibold text-lg text-gray-900 mb-1">{report.type.replace('_', ' ').toUpperCase()}</div>
                    <div className="text-gray-700 mb-1">{report.description}</div>
                    <div className="text-gray-500 text-sm mb-1">Location: {report.location}</div>
                    <div className="text-gray-400 text-xs">Reported by: {report.reporter} | {report.timestamp.toLocaleString()}</div>
                    {report.lat && report.lng && isMapLoaded && (
                      <div className="mt-2">
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '200px' }}
                          center={{ lat: Number(report.lat), lng: Number(report.lng) }}
                          zoom={16}
                          options={{ disableDefaultUI: true }}
                        >
                          <Marker position={{ lat: Number(report.lat), lng: Number(report.lng) }} />
                        </GoogleMap>
                      </div>
                    )}
                    {/* Show resolved image if present */}
                    {report.status === 'resolved' && report.resolvedImage && (
                      <div className="mt-4">
                        <div className="text-xs text-green-700 mb-1">Resolved Image by Authority:</div>
                        <img src={report.resolvedImage} alt="Resolved Proof" className="w-32 h-32 object-cover rounded-lg border" />
                      </div>
                    )}
                  </div>
                  {report.image && (
                    <img src={report.image} alt="Report" className="w-32 h-32 object-cover rounded-lg border" />
                  )}
                </div>
              ))}
              {reports.length === 0 && (
                <div className="text-gray-500 text-center py-12">No reports found.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function App({ role, onLogout }: { role: 'user' | 'authority'; onLogout: () => void }) {
  if (role === 'authority') {
    return <AuthorityDashboard onLogout={onLogout} />;
  }
  return <UserApp onLogout={onLogout} />;
}

export default App;