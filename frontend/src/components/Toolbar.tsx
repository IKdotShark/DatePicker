import { useI18n } from "../i18n";
import { useTheme } from "../theme";

export default function Toolbar({
  showLang = true,
  showTheme = true,
}: {
  showLang?: boolean;
  showTheme?: boolean;
}) {
  const { lang, toggle } = useI18n();
  const { theme, cycle } = useTheme();
  return (
    <div className="absolute top-3 right-3 z-20 flex gap-2">
      {showLang && (
        <button
          onClick={toggle}
          className="rounded-full bg-white/80 backdrop-blur px-3 py-1 text-sm shadow"
          aria-label="language"
        >
          {lang === "ru" ? "RU" : "EN"}
        </button>
      )}
      {showTheme && (
        <button
          onClick={cycle}
          className="rounded-full bg-white/80 backdrop-blur px-3 py-1 text-sm shadow"
          aria-label="theme"
        >
          {theme === "romantic" ? "💗" : theme === "minimal" ? "◻️" : "◼️"}
        </button>
      )}
    </div>
  );
}
