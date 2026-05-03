import type { ChatMessage } from "../types";

type Props = {
  message: ChatMessage;
  isOwn: boolean;
};

export function MessageBubble({ message, isOwn }: Props) {
  return (
    <div
      className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[70%] ${
          isOwn
            ? "rounded-br-md bg-chat-bubbleMe text-white"
            : "rounded-bl-md bg-chat-bubbleOther text-gray-100"
        }`}
      >
        <p
          className={`whitespace-pre-wrap text-[16px] font-semibold leading-snug ${
            isOwn ? "text-white" : "text-gray-50"
          }`}
        >
          {message.translated_text}
        </p>
        <p
          className={`mt-1.5 text-[11px] leading-snug ${
            isOwn ? "text-emerald-100/75" : "text-gray-500"
          }`}
        >
          {message.original_text}
        </p>
      </div>
    </div>
  );
}
