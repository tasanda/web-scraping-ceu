import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, useAuth } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { setAuthToken } from './services/api';
import CourseDiscovery from './pages/CourseDiscovery';
import CourseDetail from './pages/CourseDetail';
import Dashboard from './pages/Dashboard';
import MyCourses from './pages/MyCourses';
import Profile from './pages/Profile';
import Layout from './components/Layout';

function AppContent() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      const updateToken = async () => {
        const token = await getToken();
        setAuthToken(token);
      };
      updateToken();
      // Set up periodic token refresh
      const interval = setInterval(updateToken, 5 * 60 * 1000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    } else {
      setAuthToken(null);
    }
  }, [getToken, isSignedIn]);

  return (
    <Routes>
      <Route
        path="/sign-in/*"
        element={
          <SignedOut>
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <SignIn routing="path" path="/sign-in" />
            </div>
          </SignedOut>
        }
      />
      <Route
        path="/*"
        element={
          <>
            <SignedIn>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/discover" replace />} />
                  <Route path="/discover" element={<CourseDiscovery />} />
                  <Route path="/courses/:id" element={<CourseDetail />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/my-courses" element={<MyCourses />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </Layout>
              <Toaster position="top-right" />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
