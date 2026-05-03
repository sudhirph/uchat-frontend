import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

type Props = {
  messages: ChatMessage[];
  selfId: number;
  peerTyping?: boolean;
};

export function ChatWindow({ messages, selfId, peerTyping }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            Start a conversation — messages will be automatically translated.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isOwn={m.sender_id === selfId}
          />
        ))}
        {peerTyping && (
          <p className="text-xs italic text-gray-500">Writing…</p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
