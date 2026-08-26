const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

export interface ActivityOut {
  id: string;
  name: string;
  description: string;
  link?: string | null;
  image_url?: string | null;
  is_active: boolean;
  allowed_restaurant_ids?: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RestaurantOut {
  id: string;
  name: string;
  description: string;
  link?: string | null;
  image_url?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DateOptionOut {
  id: string;
  starts_at: string;
  duration_minutes: number;
  note: string;
  is_active: boolean;
  created_at: string;
}

export interface SubmissionOut {
  id: string;
  invitation_id: string;
  activity_id: string | null;
  activity_name: string;
  restaurant_id: string | null;
  restaurant_name: string;
  starts_at: string;
  duration_minutes: number;
  note: string;
  confirmed: boolean;
  created_at: string;
}

export interface PublicSettings {
  title: string;
  default_theme: "romantic" | "minimal";
  default_language: "ru" | "en";
  allow_theme_switch: boolean;
  allow_language_switch: boolean;
  confetti_enabled: boolean;
}

export interface PublicBootstrap {
  invitation_name: string;
  settings: PublicSettings;
  activities: ActivityOut[];
  restaurants: RestaurantOut[];
  date_options: DateOptionOut[];
  allow_custom_datetime: boolean;
  enforce_future_dates: boolean;
  last_submission: SubmissionOut | null;
  allow_resubmit: boolean;
}

export interface AppSettings {
  title: string;
  default_theme: "romantic" | "minimal";
  default_language: "ru" | "en";
  allow_theme_switch: boolean;
  allow_language_switch: boolean;
  enable_restaurant_step: boolean;
  allow_custom_datetime: boolean;
  enforce_future_dates: boolean;
  allow_resubmit: boolean;
  confetti_enabled: boolean;
}

export interface InvitationOut {
  id: string;
  token: string;
  name: string;
  is_active: boolean;
  created_at: string;
  url?: string;
}

export interface AuditEventOut {
  id: string;
  invitation_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : `HTTP ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(
      res.status,
      (body as { detail?: unknown })?.detail ?? body,
    );
  }
  if (res.status === 204) return undefined as T;
  const ctype = res.headers.get("content-type") ?? "";
  if (ctype.includes("application/json")) return res.json();
  return (await res.text()) as unknown as T;
}

export const api = {
  bootstrap: (token: string) => request<PublicBootstrap>(`/public/i/${token}`),
  logEvent: (token: string, event_type: string, payload: Record<string, unknown> = {}) =>
    request<void>(`/public/i/${token}/event`, {
      method: "POST",
      body: JSON.stringify({ event_type, payload }),
    }),
  submit: (
    token: string,
    body: {
      activity_id?: string | null;
      activity_name?: string | null;
      restaurant_id?: string | null;
      restaurant_name?: string | null;
      starts_at: string;
      duration_minutes: number;
      note?: string;
    },
  ) =>
    request<SubmissionOut>(`/public/i/${token}/submit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  icsUrl: (token: string) => `${BASE}/public/i/${token}/ics`,

  login: (username: string, password: string) =>
    request(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request(`/auth/logout`, { method: "POST" }),
  me: () => request<{ id: string; username: string }>(`/auth/me`),

  adminActivities: {
    list: () => request<ActivityOut[]>(`/admin/activities`),
    create: (body: Partial<ActivityOut>) =>
      request<ActivityOut>(`/admin/activities`, { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<ActivityOut> & { clear_image?: boolean }) =>
      request<ActivityOut>(`/admin/activities/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => request<void>(`/admin/activities/${id}`, { method: "DELETE" }),
  },
  adminRestaurants: {
    list: () => request<RestaurantOut[]>(`/admin/restaurants`),
    create: (body: Partial<RestaurantOut>) =>
      request<RestaurantOut>(`/admin/restaurants`, { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<RestaurantOut> & { clear_image?: boolean }) =>
      request<RestaurantOut>(`/admin/restaurants/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => request<void>(`/admin/restaurants/${id}`, { method: "DELETE" }),
  },
  adminDates: {
    list: () => request<DateOptionOut[]>(`/admin/dates`),
    create: (body: Partial<DateOptionOut>) =>
      request<DateOptionOut>(`/admin/dates`, { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<DateOptionOut>) =>
      request<DateOptionOut>(`/admin/dates/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => request<void>(`/admin/dates/${id}`, { method: "DELETE" }),
  },
  adminInvitations: {
    list: () => request<InvitationOut[]>(`/admin/invitations`),
    create: (name: string) =>
      request<InvitationOut>(`/admin/invitations`, { method: "POST", body: JSON.stringify({ name }) }),
    rotate: (id: string) =>
      request<InvitationOut>(`/admin/invitations/${id}/rotate`, { method: "POST" }),
    toggle: (id: string, is_active: boolean) =>
      request<InvitationOut>(`/admin/invitations/${id}?is_active=${is_active}`, { method: "PATCH" }),
    remove: (id: string) => request<void>(`/admin/invitations/${id}`, { method: "DELETE" }),
  },
  adminSettings: {
    get: () => request<AppSettings>(`/admin/settings`),
    update: (s: AppSettings) => request<AppSettings>(`/admin/settings`, { method: "PUT", body: JSON.stringify(s) }),
  },
  adminScrapeOg: (url: string) =>
    request<{ image_url: string | null; title: string | null; description: string | null }>(
      `/admin/scrape-og`,
      { method: "POST", body: JSON.stringify({ url }) },
    ),
  adminUpload: async (file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${BASE}/admin/uploads`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      throw new ApiError(res.status, (body as { detail?: unknown })?.detail ?? body);
    }
    return res.json();
  },
  adminSubmissions: (invitation_id?: string) =>
    request<SubmissionOut[]>(`/admin/submissions${invitation_id ? `?invitation_id=${invitation_id}` : ""}`),
  adminAudit: (invitation_id?: string) =>
    request<AuditEventOut[]>(`/admin/audit${invitation_id ? `?invitation_id=${invitation_id}` : ""}`),
};
