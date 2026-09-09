import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import Login from "./pages/Login.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import DiaryEntryForm from "./pages/DiaryEntryForm.jsx";
import Journal from "./pages/Journal.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ProjectsList from "./pages/ProjectsList.jsx";
import ProjectDetail from "./pages/ProjectDetail.jsx";
import AttendanceScan from "./pages/AttendanceScan.jsx";
import Vacation from "./pages/Vacation.jsx";
import Tasks from "./pages/Tasks.jsx";
import Team from "./pages/Team.jsx";
import Calendar from "./pages/Calendar.jsx";
import Reports from "./pages/Reports.jsx";
import Account from "./pages/Account.jsx";
import Layout from "./components/Layout.jsx";

function Protected({ children, managerOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (managerOnly && user.role !== "manager") return <Navigate to="/" replace />;
  return children;
}

function page(Component, { managerOnly = false } = {}) {
  return (
    <Protected managerOnly={managerOnly}>
      <Layout>
        <Component />
      </Layout>
    </Protected>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/scan" element={<AttendanceScan />} />

      <Route
        path="/"
        element={
          <Protected>
            <Layout>
              {user?.role === "manager" ? <ManagerDashboard /> : <EmployeeDashboard />}
            </Layout>
          </Protected>
        }
      />
      <Route path="/journal" element={page(Journal)} />
      <Route path="/diary/new" element={page(DiaryEntryForm)} />
      <Route path="/calendar" element={page(Calendar)} />
      <Route path="/projects" element={page(ProjectsList)} />
      <Route path="/projects/:id" element={page(ProjectDetail)} />
      <Route path="/tasks" element={page(Tasks)} />
      <Route path="/vacation" element={page(Vacation)} />
      <Route path="/team" element={page(Team, { managerOnly: true })} />
      <Route path="/reports" element={page(Reports, { managerOnly: true })} />
      <Route path="/account" element={page(Account)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
