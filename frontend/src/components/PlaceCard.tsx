import { useI18n } from "../i18n";

interface Place {
  id: string;
  name: string;
  description: string;
  link?: string | null;
  image_url?: string | null;
}

export default function PlaceCard({
  place,
  selected,
  onSelect,
}: {
  place: Place;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => onSelect(place.id)}
      className={`card text-left transition-all w-full ${
        selected ? "ring-4 ring-pink-300 -translate-y-0.5" : "hover:-translate-y-0.5"
      }`}
    >
      {place.image_url && (
        <img
          src={place.image_url}
          alt=""
          loading="lazy"
          className="mb-3 h-40 w-full rounded-xl object-cover"
        />
      )}
      <div className="text-lg font-bold">{place.name}</div>
      {place.description && (
        <p className="mt-1 text-sm opacity-80 whitespace-pre-line">{place.description}</p>
      )}
      {place.link && (
        <a
          href={place.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-block text-sm underline opacity-80"
        >
          {t("wizard.activity.open_link")} ↗
        </a>
      )}
    </button>
  );
}
