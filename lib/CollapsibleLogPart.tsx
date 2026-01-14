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

import React, { useState } from "react";
import cn from "classnames";

export type CollapsibleLogPartProps = {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  icon?: string;
};

/**
 * A collapsible wrapper for verbose log content (thinking, function calls, etc.)
 * Shows a rotating triangle toggle that animates on expand/collapse.
 */
export const CollapsibleLogPart: React.FC<CollapsibleLogPartProps> = ({
  title,
  children,
  defaultExpanded = true,
  className,
  icon,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("part", "collapsible-part", className, { expanded: isExpanded })}>
      <h5
        className="collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {icon && <span className="material-symbols-outlined header-icon">{icon}</span>}
        {title}
        <span className="material-symbols-outlined toggle-icon">
          arrow_drop_down
        </span>
      </h5>
      <div className="collapsible-content">
        {children}
      </div>
    </div>
  );
};

export default CollapsibleLogPart;
