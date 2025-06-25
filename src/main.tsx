import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Login from './Login';
import { apiService } from './services/api';
import './index.css';

function Root() {
  const [role, setRole] = useState<'user' | 'authority' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const currentUser = apiService.getCurrentUser();
    if (currentUser && apiService.isAuthenticated()) {
      setRole(currentUser.role);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userRole: 'user' | 'authority') => {
    setRole(userRole);
  };

  const handleLogout = () => {
    apiService.logout();
    setRole(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return role ? <App role={role} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
