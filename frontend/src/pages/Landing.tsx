import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

export default function LandingPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">DatePicker 💖</h1>
        <p className="opacity-75 mb-4">{t("404.subtitle")}</p>
        <Link to="/admin" className="btn-primary">
          Admin
        </Link>
      </div>
    </div>
  );
}
