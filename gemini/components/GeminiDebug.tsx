
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
import { OverlayPosition } from "../../types";

export type GeminiDebugProps = {
  agentName?: string;
  initialOverlayPosition?: OverlayPosition;
  isOpen?: boolean;
  onClose?: () => void;
  welcomeMessage?: string;
  placeholder?: string;
  initialAutoApprove?: boolean;
  showApprovalSelector?: boolean;
  // Added showModelSelector to GeminiDebugProps
  showModelSelector?: boolean;
};

/**
 * A debug overlay component for the Gemini API.
 * Pre-configured with:
 * - Overlay display mode with draggable positioning
 * - Full logger with filter and style selectors
 * - All input controls visible
 */
function GeminiDebug({
  agentName = "Gemini Debug",
  initialOverlayPosition = "side",
  isOpen = true,
  onClose,
  welcomeMessage,
  placeholder,
  initialAutoApprove = false,
  showApprovalSelector = true,
  // Added showModelSelector parameter with default value
  showModelSelector = true,
}: GeminiDebugProps) {
  return (
    <GeminiCustomConsole
      agentName={agentName}
      displayMode="overlay"
      initialOverlayPosition={initialOverlayPosition}
      enableOverlayPositionSelector={true}
      showInput={true}
      showLogger={true}
      enableLogStyleSelector={true}
      enableLogFilterSelector={true}
      initialLogStyle="chat"
      autoConnect={true}
      isOpen={isOpen}
      onClose={onClose}
      welcomeMessage={welcomeMessage}
      placeholder={placeholder}
      initialAutoApprove={initialAutoApprove}
      showApprovalSelector={showApprovalSelector}
      // Pass showModelSelector prop to GeminiCustomConsole
      showModelSelector={showModelSelector}
    />
  );
}

export default GeminiDebug;
