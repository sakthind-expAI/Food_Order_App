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

import { GoogleGenAIOptions } from "@google/genai";
import { GeminiLoggerType } from "./gemini/lib/gemini-log-filters";

// ===== Client Options =====

/**
 * the options to initiate the client, ensure apiKey is required
 */
export type GeminiClientOptions = GoogleGenAIOptions & { apiKey: string };

// ===== Log Types =====

// Log direction
export type LogDirection = "send" | "receive" | "internal";

// Shared app events (both APIs use these)
export type SharedAppLogEventType =
  | "app-set-model"
  | "app-set-config"
  | "app-set-placeholder"
  | "app-set-welcome";

// Core API events - maps to genai client methods
export type GeminiLogEventType =
  | "generate-content" // generateContent request/response
  | "generate-content-stream" // generateContentStream chunks
  | "send-message" // chat.sendMessage request/response
  | "send-message-stream" // chat.sendMessageStream chunks
  | "function-call" // detected function calls in response
  | "function-response" // function responses in next request
  // Core-specific app events for function approval
  | "app-review-functions" // user needs to approve
  | "app-approve-functions" // user approved
  | "app-reject-functions"; // user rejected

export type GeminiLogEvent = {
  date: Date;
  direction: LogDirection;
  type: GeminiLogEventType | SharedAppLogEventType;
  message: any;
  count?: number;
};

// ===== Console Display Types =====

export type DisplayMode = "overlay" | "inline";

export type OverlayPosition = "side" | "fullscreen" | "minimized";

export type LogStyle = "console" | "chat" | "plaintext";

// ===== Console Props =====

export type GeminiCustomConsoleProps = {
  agentName?: string;

  // Display
  displayMode?: DisplayMode;
  initialOverlayPosition?: OverlayPosition;
  enableOverlayPositionSelector?: boolean;

  // Visibility toggles
  showInput?: boolean;
  showLogger?: boolean;
  showApprovalSelector?: boolean;
  showModelSelector?: boolean;

  // Logger settings
  enableLogStyleSelector?: boolean;
  initialLogStyle?: LogStyle;
  enableLogFilterSelector?: boolean;
  initialLogFilter?: GeminiLoggerType;

  // Connection
  autoConnect?: boolean;

  // Content customization
  welcomeMessage?: string;
  placeholder?: string;
  initialAutoApprove?: boolean;
};

// ===== Console Option Arrays =====

export const logStyleOptions = [
  { value: "console" as const, label: "Console view" },
  { value: "chat" as const, label: "Chat view" },
  { value: "plaintext" as const, label: "Plaintext view" },
];

export const voiceOptions = [
  { value: "Puck", label: "Puck" },
  { value: "Charon", label: "Charon" },
  { value: "Kore", label: "Kore" },
  { value: "Fenrir", label: "Fenrir" },
  { value: "Aoede", label: "Aoede" },
];

export const responseModalityOptions = [
  { value: "audio" as const, label: "Audio" },
  { value: "text" as const, label: "Text" },
];

export const modelOptions = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
];

export const functionApprovalOptions = [
  { value: "manual", label: "Require approval" },
  { value: "auto", label: "Auto approve functions" },
];
