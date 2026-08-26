import { useEffect, useState } from "react";
import { api, RestaurantOut } from "../../api";
import PlaceForm, { PlaceFormValue } from "./PlaceForm";

const empty: PlaceFormValue = {
  name: "",
  description: "",
  link: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminRestaurants() {
  const [items, setItems] = useState<RestaurantOut[]>([]);
  const [editing, setEditing] = useState<PlaceFormValue | null>(null);

  async function load() {
    setItems(await api.adminRestaurants.list());
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    const body = {
      name: editing.name,
      description: editing.description,
      link: editing.link || null,
      image_url: editing.image_url || null,
      is_active: editing.is_active,
      sort_order: editing.sort_order,
    };
    if (editing.id) await api.adminRestaurants.update(editing.id, body as any);
    else await api.adminRestaurants.create(body as any);
    setEditing(null);
    await load();
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <h1 className="text-xl font-bold">Restaurants</h1>
        <button className="btn-primary ml-auto" onClick={() => setEditing({ ...empty })}>+ Add</button>
      </div>

      {editing && (
        <div className="card mb-4">
          <h2 className="font-bold mb-3">{editing.id ? "Edit" : "New"} restaurant</h2>
          <PlaceForm value={editing} onChange={setEditing} />
          <div className="flex gap-2 mt-4 justify-end">
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={!editing.name.trim()}>Save</button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {items.length === 0 && <div className="opacity-60">No restaurants yet</div>}
        {items.map((r) => (
          <div key={r.id} className="card flex items-center gap-3">
            {r.image_url && <img src={r.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{r.name}</div>
              <div className="text-sm opacity-70 line-clamp-2">{r.description}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? "bg-green-100 text-green-800" : "bg-gray-200"}`}>
              {r.is_active ? "active" : "off"}
            </span>
            <button
              className="text-sm underline"
              onClick={() =>
                setEditing({
                  id: r.id,
                  name: r.name,
                  description: r.description,
                  link: r.link ?? "",
                  image_url: r.image_url ?? "",
                  is_active: r.is_active,
                  sort_order: r.sort_order,
                })
              }
            >
              Edit
            </button>
            <button
              className="text-sm underline text-red-600"
              onClick={async () => {
                if (confirm(`Delete "${r.name}"?`)) {
                  await api.adminRestaurants.remove(r.id);
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
