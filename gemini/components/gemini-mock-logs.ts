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

/**
 * this module is just mock data, intended to make it easier to develop and style the logger
 */
import type { GeminiLogEvent } from "../../types";

// Mock data for Core API - using appropriate Core event types
export const mockLogs: GeminiLogEvent[] = [
  {
    date: new Date(),
    type: "send-message",
    direction: 'send',
    message: {
      message: [{ text: "Hello, how are you?" }],
    },
  },
  {
    date: new Date(),
    type: "send-message",
    direction: 'receive',
    message: {
      candidates: [
        {
          content: {
            parts: [{ text: "I'm doing well, thank you! How can I help you today?" }],
          },
        },
      ],
    },
  },
  {
    date: new Date(),
    type: "function-call",
    direction: 'receive',
    message: {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "get_weather",
                  args: { location: "San Francisco" },
                },
              },
            ],
          },
        },
      ],
    },
  },
  {
    date: new Date(),
    type: "app-review-functions",
    direction: 'internal',
    message: {
      functionCalls: [
        {
          id: "test-123",
          name: "get_weather",
          args: { location: "San Francisco" },
        },
      ],
    },
  },
  {
    date: new Date(),
    type: "app-approve-functions",
    direction: 'internal',
    message: {
      functionCalls: [
        {
          id: "test-123",
          name: "get_weather",
          args: { location: "San Francisco" },
        },
      ],
      action: "run",
    },
  },
  {
    date: new Date(),
    type: "function-response",
    direction: 'send',
    message: {
      candidates: [
        {
          content: {
            parts: [
              {
                functionResponse: {
                  name: "get_weather",
                  response: { temperature: 72, conditions: "sunny" },
                },
              },
            ],
          },
        },
      ],
    },
  },
];
