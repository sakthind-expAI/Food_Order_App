
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useMemo, useState, useEffect, useCallback } from "react";
import { GenerateContentConfig, GenerateContentResponse, Content, Part } from "@google/genai";
import { GenAIGeminiClient } from "../lib/gemini-client";
import { GeminiLogEvent } from "../../types";
import { createLoggerStore, LoggerStore } from "../../lib/create-logger-store";

/**
 * API Key Configuration
 * 
 * This hook supports two runtime environments:
 * 
 * 1. Vite (local development)
 *    - Run with: npm run dev
 *    - Set your API key in .env file as: VITE_GEMINI_API_KEY=your_key_here
 * 
 * 2. AI Studio (browser-based IDE)
 *    - Copy the src/ folder into AI Studio
 *    - AI Studio automatically provides the API key via process.env.API_KEY
 */
declare const process: { env?: { API_KEY?: string } } | undefined;

function getApiKey(): string {
  // Try Vite environment first (local development)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
    return (import.meta as any).env.VITE_GEMINI_API_KEY;
  }

  // Try AI Studio environment
  if (typeof process !== 'undefined' && process?.env?.API_KEY) {
    return process.env.API_KEY;
  }

  return '';
}

export type UseCoreAPIResults = {
  client: GenAIGeminiClient;
  connected: boolean;
  isAwaitingResponse: boolean;
  hasUnreadResponse: boolean;
  clearUnreadResponse: () => void;
  generateContent: (contents: Content[]) => Promise<GenerateContentResponse>;
  generateContentStream: (
    contents: Content[],
    onUpdate: (text: string) => void
  ) => Promise<string | void>;
  startChat: (history?: Content[]) => void;
  endChat: () => void;
  sendMessage: (message: Part[]) => Promise<GenerateContentResponse>;
  sendMessageStream: (onUpdate: (text: string) => void, message: Part[]) => Promise<void>;
  getHistory: () => Content[];
  model: string;
  setModel: (model: string) => void;
  config: GenerateContentConfig;
  setConfig: (config: GenerateContentConfig) => void;
  placeholder: string;
  setPlaceholder: (placeholder: string) => void;
  welcomeMessage: string;
  setWelcomeMessage: (message: string) => void;
  autoApproveFunctionCalls: boolean;
  setAutoApproveFunctionCalls: (autoApprove: boolean) => void;
  functionCallingEnabled: boolean;
  setFunctionCallingEnabled: (value: boolean) => void;
  loggerStore: LoggerStore<GeminiLogEvent>;
};

export function useGeminiAPI(): UseCoreAPIResults {
  const apiKey = useMemo(() => {
    const key = getApiKey();
    if (!key) {
      throw new Error(
        "API key not found. " +
        "For local development, set VITE_GEMINI_API_KEY in your .env file. " +
        "In AI Studio, the key is provided automatically."
      );
    }
    return key;
  }, []);

  const client = useMemo(() => new GenAIGeminiClient({ apiKey }), [apiKey]);
  const [model, setModel] = useState<string>("gemini-3-flash-preview");
  const [config, setConfig] = useState<GenerateContentConfig>({});
  const [placeholder, setPlaceholder] = useState<string>("Type a message...");
  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [autoApproveFunctionCalls, setAutoApproveFunctionCalls] = useState<boolean>(false);
  const [functionCallingEnabled, setFunctionCallingEnabled] = useState<boolean>(true);
  const [connected, setConnected] = useState<boolean>(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState<boolean>(false);
  const [hasUnreadResponse, setHasUnreadResponse] = useState<boolean>(false);

  const clearUnreadResponse = useCallback(() => {
    setHasUnreadResponse(false);
  }, []);

  // Create instance-specific logger store
  const loggerStore = useMemo(() => createLoggerStore<GeminiLogEvent>(), []);
  const logToStore = loggerStore.getState().log;

  useEffect(() => {
    const onLog = (log: GeminiLogEvent) => {
      logToStore(log);
    };
    // Type assertions needed for AI Studio compatibility - its CDN-based environment
    // doesn't properly resolve eventemitter3 types inherited by the client class
    (client as any).on("log", onLog);
    return () => {
      (client as any).off("log", onLog);
    };
  }, [client, logToStore]);

  useEffect(() => {
    const onFunctionCalls = (functionCalls: any) => {
      if (autoApproveFunctionCalls) {
        // Re-emit as approvedfunctioncalls to trigger execution
        // Type assertion needed for AI Studio compatibility - its CDN-based environment
        // doesn't properly resolve eventemitter3 types inherited by the client class
        (client as any).emit("approvedfunctioncalls", functionCalls);
      } else {
        // If auto-approve is off, trigger review in logger (no action yet)
        logToStore({
          date: new Date(),
          direction: 'internal',
          type: 'app-review-functions',
          message: { functionCalls },
        });
      }
    };

    const onApprovedFunctionCalls = (functionCalls: any) => {
      logToStore({
        date: new Date(),
        direction: 'internal',
        type: 'app-approve-functions',
        message: { functionCalls, action: autoApproveFunctionCalls ? 'auto-approve' : 'run' },
      });
    };

    const onRejectedFunctionCalls = (functionCalls: any) => {
      logToStore({
        date: new Date(),
        direction: 'internal',
        type: 'app-reject-functions',
        message: { functionCalls, action: 'reject' },
      });
    };

    // Type assertions needed for AI Studio compatibility - see comment above
    (client as any).on("functioncalls", onFunctionCalls);
    (client as any).on("approvedfunctioncalls", onApprovedFunctionCalls);
    (client as any).on("rejectedfunctioncalls", onRejectedFunctionCalls);
    return () => {
      (client as any).off("functioncalls", onFunctionCalls);
      (client as any).off("approvedfunctioncalls", onApprovedFunctionCalls);
      (client as any).off("rejectedfunctioncalls", onRejectedFunctionCalls);
    };
  }, [client, autoApproveFunctionCalls, logToStore]);

  const getEffectiveConfig = useCallback(
    (config: GenerateContentConfig) => {
      let effectiveConfig = config;

      // Remove tools if function calling is disabled
      if (!functionCallingEnabled) {
        const { tools, ...rest } = config;
        effectiveConfig = rest;
      }

      // Always add thinking config
      return {
        ...effectiveConfig,
        thinkingConfig: { ...effectiveConfig.thinkingConfig, includeThoughts: true },
      };
    },
    [functionCallingEnabled]
  );

  const boundSetModel = useCallback((newModel: string) => {
    setModel(newModel);
    logToStore({
      date: new Date(),
      direction: 'internal',
      type: 'app-set-model',
      message: { model: newModel },
    });
  }, [logToStore]);

  const boundSetConfig = useCallback((newConfig: GenerateContentConfig) => {
    setConfig(newConfig);
    logToStore({
      date: new Date(),
      direction: 'internal',
      type: 'app-set-config',
      message: { config: newConfig },
    });
  }, [logToStore]);

  const boundSetPlaceholder = useCallback((newPlaceholder: string) => {
    setPlaceholder(newPlaceholder);
    logToStore({
      date: new Date(),
      direction: 'internal',
      type: 'app-set-placeholder',
      message: { placeholder: newPlaceholder },
    });
  }, [logToStore]);

  const boundSetWelcomeMessage = useCallback((newWelcomeMessage: string) => {
    setWelcomeMessage(newWelcomeMessage);
    logToStore({
      date: new Date(),
      direction: 'internal',
      type: 'app-set-welcome',
      message: { welcomeMessage: newWelcomeMessage },
    });
  }, [logToStore]);

  const boundGenerateContent = useCallback(
    (contents: Content[]) => {
      return client.generateContent(model, contents, getEffectiveConfig(config));
    },
    [client, model, config, getEffectiveConfig]
  );
  const boundGenerateContentStream = useCallback(
    (contents: Content[], onUpdate: (text: string) => void) => {
      return client.generateContentStream(onUpdate, model, contents, getEffectiveConfig(config));
    },
    [client, model, config, getEffectiveConfig]
  );

  const boundStartChat = useCallback(
    (history?: Content[]) => {
      // Not sending config as StartChat for now, sending with each message
      client.startChat(model, undefined, history);
      setConnected(true);
    },
    [client, model]
  );

  const boundEndChat = useCallback(
    () => {
      setConnected(false);
    },
    []
  );

  const boundSendMessage = useCallback(
    async (message: Part[]) => {
      setIsAwaitingResponse(true);
      try {
        const response = await client.sendMessage(message, getEffectiveConfig(config));
        setHasUnreadResponse(true);
        return response;
      } finally {
        setIsAwaitingResponse(false);
      }
    },
    [client, config, getEffectiveConfig]
  );

  const boundSendMessageStream = useCallback(
    async (onUpdate: (text: string) => void, message: Part[]) => {
      setIsAwaitingResponse(true);
      try {
        await client.sendMessageStream(onUpdate, message, getEffectiveConfig(config));
        setHasUnreadResponse(true);
      } finally {
        setIsAwaitingResponse(false);
      }
    },
    [client, config, getEffectiveConfig]
  );

  const boundGetHistory = useCallback(
    () => {
      return client.getHistory();
    },
    [client]
  );

  return {
    client,
    connected,
    isAwaitingResponse,
    hasUnreadResponse,
    clearUnreadResponse,
    config,
    setConfig: boundSetConfig,
    model,
    setModel: boundSetModel,
    placeholder,
    setPlaceholder: boundSetPlaceholder,
    welcomeMessage,
    setWelcomeMessage: boundSetWelcomeMessage,
    autoApproveFunctionCalls,
    setAutoApproveFunctionCalls,
    functionCallingEnabled,
    setFunctionCallingEnabled,
    generateContent: boundGenerateContent,
    generateContentStream: boundGenerateContentStream,
    startChat: boundStartChat,
    endChat: boundEndChat,
    sendMessage: boundSendMessage,
    sendMessageStream: boundSendMessageStream,
    getHistory: boundGetHistory,
    loggerStore,
  };
}
