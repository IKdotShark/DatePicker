import { useEffect, useState } from "react";
import { api, AppSettings } from "../../api";

export default function AdminSettings() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    api.adminSettings.get().then(setS);
  }, []);

  if (!s) return <div>Loading…</div>;

  async function save() {
    setBusy(true);
    try {
      const updated = await api.adminSettings.update(s!);
      setS(updated);
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold mb-4">Settings</h1>
      <div className="card grid gap-3">
        <label className="block">
          <span className="text-sm opacity-80">Title</span>
          <input className="input mt-1" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm opacity-80">Default theme</span>
            <select className="input mt-1" value={s.default_theme} onChange={(e) => setS({ ...s, default_theme: e.target.value as any })}>
              <option value="romantic">Romantic</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm opacity-80">Default language</span>
            <select className="input mt-1" value={s.default_language} onChange={(e) => setS({ ...s, default_language: e.target.value as any })}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        {[
          ["allow_theme_switch", "Allow user to switch theme"],
          ["allow_language_switch", "Allow user to switch language"],
          ["enable_restaurant_step", "Enable restaurant step (global)"],
          ["allow_custom_datetime", "Allow custom date/time"],
          ["enforce_future_dates", "Only accept future dates"],
          ["allow_resubmit", "Allow re-submission of a new date"],
          ["confetti_enabled", "Confetti animation"],
        ].map(([k, label]) => (
          <label key={k} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(s as any)[k]}
              onChange={(e) => setS({ ...s, [k as keyof AppSettings]: e.target.checked } as AppSettings)}
            />
            <span>{label}</span>
          </label>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <button className="btn-primary" disabled={busy} onClick={save}>
            Save
          </button>
          {savedAt && <span className="text-sm opacity-70">Saved at {savedAt}</span>}
        </div>
      </div>
    </div>
  );
}
