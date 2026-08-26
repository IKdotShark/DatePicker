import { useEffect, useState } from "react";
import { api, InvitationOut, SubmissionOut } from "../../api";

export default function AdminInvitations() {
  const [items, setItems] = useState<InvitationOut[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [subs, setSubs] = useState<Record<string, SubmissionOut[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setItems(await api.adminInvitations.list());
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.adminInvitations.create(name.trim());
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function openHistory(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    if (!subs[id]) {
      const list = await api.adminSubmissions(id);
      setSubs((s) => ({ ...s, [id]: list }));
    }
    setExpanded(id);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Invitations</h1>
      <div className="card mb-4 flex gap-2 items-center">
        <input
          className="input flex-1"
          placeholder="Имя (например: Лена)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-primary" disabled={busy || !name.trim()} onClick={create}>
          + Add
        </button>
      </div>

      <div className="grid gap-3">
        {items.map((i) => (
          <div key={i.id} className="card">
            <div className="flex flex-wrap items-center gap-3">
              <div className="font-semibold text-lg">{i.name}</div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${i.is_active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}
              >
                {i.is_active ? "active" : "disabled"}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  className="text-sm underline"
                  onClick={() => navigator.clipboard?.writeText(i.url ?? "")}
                >
                  Copy link
                </button>
                <button
                  className="text-sm underline"
                  onClick={async () => {
                    await api.adminInvitations.rotate(i.id);
                    await load();
                  }}
                >
                  Rotate token
                </button>
                <button
                  className="text-sm underline"
                  onClick={async () => {
                    await api.adminInvitations.toggle(i.id, !i.is_active);
                    await load();
                  }}
                >
                  {i.is_active ? "Disable" : "Enable"}
                </button>
                <button
                  className="text-sm underline text-red-600"
                  onClick={async () => {
                    if (confirm(`Delete invitation ${i.name}?`)) {
                      await api.adminInvitations.remove(i.id);
                      await load();
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <a
              href={i.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono opacity-70 break-all underline"
            >
              {i.url}
            </a>
            <div className="mt-2">
              <button className="text-sm underline" onClick={() => openHistory(i.id)}>
                {expanded === i.id ? "Hide history" : "Show history"}
              </button>
              {expanded === i.id && (
                <div className="mt-2 grid gap-2">
                  {(subs[i.id] ?? []).length === 0 && <div className="text-sm opacity-60">No submissions yet</div>}
                  {(subs[i.id] ?? []).map((s) => (
                    <div key={s.id} className="rounded-lg border p-2 text-sm">
                      <div className="font-semibold">{s.activity_name}</div>
                      {s.restaurant_name && <div>🍽 {s.restaurant_name}</div>}
                      <div>🗓 {new Date(s.starts_at).toLocaleString()} · {s.duration_minutes} min</div>
                      {s.note && <div className="opacity-70">📝 {s.note}</div>}
                      <div className="opacity-50 text-xs">submitted {new Date(s.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
