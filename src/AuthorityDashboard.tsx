import React, { useEffect, useState } from 'react';
import { apiService } from './services/api';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDWeYaXijoWdc7SrfWuMfQktyw5W7NdB3c';

const statusOptions = [
    { value: '', label: 'All' },
    { value: 'submitted', label: 'Received' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Solved' },
];

const AuthorityDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [reports, setReports] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [uploading, setUploading] = useState<number | null>(null);
    const [solvedImages, setSolvedImages] = useState<{ [id: number]: File | null }>({});
    const { isLoaded: isMapLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

    useEffect(() => { fetchReports(); }, []);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getReports();
            setReports(data);
        } catch (e) {
            // handle error
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        await apiService.updateReportStatus(id, newStatus as any);
        fetchReports();
    };

    const handleSolvedImageChange = (id: number, file: File | null) => {
        setSolvedImages((prev) => ({ ...prev, [id]: file }));
    };

    const handleSolvedImageUpload = async (id: number) => {
        if (!solvedImages[id]) return;
        setUploading(id);
        try {
            await apiService.uploadSolvedImage(id, solvedImages[id]!);
            await apiService.updateReportStatus(id, 'resolved');
            setSolvedImages((prev) => ({ ...prev, [id]: null }));
            fetchReports();
        } catch (e) {
            // handle error
        } finally {
            setUploading(null);
        }
    };

    // Filtering and searching
    const filteredReports = reports.filter((r) => {
        const isActive = r.status === 'submitted' || r.status === 'in_progress';
        const matchesStatus = statusFilter ? r.status === statusFilter : isActive;
        const matchesSearch =
            r.id.toString().includes(search) ||
            (r.description && r.description.toLowerCase().includes(search.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Authority Dashboard</h1>
                <button
                    onClick={onLogout}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                    Logout
                </button>
            </div>
            <div className="flex flex-wrap gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Search by ID or description..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="px-4 py-2 border rounded-lg w-64"
                />
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                >
                    {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            {isLoading ? (
                <div>Loading...</div>
            ) : filteredReports.length === 0 ? (
                <div className="text-gray-500">No active reports found.</div>
            ) : (
                <div className="grid gap-6">
                    {filteredReports.map(report => (
                        <div key={report.id} className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
                            <div className="flex flex-wrap gap-4 items-center justify-between">
                                <div>
                                    <div className="font-bold text-lg">Report #{report.id}</div>
                                    <div className="text-gray-700">{report.description}</div>
                                    <div className="text-gray-500 text-sm">{report.location}</div>
                                    <div className="text-gray-400 text-xs">Submitted: {new Date(report.timestamp).toLocaleString()}</div>
                                    <div className="text-xs mt-1">Status: <span className="font-semibold">{report.status.replace('_', ' ')}</span></div>
                                </div>
                                {isMapLoaded && report.lat && report.lng && (
                                    <div className="w-64 h-40">
                                        <GoogleMap
                                            mapContainerStyle={{ width: '100%', height: '100%' }}
                                            center={{ lat: Number(report.lat), lng: Number(report.lng) }}
                                            zoom={16}
                                            options={{ disableDefaultUI: true }}
                                        >
                                            <Marker position={{ lat: Number(report.lat), lng: Number(report.lng) }} />
                                        </GoogleMap>
                                    </div>
                                )}
                            </div>
                            {report.status !== 'resolved' && (
                                <div className="flex flex-wrap gap-2 mt-2 items-center">
                                    {report.status === 'submitted' && (
                                        <button
                                            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                            onClick={() => handleStatusChange(report.id, 'in_progress')}
                                        >
                                            Mark In Progress
                                        </button>
                                    )}
                                    {report.status === 'in_progress' && (
                                        <>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => handleSolvedImageChange(report.id, e.target.files?.[0] || null)}
                                                className="border rounded px-2 py-1"
                                            />
                                            <button
                                                className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                                onClick={() => handleSolvedImageUpload(report.id)}
                                                disabled={uploading === report.id || !solvedImages[report.id]}
                                            >
                                                {uploading === report.id ? 'Uploading...' : 'Mark Solved & Upload Image'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            {report.status === 'resolved' && report.image_path && (
                                <div className="mt-4">
                                    <div className="text-xs text-green-700 mb-1">Resolution Image:</div>
                                    <img src={report.image_path} alt="Resolved Proof" className="w-32 h-32 object-cover rounded-lg border" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuthorityDashboard; 