import { useCallback, useState } from "react";

type Props = {
  onSend: (text: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function MessageInput({
  onSend,
  onTyping,
  disabled,
  placeholder = "Write a message",
}: Props) {
  const [value, setValue] = useState("");

  const submit = useCallback(() => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
  }, [value, disabled, onSend]);

  return (
    <div className="flex items-end gap-2 border-t border-gray-800 bg-chat-panel p-3">
      <textarea
        rows={1}
        className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-gray-700 bg-chat-bg px-4 py-2.5 text-[15px] text-white placeholder:text-gray-500 focus:border-chat-accent focus:outline-none focus:ring-1 focus:ring-chat-accent disabled:opacity-50"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          onTyping?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="shrink-0 rounded-full bg-chat-accent px-5 py-2.5 text-sm font-semibold text-chat-bg transition hover:opacity-90 disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
}
