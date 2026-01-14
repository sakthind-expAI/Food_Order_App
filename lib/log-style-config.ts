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

import { Part } from "@google/genai";
import { LogStyle } from "../types";

/**
 * All renderable element types in a log.
 * Includes Gemini API Part types AND config elements.
 */
export type ElementType =
  // Config elements (not Part)
  | 'modelConfig'
  | 'systemInstruction'
  | 'tool'
  | 'placeholder'
  | 'welcomeMessage'
  // Part types (from Gemini API Part interface)
  | 'text'
  | 'thought'
  | 'inlineData'
  | 'fileData'
  | 'functionCall'
  | 'functionResponse'
  | 'executableCode'
  | 'codeExecutionResult'
  // App elements (Core API)
  | 'appFunctionReview'
  | 'appFunctionStatus';

/** A set of visible elements, or 'all' for no filtering */
export type ElementFilter = Set<ElementType> | 'all';

/** Display options for log entries */
export type DisplayOptions = {
  showTimestamp: boolean;
  showRoleHeader: boolean;
  showLogType: boolean;
  showCount: boolean;
  usePlainText: boolean;  // Use AnyMessage component for all logs
};

/** Configuration for a log style */
export type LogStyleConfig = {
  visibleElements: ElementFilter;
  displayOptions: DisplayOptions;
};

/** Style configurations indexed by LogStyle */
export const logStyleConfigs: Record<LogStyle, LogStyleConfig> = {
  console: {
    visibleElements: 'all',
    displayOptions: {
      showTimestamp: true,
      showRoleHeader: true,
      showLogType: true,
      showCount: true,
      usePlainText: false,
    },
  },
  chat: {
    visibleElements: new Set<ElementType>([
      'text',
      'functionCall',
      'functionResponse',
      'welcomeMessage',
      'appFunctionReview',
      'appFunctionStatus',
      'systemInstruction',
      'tool',
    ]),
    displayOptions: {
      showTimestamp: false,
      showRoleHeader: false,
      showLogType: false,
      showCount: false,
      usePlainText: false,
    },
  },
  plaintext: {
    visibleElements: 'all',
    displayOptions: {
      showTimestamp: true,
      showRoleHeader: true,
      showLogType: true,
      showCount: true,
      usePlainText: true,  // Use AnyMessage for all logs
    },
  },
};

/** Check if an element type is visible */
export function isVisible(element: ElementType, filter: ElementFilter): boolean {
  return filter === 'all' || filter.has(element);
}

/** Check if a Part should be visible based on its type */
export function isPartVisible(part: Part, filter: ElementFilter): boolean {
  if (filter === 'all') return true;
  if (part.thought === true) return filter.has('thought');
  if (part.text !== undefined && part.text.length > 0) return filter.has('text');
  if (part.functionCall !== undefined) return filter.has('functionCall');
  if (part.functionResponse !== undefined) return filter.has('functionResponse');
  if (part.executableCode !== undefined) return filter.has('executableCode');
  if (part.codeExecutionResult !== undefined) return filter.has('codeExecutionResult');
  if (part.inlineData !== undefined) return filter.has('inlineData');
  if (part.fileData !== undefined) return filter.has('fileData');
  return false;
}

/**
 * Check if an app log (app-set-model, app-set-config, etc.) has visible content.
 * Returns false if all showable content is null/undefined.
 */
export function isAppLogVisible(message: any, filter: ElementFilter): boolean {
  if (!message || typeof message !== 'object') return false;

  const { model, config, placeholder, welcomeMessage, functionCalls } = message;

  // Check each field that could make the log visible
  if (model && isVisible('modelConfig', filter)) return true;
  if (config?.systemInstruction && isVisible('systemInstruction', filter)) return true;
  if ((config?.tools?.length ?? 0) > 0 && isVisible('tool', filter)) return true;
  if (placeholder && isVisible('placeholder', filter)) return true;
  if (welcomeMessage && isVisible('welcomeMessage', filter)) return true;
  if (functionCalls && isVisible('appFunctionReview', filter)) return true;

  return false;
}
