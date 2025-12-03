export type ColumnSchema = {
  name: string;
  type: string;
  semantic: string;
};

export type Dataset = {
  id: string;
  slug: string;
  name: string;
  publisher: string;
  tags: string[];
  description: string;
  summary: string;
  pricePerRow: number;
  pricePerColumn: number;
  rowCount: string;
  columnCount: number;
  updatedAt: string;
  image: string;
  schema: ColumnSchema[];
};

export const datasets: Dataset[] = [
  {
    id: "ds-1",
    slug: "global-ecommerce-behavior-2024",
    name: "Global E-commerce Behavior 2024",
    publisher: "DataStream Corp",
    tags: ["retail", "behavioral", "marketing"],
    description:
      "User browsing habits across top 50 retail platforms. Includes anonymized session duration, cart interactions, and loyalty activity.",
    summary:
      "Trusted by 40+ growth teams for building demand forecasts and loyalty scoring models.",
    pricePerRow: 0.002,
    pricePerColumn: 0.0005,
    rowCount: "120M",
    columnCount: 18,
    updatedAt: "3 days ago",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80",
    schema: [
      {
        name: "session_hash",
        type: "string",
        semantic: "Anonymous session id per visit",
      },
      {
        name: "session_duration_sec",
        type: "float",
        semantic: "Total dwell time in seconds",
      },
      {
        name: "cart_items",
        type: "array<int>",
        semantic: "SKU count captured during the session",
      },
      {
        name: "loyalty_tier",
        type: "string",
        semantic: "Provider loyalty tier label",
      },
      {
        name: "checkout_intent",
        type: "bool",
        semantic: "Binary indicator for checkout start event",
      },
    ],
  },
  {
    id: "ds-2",
    slug: "defi-transaction-graph-q3",
    name: "DeFi Transaction Graph Q3",
    publisher: "ChainSight",
    tags: ["defi", "blockchain", "risk"],
    description:
      "Wallet interaction graphs for major DEXs. Useful for whale watching, liquidity routing, and fraud heuristics.",
    summary:
      "Covers 28 chains with unified labels and counterparty scoring powered by on-chain AI agents.",
    pricePerRow: 0.003,
    pricePerColumn: 0.0006,
    rowCount: "75M",
    columnCount: 22,
    updatedAt: "6 hours ago",
    image:
      "https://images.unsplash.com/photo-1518544889280-37f4ca38e4b4?auto=format&fit=crop&w=1400&q=80",
    schema: [
      {
        name: "wallet_address",
        type: "string",
        semantic: "Normalized origin wallet address",
      },
      {
        name: "target_address",
        type: "string",
        semantic: "Destination wallet for the hop",
      },
      {
        name: "token_symbol",
        type: "string",
        semantic: "Ticker symbol for the transferred asset",
      },
      {
        name: "usd_notional",
        type: "float",
        semantic: "USD spot valuation at block time",
      },
      {
        name: "risk_score",
        type: "float",
        semantic: "Probabilistic flag for sanctioned activity",
      },
    ],
  },
  {
    id: "ds-3",
    slug: "healthcare-patient-triage-logs",
    name: "Healthcare Patient Triage Logs",
    publisher: "MedSafe Anonymized",
    tags: ["healthcare", "operations", "triage"],
    description:
      "Emergency room triage logs categorized by symptom severity and wait times. Fully HIPAA-aligned with de-identified visit ids.",
    summary:
      "Used by 70+ hospitals to predict resource loads and reduce wait times by 18%.",
    pricePerRow: 0.002,
    pricePerColumn: 0.0004,
    rowCount: "32M",
    columnCount: 14,
    updatedAt: "12 hours ago",
    image:
      "https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=1400&q=80",
    schema: [
      { name: "visit_id", type: "uuid", semantic: "Synthetic visit identifier" },
      {
        name: "symptom_code",
        type: "string",
        semantic: "SNOMED-coded symptom grouping",
      },
      {
        name: "acuity_score",
        type: "int",
        semantic: "Nurse tagged urgency bucket from 1-5",
      },
      {
        name: "wait_time_min",
        type: "int",
        semantic: "Minutes between arrival and first clinician",
      },
      {
        name: "disposition",
        type: "string",
        semantic: "Outcome label (admit, transfer, discharge)",
      },
    ],
  },
  {
    id: "ds-4",
    slug: "smart-mobility-patterns",
    name: "Smart Mobility Patterns",
    publisher: "TransitPulse",
    tags: ["mobility", "iot", "smart cities"],
    description:
      "Aggregated sensor data from 18 global metro areas capturing commute density, EV charging, and curb activity.",
    summary:
      "Perfect for infrastructure prioritization and climate-aware routing models.",
    pricePerRow: 0.0015,
    pricePerColumn: 0.0004,
    rowCount: "210M",
    columnCount: 16,
    updatedAt: "1 day ago",
    image:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80",
    schema: [
      {
        name: "sensor_hub_id",
        type: "string",
        semantic: "Physical IoT hub identifier",
      },
      {
        name: "timestamp_utc",
        type: "timestamp",
        semantic: "UTC capture time",
      },
      {
        name: "vehicle_flow",
        type: "int",
        semantic: "Vehicles per 5-minute bucket",
      },
      {
        name: "ev_sessions",
        type: "int",
        semantic: "Active EV charge sessions per hub",
      },
      {
        name: "micro_mobility_index",
        type: "float",
        semantic: "Composite score of scooters + bikes",
      },
    ],
  },
  {
    id: "ds-5",
    slug: "streaming-sentiment-radar",
    name: "Streaming Sentiment Radar",
    publisher: "SignalNorth",
    tags: ["media", "nlp", "sentiment"],
    description:
      "Real-time voice-of-customer analysis from podcasts, earnings calls, and community AMAs.",
    summary:
      "Built for quant teams and brand strategists needing entity-level emotional context.",
    pricePerRow: 0.0025,
    pricePerColumn: 0.0007,
    rowCount: "56M",
    columnCount: 20,
    updatedAt: "45 minutes ago",
    image:
      "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=80",
    schema: [
      {
        name: "clip_id",
        type: "string",
        semantic: "Audio segment identifier",
      },
      {
        name: "speaker_role",
        type: "string",
        semantic: "Role label extracted from transcript",
      },
      {
        name: "sentiment_score",
        type: "float",
        semantic: "Range -1..1 aggregated by transformer",
      },
      {
        name: "entities",
        type: "array<string>",
        semantic: "Top mentioned entities per clip",
      },
      {
        name: "confidence",
        type: "float",
        semantic: "Model confidence for the inference set",
      },
    ],
  },
];

export function getDatasetBySlug(slug: string) {
  return datasets.find((dataset) => dataset.slug === slug);
}

