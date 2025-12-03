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
  ChevronDown,
  Bot,
  Database,
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
import { cn } from "@/lib/utils";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl glass-panel p-8 mx-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="section-label">Checkout</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Purchase slice
            </h2>
          </div>
          <button
            className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <span className="text-white/60">Rows requested</span>
            <span className="text-xl font-semibold text-white">
              {totalRows.toLocaleString()}
            </span>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">
              Datasets
            </p>
            <div className="flex flex-wrap gap-2">
              {selected.map((slug) => {
                const dataset = datasets.find((d) => d.slug === slug);
                return (
                  <span key={slug} className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm font-medium text-cyan-400">
                    {dataset?.name ?? slug}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-white/10 p-5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white">Total</span>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                {total.toFixed(3)} SOL
              </span>
            </div>
            <p className="mt-1 text-xs text-white/50">
              {totalRows} rows × {pricePerRow.toFixed(4)} SOL
            </p>
          </div>
          <Button className="w-full h-14 rounded-full bg-white text-slate-900 font-semibold hover:bg-white/90">
            <Wallet2 className="h-4 w-4 mr-2" />
            Approve in wallet
          </Button>
          <p className="text-xs text-white/40 text-center">
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
  const [expandedDataset, setExpandedDataset] = useState<string | null>(null);
  const [sliceHighlight, setSliceHighlight] = useState(false);

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
    setSliceHighlight(true);
    setTimeout(() => setSliceHighlight(false), 700);

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
    <div className="py-8">
      {/* Hero */}
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5">
          <Bot className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-medium text-violet-400">Agent Workspace</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Orchestrate your data slice
        </h1>
        <p className="text-white/50">
          Attach datasets, describe your needs, and let the agent build your projection.
        </p>
      </div>

      <div className="flex flex-col gap-8 xl:flex-row">
        {/* Left Sidebar */}
        <div className="space-y-6 xl:w-[380px] shrink-0">
          {/* Context Window */}
          <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-label">Context window</p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Attached datasets
                </h2>
              </div>
              <Button className="btn-secondary h-9 text-xs" asChild>
                <Link href="/datasets">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Link>
              </Button>
            </div>

            <div className="space-y-2">
              {selectedDatasets.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40 text-center">
                  No datasets attached yet.
                </div>
              )}
              {selectedDatasets.map((slug) => {
                const dataset = datasets.find((d) => d.slug === slug);
                if (!dataset) return null;
                return (
                  <div key={slug} className="glass-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10">
                          <Database className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{dataset.name}</p>
                          <p className="text-xs text-white/40">
                            {dataset.columnCount} columns
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors"
                          onClick={() => handleRemoveDataset(slug)}
                          aria-label="Remove dataset"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors"
                          onClick={() =>
                            setExpandedDataset((prev) =>
                              prev === slug ? null : slug
                            )
                          }
                          aria-label="Toggle schema"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              expandedDataset === slug && "rotate-180"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                    {expandedDataset === slug && (
                      <div className="mt-3 space-y-1.5 pl-12">
                        {dataset.schema.slice(0, 3).map((column) => (
                          <div
                            key={column.name}
                            className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-xs"
                          >
                            <span className="text-white/70">{column.name}</span>
                            <span className="font-mono text-white/30">{column.type}</span>
                          </div>
                        ))}
                        {dataset.schema.length > 3 && (
                          <p className="text-xs text-white/30 pl-3">
                            + {dataset.schema.length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slice Preview */}
          <div
            className={cn(
              "glass-panel p-6 space-y-4 transition-all duration-300",
              sliceHighlight && "ring-2 ring-cyan-500/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="section-label">Slice preview</p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Columns included
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-white/50">
                schema only
              </span>
            </div>
            <div className="space-y-2">
              {slicePreview.map((entry) => (
                <div
                  key={entry.column}
                  className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white/80 text-sm">{entry.column}</p>
                    <p className="text-xs text-white/40">{entry.dataset}</p>
                  </div>
                  <span className="text-xs font-mono text-white/30">{entry.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase Card */}
          <div className="glass-panel p-6 space-y-4 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Rows requested</span>
                <span className="font-medium text-white">
                  {estimatedRows.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Datasets included</span>
                <span className="font-medium text-white">
                  {selectedDatasets.length}
                </span>
              </div>
              <div className="divider" />
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">Est. total</span>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                  {totalCost.toFixed(3)} SOL
                </span>
              </div>
            </div>
            <Button
              className="w-full h-12 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-0.5"
              onClick={() => setCheckoutOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Purchase slice
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 glass-panel p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="section-label">Agent chat</p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                "What slice do you need?"
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/50">
              schema access only
            </span>
          </div>

          <div className="flex-1 flex flex-col rounded-2xl border border-white/5 bg-black/40 overflow-hidden min-h-[500px]">
            <ChatMessageList className="flex-1 p-4">
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
                className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
              >
                <ChatInput
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Get me 500 positive churn rows and join age + salary..."
                  className="min-h-[60px] resize-none border-0 bg-transparent px-1 text-white text-sm placeholder:text-white/30"
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/[0.05]"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/[0.05]"
                    >
                      <Wallet2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="btn-primary h-9 px-5"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Send
                        <CornerDownLeft className="h-3.5 w-3.5 ml-1.5" />
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
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex items-center gap-3 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading agent experience...
          </div>
        </div>
      }
    >
      <AgentPageContent />
    </Suspense>
  );
}
