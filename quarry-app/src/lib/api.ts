const API_BASE_URL = "http://localhost:8000";

export type ColumnSchema = {
  name: string;
  type: string;
  semantic: string;
};

export type ReputationBadge = {
  type: string;
  level: string;
  label: string;
  icon: string;
};

export type AttestationInfo = {
  id: string;
  address: string;
  tx_signature: string;
  issued_at: string;
  expires_at: string | null;
  schema: string;
};

export type QAReportSummary = {
  ipfs_cid: string;
  summary: {
    completeness: string;
    duplicates: string;
    pii_risk: string;
    freshness: string;
  };
};

export type DatasetReputation = {
  dataset_id: string;
  dataset_name: string;
  dataset_version: string;
  dataset_version_pda: string;
  processed_at: string;
  quality_score: number;
  qa_report: QAReportSummary;
  attestations: {
    quality: AttestationInfo;
    freshness: AttestationInfo;
  };
  badges: ReputationBadge[];
};

export type Dataset = {
  id: string;
  slug: string;
  name: string;
  publisher: string;
  publisherWallet?: string;
  tags: string[];
  description: string;
  summary: string;
  pricePerRow: number;
  rowCount: string;
  columnCount: number;
  updatedAt: string;
  image: string;
  schema: ColumnSchema[];
  reputation?: DatasetReputation;
};

export type DatasetListResponse = {
  datasets: Dataset[];
  total: number;
};

export type TagsResponse = {
  tags: string[];
  counts: Record<string, number>;
};

export type DataQueryResponse = {
  columns: string[];
  rows: unknown[][];
  total_rows: number;
  returned_rows: number;
};

export type UploadResponse = {
  dataset: Dataset;
  message: string;
};

export type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
};

export type DatasetInfo = {
  id: number;
  slug: string;
  name: string;
  table_name: string;
  schema: ColumnSchema[];
};

export type AgentChatRequest = {
  message: string;
  history: ChatMessage[];
  attached_datasets: string[];
  datasets_info: DatasetInfo[];
  currency?: string;
};

export type AgentChatResponse = {
  message: string;
  role: string;
};

export type PaymentRequest = {
  payment_required: boolean;
  challenge_id: string;
  dataset_slug: string;
  dataset_name: string;
  sql_query: string;
  estimated_rows: number;
  price_per_row: number;
  total_cost: number;
  currency: string;
  payment_details: {
    challenge_id: string;
    recipient: string;
    recipient_token_account?: string;
    amount: number;
    amount_lamports?: number;
    amount_tokens?: number;
    currency: string;
    mint_address?: string;
    decimals: number;
    resource_id: string;
    description: string;
    timestamp: number;
    expires_at: number;
  };
};

export type PaymentConfirmation = {
  query_id: string;
  transaction_signature: string;
  payer_wallet?: string;
  currency?: string;
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Datasets
  async getDatasets(params?: {
    limit?: number;
    offset?: number;
    tag?: string;
    search?: string;
  }): Promise<DatasetListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    if (params?.tag) searchParams.set("tag", params.tag);
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return this.fetch<DatasetListResponse>(
      `/api/datasets${query ? `?${query}` : ""}`
    );
  }

  async getDataset(slug: string): Promise<Dataset> {
    // Reputation is now included in the dataset response
    return this.fetch<Dataset>(`/api/datasets/${slug}`);
  }

  async getTags(): Promise<TagsResponse> {
    return this.fetch<TagsResponse>("/api/datasets/tags");
  }

  // Reputation APIs
  async getDatasetReputation(datasetId: string, version: string = "v1"): Promise<DatasetReputation> {
    return this.fetch<DatasetReputation>(`/api/reputation/dataset/${datasetId}?version=${version}`);
  }

  async verifyAttestation(attestationId: string): Promise<any> {
    return this.fetch<any>(`/api/reputation/attestation/${attestationId}/verify`);
  }

  async getIPFSContent(cid: string): Promise<any> {
    return this.fetch<any>(`/api/reputation/ipfs/${cid}`);
  }

  async createUsageReceipt(
    reviewerWallet: string,
    datasetId: string,
    datasetVersion: string,
    txSignature: string,
    rowsAccessed: number,
    costPaid: number
  ): Promise<any> {
    return this.fetch<any>("/api/reputation/usage-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewer_wallet: reviewerWallet,
        dataset_id: datasetId,
        dataset_version: datasetVersion,
        tx_signature: txSignature,
        rows_accessed: rowsAccessed,
        cost_paid: costPaid,
      }),
    });
  }

  async getReputationSchemas(): Promise<any> {
    return this.fetch<any>("/api/reputation/schemas");
  }

  // Review APIs
  async createReview(
    datasetId: string,
    reviewerWallet: string,
    rating: number,
    reviewText: string,
    usageReceiptAttestation: string,
    datasetVersion: string = "v1"
  ): Promise<any> {
    return this.fetch<any>("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_id: datasetId,
        dataset_version: datasetVersion,
        rating: rating,
        review_text: reviewText,
        reviewer_wallet: reviewerWallet,
        usage_receipt_attestation: usageReceiptAttestation,
      }),
    });
  }

  async getDatasetReviews(datasetId: string, version: string = "v1", limit: number = 50, offset: number = 0): Promise<any> {
    return this.fetch<any>(`/api/reviews/dataset/${datasetId}?version=${version}&limit=${limit}&offset=${offset}`);
  }

  async checkReviewEligibility(datasetId: string, walletAddress: string): Promise<any> {
    return this.fetch<any>(`/api/reviews/check-eligibility/${datasetId}/${walletAddress}`);
  }

  async markReviewHelpful(reviewId: string, voterWallet: string): Promise<any> {
    return this.fetch<any>("/api/reviews/helpful", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        review_id: reviewId,
        voter_wallet: voterWallet,
      }),
    });
  }

  async createDataset(formData: FormData): Promise<UploadResponse> {
    const response = await fetch(`${this.baseUrl}/api/datasets`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async updateDataset(
    slug: string,
    data: Partial<{
      name: string;
      publisher: string;
      tags: string[];
      description: string;
      summary: string;
      price_per_row: number;
      update_frequency: string;
    }>
  ): Promise<Dataset> {
    return this.fetch<Dataset>(`/api/datasets/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async deleteDataset(slug: string): Promise<void> {
    await this.fetch(`/api/datasets/${slug}`, { method: "DELETE" });
  }

  async queryDataset(
    slug: string,
    params?: {
      sql?: string;
      limit?: number;
      offset?: number;
      columns?: string[];
    }
  ): Promise<DataQueryResponse> {
    return this.fetch<DataQueryResponse>(`/api/datasets/${slug}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });
  }

  async previewDataset(
    slug: string,
    limit: number = 10
  ): Promise<DataQueryResponse> {
    return this.fetch<DataQueryResponse>(
      `/api/datasets/${slug}/preview?limit=${limit}`
    );
  }

  async addDataToDataset(
    slug: string,
    formData: FormData
  ): Promise<UploadResponse> {
    const response = await fetch(`${this.baseUrl}/api/datasets/${slug}/data`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Agent
  async sendAgentMessage(request: AgentChatRequest): Promise<AgentChatResponse> {
    return this.fetch<AgentChatResponse>("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  }

  // Agent - confirm payment
  async confirmPayment(payment: PaymentConfirmation): Promise<any> {
    return this.fetch(`/api/agent/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payment),
    });
  }

  // Agent streaming
  async *streamAgentMessage(request: AgentChatRequest): AsyncGenerator<string | PaymentRequest, void, unknown> {
    const url = `${this.baseUrl}/api/agent`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const error = await response.json();
        console.error("Stream API Error:", error);
        // Handle FastAPI validation errors
        if (error.detail && Array.isArray(error.detail)) {
          errorDetail = error.detail.map((e: any) => `${e.loc?.join('.')} : ${e.msg}`).join(', ');
        } else if (typeof error.detail === 'string') {
          errorDetail = error.detail;
        } else if (error.message) {
          errorDetail = error.message;
        } else {
          errorDetail = JSON.stringify(error);
        }
      } catch (e) {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    try {
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // SSE format: each event is "data: content\n\n"
        // Split by the event boundary pattern, not by single \n
        // This preserves newlines WITHIN the content
        while (buffer.includes("\n\ndata: ") || buffer.includes("\n\n[DONE]")) {
          let eventEnd = buffer.indexOf("\n\ndata: ");
          if (eventEnd === -1) {
            eventEnd = buffer.indexOf("\n\n");
          }
          
          if (eventEnd !== -1) {
            const event = buffer.slice(0, eventEnd);
            buffer = buffer.slice(eventEnd + 2);  // Skip the \n\n
            
            // Process the event
            if (event.startsWith("data: ")) {
              const data = event.slice(6);
              
              if (data === "[DONE]") {
                return;
              }
              if (data.startsWith("{")) {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                  if (parsed.payment_required) {
                    yield parsed as PaymentRequest;
                  }
                } catch (e) {
                  yield data;
                }
              } else {
                // Text content with newlines preserved!
                yield data;
              }
            }
          } else {
            break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const api = new ApiClient();

