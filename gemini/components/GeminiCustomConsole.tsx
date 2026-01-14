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

import { useState, useRef, useEffect, memo, useCallback, MouseEvent as ReactMouseEvent } from "react";
import cn from "classnames";
import Select from "react-select";
import { useGeminiAPIContext } from "../contexts/GeminiAPIContext";
import { useStore } from "zustand";
import TypingIndicator from "./TypingIndicator";
import GeminiLogger from "./GeminiLogger";
import { coreFilters, GeminiLoggerType } from "../lib/gemini-log-filters";
import "../../styles/console.css";
import "./gemini-custom-console.css";

import { createPartFromText } from "@google/genai";
import {
  GeminiCustomConsoleProps,
  OverlayPosition,
  LogStyle,
  logStyleOptions,
  modelOptions,
  functionApprovalOptions,
} from "../../types";

// Extended props that include open/close control
interface GeminiCustomConsoleExtendedProps extends GeminiCustomConsoleProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const logFilterOptions = Object.keys(coreFilters).map((filter) => ({
  value: filter as GeminiLoggerType,
  label: filter === "all" ? "Show all logs" : filter.charAt(0).toUpperCase() + filter.slice(1),
}));

function GeminiCustomConsole({
  agentName = "Core Console",

  // Display
  displayMode = "overlay",
  initialOverlayPosition = "side",
  enableOverlayPositionSelector = true,

  // Visibility
  showInput = true,
  showLogger = true,
  showApprovalSelector = true,
  showModelSelector = true,

  // Logger settings
  enableLogStyleSelector = true,
  initialLogStyle = "console",
  enableLogFilterSelector = true,
  initialLogFilter = "conversations",

  // Connection
  autoConnect = false,

  // Open/close control for external management
  isOpen = true,
  onClose,

  // Content customization
  welcomeMessage,
  placeholder,
  initialAutoApprove = false,
}: GeminiCustomConsoleExtendedProps) {
  // State
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>(initialOverlayPosition);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [logStyle, setLogStyle] = useState<LogStyle>(initialLogStyle); // TODO: Implement log style rendering
  const [logFilter, setLogFilter] = useState<GeminiLoggerType>(initialLogFilter);
  const [textInput, setTextInput] = useState("");

  // Drag state for overlay mode
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number; zIndex: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Refs
  const loggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  // Context and hooks
  const {
    connected,
    isAwaitingResponse,
    hasUnreadResponse,
    clearUnreadResponse,
    startChat,
    endChat,
    sendMessage,
    loggerStore,
    model,
    setModel,
    setAutoApproveFunctionCalls,
    setWelcomeMessage,
  } = useGeminiAPIContext();
  const logs = useStore(loggerStore, (state) => state.logs);

  // Function approval mode state - initialize from prop
  const [selectedApprovalMode, setSelectedApprovalMode] = useState(
    initialAutoApprove ? functionApprovalOptions[1] : functionApprovalOptions[0]
  );

  // Set initial auto-approve on mount
  useEffect(() => {
    if (initialAutoApprove) {
      setAutoApproveFunctionCalls(true);
    }
  }, [initialAutoApprove, setAutoApproveFunctionCalls]);

  // Model selector state
  const [selectedModel, setSelectedModel] = useState(
    modelOptions.find((m) => m.value === model) || modelOptions[0]
  );

  // Update approval mode when selection changes
  const updateApprovalMode = useCallback(
    (mode: "manual" | "auto") => {
      setAutoApproveFunctionCalls(mode === "auto");
    },
    [setAutoApproveFunctionCalls]
  );

  // Update model when selection changes
  const updateModel = useCallback(
    (modelValue: string) => {
      setModel(modelValue);
    },
    [setModel]
  );

  // Focus connect button when disconnected
  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  // Auto-connect on mount if enabled, and log welcome message
  useEffect(() => {
    if (autoConnect) {
      if (welcomeMessage) {
        setWelcomeMessage(welcomeMessage);
      }
      startChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Auto-scroll log to bottom
  useEffect(() => {
    if (loggerRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        if (loggerRef.current) {
          loggerRef.current.scrollTop = loggerRef.current.scrollHeight;
        }
      });
    }
  }, [logs]);

  // Reset drag position when overlay position changes
  useEffect(() => {
    setDragPosition(null);
  }, [overlayPosition]);

  // Handle drag functionality for overlay mode
  const handleMouseDown = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    if (displayMode !== 'overlay' || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    // Use Date.now() as z-index to bring to front (works across all console instances)
    setDragPosition({ x: rect.left, y: rect.top, zIndex: (Date.now() % 100000) + 1000 });
    setIsDragging(true);
  }, [displayMode]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;

      const x = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - width));
      const y = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - height));

      setDragPosition(prev => prev ? { ...prev, x, y } : null);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleSubmit = () => {
    if (!textInput.trim()) return;
    sendMessage([createPartFromText(textInput)]);
    setTextInput("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // Compute if logger is actually visible (showLogger prop AND not minimized)
  const isLoggerVisible = showLogger && overlayPosition !== "minimized";
  const isCompact = overlayPosition === "minimized";

  // Class names based on display mode
  const wrapperClassName = cn(
    "console-wrapper",
    "gemini-console-wrapper",
    displayMode === "overlay" ? `overlay-${overlayPosition}` : "inline",
    { "dragging": isDragging }
  );

  // Custom position style when dragging
  const wrapperStyle = dragPosition && displayMode === "overlay" ? {
    position: 'fixed' as const,
    left: dragPosition.x,
    top: dragPosition.y,
    right: 'auto',
    bottom: 'auto',
    transform: 'none',
    zIndex: dragPosition.zIndex,
  } : undefined;

  // Handle typing indicator click - open in centered view
  const handleTypingIndicatorClick = useCallback((e: ReactMouseEvent) => {
    e.stopPropagation();
    if (displayMode === "overlay" && overlayPosition === "minimized") {
      setOverlayPosition("fullscreen");
    }
    clearUnreadResponse();
  }, [displayMode, overlayPosition, clearUnreadResponse]);

  // Don't render if externally controlled and closed
  if (!isOpen) {
    return null;
  }

  return (
    <div className={wrapperClassName} ref={wrapperRef} style={wrapperStyle}>
      {/* Overlay Position Selector - only in overlay mode if enabled */}
      {displayMode === "overlay" && enableOverlayPositionSelector && (
        <div className="header-hover-area">
          <div className="overlay-controls">
            <button
              className={cn({ active: overlayPosition === "fullscreen" })}
              onClick={() => setOverlayPosition("fullscreen")}
              title="Fullscreen"
            >
              <span className="material-symbols-outlined">picture_in_picture_center</span>
            </button>
            <span className="side-panel-button">
              <button
                className={cn({ active: overlayPosition === "side" })}
                onClick={() => setOverlayPosition("side")}
                title="Dock to side"
              >
                <span className="material-symbols-outlined">dock_to_left</span>
              </button>
            </span>
            <button
              className={cn({ active: overlayPosition === "minimized" })}
              onClick={() => setOverlayPosition("minimized")}
              title="Minimize"
            >
              <span className="material-symbols-outlined">collapse_content</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                title="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main console container with background and border */}
      <div
        className="console gemini-console"
        onClick={() => {
          if (isLoggerVisible) {
            clearUnreadResponse();
          }
        }}
      >
        {/* Header - always visible, draggable in overlay mode */}
        <header
          className="console-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: displayMode === "overlay" ? 'grab' : undefined }}
        >
          <h2 className="agent-name">{agentName}</h2>
          <div className="header-spacer" />
          <button
            ref={connectButtonRef}
            className={cn("connect-button", { connected })}
            onClick={() => {
              if (connected) {
                endChat();
              } else {
                if (overlayPosition === "minimized") {
                  setOverlayPosition("fullscreen");
                }
                startChat();
              }
            }}
          >
            {connected ? "Pause chat" : "Start chat"}
          </button>
          <div
            className="status-indicator-container typing-indicator-container"
            onClick={handleTypingIndicatorClick}
            style={{ cursor: 'pointer' }}
            title="Open console"
          >
            <TypingIndicator active={isAwaitingResponse} hasNotification={hasUnreadResponse} />
          </div>
        </header>

        {/* Logger Section - contains controls and logger, with disabled overlay when disconnected */}
        {!isCompact && (
          <div className={cn("logger-section", { disabled: !connected })}>
            {/* Logger Controls - conditional on enable props */}
            {(enableLogStyleSelector || enableLogFilterSelector) && (
              <div className="logger-controls">
                {enableLogFilterSelector && (
                  <Select
                    className="react-select"
                    classNamePrefix="react-select"
                    options={logFilterOptions}
                    defaultValue={logFilterOptions.find((o) => o.value === initialLogFilter)}
                    onChange={(e) => e && setLogFilter(e.value)}
                  />
                )}
                {enableLogStyleSelector && (
                  <Select
                    className="react-select"
                    classNamePrefix="react-select"
                    options={logStyleOptions}
                    defaultValue={logStyleOptions.find((o) => o.value === initialLogStyle)}
                    onChange={(e) => e && setLogStyle(e.value)}
                  />
                )}
              </div>
            )}

            {/* Logger Container - hidden when showLogger is false */}
            {showLogger && (
              <div className="logger-container" ref={loggerRef}>
                <GeminiLogger filter={logFilter} logStyle={logStyle} />
              </div>
            )}
          </div>
        )}

        {/* Input Container - conditional on showInput prop */}
        {showInput && (
          <div
            className={cn("input-container", "minimized-text-input", {
              disabled: !connected,
              minimized: overlayPosition === "minimized",
            })}
          >
            <textarea
              id="gemini-console-input"
              ref={inputRef}
              className="message-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit();
                }
              }}
              placeholder={!connected ? "Click 'Start chat' to start..." : (placeholder || "Type something...")}
              disabled={!connected}
            />
            <div className="input-settings">
              {!isCompact && (showApprovalSelector || showModelSelector) && (
                <div className="model-settings">
                  {showApprovalSelector && (
                    <Select
                      className="react-select approval-mode-select"
                      classNamePrefix="react-select"
                      options={functionApprovalOptions}
                      value={selectedApprovalMode}
                      isSearchable={false}
                      menuPlacement="top"
                      onChange={(e) => {
                        if (e) {
                          setSelectedApprovalMode(e);
                          updateApprovalMode(e.value as "manual" | "auto");
                        }
                      }}
                    />
                  )}
                  {showModelSelector && (
                    <Select
                      className="react-select model-select"
                      classNamePrefix="react-select"
                      options={modelOptions}
                      value={selectedModel}
                      isSearchable={false}
                      menuPlacement="top"
                      onChange={(e) => {
                        if (e) {
                          setSelectedModel(e);
                          updateModel(e.value);
                        }
                      }}
                    />
                  )}
                </div>
              )}
              {overlayPosition !== "minimized" && <div className="input-spacer" />}
              <button
                className={cn("action-button", "send-button", {
                  disabled: !connected || !textInput.trim(),
                  ready: connected && textInput.trim(),
                })}
                onClick={handleSubmit}
                disabled={!connected || !textInput.trim()}
                title="Send"
              >
                <span className="material-symbols-outlined filled">east</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(GeminiCustomConsole);

