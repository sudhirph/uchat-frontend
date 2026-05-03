import { useNavigate } from "react-router-dom";

function DemoBubble({
  align,
  text,
  subtext,
}: {
  align: "left" | "right";
  text: string;
  subtext?: string;
}) {
  const isOwn = align === "right";
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
          {text}
        </p>
        {subtext ? (
          <p
            className={`mt-1.5 text-[11px] leading-snug ${
              isOwn ? "text-emerald-100/75" : "text-gray-500"
            }`}
          >
            {subtext}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col bg-chat-bg text-gray-100">
      <header className="border-b border-gray-800 bg-chat-panel/80">
        <div className="mx-auto flex max-w-3xl items-center justify-end px-4 py-4">
          <button
            type="button"
            title="Go to chat"
            onClick={() => navigate("/chat")}
            className="rounded-full border border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-gray-500 hover:bg-chat-bg"
          >
            Open app
          </button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <h1 className="text-balance text-3xl font-semibold leading-tight text-white md:text-4xl">
            Chat in your language. They read it in theirs.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-gray-400">
            Type in your language. They see it in theirs.
          </p>
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="mt-10 rounded-full bg-[#25D366] px-10 py-3.5 text-base font-semibold text-white shadow-lg transition hover:opacity-95"
          >
            Start chatting
          </button>
          <div className="mt-4 space-y-1 text-center text-sm text-gray-500">
            <p>Takes less than 10 seconds</p>
            <p>No signup needed</p>
          </div>
        </section>

        <section className="border-t border-gray-800/80 bg-chat-panel/30 py-16">
          <div className="mx-auto max-w-3xl space-y-4 px-4">
            <p className="text-center text-sm font-medium text-gray-300">
              See how it works
            </p>
            <div className="space-y-3 rounded-2xl border border-gray-800 bg-chat-bg/80 p-4 sm:p-6">
              <DemoBubble align="left" text="¿Cómo estás?" />
              <DemoBubble align="right" text="How are you?" />
              <DemoBubble align="left" text="Estoy bien" />
              <DemoBubble align="right" text="I am good" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16">
          <ul className="mx-auto max-w-md space-y-4 text-center text-lg text-gray-300">
            <li>Works instantly</li>
            <li>No setup required</li>
            <li>Messages translate automatically</li>
          </ul>
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="rounded-full bg-[#25D366] px-10 py-3.5 text-base font-semibold text-white shadow-lg transition hover:opacity-95"
            >
              Start your first conversation
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-xs text-gray-500">
        Simple multilingual chat
      </footer>
    </div>
  );
}
