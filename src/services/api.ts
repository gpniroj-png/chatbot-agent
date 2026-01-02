/**
 * ChatbotAPI Service
 * Supports multiple AI providers: Groq, Gemini, and HuggingFace
 * Includes streaming capabilities for real-time responses
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamOptions {
  onChunk?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  abortSignal?: AbortSignal;
}

export interface ApiConfig {
  provider: 'groq' | 'gemini' | 'huggingface';
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * ChatbotAPI class for managing multi-provider AI interactions
 */
export class ChatbotAPI {
  private apiKey: string;
  private provider: 'groq' | 'gemini' | 'huggingface';
  private model: string;
  private temperature: number;
  private maxTokens: number;

  // Provider-specific endpoints
  private readonly ENDPOINTS = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
    huggingface: 'https://api-inference.huggingface.co/models',
  };

  // Default models for each provider
  private readonly DEFAULT_MODELS = {
    groq: 'mixtral-8x7b-32768',
    gemini: 'gemini-2.0-flash',
    huggingface: 'mistralai/Mistral-7B-Instruct-v0.1',
  };

  constructor(config: ApiConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.model = config.model || this.DEFAULT_MODELS[this.provider];
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;

    if (!this.apiKey) {
      throw new Error(`API key is required for ${this.provider}`);
    }
  }

  /**
   * Send a chat message and get a response
   */
  async chat(
    messages: ChatMessage[],
    options?: Omit<StreamOptions, 'onChunk'>
  ): Promise<ChatResponse> {
    switch (this.provider) {
      case 'groq':
        return this.chatGroq(messages, options);
      case 'gemini':
        return this.chatGemini(messages, options);
      case 'huggingface':
        return this.chatHuggingFace(messages, options);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Send a streaming chat message
   */
  async chatStream(
    messages: ChatMessage[],
    options: StreamOptions
  ): Promise<void> {
    switch (this.provider) {
      case 'groq':
        return this.chatStreamGroq(messages, options);
      case 'gemini':
        return this.chatStreamGemini(messages, options);
      case 'huggingface':
        return this.chatStreamHuggingFace(messages, options);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Groq API Implementation
   */
  private async chatGroq(
    messages: ChatMessage[],
    options?: Omit<StreamOptions, 'onChunk'>
  ): Promise<ChatResponse> {
    const response = await fetch(this.ENDPOINTS.groq, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      }),
      signal: options?.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.statusText} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      provider: 'groq',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Groq Streaming Implementation
   */
  private async chatStreamGroq(
    messages: ChatMessage[],
    options: StreamOptions
  ): Promise<void> {
    const response = await fetch(this.ENDPOINTS.groq, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream: true,
      }),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.statusText} - ${error}`);
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    await this.processStream(response.body, options);
  }

  /**
   * Gemini API Implementation
   */
  private async chatGemini(
    messages: ChatMessage[],
    options?: Omit<StreamOptions, 'onChunk'>
  ): Promise<ChatResponse> {
    const requestBody = {
      contents: messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
    };

    const response = await fetch(
      `${this.ENDPOINTS.gemini}/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: options?.abortSignal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: this.model,
      provider: 'gemini',
    };
  }

  /**
   * Gemini Streaming Implementation
   */
  private async chatStreamGemini(
    messages: ChatMessage[],
    options: StreamOptions
  ): Promise<void> {
    const requestBody = {
      contents: messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
    };

    const response = await fetch(
      `${this.ENDPOINTS.gemini}/${this.model}:streamGenerateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: options.abortSignal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${error}`);
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    await this.processStreamGemini(response.body, options);
  }

  /**
   * HuggingFace API Implementation
   */
  private async chatHuggingFace(
    messages: ChatMessage[],
    options?: Omit<StreamOptions, 'onChunk'>
  ): Promise<ChatResponse> {
    const formattedMessages = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await fetch(
      `${this.ENDPOINTS.huggingface}/${this.model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: formattedMessages,
          parameters: {
            max_new_tokens: this.maxTokens,
            temperature: this.temperature,
          },
        }),
        signal: options?.abortSignal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `HuggingFace API error: ${response.statusText} - ${error}`
      );
    }

    const data = await response.json();
    const content = Array.isArray(data)
      ? data[0]?.generated_text || ''
      : data?.generated_text || '';

    return {
      content,
      model: this.model,
      provider: 'huggingface',
    };
  }

  /**
   * HuggingFace Streaming Implementation
   */
  private async chatStreamHuggingFace(
    messages: ChatMessage[],
    options: StreamOptions
  ): Promise<void> {
    const formattedMessages = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await fetch(
      `${this.ENDPOINTS.huggingface}/${this.model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: formattedMessages,
          parameters: {
            max_new_tokens: this.maxTokens,
            temperature: this.temperature,
            details: true,
          },
          stream: true,
        }),
        signal: options.abortSignal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `HuggingFace API error: ${response.statusText} - ${error}`
      );
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    await this.processStreamHuggingFace(response.body, options);
  }

  /**
   * Process streaming response (Groq, OpenAI-compatible)
   */
  private async processStream(
    body: ReadableStream<Uint8Array>,
    options: StreamOptions
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          options.onComplete?.();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              options.onComplete?.();
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content =
                parsed.choices?.[0]?.delta?.content || '';

              if (content) {
                options.onChunk?.(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        options.onError?.(error);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Process streaming response (Gemini)
   */
  private async processStreamGemini(
    body: ReadableStream<Uint8Array>,
    options: StreamOptions
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          options.onComplete?.();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              const content =
                parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';

              if (content) {
                options.onChunk?.(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        options.onError?.(error);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Process streaming response (HuggingFace)
   */
  private async processStreamHuggingFace(
    body: ReadableStream<Uint8Array>,
    options: StreamOptions
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          options.onComplete?.();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              const content = parsed.token?.text || '';

              if (content) {
                options.onChunk?.(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        options.onError?.(error);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Omit<ApiConfig, 'apiKey'> {
    return {
      provider: this.provider,
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<Omit<ApiConfig, 'provider' | 'apiKey'>>): void {
    if (config.model) this.model = config.model;
    if (config.temperature !== undefined)
      this.temperature = config.temperature;
    if (config.maxTokens !== undefined) this.maxTokens = config.maxTokens;
  }
}

/**
 * Factory function to create ChatbotAPI instance
 */
export function createChatbotAPI(config: ApiConfig): ChatbotAPI {
  return new ChatbotAPI(config);
}
