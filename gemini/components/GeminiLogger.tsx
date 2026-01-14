
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



import cn from "classnames";
import React, { memo, ReactNode } from "react";
import { useStore } from "zustand";
import { useGeminiAPIContext } from "../contexts/GeminiAPIContext";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import {
  GeminiLogEvent,
} from "../../types";
import {
  Part,
  SendMessageParameters,
  Tool,
  ContentUnion,
} from "@google/genai";
import { coreFilters, GeminiLoggerType } from "../lib/gemini-log-filters";
import { logStyleConfigs, DisplayOptions, ElementFilter, isVisible, isPartVisible, isAppLogVisible } from "../../lib/log-style-config";
import { LogStyle } from "../../types";
import { CollapsibleLogPart } from "../../lib/CollapsibleLogPart";

// Custom theme based on vs2015 with background matching app colors
const customTheme = {
  ...vs2015,
  hljs: {
    ...vs2015.hljs,
    background: "var(--Neutral-15)",
    scrollbarColor: "var(--Neutral-30) var(--Neutral-15)",
  },
};

const formatTime = (d: Date) => d.toLocaleTimeString().slice(0, -3);

// Track which response IDs have had their functions executed/rejected
// This persists across re-renders and is shared across all log instances
type ActionType = 'run' | 'reject';
const executedResponseActions = new Map<string, ActionType>();

const LogEntry = memo(
  ({
    log,
    MessageComponent,
    displayOptions,
  }: {
    log: GeminiLogEvent;
    MessageComponent: ({
      message,
    }: {
      message: GeminiLogEvent["message"];
    }) => ReactNode;
    displayOptions: DisplayOptions;
  }): React.ReactElement => {
    return (
      <li
        className={cn(
          `plain-log`,
          `direction-${log.direction}`,
          {
            receive: log.direction === 'receive',
            send: log.direction === 'send',
          }
        )}
      >
        {displayOptions.showTimestamp && <span className="timestamp">{formatTime(log.date)}</span>}
        {displayOptions.showLogType && <span className="source">{log.type}</span>}
        <div className="message">
          <MessageComponent message={log.message} />
        </div>
        {displayOptions.showCount && log.count && log.count > 1 && <span className="count">{log.count}</span>}
      </li>
    );
  }
);

const PlainTextMessage = ({
  message,
}: {
  message: GeminiLogEvent["message"];
}) => <span>{message as string}</span>;

type Message = { message: GeminiLogEvent["message"]; filter?: GeminiLoggerType; visibleElements?: ElementFilter; defaultExpanded?: boolean };

const AnyMessage = ({ message }: Message

) => (
  <pre>{JSON.stringify(message, null, "  ")}</pre>
);

function tryParseCodeExecutionResult(output: string) {
  try {
    const json = JSON.parse(output);
    return JSON.stringify(json, null, "  ");
  } catch (e) {
    return output;
  }
}

function hasFunctionResponses(parts: Part[]): boolean {
  return parts.some(part => part && part.functionResponse);
}

// Render components

const RenderPart = memo(({ part, defaultExpanded = true }: { part: Part; defaultExpanded?: boolean }) => {
  if (part.thought) {
    return (
      <CollapsibleLogPart
        title="Thinking"
        icon="short_text"
        defaultExpanded={defaultExpanded}
        className="part-thought"
      >
        <p className="part-text" style={{ color: "var(--Neutral-60)" }}>{part.text}</p>
      </CollapsibleLogPart>
    );
  }
  if (part.text && part.text.length) {
    return <p className="part part-text">{part.text}</p>;
  }
  if (part.executableCode) {
    return (
      <CollapsibleLogPart
        title={`Run executable code: ${part.executableCode.language}`}
        icon="play_arrow"
        defaultExpanded={defaultExpanded}
        className="part-executableCode"
      >
        <SyntaxHighlighter
          language={part.executableCode!.language!.toLowerCase()}
          style={customTheme}
        >
          {part.executableCode!.code!}
        </SyntaxHighlighter>
      </CollapsibleLogPart>
    );
  }
  if (part.codeExecutionResult) {
    return (
      <CollapsibleLogPart
        title={`Send code execution result: ${part.codeExecutionResult!.outcome}`}
        icon="output"
        defaultExpanded={defaultExpanded}
        className="part-codeExecutionResult"
      >
        <SyntaxHighlighter language="json" style={customTheme}>
          {tryParseCodeExecutionResult(part.codeExecutionResult!.output!)}
        </SyntaxHighlighter>
      </CollapsibleLogPart>
    );
  }
  if (part.functionCall) {
    return (
      <CollapsibleLogPart
        title={`Call function: ${part.functionCall.name}`}
        icon="terminal"
        defaultExpanded={defaultExpanded}
        className="part-functioncall"
      >
        <SyntaxHighlighter language="json" style={customTheme}>
          {JSON.stringify(part.functionCall, null, "  ")}
        </SyntaxHighlighter>
      </CollapsibleLogPart>
    );
  }
  if (part.functionResponse) {
    return (
      <CollapsibleLogPart
        title={`Send function response: ${part.functionResponse!.name}`}
        icon="output"
        defaultExpanded={defaultExpanded}
        className="part-functionresponse"
      >
        <SyntaxHighlighter language="json" style={customTheme}>
          {JSON.stringify(part.functionResponse, null, "  ")}
        </SyntaxHighlighter>
      </CollapsibleLogPart>
    );
  }
  if (part.inlineData) {
    return (
      <div className="part part-inlinedata">
        <h5>Send inline Data: {part.inlineData?.mimeType}</h5>
      </div>
    );
  }
  return <div className="part part-unknown">&nbsp;</div>;
});

const RenderSystemInstruction = memo(({ systemInstruction, defaultExpanded = true }: { systemInstruction: ContentUnion; defaultExpanded?: boolean }) => {
  // Handle string type
  if (typeof systemInstruction === "string") {
    return (
      <CollapsibleLogPart
        title="System instruction"
        icon="menu"
        defaultExpanded={defaultExpanded}
        className="part-system-instruction"
      >
        <p className="system-instruction-text">{systemInstruction}</p>
      </CollapsibleLogPart>
    );
  }

  // Handle Part type
  if (systemInstruction && typeof systemInstruction === "object" && "text" in systemInstruction) {
    return (
      <CollapsibleLogPart
        title="System instruction"
        icon="menu"
        defaultExpanded={defaultExpanded}
        className="part-system-instruction"
      >
        <RenderPart part={systemInstruction as Part} defaultExpanded={defaultExpanded} />
      </CollapsibleLogPart>
    );
  }

  // Handle Content type (has parts array)
  if (systemInstruction && typeof systemInstruction === "object" && "parts" in systemInstruction) {
    const content = systemInstruction as any;
    return (
      <CollapsibleLogPart
        title="System instruction"
        icon="menu"
        defaultExpanded={defaultExpanded}
        className="part-system-instruction"
      >
        {content.parts?.map((part: Part, j: number) => (
          <RenderPart part={part} key={`system-instruction-part-${j}`} defaultExpanded={defaultExpanded} />
        ))}
      </CollapsibleLogPart>
    );
  }

  // Handle PartUnion[] (array of parts)
  if (Array.isArray(systemInstruction)) {
    return (
      <CollapsibleLogPart
        title="System instruction"
        icon="menu"
        defaultExpanded={defaultExpanded}
        className="part-system-instruction"
      >
        {systemInstruction.map((item: any, j: number) => {
          if (typeof item === "string") {
            return <RenderSystemInstruction systemInstruction={item} key={`system-instruction-part-${j}`} defaultExpanded={defaultExpanded} />;
          } else {
            return <RenderPart part={item as Part} key={`system-instruction-part-${j}`} defaultExpanded={defaultExpanded} />;
          }
        })}
      </CollapsibleLogPart>
    );
  }

  // Fallback for unknown types
  return (
    <CollapsibleLogPart
      title="System instruction:"
      icon="info"
      defaultExpanded={defaultExpanded}
      className="part-system-instruction"
    >
      <SyntaxHighlighter language="json" style={customTheme}>
        {JSON.stringify(systemInstruction, null, "  ")}
      </SyntaxHighlighter>
    </CollapsibleLogPart>
  );
});

const RenderTool = memo(({ tool, defaultExpanded = true }: { tool: Tool; defaultExpanded?: boolean }) => {
  if (tool.functionDeclarations) {
    return (
      <CollapsibleLogPart
        title="Declare functions"
        icon="code_blocks"
        defaultExpanded={defaultExpanded}
        className="part-functionDeclarations"
      >
        <SyntaxHighlighter language="json" style={customTheme}>
          {JSON.stringify(tool.functionDeclarations, null, "  ")}
        </SyntaxHighlighter>
      </CollapsibleLogPart>
    );
  }
  if (tool.googleSearch) {
    return (
      <CollapsibleLogPart
        title="Google Search tool"
        icon="search"
        defaultExpanded={defaultExpanded}
        className="part-googleSearch"
      >
        <SyntaxHighlighter language="json" style={customTheme}>
          {JSON.stringify(tool.googleSearch, null, "  ")}
        </SyntaxHighlighter>
      </CollapsibleLogPart>
    );
  }
  if (tool.googleMaps) {
    return (
      <CollapsibleLogPart
        title="Google Maps tool"
        icon="map"
        defaultExpanded={defaultExpanded}
        className="part-googleMaps"
      >
        <SyntaxHighlighter language="json" style={customTheme}>
          {JSON.stringify(tool.googleMaps, null, "  ")}
        </SyntaxHighlighter>
      </CollapsibleLogPart>
    );
  }
  if (tool.urlContext) {
    return (
      <CollapsibleLogPart
        title="URL Context tool"
        icon="link"
        defaultExpanded={defaultExpanded}
        className="part-urlContext"
      >
        <SyntaxHighlighter language="json" style={customTheme}>
          {JSON.stringify(tool.urlContext, null, "  ")}
        </SyntaxHighlighter>
      </CollapsibleLogPart>
    );
  }
  if (tool.codeExecution) {
    return (
      <CollapsibleLogPart
        title="Code Execution tool"
        icon="code"
        defaultExpanded={defaultExpanded}
        className="part-codeExecution"
      >
        <SyntaxHighlighter language="json" style={customTheme}>
          {JSON.stringify(tool.codeExecution, null, "  ")}
        </SyntaxHighlighter>
      </CollapsibleLogPart>
    );
  }
  return (
    <CollapsibleLogPart
      title="Tool"
      icon="build"
      defaultExpanded={defaultExpanded}
      className="part-unknown-tool"
    >
      <SyntaxHighlighter language="json" style={customTheme}>
        {JSON.stringify(tool, null, "  ")}
      </SyntaxHighlighter>
    </CollapsibleLogPart>
  );
});

// Client logs

const GenerateContentRequestLog = memo(({ message, filter, visibleElements = 'all', defaultExpanded = true }: Message) => {
  const { model, contents, config } = message as any;

  const parts: Part[] = [];

  // Extract parts from contents array (may not exist for setModel/setConfig)
  if (contents && Array.isArray(contents)) {
    contents.forEach((content: any) => {
      if (content.parts && Array.isArray(content.parts)) {
        parts.push(...content.parts.filter((p: Part) => p != null));
      }
    });
  }

  // Filter parts based on visibleElements
  const filteredParts = parts.filter(part => isPartVisible(part, visibleElements));

  const tools: Tool[] = (config?.tools || []).filter((tool: any) =>
    tool.functionDeclarations || tool.retrieval || tool.googleSearch ||
    tool.googleMaps || tool.urlContext || tool.codeExecution
  ) as Tool[];

  const systemInstruction = config?.systemInstruction;
  const showModel = model && isVisible('modelConfig', visibleElements);
  const showSystemInstruction = systemInstruction && isVisible('systemInstruction', visibleElements);
  const showTools = tools.length > 0 && !hasFunctionResponses(parts) && isVisible('tool', visibleElements);

  return (
    <div className="rich-log client-content user">
      <h4 className="role-user">User</h4>
      {showModel && (
        <div className="part part-model">
          <h5>Config: model</h5>
          <SyntaxHighlighter language="json" style={customTheme}>
            {JSON.stringify({ model }, null, "  ")}
          </SyntaxHighlighter>
        </div>
      )}
      {showSystemInstruction && (
        <RenderSystemInstruction systemInstruction={systemInstruction} defaultExpanded={defaultExpanded} />
      )}
      {showTools && tools.map((tool: Tool, j: number) => (
        <RenderTool tool={tool} key={`tool-${j}`} defaultExpanded={defaultExpanded} />
      ))}
      {filteredParts.map((part: Part, j: number) => (
        <RenderPart part={part} key={`message-part-${j}`} defaultExpanded={defaultExpanded} />
      ))}
    </div>
  );
});

const SendMessageRequestLog = memo(({ message, filter, visibleElements = 'all', defaultExpanded = true }: Message) => {
  const { message: messagePartListUnion, config } = message as SendMessageParameters;

  const parts: Part[] = [];

  // Handle messagePartListUnion
  if (typeof messagePartListUnion === "string") {
    parts.push({ text: messagePartListUnion });
  } else if (Array.isArray(messagePartListUnion)) {
    for (const item of messagePartListUnion) {
      if (typeof item === "string") {
        parts.push({ text: item });
      } else if (item) {
        parts.push(item);
      }
    }
  } else if (messagePartListUnion) {
    parts.push(messagePartListUnion);
  }

  // Filter parts based on visibleElements
  const filteredParts = parts.filter(part => isPartVisible(part, visibleElements));

  const tools: Tool[] = (config?.tools || []).filter((tool: any) =>
    tool.functionDeclarations || tool.retrieval || tool.googleSearch ||
    tool.googleMaps || tool.urlContext || tool.codeExecution
  ) as Tool[];

  const systemInstruction = config?.systemInstruction;
  const showSystemInstruction = systemInstruction && isVisible('systemInstruction', visibleElements);
  const showTools = tools.length > 0 && !hasFunctionResponses(parts) && isVisible('tool', visibleElements);

  return (
    <div className="rich-log client-content user">
      <h4 className="role-user">User</h4>
      {showSystemInstruction && (
        <RenderSystemInstruction systemInstruction={systemInstruction} defaultExpanded={defaultExpanded} />
      )}
      {showTools && tools.map((tool: Tool, j: number) => (
        <RenderTool tool={tool} key={`tool-${j}`} defaultExpanded={defaultExpanded} />
      ))}
      {filteredParts.map((part: Part, j: number) => (
        <RenderPart part={part} key={`message-part-${j}`} defaultExpanded={defaultExpanded} />
      ))}
    </div>
  );
});

// App logs

const AppLog = memo(({ message, visibleElements = 'all', defaultExpanded = true }: Message) => {
  const { model, config, placeholder, welcomeMessage, functionCalls, action } = message as any;
  const { client } = useGeminiAPIContext();

  const tools: Tool[] = (config?.tools || []).filter((tool: any) =>
    tool.functionDeclarations || tool.retrieval || tool.googleSearch ||
    tool.googleMaps || tool.urlContext || tool.codeExecution
  ) as Tool[];

  const systemInstruction = config?.systemInstruction;

  // For functioncalls logs, determine if we should show buttons
  // Only show active buttons if there's no action (wasn't auto-approved) and user hasn't acted yet
  const responseId = functionCalls?.[0]?.id;
  const executedAction = responseId ? executedResponseActions.get(responseId) : null;
  const showActiveButtons = functionCalls && !action && !executedAction;

  // Determine what's visible
  const showModel = model && isVisible('modelConfig', visibleElements);
  const showPlaceholder = placeholder && isVisible('placeholder', visibleElements);
  const showWelcomeMessage = welcomeMessage && isVisible('welcomeMessage', visibleElements);
  const showTools = tools.length > 0 && isVisible('tool', visibleElements);
  const showFunctionCalls = functionCalls && isVisible('appFunctionReview', visibleElements);

  // Return null if nothing to show
  if (!showModel && !systemInstruction && !showPlaceholder && !showWelcomeMessage && !showTools && !showFunctionCalls) {
    return null;
  }

  // Button handlers
  const handleRunFunctionClick = () => {
    if (responseId && functionCalls) {
      // Type assertion needed for AI Studio compatibility - its CDN-based environment
      // doesn't properly resolve eventemitter3 types inherited by the client class
      (client as any).emit("approvedfunctioncalls", functionCalls);
      executedResponseActions.set(responseId, 'run');
    }
  };

  const handleRejectFunctionClick = () => {
    if (responseId && functionCalls) {
      // Type assertion needed for AI Studio compatibility - its CDN-based environment
      // doesn't properly resolve eventemitter3 types inherited by the client class
      (client as any).emit("rejectedfunctioncalls", functionCalls);
      executedResponseActions.set(responseId, 'reject');
    }
  };

  return (
    <div className="rich-log client-content app">
      <h4 className="role-console">Console</h4>
      {model && isVisible('modelConfig', visibleElements) && (
        <div className="part part-model">
          <h5>Set model</h5>
          <SyntaxHighlighter language="json" style={customTheme}>
            {JSON.stringify({ model }, null, "  ")}
          </SyntaxHighlighter>
        </div>
      )}
      {systemInstruction && (
        <RenderSystemInstruction systemInstruction={systemInstruction} defaultExpanded={defaultExpanded} />
      )}
      {placeholder && isVisible('placeholder', visibleElements) && (
        <div className="part part-placeholder">
          <h5>Placeholder text</h5>
          <p className="placeholder-text">{placeholder}</p>
        </div>
      )}
      {welcomeMessage && (
        <div className="part part-welcome-message">
          <p className="part-text">{welcomeMessage}</p>
        </div>
      )}
      {tools.map((tool: Tool, j: number) => (
        <RenderTool tool={tool} key={`tool-${j}`} defaultExpanded={defaultExpanded} />
      ))}
      {functionCalls && !action && (
        <div className="part part-function-status">
          <div className="function-buttons">
            <span>Run&nbsp;{functionCalls.length}&nbsp;{functionCalls.length === 1 ? 'function call' : 'function calls'}?</span>
            <div className="button-group">
              <button
                onClick={handleRunFunctionClick}
                className={cn("run-function-button", {
                  clicked: executedAction === 'run'
                })}
                disabled={!showActiveButtons}
              >
                <span className="material-symbols-outlined">check</span>
                Approve
              </button>
              <button
                onClick={handleRejectFunctionClick}
                className={cn("reject-function-button", {
                  clicked: executedAction === 'reject'
                })}
                disabled={!showActiveButtons}
              >
                <span className="material-symbols-outlined">close</span>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
      {functionCalls && action && (
        <div className="part part-function-status">
          <div className="function-status-text">
            {action === 'auto-approve' && (
              <><span className="material-symbols-outlined">domain_verification</span> Auto-approved {functionCalls.length} {functionCalls.length === 1 ? 'function call' : 'function calls'}</>
            )}
            {action === 'run' && <><span className="material-symbols-outlined">domain_verification</span> User approved {functionCalls.length} {functionCalls.length === 1 ? 'function call' : 'function calls'}</>}
            {action === 'reject' && <><span className="material-symbols-outlined">cancel_presentation</span> User rejected {functionCalls.length} {functionCalls.length === 1 ? 'function call' : 'function calls'}</>}
          </div>
        </div>
      )}
    </div>
  );
});


// Server logs

const ServerResponseLog = memo(({ message, defaultExpanded = true }: Message) => {
  const serverResponse = message as any;

  // Handle server responses with candidates structure
  if (serverResponse.candidates && Array.isArray(serverResponse.candidates)) {
    const parts: Part[] = [];

    serverResponse.candidates.forEach((candidate: any) => {
      if (candidate.content && candidate.content.parts) {
        parts.push(...candidate.content.parts);
      }
    });

    return (
      <div className="rich-log server-content model">
        <h4 className="role-model">Model</h4>
        {parts.map((part: Part, j: number) => (
          <RenderPart part={part} key={`server-part-${j}`} defaultExpanded={defaultExpanded} />
        ))}
      </div>
    );
  }

  return <AnyMessage message={message} />;
});

export type LoggerProps = {
  filter: GeminiLoggerType;
  logStyle?: LogStyle;
};

const component = (log: GeminiLogEvent) => {
  if (typeof log.message === "string") {
    return PlainTextMessage;
  }

  switch (log.type) {
    case 'app-set-model':
    case 'app-set-config':
    case 'app-set-placeholder':
    case 'app-set-welcome':
    case 'app-review-functions':
    case 'app-approve-functions':
    case 'app-reject-functions':
      return AppLog;

    case 'generate-content':
      return log.direction === 'send'
        ? GenerateContentRequestLog
        : ServerResponseLog;

    case 'send-message':
      return log.direction === 'send'
        ? SendMessageRequestLog
        : ServerResponseLog;

    case 'generate-content-stream':
    case 'send-message-stream':
      return log.direction === 'receive' ? ServerResponseLog : AnyMessage;

    case 'function-call':
    case 'function-response':
      return ServerResponseLog;

    default:
      return AnyMessage;
  }
};

export default function GeminiLogger({ filter = "all", logStyle = "console" }: LoggerProps) {
  const { loggerStore } = useGeminiAPIContext();
  const logs = useStore(loggerStore, (state) => state.logs as GeminiLogEvent[]);

  const filterFn = coreFilters[filter];
  const styleConfig = logStyleConfigs[logStyle];
  const { displayOptions } = styleConfig;

  // Collapsible sections are expanded by default in console view, collapsed in chat view
  const defaultExpanded = logStyle !== 'chat';

  // For plain-text mode, always use AnyMessage
  const getComponent = (log: GeminiLogEvent) => {
    if (displayOptions.usePlainText) {
      return AnyMessage;
    }
    return component(log);
  };

  // Filter out app logs that have no visible content
  const isLogVisible = (log: GeminiLogEvent): boolean => {
    const appLogTypes = ['app-set-model', 'app-set-config', 'app-set-placeholder', 'app-set-welcome', 'app-review-functions', 'app-approve-functions', 'app-reject-functions'];
    if (appLogTypes.includes(log.type)) {
      return isAppLogVisible(log.message, styleConfig.visibleElements);
    }
    return true;
  };

  return (
    <div className="logger">
      <ul className="logger-list">
        {logs.filter(filterFn).filter(isLogVisible).map((log, key) => {
          const MessageComponent = getComponent(log);
          return (
            <LogEntry
              MessageComponent={(props) => <MessageComponent {...props} filter={filter} visibleElements={styleConfig.visibleElements} defaultExpanded={defaultExpanded} />}
              log={log}
              displayOptions={displayOptions}
              key={key}
            />
          );
        })}
      </ul>
    </div>
  );
}
