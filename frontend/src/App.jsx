import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './components/participant/Profile';
import OrganizerProfile from './components/organizer/OrganizerProfile';
import FollowClubs from './components/participant/Follow_Clubs';
import Interests from './components/participant/Interests';
import Clubs from './components/participant/Clubs';
import BrowseEvents from './components/participant/BrowseEvents';
import EventDetails from './components/participant/EventDetails';
import TicketPage from './components/participant/TicketPage';
import OrganizerDetailParticipant from './components/participant/OrganizerDetailParticipant';

// Dashboards
import ParticipantDashboard from './components/participant/Dashboard';
import OrganizerDashboard from './components/organizer/OrganizerDashboard';
import OrganizerOngoing from './components/organizer/OrganizerOngoing';
import AdminDashboard from './components/admin/AdminDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/participant/interests"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <Interests />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/participant/follow-clubs"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <FollowClubs />
              </ProtectedRoute>
            }
          />
          
          {/* Protected Routes - Participant */}
          <Route
            path="/participant/dashboard"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/participant/clubs"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <Clubs />
              </ProtectedRoute>
            }
          />

          <Route path="/participant/clubs/:id" element={<OrganizerDetailParticipant />} />
          
          <Route
            path="/participant/profile"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* NEW ROUTES - Browse Events and Event Details */}
          <Route
            path="/participant/browse-events"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <BrowseEvents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/participant/event/:eventId"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <EventDetails />
              </ProtectedRoute>
            }
          />

          <Route path="/participant/ticket/:ticketId" element={
            <ProtectedRoute allowedRoles={['participant']}>
              <TicketPage />
            </ProtectedRoute>
          } />
          
          {/* Protected Routes - Organizer */}
          <Route
            path="/organizer/organizerdashboard"
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/ongoing"
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <OrganizerOngoing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/organizer/profile"
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <OrganizerProfile />
              </ProtectedRoute>
            }
          />
          
          {/* Protected Routes - Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
