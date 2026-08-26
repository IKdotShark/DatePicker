import { useEffect, useState } from "react";
import { api, AuditEventOut, InvitationOut } from "../../api";

export default function AdminAudit() {
  const [invs, setInvs] = useState<InvitationOut[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [events, setEvents] = useState<AuditEventOut[]>([]);

  useEffect(() => {
    api.adminInvitations.list().then(setInvs);
  }, []);

  useEffect(() => {
    api.adminAudit(filter || undefined).then(setEvents);
  }, [filter]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Audit log</h1>
      <div className="card mb-3 flex gap-2 items-center">
        <span className="text-sm opacity-70">Invitation:</span>
        <select className="input max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          {invs.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <button className="btn-secondary ml-auto" onClick={() => api.adminAudit(filter || undefined).then(setEvents)}>
          Refresh
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left opacity-70">
              <th className="p-2">Time</th>
              <th className="p-2">Type</th>
              <th className="p-2">Payload</th>
              <th className="p-2">IP</th>
              <th className="p-2">User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-pink-100/40">
                <td className="p-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                <td className="p-2">{e.event_type}</td>
                <td className="p-2 font-mono text-xs max-w-xs truncate" title={JSON.stringify(e.payload)}>
                  {JSON.stringify(e.payload)}
                </td>
                <td className="p-2 whitespace-nowrap">{e.ip ?? "—"}</td>
                <td className="p-2 max-w-xs truncate" title={e.user_agent ?? ""}>
                  {e.user_agent ?? "—"}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center opacity-60">
                  No events
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
