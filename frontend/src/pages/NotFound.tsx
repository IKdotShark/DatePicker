import { useI18n } from "../i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card text-center max-w-md">
        <div className="text-4xl mb-2">💔</div>
        <h1 className="text-xl font-bold mb-1">{t("404.title")}</h1>
        <p className="opacity-75">{t("404.subtitle")}</p>
      </div>
    </div>
  );
}
