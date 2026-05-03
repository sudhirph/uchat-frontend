const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "hi", label: "हिन्दी" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

type Props = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
};

export function LanguageSelector({ value, onChange, disabled }: Props) {
  return (
    <label className="flex max-w-[14rem] flex-col gap-1 text-xs text-gray-300 sm:max-w-none sm:flex-row sm:items-center sm:gap-2 sm:text-sm">
      <span className="leading-snug sm:whitespace-nowrap">
        Your language (messages will be translated)
      </span>
      <select
        className="rounded-lg border border-gray-600 bg-chat-panel px-2 py-1.5 text-white focus:border-chat-accent focus:outline-none focus:ring-1 focus:ring-chat-accent disabled:opacity-50"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {!LANGUAGES.some((l) => l.code === value) && (
          <option value={value}>{value}</option>
        )}
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
