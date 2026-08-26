import { useEffect, useState } from "react";
import { api, ActivityOut, RestaurantOut } from "../../api";
import PlaceForm, { PlaceFormValue } from "./PlaceForm";

const empty: PlaceFormValue = {
  name: "",
  description: "",
  link: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
  allowed_restaurant_ids: null,
};

export default function AdminActivities() {
  const [items, setItems] = useState<ActivityOut[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOut[]>([]);
  const [editing, setEditing] = useState<PlaceFormValue | null>(null);

  async function load() {
    const [a, r] = await Promise.all([api.adminActivities.list(), api.adminRestaurants.list()]);
    setItems(a);
    setRestaurants(r);
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
      allowed_restaurant_ids: editing.allowed_restaurant_ids ?? null,
    };
    if (editing.id) {
      await api.adminActivities.update(editing.id, body as any);
    } else {
      await api.adminActivities.create(body as any);
    }
    setEditing(null);
    await load();
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <h1 className="text-xl font-bold">Activities</h1>
        <button className="btn-primary ml-auto" onClick={() => setEditing({ ...empty })}>+ Add</button>
      </div>

      {editing && (
        <div className="card mb-4">
          <h2 className="font-bold mb-3">{editing.id ? "Edit" : "New"} activity</h2>
          <PlaceForm
            value={editing}
            onChange={setEditing}
            restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
            enableAllowedRestaurants
          />
          <div className="flex gap-2 mt-4 justify-end">
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={!editing.name.trim()}>Save</button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {items.length === 0 && <div className="opacity-60">No activities yet</div>}
        {items.map((a) => (
          <div key={a.id} className="card flex items-center gap-3">
            {a.image_url && <img src={a.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{a.name}</div>
              <div className="text-sm opacity-70 line-clamp-2">{a.description}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-green-100 text-green-800" : "bg-gray-200"}`}>
              {a.is_active ? "active" : "off"}
            </span>
            <button
              className="text-sm underline"
              onClick={() =>
                setEditing({
                  id: a.id,
                  name: a.name,
                  description: a.description,
                  link: a.link ?? "",
                  image_url: a.image_url ?? "",
                  is_active: a.is_active,
                  sort_order: a.sort_order,
                  allowed_restaurant_ids: a.allowed_restaurant_ids ?? null,
                })
              }
            >
              Edit
            </button>
            <button
              className="text-sm underline text-red-600"
              onClick={async () => {
                if (confirm(`Delete "${a.name}"?`)) {
                  await api.adminActivities.remove(a.id);
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
