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

import { GeminiLogEvent, GeminiLogEventType, SharedAppLogEventType } from '../../types';
import { and, or, not, LogFilter } from '../../lib/log-filter-utils';

type CoreLogFilter = LogFilter<GeminiLogEvent>;

// Basic filters
const byType = (type: GeminiLogEventType | SharedAppLogEventType): CoreLogFilter =>
  (log) => log.type === type;

const isSend = (log: GeminiLogEvent) => log.direction === 'send';
const isReceive = (log: GeminiLogEvent) => log.direction === 'receive';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isInternal = (log: GeminiLogEvent) => log.direction === 'internal';

/**
  * Composite filters
  * Define any filters you want here and they will appear in the dropdown menu for the core logger
  */
export const coreFilters = {
  conversations: or(
    and(
      or(byType('send-message'), byType('generate-content')),
      or(isSend, isReceive)
    ),
    byType('function-call'),
    byType('app-set-welcome'),
    byType('app-review-functions'),
    byType('app-approve-functions'),
    byType('app-reject-functions'),
  ),

  tools: or(
    byType("function-call"),
    byType("function-response"),
    byType("app-approve-functions"),
    byType("app-reject-functions"),
    byType("app-review-functions")
  ),

  all: () => true,
} as const;

export type GeminiLoggerType = keyof (typeof coreFilters);
