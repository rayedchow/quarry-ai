"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import {
  CornerDownLeft,
  Loader2,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  Wallet2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { datasets } from "@/data/datasets";
import { Button } from "@/components/ui/button";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { Badge } from "@/components/ui/badge";

type Message = {
  id: number;
  content: string;
  sender: "user" | "ai";
};

const initialMessages: Message[] = [
  {
    id: 1,
    content:
      "I'm ready. Attach any dataset schema and describe the slice you want.",
    sender: "ai",
  },
];

const slicePreview = [
  { dataset: "Global E-commerce", column: "loyalty_tier", type: "string" },
  { dataset: "Streaming Sentiment", column: "sentiment_score", type: "float" },
  { dataset: "Healthcare Triage", column: "wait_time_min", type: "int" },
];

function CheckoutModal({
  open,
  onClose,
  selected,
  totalRows,
  pricePerRow,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  totalRows: number;
  pricePerRow: number;
}) {
  if (!open) return null;
  const total = totalRows * pricePerRow;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-black/90 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-primary">
              Checkout
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Purchase slice
            </h2>
          </div>
          <button
            className="rounded-full border border-white/20 p-2 text-white/60 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 space-y-4 text-sm text-white/80">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <span>Rows requested</span>
            <span className="text-xl font-semibold text-white">
              {totalRows.toLocaleString()}
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              Datasets
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.map((slug) => {
                const dataset = datasets.find((d) => d.slug === slug);
                return (
                  <Badge key={slug} className="bg-white/20 text-white">
                    {dataset?.name ?? slug}
                  </Badge>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 p-4 text-white">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{total.toFixed(3)} SOL</span>
            </div>
            <p className="mt-1 text-xs text-white/80">
              {totalRows} rows × {pricePerRow.toFixed(4)} SOL
            </p>
          </div>
          <Button className="h-14 gap-2 rounded-full bg-white text-slate-900">
            <Wallet2 className="h-4 w-4" />
            Approve in wallet
          </Button>
          <p className="text-xs text-white/60">
            Data generation happens server-side only after the transaction has
            settled on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}

function AgentPageContent() {
  const params = useSearchParams();
  const attachedFromQuery = params.getAll("attach");
  const defaultSelection = attachedFromQuery.length
    ? attachedFromQuery
    : datasets.slice(0, 2).map((d) => d.slug);

  const [selectedDatasets, setSelectedDatasets] =
    useState<string[]>(defaultSelection);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const estimatedRows = 2000;
  const pricePerRow = 0.002;
  const totalCost = useMemo(
    () => selectedDatasets.length * estimatedRows * pricePerRow,
    [selectedDatasets]
  );

  const handleRemoveDataset = (slug: string) => {
    setSelectedDatasets((prev) => prev.filter((item) => item !== slug));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, content: input, sender: "user" },
    ]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          content:
            "I'll pull 500 positive churn rows from E-commerce, join salary + age from Mobility, and keep the schema limited to the requested columns. Estimated cost 2,000 rows × 0.002 SOL.",
          sender: "ai",
        },
      ]);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="container py-16">
      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="space-y-8 xl:w-[40%]">
          <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-primary">
                  Context window
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-white">
                  Attached datasets
                </h1>
              </div>
              <Button
                variant="outline"
                className="gap-2 rounded-full border-white/20 text-white"
                asChild
              >
                <Link href="/datasets">
                  <Plus className="h-4 w-4" />
                  Add dataset
                </Link>
              </Button>
            </div>
            <div className="mt-6 space-y-3">
              {selectedDatasets.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-muted-foreground">
                  No datasets attached. Add one to start orchestrating slices.
                </div>
              )}
              {selectedDatasets.map((slug) => {
                const dataset = datasets.find((d) => d.slug === slug);
                if (!dataset) return null;
                return (
                  <div
                    key={slug}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between text-sm text-white/80">
                      <span>{dataset.name}</span>
                      <button
                        className="text-white/50 hover:text-white"
                        onClick={() => handleRemoveDataset(slug)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-white/60">
                      {dataset.schema.slice(0, 3).map((column) => (
                        <div
                          key={column.name}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 px-3 py-2"
                        >
                          <span>{column.name}</span>
                          <span>{column.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-primary">
                  Slice preview
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Columns included
                </h2>
              </div>
              <Badge variant="outline" className="border-white/30">
                schema only
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              {slicePreview.map((entry) => (
                <div
                  key={entry.column}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 text-sm text-white/80"
                >
                  <div>
                    <p className="font-medium">{entry.column}</p>
                    <p className="text-xs text-white/50">{entry.dataset}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.3em] text-primary">
                    {entry.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>Rows requested</span>
              <span>{estimatedRows.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>Datasets included</span>
              <span>{selectedDatasets.length}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-semibold text-white">
              <span>Est. total</span>
              <span>{totalCost.toFixed(3)} SOL</span>
            </div>
            <Button
              className="mt-2 h-12 gap-2 rounded-full bg-gradient-to-r from-primary to-blue-500 text-white"
              onClick={() => setCheckoutOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Purchase slice
            </Button>
          </div>
        </div>

        <div className="flex-1 rounded-3xl border border-white/10 bg-black/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-primary">
                Agent Chat
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                “What slice do you need?”
              </h2>
            </div>
            <Badge variant="outline" className="border-white/30">
              schema access only
            </Badge>
          </div>
          <div className="mt-6 flex h-[500px] flex-col overflow-hidden rounded-2xl border border-white/5 bg-black/60">
            <ChatMessageList className="flex-1">
              {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  variant={message.sender === "user" ? "sent" : "received"}
                >
                  <ChatBubbleAvatar
                    className="h-9 w-9 shrink-0"
                    src={
                      message.sender === "user"
                        ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                        : "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=64&h=64&q=80&crop=faces&fit=crop"
                    }
                    fallback={message.sender === "user" ? "US" : "AI"}
                  />
                  <ChatBubbleMessage
                    variant={message.sender === "user" ? "sent" : "received"}
                  >
                    {message.content}
                  </ChatBubbleMessage>
                </ChatBubble>
              ))}
              {isLoading && (
                <ChatBubble variant="received">
                  <ChatBubbleAvatar
                    className="h-9 w-9 shrink-0"
                    src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=64&h=64&q=80&crop=faces&fit=crop"
                    fallback="AI"
                  />
                  <ChatBubbleMessage isLoading />
                </ChatBubble>
              )}
            </ChatMessageList>
            <div className="border-t border-white/5 p-4">
              <form
                onSubmit={handleSubmit}
                className="space-y-3 rounded-2xl border border-white/10 bg-black/70 p-3"
              >
                <ChatInput
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="“Get me 500 positive churn rows and join age + salary.”"
                  className="min-h-12 resize-none border-0 bg-transparent px-0 text-white"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full border border-white/10 text-white/70"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full border border-white/10 text-white/70"
                    >
                      <Wallet2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="gap-2 rounded-full bg-primary px-5 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Send
                        <CornerDownLeft className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        selected={selectedDatasets}
        totalRows={estimatedRows}
        pricePerRow={pricePerRow}
      />
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-white/70">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading agent experience...
        </div>
      }
    >
      <AgentPageContent />
    </Suspense>
  );
}
