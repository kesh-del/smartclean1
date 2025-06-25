import React, { useState } from 'react';
import { apiService } from './services/api';

const Login: React.FC<{ onLogin: (role: 'user' | 'authority') => void }> = ({ onLogin }) => {
    const [role, setRole] = useState<'user' | 'authority'>('user');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Please enter both username and password.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            let response;
            if (role === 'authority') {
                response = await apiService.loginAuthority(username, password);
            } else {
                response = await apiService.login(username, password);
            }
            onLogin(response.user.role);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password || (role === 'user' && (!phone || !email))) {
            setError('Please fill in all fields.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            let response;
            if (role === 'authority') {
                response = await apiService.registerAuthority({ username, password });
            } else {
                response = await apiService.register({ username, password, phone, email, role });
            }
            onLogin(response.user.role);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-center mb-6">{showRegister ? 'Register' : 'Login'}</h2>
                {!showRegister && (
                    <div className="flex justify-center gap-4 mb-6">
                        <button
                            className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors duration-200 ${role === 'user' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                            onClick={() => setRole('user')}
                        >
                            User
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors duration-200 ${role === 'authority' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                            onClick={() => setRole('authority')}
                        >
                            Authority
                        </button>
                    </div>
                )}
                <form onSubmit={showRegister ? handleRegister : handleSubmit} className="space-y-4">
                    {showRegister && (
                        <div className="flex justify-center gap-4">
                            <button
                                type="button"
                                className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors duration-200 ${role === 'user' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                                onClick={() => setRole('user')}
                                disabled={isLoading}
                            >
                                User
                            </button>
                            <button
                                type="button"
                                className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors duration-200 ${role === 'authority' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                                onClick={() => setRole('authority')}
                                disabled={isLoading}
                            >
                                Authority
                            </button>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoComplete="username"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                            disabled={isLoading}
                        />
                    </div>
                    {showRegister && role === 'user' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    autoComplete="tel"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoComplete="email"
                                    disabled={isLoading}
                                />
                            </div>
                        </>
                    )}
                    {error && <div className="text-red-600 text-sm">{error}</div>}
                    <button
                        type="submit"
                        className={`w-full py-3 rounded-lg font-semibold transition-colors duration-200 ${isLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : showRegister
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-green-600 hover:bg-green-700'
                            } text-white`}
                        disabled={isLoading}
                    >
                        {isLoading
                            ? (showRegister ? 'Registering...' : 'Logging in...')
                            : (showRegister ? 'Register' : `Login as ${role === 'user' ? 'User' : 'Authority'}`)}
                    </button>
                </form>
                <div className="mt-4 text-sm text-gray-600 text-center">
                    {showRegister ? (
                        <>
                            <span>Already have an account?{' '}</span>
                            <button
                                className="text-green-600 hover:underline"
                                onClick={() => { setShowRegister(false); setError(''); }}
                                disabled={isLoading}
                            >
                                Login
                            </button>
                        </>
                    ) : (
                        <>
                            <span>Don't have an account?{' '}</span>
                            <button
                                className="text-blue-600 hover:underline"
                                onClick={() => { setShowRegister(true); setError(''); }}
                                disabled={isLoading}
                            >
                                Register
                            </button>
                        </>
                    )}
                </div>
                {!showRegister && (
                    <div className="mt-4 text-sm text-gray-600 text-center">
                        <p>Demo credentials:</p>
                        <p>User: username: "user", password: "user123"</p>
                        <p>Authority: username: "authority", password: "auth123"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login; 