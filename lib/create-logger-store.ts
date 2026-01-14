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

import { createStore } from "zustand/vanilla";

/**
 * Base log event interface that both GeminiLogEvent and GeminiLiveLogEvent conform to.
 */
export interface BaseLogEvent {
  date: Date;
  direction: "send" | "receive" | "internal";
  type: string;
  message: any;
  count?: number;
}

/**
 * Generic logger state for any log event type.
 */
export interface LoggerState<TLog extends BaseLogEvent> {
  maxLogs: number;
  logs: TLog[];
  log: (logEvent: TLog) => void;
  clearLogs: () => void;
}

/**
 * Generic logger store type for any log event type.
 */
export type LoggerStore<TLog extends BaseLogEvent> = ReturnType<typeof createLoggerStore<TLog>>;

/**
 * Creates a generic logger store that can be used with any log event type.
 * Handles log deduplication (incrementing count for consecutive identical logs)
 * and maintains a maximum log limit.
 */
export function createLoggerStore<TLog extends BaseLogEvent>() {
  return createStore<LoggerState<TLog>>((set, get) => ({
    maxLogs: 100,
    logs: [],
    log: ({ date, type, direction, message }: TLog) => {
      set((state) => {
        const prevLog = state.logs[state.logs.length - 1];
        if (prevLog && prevLog.type === type && prevLog.message === message) {
          return {
            logs: [
              ...state.logs.slice(0, -1),
              {
                date,
                direction,
                type,
                message,
                count: prevLog.count ? prevLog.count + 1 : 1,
              } as TLog,
            ],
          };
        }
        return {
          logs: [
            ...state.logs.slice(-(get().maxLogs - 1)),
            {
              date,
              direction,
              type,
              message,
            } as TLog,
          ],
        };
      });
    },

    clearLogs: () => {
      console.log("clear log");
      set({ logs: [] });
    },
  }));
}
