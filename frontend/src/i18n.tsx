import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Lang = "ru" | "en";
type Dict = Record<string, string>;

const ru: Dict = {
  "ask.title": "Пойдёшь со мной на свидание?",
  "ask.yes": "Да 💖",
  "ask.no": "Нет",
  "ask.smallprint": "Подсказка: можно нажимать только «Да» 😉",

  "wizard.activity.title": "Куда сходим?",
  "wizard.activity.subtitle": "Выбери одно из мест",
  "wizard.activity.open_link": "Подробнее",

  "wizard.restaurant.title": "А где поедим?",
  "wizard.restaurant.subtitle": "Выбери ресторан или кафе",
  "wizard.restaurant.skip": "Пропустить",

  "wizard.datetime.title": "Когда встречаемся?",
  "wizard.datetime.subtitle": "Выбери один из предложенных вариантов или укажи свой",
  "wizard.datetime.custom": "Свой вариант",
  "wizard.datetime.duration": "Длительность",
  "wizard.datetime.minutes": "мин",
  "wizard.datetime.date": "Дата",
  "wizard.datetime.time": "Время",
  "wizard.datetime.note": "Заметка (необязательно)",

  "wizard.summary.title": "Подтверди свидание",
  "wizard.summary.subtitle": "Проверь детали и подтверди",
  "wizard.summary.where": "Где",
  "wizard.summary.eat": "Где едим",
  "wizard.summary.when": "Когда",
  "wizard.summary.duration": "Длительность",
  "wizard.summary.note": "Заметка",
  "wizard.summary.confirm": "Подтвердить ❤️",
  "wizard.summary.edit": "Изменить",

  "wizard.done.title": "Готово! Свидание назначено 💕",
  "wizard.done.subtitle": "Жду тебя!",
  "wizard.done.calendar.apple": "Добавить в календарь (.ics)",
  "wizard.done.calendar.google": "Google Календарь",
  "wizard.done.redo": "Выбрать заново",
  "wizard.done.already": "Мы уже договорились",

  "common.next": "Дальше",
  "common.back": "Назад",
  "common.cancel": "Отмена",
  "common.error": "Что-то пошло не так",
  "common.loading": "Загрузка…",
  "common.required": "Это поле обязательно",
  "common.future_only": "Можно выбирать только будущую дату",
  "common.theme": "Тема",
  "common.lang": "Язык",
  "common.empty_list": "Пока пусто",

  "404.title": "Приглашение не найдено",
  "404.subtitle": "Возможно, ссылка устарела или была отозвана.",
};

const en: Dict = {
  "ask.title": "Will you go on a date with me?",
  "ask.yes": "Yes 💖",
  "ask.no": "No",
  "ask.smallprint": "Hint: only 'Yes' is clickable 😉",

  "wizard.activity.title": "Where to go?",
  "wizard.activity.subtitle": "Pick one of the activities",
  "wizard.activity.open_link": "Details",

  "wizard.restaurant.title": "Where to eat?",
  "wizard.restaurant.subtitle": "Pick a restaurant or cafe",
  "wizard.restaurant.skip": "Skip",

  "wizard.datetime.title": "When?",
  "wizard.datetime.subtitle": "Pick a suggested slot or set your own",
  "wizard.datetime.custom": "Custom",
  "wizard.datetime.duration": "Duration",
  "wizard.datetime.minutes": "min",
  "wizard.datetime.date": "Date",
  "wizard.datetime.time": "Time",
  "wizard.datetime.note": "Note (optional)",

  "wizard.summary.title": "Confirm the date",
  "wizard.summary.subtitle": "Review the details and confirm",
  "wizard.summary.where": "Where",
  "wizard.summary.eat": "Where to eat",
  "wizard.summary.when": "When",
  "wizard.summary.duration": "Duration",
  "wizard.summary.note": "Note",
  "wizard.summary.confirm": "Confirm ❤️",
  "wizard.summary.edit": "Edit",

  "wizard.done.title": "All set! Date is on 💕",
  "wizard.done.subtitle": "Can't wait!",
  "wizard.done.calendar.apple": "Add to calendar (.ics)",
  "wizard.done.calendar.google": "Google Calendar",
  "wizard.done.redo": "Choose again",
  "wizard.done.already": "We're already set",

  "common.next": "Next",
  "common.back": "Back",
  "common.cancel": "Cancel",
  "common.error": "Something went wrong",
  "common.loading": "Loading…",
  "common.required": "This field is required",
  "common.future_only": "Only future dates allowed",
  "common.theme": "Theme",
  "common.lang": "Language",
  "common.empty_list": "Nothing here yet",

  "404.title": "Invitation not found",
  "404.subtitle": "The link may be expired or revoked.",
};

const dicts: Record<Lang, Dict> = { ru, en };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  toggle: () => void;
}

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE = "dp.lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE) as Lang | null;
    if (stored === "ru" || stored === "en") return stored;
    return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key: string) => dicts[lang][key] ?? key, [lang]);
  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((l) => (l === "ru" ? "en" : "ru")), []);

  const value = useMemo(() => ({ lang, setLang, t, toggle }), [lang, setLang, t, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
