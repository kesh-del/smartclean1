const API_BASE_URL = 'http://localhost:3001/api';

export interface User {
    id: number;
    username: string;
    role: 'user' | 'authority';
}

export interface Report {
    id: number;
    type: 'garbage' | 'drainage' | 'stagnant_water' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location: string;
    image_path?: string;
    status: 'submitted' | 'in_progress' | 'resolved';
    timestamp: string;
    reporter_id: number;
    reporter_name: string;
    lat?: number | null;
    lng?: number | null;
}

export interface Stats {
    totalReports: number;
    resolvedReports: number;
    inProgress: number;
    uniqueCitizens: number;
    responseTime: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

class ApiService {
    private token: string | null = localStorage.getItem('token');

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;
        const config: RequestInit = {
            ...options,
            headers: this.getHeaders(),
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication
    async login(username: string, password: string): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });

        this.token = response.token;
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        return response;
    }

    async register(data: { username: string; password: string; phone: string; email: string; role: 'user' | 'authority' }): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.token = response.token;
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        return response;
    }

    logout(): void {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    getCurrentUser(): User | null {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    isAuthenticated(): boolean {
        return !!this.token;
    }

    // Reports
    async getReports(): Promise<Report[]> {
        return this.request<Report[]>('/reports');
    }

    async createReport(data: {
        type: 'garbage' | 'drainage' | 'stagnant_water' | 'other';
        description: string;
        location: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        image?: File;
        lat?: number | null;
        lng?: number | null;
    }): Promise<Report> {
        const formData = new FormData();
        formData.append('type', data.type);
        formData.append('description', data.description);
        formData.append('location', data.location);
        if (data.severity) {
            formData.append('severity', data.severity);
        }
        if (data.image) {
            formData.append('image', data.image);
        }
        if (data.lat !== undefined && data.lat !== null) {
            formData.append('lat', String(data.lat));
        }
        if (data.lng !== undefined && data.lng !== null) {
            formData.append('lng', String(data.lng));
        }

        const url = `${API_BASE_URL}/reports`;
        const config: RequestInit = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
            },
            body: formData,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async updateReportStatus(reportId: number, status: 'submitted' | 'in_progress' | 'resolved'): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/reports/${reportId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    async getUserReports(): Promise<Report[]> {
        return this.request<Report[]>('/user/reports');
    }

    // Statistics
    async getStats(): Promise<Stats> {
        return this.request<Stats>('/stats');
    }

    // Upload solved image for a report (authority only)
    async uploadSolvedImage(reportId: number, image: File): Promise<{ message: string; image_path: string }> {
        const formData = new FormData();
        formData.append('image', image);
        const url = `${API_BASE_URL}/reports/${reportId}/image`;
        const config: RequestInit = {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.token}`,
            },
            body: formData,
        };
        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authority registration
    async registerAuthority(data: { username: string; password: string }): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/register-authority', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.token = response.token;
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        return response;
    }

    // Authority login
    async loginAuthority(username: string, password: string): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/login-authority', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        this.token = response.token;
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        return response;
    }
}

export const apiService = new ApiService(); 