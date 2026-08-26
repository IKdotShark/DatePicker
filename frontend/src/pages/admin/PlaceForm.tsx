import { useState } from "react";
import { api } from "../../api";

export interface PlaceFormValue {
  id?: string;
  name: string;
  description: string;
  link: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  allowed_restaurant_ids?: string[] | null;
}

interface Props {
  value: PlaceFormValue;
  onChange: (v: PlaceFormValue) => void;
  restaurants?: { id: string; name: string }[];
  enableAllowedRestaurants?: boolean;
}

export default function PlaceForm({ value, onChange, restaurants, enableAllowedRestaurants }: Props) {
  const [busy, setBusy] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);

  async function scrapeImage() {
    if (!value.link) return;
    setBusy(true);
    setScrapeStatus(null);
    try {
      const res = await api.adminScrapeOg(value.link);
      if (res.image_url) {
        onChange({ ...value, image_url: res.image_url });
        setScrapeStatus("✓ OG image pulled");
      } else {
        setScrapeStatus("No image found");
      }
    } catch (e: any) {
      setScrapeStatus("Failed: " + (e.message ?? "error"));
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(f: File) {
    setBusy(true);
    try {
      const res = await api.adminUpload(f);
      onChange({ ...value, image_url: res.url });
    } catch (e: any) {
      alert("Upload failed: " + (e.message ?? "error"));
    } finally {
      setBusy(false);
    }
  }

  const restrictMode: "all" | "filter" | "none" =
    value.allowed_restaurant_ids === null || value.allowed_restaurant_ids === undefined
      ? "all"
      : value.allowed_restaurant_ids.length === 0
      ? "none"
      : "filter";

  return (
    <div className="grid gap-3">
      <label className="block">
        <span className="text-sm opacity-80">Name *</span>
        <input className="input mt-1" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </label>
      <label className="block">
        <span className="text-sm opacity-80">Description</span>
        <textarea
          rows={3}
          className="textarea mt-1"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-sm opacity-80">Link</span>
        <div className="flex gap-2 mt-1">
          <input
            className="input"
            placeholder="https://yandex.ru/maps/…"
            value={value.link}
            onChange={(e) => onChange({ ...value, link: e.target.value })}
          />
          <button className="btn-secondary whitespace-nowrap" type="button" disabled={busy || !value.link} onClick={scrapeImage}>
            Pull image
          </button>
        </div>
        {scrapeStatus && <p className="text-xs opacity-70 mt-1">{scrapeStatus}</p>}
      </label>

      <div className="block">
        <span className="text-sm opacity-80">Image</span>
        <div className="flex gap-2 items-start mt-1">
          {value.image_url ? (
            <img src={value.image_url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
          ) : (
            <div className="h-20 w-20 rounded-lg border bg-gray-100 grid place-items-center text-xs opacity-50">no image</div>
          )}
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="…or paste image URL"
              value={value.image_url}
              onChange={(e) => onChange({ ...value, image_url: e.target.value })}
            />
            {value.image_url && (
              <button className="btn-secondary text-sm self-start" type="button" onClick={() => onChange({ ...value, image_url: "" })}>
                Clear image
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm opacity-80">Sort order</span>
          <input
            type="number"
            className="input mt-1"
            value={value.sort_order}
            onChange={(e) => onChange({ ...value, sort_order: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex items-center gap-2 mt-7">
          <input
            type="checkbox"
            checked={value.is_active}
            onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
          />
          <span>Active</span>
        </label>
      </div>

      {enableAllowedRestaurants && (
        <div className="block">
          <span className="text-sm opacity-80">Allowed restaurants for this activity</span>
          <div className="flex gap-3 mt-1 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={restrictMode === "all"}
                onChange={() => onChange({ ...value, allowed_restaurant_ids: null })}
              />
              All
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={restrictMode === "filter"}
                onChange={() =>
                  onChange({ ...value, allowed_restaurant_ids: value.allowed_restaurant_ids?.length ? value.allowed_restaurant_ids : [] })
                }
              />
              Pick from list
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={restrictMode === "none"}
                onChange={() => onChange({ ...value, allowed_restaurant_ids: [] })}
              />
              Skip restaurant step
            </label>
          </div>
          {restrictMode === "filter" && (restaurants ?? []).length > 0 && (
            <div className="grid grid-cols-2 gap-1 mt-2">
              {(restaurants ?? []).map((r) => {
                const ids = new Set(value.allowed_restaurant_ids ?? []);
                const checked = ids.has(r.id);
                return (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(ids);
                        if (e.target.checked) next.add(r.id);
                        else next.delete(r.id);
                        onChange({ ...value, allowed_restaurant_ids: Array.from(next) });
                      }}
                    />
                    {r.name}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
