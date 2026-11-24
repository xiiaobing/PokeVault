import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestedQuestions = [
  "Should I buy more cards or hold my current collection?",
  "Which cards should I consider selling?",
  "Analyse my collection and its market value.",
  "What should I look out for in my watchlist?"
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  const sendMessage = async (message?: string) => {
    const userMessage = (message ?? input).trim();

    if (!userMessage || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: userMessage }
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/ai-assistant/chat/", {
        message: userMessage
      });

      const answer = response.data.answer;

      const answerText =
        typeof answer === "string"
          ? answer
          : Array.isArray(answer)
            ? answer
                .filter((item: any) => item.type === "text")
                .map((item: any) => item.text)
                .join("\n")
            : String(answer);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: answerText
        }
      ]);
    } catch (error: any) {
      const status = error.response?.status;

      let errorMessage = "Sorry, something went wrong. Please try again later.";

      if (status === 503) {
        errorMessage =
          "Gemini is temporarily unavailable due to high demand. Please try again in a moment.";
      } else if (status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (status === 500) {
        errorMessage = "Unable to generate AI advice. Please try again later.";
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: errorMessage
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="flex h-full min-h-[600px] flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">AI Assistant</h2>
        <p className="mt-2 text-text-secondary">
          Get AI-powered insights about your Pokémon collection.
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface p-4">
        {messages.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
              ✨
            </div>

            <h3 className="text-xl font-semibold">How can I help you today?</h3>

            <p className="mt-2 max-w-md text-sm text-text-secondary">
              Ask me about your Pokémon collection, card prices, buying
              opportunities, or selling decisions.
            </p>

            <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendMessage(question)}
                  disabled={loading}
                  className="rounded-lg border border-border p-4 text-left text-sm transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-primary text-white whitespace-pre-wrap"
                      : "w-full border border-border bg-background text-text-primary"
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="mb-3 mt-4 text-xl font-bold">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-2 mt-4 text-lg font-bold">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-2 mt-3 text-base font-bold">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-3 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-3 list-disc space-y-1 pl-6">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-3 list-decimal space-y-1 pl-6">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="pl-1">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      )
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-secondary">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your Pokémon collection..."
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <p className="mt-2 text-center text-xs text-text-secondary">
        AI-generated insights are for informational purposes and are not
        guaranteed predictions of future card prices.
      </p>
    </div>
  );
}
