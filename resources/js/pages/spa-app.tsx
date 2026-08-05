import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import SPARoleManagement from '@/pages/super-admin/role-management';
import { useState } from 'react';

const LoginForm = () => {
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(formData.email, formData.password);
        } catch (error: any) {
            setError(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center font-serif text-2xl">SPA Login</CardTitle>
                    <CardDescription className="text-center font-sans">Login dengan Sanctum Authentication</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="admin@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="password123"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('dashboard');

    const renderPage = () => {
        switch (currentPage) {
            case 'roles':
                return <SPARoleManagement />;
            default:
                return (
                    <div className="flex min-h-screen flex-1 flex-col bg-white">
                        <div className="p-6">
                            <h1 className="font-serif text-2xl font-bold">SPA Dashboard</h1>
                            <p className="text-gray-600">Welcome to the SPA version with Sanctum auth!</p>
                            <p className="mt-2">
                                User: {user?.name} ({user?.email})
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <div className="w-64 bg-gray-900 text-white">
                <div className="p-4">
                    <h2 className="font-serif text-lg font-bold">SPA Navigation</h2>
                </div>
                <nav className="mt-4">
                    <button
                        onClick={() => setCurrentPage('dashboard')}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-800 ${currentPage === 'dashboard' ? 'bg-gray-800' : ''}`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setCurrentPage('roles')}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-800 ${currentPage === 'roles' ? 'bg-gray-800' : ''}`}
                    >
                        Role Management
                    </button>
                </nav>
                <div className="absolute bottom-4 left-4">
                    <Button onClick={logout} variant="outline" size="sm">
                        Logout
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">{renderPage()}</div>
        </div>
    );
};

const SPAApp = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return user ? <Dashboard /> : <LoginForm />;
};

export default function MainSPAApp() {
    return (
        <AuthProvider>
            <SPAApp />
        </AuthProvider>
    );
}
