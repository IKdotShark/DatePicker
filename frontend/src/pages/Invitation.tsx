import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError, PublicBootstrap, SubmissionOut } from "../api";
import Confetti from "../components/Confetti";
import PlaceCard from "../components/PlaceCard";
import RunawayButton from "../components/RunawayButton";
import Toolbar from "../components/Toolbar";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";

type Step = "ask" | "activity" | "restaurant" | "datetime" | "summary" | "done";

interface Choice {
  activity_id: string | null;
  activity_name: string;
  restaurant_id: string | null;
  restaurant_name: string;
  starts_at: string;
  duration_minutes: number;
  note: string;
}

const isoLocal = (d: Date) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
};

function googleCalUrl(c: { title: string; start: Date; durationMin: number; details?: string; location?: string }) {
  const end = new Date(c.start.getTime() + c.durationMin * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: c.title,
    dates: `${fmt(c.start)}/${fmt(end)}`,
    details: c.details ?? "",
    location: c.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function InvitationPage() {
  const { token = "" } = useParams();
  const { t, setLang } = useI18n();
  const { setTheme } = useTheme();
  const [data, setData] = useState<PublicBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("ask");
  const [choice, setChoice] = useState<Choice>({
    activity_id: null,
    activity_name: "",
    restaurant_id: null,
    restaurant_name: "",
    starts_at: "",
    duration_minutes: 120,
    note: "",
  });
  const [confettiOn, setConfettiOn] = useState(false);
  const [submission, setSubmission] = useState<SubmissionOut | null>(null);
  const [showAlreadyScreen, setShowAlreadyScreen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .bootstrap(token)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLang(d.settings.default_language);
        setTheme(d.settings.default_theme);
        if (d.last_submission) {
          setSubmission(d.last_submission);
          setShowAlreadyScreen(!d.allow_resubmit);
          setStep(d.allow_resubmit ? "ask" : "done");
        }
        api.logEvent(token, "opened").catch(() => undefined);
      })
      .catch((e: ApiError) => {
        setError(e.message);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token, setLang, setTheme]);

  const activities = data?.activities ?? [];
  const allRestaurants = data?.restaurants ?? [];

  const restaurantsForActivity = useMemo(() => {
    if (!choice.activity_id) return allRestaurants;
    const a = activities.find((x) => x.id === choice.activity_id);
    if (!a) return allRestaurants;
    if (a.allowed_restaurant_ids === null || a.allowed_restaurant_ids === undefined) return allRestaurants;
    if (a.allowed_restaurant_ids.length === 0) return [];
    const allowed = new Set(a.allowed_restaurant_ids);
    return allRestaurants.filter((r) => allowed.has(r.id));
  }, [choice.activity_id, activities, allRestaurants]);

  const goNext = useCallback(
    (next: Step) => {
      setStep(next);
      api.logEvent(token, "step_changed", { step: next }).catch(() => undefined);
    },
    [token],
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">{t("common.loading")}</div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card text-center max-w-md">
          <div className="text-4xl mb-2">💔</div>
          <h1 className="text-xl font-bold">{t("404.title")}</h1>
          <p className="opacity-75 mt-1">{t("404.subtitle")}</p>
        </div>
      </div>
    );
  }

  const allowedTheme = data.settings.allow_theme_switch;
  const allowedLang = data.settings.allow_language_switch;

  return (
    <div className="min-h-screen relative">
      <Toolbar showLang={allowedLang} showTheme={allowedTheme} />
      <Confetti active={confettiOn && data.settings.confetti_enabled} />

      {step === "ask" && (
        <AskStep
          name={data.invitation_name}
          onYes={() => {
            api.logEvent(token, "yes_clicked").catch(() => undefined);
            goNext("activity");
          }}
          onNoAttempt={() => api.logEvent(token, "no_attempt").catch(() => undefined)}
        />
      )}

      {step === "activity" && (
        <ActivityStep
          activities={activities}
          selectedId={choice.activity_id}
          onSelect={(a) =>
            setChoice((c) => ({
              ...c,
              activity_id: a.id,
              activity_name: a.name,
              restaurant_id: null,
              restaurant_name: "",
            }))
          }
          onNext={() => {
            const restaurantStepEnabled = restaurantsForActivity.length > 0;
            goNext(restaurantStepEnabled ? "restaurant" : "datetime");
          }}
        />
      )}

      {step === "restaurant" && (
        <RestaurantStep
          restaurants={restaurantsForActivity}
          selectedId={choice.restaurant_id}
          onSelect={(r) =>
            setChoice((c) => ({
              ...c,
              restaurant_id: r.id,
              restaurant_name: r.name,
            }))
          }
          onNext={() => goNext("datetime")}
          onSkip={() => {
            setChoice((c) => ({ ...c, restaurant_id: null, restaurant_name: "" }));
            goNext("datetime");
          }}
          onBack={() => goNext("activity")}
        />
      )}

      {step === "datetime" && (
        <DateTimeStep
          options={data.date_options}
          allowCustom={data.allow_custom_datetime}
          enforceFuture={data.enforce_future_dates}
          value={choice}
          onChange={(patch) => setChoice((c) => ({ ...c, ...patch }))}
          onNext={() => goNext("summary")}
          onBack={() => goNext(restaurantsForActivity.length > 0 ? "restaurant" : "activity")}
        />
      )}

      {step === "summary" && (
        <SummaryStep
          choice={choice}
          onEdit={() => {
            api.logEvent(token, "edit_requested").catch(() => undefined);
            goNext("activity");
          }}
          onBack={() => goNext("datetime")}
          onConfirm={async () => {
            try {
              const sub = await api.submit(token, {
                activity_id: choice.activity_id,
                activity_name: choice.activity_name,
                restaurant_id: choice.restaurant_id,
                restaurant_name: choice.restaurant_name,
                starts_at: new Date(choice.starts_at).toISOString(),
                duration_minutes: choice.duration_minutes,
                note: choice.note,
              });
              setSubmission(sub);
              setConfettiOn(true);
              setTimeout(() => setConfettiOn(false), 5000);
              goNext("done");
            } catch (e) {
              alert(t("common.error"));
            }
          }}
        />
      )}

      {step === "done" && submission && (
        <DoneStep
          submission={submission}
          token={token}
          inviteName={data.invitation_name}
          allowResubmit={data.allow_resubmit && !showAlreadyScreen}
          onRedo={() => {
            setShowAlreadyScreen(false);
            setSubmission(null);
            setChoice({
              activity_id: null,
              activity_name: "",
              restaurant_id: null,
              restaurant_name: "",
              starts_at: "",
              duration_minutes: 120,
              note: "",
            });
            goNext("activity");
          }}
        />
      )}
    </div>
  );
}

function AskStep({
  name,
  onYes,
  onNoAttempt,
}: {
  name: string;
  onYes: () => void;
  onNoAttempt: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-lg text-center animate-floatY">
        <div className="text-6xl mb-4 animate-heart-pulse">💖</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {name}, {t("ask.title")}
        </h1>
        <p className="opacity-75 mb-8">{t("ask.smallprint")}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button className="btn-primary text-lg px-8 py-4" onClick={onYes}>
            {t("ask.yes")}
          </button>
          <RunawayButton label={t("ask.no")} onAttempt={onNoAttempt} />
        </div>
      </div>
    </div>
  );
}

function ActivityStep({
  activities,
  selectedId,
  onSelect,
  onNext,
}: {
  activities: PublicBootstrap["activities"];
  selectedId: string | null;
  onSelect: (a: PublicBootstrap["activities"][number]) => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto p-6 pt-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center">{t("wizard.activity.title")}</h2>
      <p className="text-center opacity-75 mt-1 mb-6">{t("wizard.activity.subtitle")}</p>
      {activities.length === 0 ? (
        <p className="text-center opacity-60">{t("common.empty_list")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((a) => (
            <PlaceCard key={a.id} place={a} selected={a.id === selectedId} onSelect={() => onSelect(a)} />
          ))}
        </div>
      )}
      <div className="flex justify-end mt-6">
        <button className="btn-primary" disabled={!selectedId} onClick={onNext}>
          {t("common.next")} →
        </button>
      </div>
    </div>
  );
}

function RestaurantStep({
  restaurants,
  selectedId,
  onSelect,
  onNext,
  onSkip,
  onBack,
}: {
  restaurants: PublicBootstrap["restaurants"];
  selectedId: string | null;
  onSelect: (r: PublicBootstrap["restaurants"][number]) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto p-6 pt-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center">{t("wizard.restaurant.title")}</h2>
      <p className="text-center opacity-75 mt-1 mb-6">{t("wizard.restaurant.subtitle")}</p>
      {restaurants.length === 0 ? (
        <p className="text-center opacity-60">{t("common.empty_list")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {restaurants.map((r) => (
            <PlaceCard key={r.id} place={r} selected={r.id === selectedId} onSelect={() => onSelect(r)} />
          ))}
        </div>
      )}
      <div className="flex justify-between mt-6">
        <button className="btn-secondary" onClick={onBack}>
          ← {t("common.back")}
        </button>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={onSkip}>
            {t("wizard.restaurant.skip")}
          </button>
          <button className="btn-primary" disabled={!selectedId} onClick={onNext}>
            {t("common.next")} →
          </button>
        </div>
      </div>
    </div>
  );
}

function DateTimeStep({
  options,
  allowCustom,
  enforceFuture,
  value,
  onChange,
  onNext,
  onBack,
}: {
  options: PublicBootstrap["date_options"];
  allowCustom: boolean;
  enforceFuture: boolean;
  value: Choice;
  onChange: (patch: Partial<Choice>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"preset" | "custom">(options.length > 0 ? "preset" : "custom");
  const [pickedId, setPickedId] = useState<string | null>(null);

  const minLocal = useMemo(() => isoLocal(new Date()), []);

  function handlePresetPick(o: PublicBootstrap["date_options"][number]) {
    setPickedId(o.id);
    onChange({
      starts_at: isoLocal(new Date(o.starts_at)),
      duration_minutes: o.duration_minutes,
    });
  }

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [lang],
  );

  const canNext =
    !!value.starts_at &&
    (!enforceFuture || new Date(value.starts_at).getTime() > Date.now() - 60_000);

  return (
    <div className="max-w-2xl mx-auto p-6 pt-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center">{t("wizard.datetime.title")}</h2>
      <p className="text-center opacity-75 mt-1 mb-6">{t("wizard.datetime.subtitle")}</p>

      {options.length > 0 && (
        <div className="grid gap-2 mb-4">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setMode("preset");
                handlePresetPick(o);
              }}
              className={`card text-left ${pickedId === o.id && mode === "preset" ? "ring-4 ring-pink-300" : ""}`}
            >
              <div className="font-semibold">{formatter.format(new Date(o.starts_at))}</div>
              <div className="text-sm opacity-70">
                {o.duration_minutes} {t("wizard.datetime.minutes")}
                {o.note ? ` · ${o.note}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {allowCustom && (
        <div className="card">
          <button
            onClick={() => {
              setMode("custom");
              setPickedId(null);
            }}
            className="font-semibold mb-3 underline"
          >
            {t("wizard.datetime.custom")}
          </button>
          {mode === "custom" && (
            <div className="grid gap-3">
              <label className="block">
                <span className="text-sm opacity-80">{t("wizard.datetime.date")} / {t("wizard.datetime.time")}</span>
                <input
                  type="datetime-local"
                  min={enforceFuture ? minLocal : undefined}
                  value={value.starts_at}
                  onChange={(e) => onChange({ starts_at: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <label className="block">
                <span className="text-sm opacity-80">
                  {t("wizard.datetime.duration")} ({t("wizard.datetime.minutes")})
                </span>
                <input
                  type="number"
                  min={15}
                  max={1440}
                  step={15}
                  value={value.duration_minutes}
                  onChange={(e) => onChange({ duration_minutes: Number(e.target.value) || 120 })}
                  className="input mt-1"
                />
              </label>
              <label className="block">
                <span className="text-sm opacity-80">{t("wizard.datetime.note")}</span>
                <textarea
                  rows={2}
                  value={value.note}
                  onChange={(e) => onChange({ note: e.target.value })}
                  className="textarea mt-1"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {enforceFuture && value.starts_at && new Date(value.starts_at).getTime() < Date.now() - 60_000 && (
        <p className="text-sm text-red-600 mt-2">{t("common.future_only")}</p>
      )}

      <div className="flex justify-between mt-6">
        <button className="btn-secondary" onClick={onBack}>
          ← {t("common.back")}
        </button>
        <button className="btn-primary" disabled={!canNext} onClick={onNext}>
          {t("common.next")} →
        </button>
      </div>
    </div>
  );
}

function SummaryStep({
  choice,
  onConfirm,
  onEdit,
  onBack,
}: {
  choice: Choice;
  onConfirm: () => void;
  onEdit: () => void;
  onBack: () => void;
}) {
  const { t, lang } = useI18n();
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [lang],
  );
  return (
    <div className="max-w-xl mx-auto p-6 pt-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center">{t("wizard.summary.title")}</h2>
      <p className="text-center opacity-75 mt-1 mb-6">{t("wizard.summary.subtitle")}</p>
      <div className="card grid gap-2 text-base">
        <div>
          <span className="opacity-70 mr-2">{t("wizard.summary.where")}:</span>
          <span className="font-semibold">{choice.activity_name || "—"}</span>
        </div>
        {choice.restaurant_name && (
          <div>
            <span className="opacity-70 mr-2">{t("wizard.summary.eat")}:</span>
            <span className="font-semibold">{choice.restaurant_name}</span>
          </div>
        )}
        <div>
          <span className="opacity-70 mr-2">{t("wizard.summary.when")}:</span>
          <span className="font-semibold">
            {choice.starts_at ? formatter.format(new Date(choice.starts_at)) : "—"}
          </span>
        </div>
        <div>
          <span className="opacity-70 mr-2">{t("wizard.summary.duration")}:</span>
          <span className="font-semibold">
            {choice.duration_minutes} {t("wizard.datetime.minutes")}
          </span>
        </div>
        {choice.note && (
          <div>
            <span className="opacity-70 mr-2">{t("wizard.summary.note")}:</span>
            <span>{choice.note}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between mt-6 flex-wrap gap-2">
        <button className="btn-secondary" onClick={onBack}>
          ← {t("common.back")}
        </button>
        <div className="flex gap-2 ml-auto">
          <button className="btn-secondary" onClick={onEdit}>
            {t("wizard.summary.edit")}
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            {t("wizard.summary.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DoneStep({
  submission,
  token,
  inviteName,
  allowResubmit,
  onRedo,
}: {
  submission: SubmissionOut;
  token: string;
  inviteName: string;
  allowResubmit: boolean;
  onRedo: () => void;
}) {
  const { t, lang } = useI18n();
  const start = new Date(submission.starts_at);
  const formatter = new Intl.DateTimeFormat(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const gUrl = googleCalUrl({
    title: `${lang === "ru" ? "Свидание" : "Date"}: ${submission.activity_name}`,
    start,
    durationMin: submission.duration_minutes,
    details: [
      `${lang === "ru" ? "С" : "With"}: ${inviteName}`,
      submission.restaurant_name && `${lang === "ru" ? "Ресторан" : "Restaurant"}: ${submission.restaurant_name}`,
      submission.note,
    ]
      .filter(Boolean)
      .join("\n"),
    location: submission.restaurant_name || submission.activity_name,
  });

  return (
    <div className="max-w-xl mx-auto p-6 pt-16 text-center">
      <div className="text-6xl mb-4">💕</div>
      <h2 className="text-2xl md:text-3xl font-bold mb-1">{t("wizard.done.title")}</h2>
      <p className="opacity-75 mb-6">{t("wizard.done.subtitle")}</p>
      <div className="card text-left mb-6">
        <div className="font-semibold text-lg">{submission.activity_name}</div>
        {submission.restaurant_name && <div className="opacity-80">🍽 {submission.restaurant_name}</div>}
        <div className="opacity-80">🗓 {formatter.format(start)}</div>
        <div className="opacity-80">
          ⏱ {submission.duration_minutes} {t("wizard.datetime.minutes")}
        </div>
        {submission.note && <div className="opacity-80 mt-1 whitespace-pre-line">📝 {submission.note}</div>}
      </div>
      <div className="flex justify-center gap-2 flex-wrap">
        <a
          href={`/api/public/i/${token}/ics`}
          className="btn-primary"
          onClick={() => api.logEvent(token, "calendar_exported", { kind: "ics" }).catch(() => undefined)}
        >
          📅 {t("wizard.done.calendar.apple")}
        </a>
        <a
          href={gUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          onClick={() => api.logEvent(token, "calendar_exported", { kind: "google" }).catch(() => undefined)}
        >
          🟦 {t("wizard.done.calendar.google")}
        </a>
      </div>
      {allowResubmit ? (
        <button className="mt-6 underline opacity-70" onClick={onRedo}>
          {t("wizard.done.redo")}
        </button>
      ) : (
        <p className="mt-6 opacity-60 italic">{t("wizard.done.already")}</p>
      )}
    </div>
  );
}
