/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Copyright 2025 Google LLC
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

export type LogFilter<T> = (log: T) => boolean;

// Combinator functions
export function and<T>(...filters: LogFilter<T>[]): LogFilter<T> {
  return (log: T) => filters.every(f => f(log));
}

export function or<T>(...filters: LogFilter<T>[]): LogFilter<T> {
  return (log: T) => filters.some(f => f(log));
}

export function not<T>(filter: LogFilter<T>): LogFilter<T> {
  return (log: T) => !filter(log);
}
