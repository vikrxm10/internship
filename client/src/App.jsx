
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Lazy load page components
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const WasteLog = lazy(() => import('./pages/WasteLog'));
const Donations = lazy(() => import('./pages/Donations'));
const MapPage = lazy(() => import('./pages/MapPage'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Admin = lazy(() => import('./pages/Admin'));

const LoadingSpinner = () => (
  <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RESTAURANT', 'NGO']}>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/inventory" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RESTAURANT']}>
                      <Inventory />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/waste-log" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RESTAURANT']}>
                      <WasteLog />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/donations" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RESTAURANT', 'NGO']}>
                      <Donations />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/map" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RESTAURANT', 'NGO']}>
                      <MapPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/analytics" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RESTAURANT', 'NGO']}>
                      <Analytics />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
