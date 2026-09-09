import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

const icon = (path) => (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {path}
  </svg>
);

const Icons = {
  dashboard: icon(<><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>),
  journal: icon(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>),
  calendar: icon(<><rect x="3" y="4" width="18" height="18" rx="1" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  projects: icon(<><path d="M3 7l3-4h12l3 4" /><path d="M3 7h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" /><path d="M9 12h6" /></>),
  tasks: icon(<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
  vacation: icon(<><path d="M17.5 12a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" /><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></>),
  team: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16.5 5.5a3.5 3.5 0 0 1 0 7" /><path d="M21.5 20a6.5 6.5 0 0 0-5-6.3" /></>),
  reports: icon(<><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M2 20h20" /></>),
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { to: "/", label: "Dashboard", icon: Icons.dashboard },
    { to: "/journal", label: "Journal", icon: Icons.journal },
    { to: "/calendar", label: "Calendar", icon: Icons.calendar },
    { to: "/projects", label: "Projects", icon: Icons.projects },
    { to: "/tasks", label: "Tasks", icon: Icons.tasks },
    { to: "/vacation", label: "Vacation", icon: Icons.vacation },
    ...(user?.role === "manager"
      ? [{ to: "/team", label: "Team", icon: Icons.team }, { to: "/reports", label: "Reports", icon: Icons.reports }]
      : []),
  ];

  const currentLabel = links.find((l) => l.to === location.pathname)?.label
    || (location.pathname === "/account" ? "Account" : "");

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-navy-600/20 bg-navy-900 flex flex-col">
        <div className="px-4 py-4 border-b border-navy-600/20">
          <div className="text-cyan-400 font-semibold text-base">ArchiOffice</div>
        </div>
        <nav className="flex-1 py-2 px-2">
          {links.map((l) => {
            const active = location.pathname === l.to;
            const ItemIcon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-cyan-400/10 text-cyan-400 font-medium"
                    : "text-cyan-300/60 hover:text-cyan-300 hover:bg-navy-800"
                }`}
              >
                <ItemIcon className={active ? "text-cyan-400" : "text-cyan-300/50"} />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-navy-600/20 space-y-3">
          <Link to="/account" className="flex items-center justify-between text-sm text-cyan-300/80 hover:text-cyan-300 transition-colors group">
            <span className="truncate">{user?.full_name}</span>
            <span className="text-xs text-cyan-300/40 group-hover:text-cyan-300/70 shrink-0 ml-2">Account</span>
          </Link>
          <button onClick={logout} className="btn-danger w-full text-xs">
            Log out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-navy-600/20 flex items-center justify-between px-6">
          <div className="text-sm text-cyan-300/50">{currentLabel}</div>
          <NotificationBell />
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
