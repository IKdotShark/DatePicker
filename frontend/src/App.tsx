import { Navigate, Route, Routes } from "react-router-dom";
import InvitationPage from "./pages/Invitation";
import AdminLogin from "./pages/admin/Login";
import AdminLayout from "./pages/admin/Layout";
import AdminActivities from "./pages/admin/Activities";
import AdminRestaurants from "./pages/admin/Restaurants";
import AdminDates from "./pages/admin/Dates";
import AdminInvitations from "./pages/admin/Invitations";
import AdminSettings from "./pages/admin/Settings";
import AdminAudit from "./pages/admin/Audit";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/Landing";

export default function App() {
  return (
    <div className="hearts-bg min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/i/:token" element={<InvitationPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="invitations" replace />} />
          <Route path="activities" element={<AdminActivities />} />
          <Route path="restaurants" element={<AdminRestaurants />} />
          <Route path="dates" element={<AdminDates />} />
          <Route path="invitations" element={<AdminInvitations />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit" element={<AdminAudit />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
