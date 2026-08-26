import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../../api";

const nav = [
  { to: "invitations", label: "Invitations" },
  { to: "activities", label: "Activities" },
  { to: "restaurants", label: "Restaurants" },
  { to: "dates", label: "Date options" },
  { to: "settings", label: "Settings" },
  { to: "audit", label: "Audit log" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<{ username: string } | null>(null);

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => navigate("/admin/login", { replace: true }))
      .finally(() => setReady(true));
  }, [navigate]);

  if (!ready) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-pink-200/40 bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-3">
          <div className="font-bold">💖 DatePicker Admin</div>
          <nav className="flex flex-wrap gap-1 ml-4">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-1 rounded-lg text-sm ${isActive ? "bg-pink-500 text-white" : "hover:bg-pink-100"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="opacity-70">{me?.username}</span>
            <button
              className="underline"
              onClick={async () => {
                await api.logout();
                navigate("/admin/login", { replace: true });
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
