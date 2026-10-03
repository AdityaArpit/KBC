import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './client/context/AuthContext.tsx';
import { Navbar } from './client/components/Navbar.tsx';
import { Footer } from './client/components/Footer.tsx';

// Pages
import { Home } from './client/pages/Home.tsx';
import { EventsList } from './client/pages/EventsList.tsx';
import { EventDetail } from './client/pages/EventDetail.tsx';
import { OngoingEvents } from './client/pages/OngoingEvents.tsx';
import { UpcomingEvents } from './client/pages/UpcomingEvents.tsx';
import { SocietiesList } from './client/pages/SocietiesList.tsx';
import { SocietyDetail } from './client/pages/SocietyDetail.tsx';
import { CalendarPage } from './client/pages/CalendarPage.tsx';
import { ProfilePage } from './client/pages/ProfilePage.tsx';
import { MyRegistrationsPage } from './client/pages/MyRegistrationsPage.tsx';
import { StudentAttendancePage } from './client/pages/StudentAttendancePage.tsx';
import { LeadDashboard } from './client/pages/LeadDashboard.tsx';
import { EventCreationPage } from './client/pages/EventCreationPage.tsx';
import { EventCommandCenter } from './client/pages/EventCommandCenter.tsx';
import { AdminLoginPage } from './client/pages/AdminLoginPage.tsx';
import { AdminDashboard } from './client/pages/AdminDashboard.tsx';
import { AdminReviewPage } from './client/pages/AdminReviewPage.tsx';

import { NotFoundPage } from './components/ui/not-found.tsx';

// Lead Route Guard
const LeadRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, role, loading } = useAuth();
  if (loading) return null;
  if (!profile || (role !== 'LEAD' && role !== 'ADMIN')) {
    return <Navigate to="/profile" replace />;
  }
  return <>{children}</>;
};

// Admin Route Guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col font-sans bg-[#0a0908] text-[#f2f4f3] selection:bg-[#49111c] selection:text-[#f2f4f3]">
          <Navbar />

          <div className="flex-1 flex flex-col">
            <Routes>
              {/* Public Portal Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<EventsList />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/ongoing" element={<OngoingEvents />} />
              <Route path="/upcoming" element={<UpcomingEvents />} />
              <Route path="/societies" element={<SocietiesList />} />
              <Route path="/societies/:id" element={<SocietyDetail />} />
              <Route path="/calendar" element={<CalendarPage />} />

              {/* User Identity & Passes */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-registrations" element={<MyRegistrationsPage />} />
              <Route path="/my-events" element={<MyRegistrationsPage />} />
              <Route path="/my-attendance" element={<MyRegistrationsPage />} />
              <Route path="/attendance/:token" element={<StudentAttendancePage />} />

              {/* Lead Operations Workspace */}
              <Route
                path="/lead"
                element={
                  <LeadRoute>
                    <LeadDashboard />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/societies"
                element={
                  <LeadRoute>
                    <LeadDashboard />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/events"
                element={
                  <LeadRoute>
                    <LeadDashboard />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/events/new"
                element={
                  <LeadRoute>
                    <EventCreationPage />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/events/:id"
                element={
                  <LeadRoute>
                    <EventCommandCenter />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/events/:id/operations"
                element={
                  <LeadRoute>
                    <EventCommandCenter />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/events/:id/registrations"
                element={
                  <LeadRoute>
                    <EventCommandCenter />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/events/:id/attendance"
                element={
                  <LeadRoute>
                    <EventCommandCenter />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/events/:id/dependencies"
                element={
                  <LeadRoute>
                    <EventCommandCenter />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/events/:id/risks"
                element={
                  <LeadRoute>
                    <EventCommandCenter />
                  </LeadRoute>
                }
              />
              <Route
                path="/lead/events/:id/tasks"
                element={
                  <LeadRoute>
                    <EventCommandCenter />
                  </LeadRoute>
                }
              />

              {/* Admin Governance */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/societies"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/leads"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/events"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/events/:id/review"
                element={
                  <AdminRoute>
                    <AdminReviewPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />

              {/* Dedicated 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>

          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
