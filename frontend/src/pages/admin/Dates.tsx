import { useEffect, useState } from "react";
import { api, DateOptionOut } from "../../api";

const isoLocal = (d: Date) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
};

interface Editing {
  id?: string;
  starts_at: string;
  duration_minutes: number;
  note: string;
  is_active: boolean;
}
const empty: Editing = { starts_at: "", duration_minutes: 120, note: "", is_active: true };

export default function AdminDates() {
  const [items, setItems] = useState<DateOptionOut[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);

  async function load() {
    setItems(await api.adminDates.list());
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    const body = {
      starts_at: new Date(editing.starts_at).toISOString(),
      duration_minutes: editing.duration_minutes,
      note: editing.note,
      is_active: editing.is_active,
    };
    if (editing.id) await api.adminDates.update(editing.id, body as any);
    else await api.adminDates.create(body as any);
    setEditing(null);
    await load();
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <h1 className="text-xl font-bold">Date options</h1>
        <button className="btn-primary ml-auto" onClick={() => setEditing({ ...empty, starts_at: isoLocal(new Date()) })}>
          + Add
        </button>
      </div>

      {editing && (
        <div className="card mb-4">
          <div className="grid gap-3">
            <label className="block">
              <span className="text-sm opacity-80">Starts at</span>
              <input
                type="datetime-local"
                className="input mt-1"
                value={editing.starts_at}
                onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm opacity-80">Duration (min)</span>
              <input
                type="number"
                min={15}
                step={15}
                className="input mt-1"
                value={editing.duration_minutes}
                onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) || 120 })}
              />
            </label>
            <label className="block">
              <span className="text-sm opacity-80">Note</span>
              <input
                className="input mt-1"
                value={editing.note}
                onChange={(e) => setEditing({ ...editing, note: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              <span>Active</span>
            </label>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={!editing.starts_at}>Save</button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {items.length === 0 && <div className="opacity-60">No date options yet</div>}
        {items.map((d) => (
          <div key={d.id} className="card flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold">{new Date(d.starts_at).toLocaleString()}</div>
              <div className="text-sm opacity-70">
                {d.duration_minutes} min{d.note ? ` · ${d.note}` : ""}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${d.is_active ? "bg-green-100 text-green-800" : "bg-gray-200"}`}>
              {d.is_active ? "active" : "off"}
            </span>
            <button
              className="text-sm underline"
              onClick={() =>
                setEditing({
                  id: d.id,
                  starts_at: isoLocal(new Date(d.starts_at)),
                  duration_minutes: d.duration_minutes,
                  note: d.note,
                  is_active: d.is_active,
                })
              }
            >
              Edit
            </button>
            <button
              className="text-sm underline text-red-600"
              onClick={async () => {
                if (confirm("Delete this option?")) {
                  await api.adminDates.remove(d.id);
                  await load();
                }
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
