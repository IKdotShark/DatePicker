import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";

export default function AdminLogin() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.login(username, password);
      nav("/admin");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="card max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Admin</h1>
        <input
          className="input mb-3"
          placeholder="Username"
          value={username}
          onChange={(e) => setU(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          className="input mb-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setP(e.target.value)}
          autoComplete="current-password"
          required
        />
        {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
