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

import GeminiCustomConsole from "./GeminiCustomConsole";

export type GeminiChatProps = {
  agentName?: string;
};

/**
 * A simplified inline chat component for the Gemini API.
 * Pre-configured with:
 * - Inline display mode (no overlay)
 * - Hidden overlay controls
 * - Hidden logger controls
 * - Input and logger visible
 */
function GeminiChat({ agentName = "Gemini Chat" }: GeminiChatProps) {
  return (
    <GeminiCustomConsole
      agentName={agentName}
      displayMode="inline"
      enableOverlayPositionSelector={false}
      showInput={true}
      showLogger={true}
      enableLogStyleSelector={false}
      enableLogFilterSelector={false}
      initialLogStyle="chat"
    />
  );
}

export default GeminiChat;
