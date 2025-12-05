const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  rowCount: string;
  columnCount: number;
  updatedAt: string;
  image: string;
  schema: ColumnSchema[];
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
  payment_details: {
    challenge_id: string;
    recipient: string;
    amount: number;
    amount_lamports: number;
    currency: string;
    resource_id: string;
    description: string;
    timestamp: number;
    expires_at: number;
  };
};

export type PaymentConfirmation = {
  query_id: string;
  transaction_signature: string;
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
    return this.fetch<Dataset>(`/api/datasets/${slug}`);
  }

  async getTags(): Promise<TagsResponse> {
    return this.fetch<TagsResponse>("/api/datasets/tags");
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

