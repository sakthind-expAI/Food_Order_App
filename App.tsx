
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

import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GeminiAPIProvider, useGeminiAPIContext } from "./gemini/contexts/GeminiAPIContext";
import GeminiDebug from "./gemini/components/GeminiDebug";
import { Content, FunctionCall } from '@google/genai';
import {
  Ingredient,
  KitchenAction,
  TimelineEntry,
  CombinationResult,
  Order,
  VerificationResult,
  COOKING_ACTIONS,
  STARTING_INGREDIENTS,
  PRESELECTED_INGREDIENTS,
  EXAMPLE_ORDERS,
  COMBINATION_SYSTEM_INSTRUCTION,
  COMBINATION_RESPONSE_SCHEMA,
  VERIFICATION_SYSTEM_INSTRUCTION,
  VERIFICATION_RESPONSE_SCHEMA,
  generateCookingTools,
  buildCookingAgentSystemInstruction,
} from './constants';

// ============================================================================
// Ingredient Normalization Helper
// ============================================================================

function normalizeIngredientName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findIngredientInInventory(name: string, inventory: Ingredient[]): Ingredient | null {
  const normalizedSearch = normalizeIngredientName(name);
  return inventory.find(ing => normalizeIngredientName(ing.name) === normalizedSearch) || null;
}

function isDuplicateIngredient(name: string, inventory: Ingredient[]): boolean {
  return findIngredientInInventory(name, inventory) !== null;
}

// ============================================================================
// Ingredient Tile Component
// ============================================================================

interface IngredientTileProps {
  ingredient: Ingredient;
  isSelected: boolean;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function IngredientTile({ ingredient, isSelected, isActive, isDisabled, onClick }: IngredientTileProps) {
  return (
    <button
      className={`ingredient-tile ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={ingredient.name}
      data-ingredient={ingredient.name}
      disabled={isDisabled}
    >
      <span className="emoji">{ingredient.emoji}</span>
      <span className="name">{ingredient.name}</span>
    </button>
  );
}

// ============================================================================
// Action Tile Component
// ============================================================================

interface ActionTileProps {
  action: KitchenAction;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function ActionTile({ action, isActive, isDisabled, onClick }: ActionTileProps) {
  return (
    <button
      className={`action-tile ${isActive ? 'active' : ''}`}
      onClick={onClick}
      disabled={isDisabled}
      title={action.displayName}
      data-action={action.name}
    >
      <span className="emoji">{action.emoji}</span>
      <span className="name">{action.name}()</span>
    </button>
  );
}

// ============================================================================
// Timeline Item Component
// ============================================================================

interface TimelineItemProps {
  entry: TimelineEntry;
}

function TimelineItem({ entry }: TimelineItemProps) {
  const hasAction = entry.action && entry.ingredients;
  const hasText = entry.text;
  const isLoading = hasAction && entry.result === null;

  if (hasText && !hasAction) {
    return (
      <div className="timeline-item timeline-text-only">
        <div className="timeline-text-content">
          {entry.text}
        </div>
      </div>
    );
  }

  return (
    <div className={`timeline-item ${isLoading ? 'loading' : ''}`}>
      {hasText && (
        <div className="timeline-text-content">
          {entry.text}
        </div>
      )}
      {hasAction && (
        <>
          <div className="timeline-action">
            <span className="action-name">{entry.action}(</span>
            <span className="action-args">{entry.ingredients?.join(', ')}</span>
            <span className="action-name">)</span>
          </div>
          <div className="timeline-result">
            <span className="timeline-result-arrow">↳</span>
            {isLoading ? (
              <span className="spinner">⏳</span>
            ) : (
              <>
                <span className="result-emoji">{entry.result!.emoji}</span>
                <span className="result-name">{entry.result!.name}</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Order Card Component
// ============================================================================

interface OrderCardProps {
  order: Order;
  isDisabled: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  onPickUp: (orderId: string) => void;
  onCookWithGemini: (order: Order) => void;
  onToggleSelection: (orderId: string) => void;
  onOpenVerificationAgent?: () => void;
}

function OrderCard({ 
  order, 
  isDisabled, 
  isSelected,
  selectionMode,
  onPickUp, 
  onCookWithGemini, 
  onToggleSelection,
  onOpenVerificationAgent 
}: OrderCardProps) {
  const statusClass = order.status === 'completed' ? 'completed' :
    order.status === 'failed' ? 'failed' :
      order.status === 'in_progress' ? 'in-progress' : 'not-started';

  const difficultyClass = order.difficulty ? `difficulty-${order.difficulty}` : '';

  return (
    <div 
      className={`order-card ${statusClass} ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={() => selectionMode && order.status === 'not_started' && !isDisabled && onToggleSelection(order.id)}
    >
      {selectionMode && order.status === 'not_started' && (
        <div className="selection-checkbox">
          {isSelected ? '☑️' : '☐'}
        </div>
      )}
      {order.difficulty && (
        <div className={`order-difficulty ${difficultyClass}`}>
          {order.difficulty}
        </div>
      )}
      <div className="order-emoji">{order.emoji}</div>
      <div className="order-name">{order.name}</div>
      <div className="order-status">
        {order.status === 'completed' && '✅ Served!'}
        {order.status === 'failed' && `❌ ${order.servedDish}`}
        {order.status === 'in_progress' && '🔄 Preparation...'}
        {order.status === 'not_started' && 'Pending'}
      </div>
      {!selectionMode && order.status === 'not_started' && (
        <div className="order-card-actions">
          <button
            className="order-button"
            onClick={(e) => { e.stopPropagation(); onPickUp(order.id); }}
            disabled={isDisabled}
          >
            Manual
          </button>
          <button
            className="order-button ai-button"
            onClick={(e) => { e.stopPropagation(); onCookWithGemini(order); }}
            disabled={isDisabled}
          >
            <span className="material-symbols-outlined">spark</span>
            VJOSS
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Add Order Card Component
// ============================================================================

interface AddOrderCardProps {
  onAddOrder: (orderName: string) => void;
  isDisabled?: boolean;
}

function AddOrderCard({ onAddOrder, isDisabled }: AddOrderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [orderName, setOrderName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    if (orderName.trim()) {
      onAddOrder(orderName.trim());
      setOrderName('');
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setOrderName('');
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div
        className={`order-card add-order-card ${isDisabled ? 'disabled' : ''}`}
        onClick={() => !isDisabled && setIsEditing(true)}
      >
        <div className="order-emoji">📜</div>
        <div className="order-name">New Menu Item</div>
        <div className="order-status">{isDisabled ? 'Locked' : 'Add custom order'}</div>
      </div>
    );
  }

  return (
    <div className="order-card add-order-card editing">
      <div className="order-emoji">📜</div>
      <input
        ref={inputRef}
        type="text"
        className="order-input"
        placeholder="Dish name (e.g. Idli)"
        value={orderName}
        onChange={(e) => setOrderName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!orderName.trim()) {
            setIsEditing(false);
          }
        }}
      />
      <button className="cook-button" onClick={handleSubmit} disabled={!orderName.trim()}>
        ➕ Add to Menu
      </button>
    </div>
  );
}

// ============================================================================
// Combination Agent Component (Layer 1)
// ============================================================================

interface CombinationAgentProps {
  inventory: Ingredient[];
  setInventory: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  timeline: TimelineEntry[];
  setTimeline: React.Dispatch<React.SetStateAction<TimelineEntry[]>>;
  selectedIngredients: Set<string>;
  setSelectedIngredients: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeAction: string | null;
  setActiveAction: React.Dispatch<React.SetStateAction<string | null>>;
  actionTriggerCount: number;
  onExecuteActionRef: React.MutableRefObject<((action: KitchenAction, ingredients: string[]) => Promise<Ingredient | null>) | null>;
  orders: Order[];
  onCookWithGemini: (order: Order) => void;
  onCookBatchWithGemini: (orders: Order[]) => void;
  onPickUp: (orderId: string) => void;
  onAddOrder: (orderName: string) => void;
  onClearSummary: () => void;
  onServe: (servedDishName: string) => void;
  onOpenCombinationAgent: () => void;
  onOpenCookingAgent: () => void;
  onOpenVerificationAgent: () => void;
  activeIngredients: Set<string>;
  setActiveIngredients: React.Dispatch<React.SetStateAction<Set<string>>>;
  isCooking: boolean;
  isCookingAgentOpen: boolean;
  isAlchemyAgentOpen: boolean;
  isJudgeAgentOpen: boolean;
}

function CombinationAgent({
  inventory,
  setInventory,
  timeline,
  setTimeline,
  selectedIngredients,
  setSelectedIngredients,
  activeAction,
  setActiveAction,
  actionTriggerCount,
  onExecuteActionRef,
  orders,
  onCookWithGemini,
  onCookBatchWithGemini,
  onPickUp,
  onAddOrder,
  onClearSummary,
  onServe,
  onOpenCombinationAgent,
  onOpenCookingAgent,
  onOpenVerificationAgent,
  activeIngredients,
  setActiveIngredients,
  isCooking,
  isCookingAgentOpen,
  isAlchemyAgentOpen,
  isJudgeAgentOpen,
}: CombinationAgentProps) {
  const { generateContent, setConfig } = useGeminiAPIContext();

  const ingredientsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const prevInventoryLengthRef = useRef(inventory.length);

  const [selectionMode, setSelectionMode] = useState(false);
  const [batchSelectedOrderIds, setBatchSelectedOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setConfig({
      systemInstruction: COMBINATION_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: COMBINATION_RESPONSE_SCHEMA,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    });
  }, [setConfig]);

  const toggleIngredient = useCallback((name: string) => {
    setSelectedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, [setSelectedIngredients]);

  const toggleOrderSelection = useCallback((id: string) => {
    setBatchSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const executeCombination = useCallback(async (
    action: KitchenAction,
    ingredientNames: string[]
  ): Promise<Ingredient | null> => {
    try {
      const prompt = `Action: ${action.displayName}\nIngredients: ${ingredientNames.join(', ')}\n\nWhat is the result in South Indian cuisine?`;

      const contents: Content[] = [
        { role: 'user', parts: [{ text: prompt }] }
      ];

      const response = await generateContent(contents);
      const text = response?.text || '{}';
      const result: CombinationResult = JSON.parse(text);

      return {
        name: result.result_name,
        emoji: result.emoji,
      };
    } catch (error) {
      console.error('Error in combination:', error);
      return null;
    }
  }, [generateContent]);

  useEffect(() => {
    onExecuteActionRef.current = executeCombination;
    return () => {
      onExecuteActionRef.current = null;
    };
  }, [executeCombination, onExecuteActionRef]);

  const executeAction = useCallback(async (action: KitchenAction) => {
    if (selectedIngredients.size === 0) return;

    const ingredientNames = Array.from(selectedIngredients);
    setSelectedIngredients(new Set());

    if (action.name === 'serve_on_leaf') {
      const dishName = ingredientNames[0];

      setTimeline(prev => [...prev, {
        id: `serve-${Date.now()}`,
        type: 'text' as const,
        action: '',
        ingredients: [],
        result: null,
        text: `🍽️ Served on Banana Leaf: ${dishName}`,
        timestamp: new Date(),
      }]);

      onServe(dishName);
      return;
    }

    const timelineId = `${Date.now()}`;

    const loadingEntry: TimelineEntry = {
      id: timelineId,
      timestamp: new Date(),
      action: action.name,
      ingredients: ingredientNames,
      result: null,
    };
    setTimeline(prev => [...prev, loadingEntry]);
    setActiveAction(action.name);

    const newIngredient = await executeCombination(action, ingredientNames);

    if (newIngredient) {
      setTimeline(prev => prev.map(entry =>
        entry.id === timelineId
          ? { ...entry, result: newIngredient }
          : entry
      ));

      setInventory(prev => {
        if (isDuplicateIngredient(newIngredient.name, prev)) return prev;
        return [newIngredient, ...prev];
      });
    } else {
      setTimeline(prev => prev.map(entry =>
        entry.id === timelineId
          ? { ...entry, result: { name: 'error', emoji: '❌' } }
          : entry
      ));
    }

    setActiveAction(null);
  }, [selectedIngredients, executeCombination, setTimeline, setActiveAction, setSelectedIngredients, setInventory, onServe]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
    }
  }, [timeline.length]);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    hasScrolledRef.current = true;
    const timer = setTimeout(() => {
      if (ingredientsRef.current) ingredientsRef.current.scrollTo({ top: ingredientsRef.current.scrollHeight, behavior: 'smooth' });
      if (actionsRef.current) actionsRef.current.scrollTo({ top: actionsRef.current.scrollHeight, behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (inventory.length > prevInventoryLengthRef.current && ingredientsRef.current) {
      ingredientsRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevInventoryLengthRef.current = inventory.length;
  }, [inventory.length]);

  useEffect(() => {
    if (actionTriggerCount === 0) return;
    requestAnimationFrame(() => {
      const container = actionsRef.current;
      if (!container || !activeAction) return;
      const actionElement = container.querySelector(`[data-action="${activeAction}"]`) as HTMLElement;
      if (actionElement) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = actionElement.getBoundingClientRect();
        const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - containerRect.height / 2 + elementRect.height / 2;
        container.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }
    });
  }, [actionTriggerCount, activeAction]);

  const hasSelection = selectedIngredients.size > 0;
  const currentOrder = orders.find(o => o.status === 'in_progress');
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'failed');

  return (
    <div className="kitchen-app">
      <div className="kitchen-header">
        <h1 className="kitchen-title">Madras Masala Lab</h1>
        <p className="kitchen-subtitle">Training Gemini 3 Flash in the art of Chennai South Indian cuisine:</p>
      </div>

      <div className="challenge-banner">
        <div className="challenge-title">🍛 AUTHENTIC TAMIL CUISINE CHALLENGE! 🍛</div>
        <div className="challenge-subtitle">Sequence tempering, stone-grinding, and fermenting to serve the perfect meal</div>
      </div>

      <section className="kitchen-section orders-section">
        <div className="section-header">
          <div className="section-header-text">
            <h2 className="section-title">Orders</h2>
            <p className="section-subtitle">Regional dishes to prepare and serve</p>
          </div>
          <div className="header-actions">
             <button 
              className={`toggle-mode-button ${selectionMode ? 'active' : ''}`}
              onClick={() => { setSelectionMode(!selectionMode); setBatchSelectedOrderIds(new Set()); }}
            >
              {selectionMode ? 'Cancel Selection' : 'Multi-Select'}
            </button>
            {selectionMode && batchSelectedOrderIds.size >= 1 && (
              <button 
                className="batch-cook-button"
                onClick={() => {
                  const selected = orders.filter(o => batchSelectedOrderIds.has(o.id));
                  onCookBatchWithGemini(selected);
                  setSelectionMode(false);
                  setBatchSelectedOrderIds(new Set());
                }}
              >
                VJOSS Batch ({batchSelectedOrderIds.size})
              </button>
            )}
          </div>
        </div>
        <div className="orders-grid">
          {(() => {
            const hasInProgressOrder = orders.some(o => o.status === 'in_progress');
            return (
              <>
                {orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isDisabled={!selectionMode && hasInProgressOrder && order.status === 'not_started'}
                    isSelected={batchSelectedOrderIds.has(order.id)}
                    selectionMode={selectionMode}
                    onPickUp={onPickUp}
                    onCookWithGemini={onCookWithGemini}
                    onToggleSelection={toggleOrderSelection}
                    onOpenVerificationAgent={onOpenVerificationAgent}
                  />
                ))}
                {!selectionMode && <AddOrderCard onAddOrder={onAddOrder} isDisabled={hasInProgressOrder} />}
              </>
            );
          })()}
        </div>
      </section>

      <div className="ingredients-tools-row">
        <section className="kitchen-section ingredients-section">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="section-title">Pantry</h2>
              <p className="section-subtitle">Essential South Indian ingredients</p>
            </div>
            <span className="section-count">items: {inventory.length}</span>
          </div>
          <div className="ingredients-grid" ref={ingredientsRef}>
            {inventory.map((ingredient, index) => (
              <IngredientTile
                key={`${ingredient.name}-${index}-${actionTriggerCount}`}
                ingredient={ingredient}
                isSelected={selectedIngredients.has(ingredient.name)}
                isActive={false}
                isDisabled={!currentOrder}
                onClick={() => toggleIngredient(ingredient.name)}
              />
            ))}
          </div>
        </section>

        <section className="kitchen-section actions-section">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="section-title">Regional Tools</h2>
              <p className="section-subtitle">Apply authentic cooking techniques</p>
            </div>
            <span className="section-count">methods: {COOKING_ACTIONS.length}</span>
          </div>
          <div className="actions-grid" ref={actionsRef}>
            {COOKING_ACTIONS.map(action => {
              const isServeDisabled = action.name === 'serve_on_leaf' && selectedIngredients.size !== 1;
              const isDisabled = isCooking ? false : (!hasSelection || activeAction !== null || isServeDisabled);

              return (
                <ActionTile
                  key={`${action.name}-${actionTriggerCount}`}
                  action={action}
                  isActive={false}
                  isDisabled={isDisabled}
                  onClick={() => executeAction(action)}
                />
              );
            })}
          </div>
        </section>
      </div>

      <section className="kitchen-section agents-section">
        <div className="section-header">
          <div className="section-header-text">
            <h2 className="section-title">Culinary Agents</h2>
            <p className="section-subtitle">Specialized Gemini 3 Flash regional experts</p>
          </div>
        </div>
        <div className="agents-grid">
          <div className="agent-card agent-card-wide">
            <div className="agent-card-header">
              <span className="agent-emoji">🧑‍🍳</span>
              <span className="agent-name">Head Chef (Mami)</span>
            </div>
            <p className="agent-description">Orchestrates cooking using regional tools and authentic recipes</p>
            <div className="agent-actions">
              <button
                className="agent-cook-button"
                onClick={() => currentOrder && onCookWithGemini(currentOrder)}
                disabled={!currentOrder || isCooking}
              >
                {isCooking ? 'Grinding...' : currentOrder ? `Prepare '${currentOrder.name}'` : 'Awaiting order'}
              </button>
              <button
                className="agent-view-button"
                onClick={onOpenCookingAgent}
                disabled={isCookingAgentOpen}
              >
                <span className="material-symbols-outlined">search</span>
                Monitor
              </button>
            </div>
          </div>

          <div className="agent-card">
            <div className="agent-card-header">
              <span className="agent-emoji">🪨</span>
              <span className="agent-name">Spice Expert</span>
            </div>
            <p className="agent-description">Determines the chemistry of tempering and grinding</p>
            <div className="agent-actions">
              <button
                className="agent-view-button"
                onClick={onOpenCombinationAgent}
                disabled={isAlchemyAgentOpen}
              >
                <span className="material-symbols-outlined">search</span>
                Open
              </button>
            </div>
          </div>

          <div className="agent-card">
            <div className="agent-card-header">
              <span className="agent-emoji">🧑‍⚖️</span>
              <span className="agent-name">Food Critic</span>
            </div>
            <p className="agent-description">Verifies if dishes match traditional Chennai flavors</p>
            <div className="agent-actions">
              <button
                className="agent-view-button"
                onClick={onOpenVerificationAgent}
                disabled={isJudgeAgentOpen}
              >
                <span className="material-symbols-outlined">search</span>
                Open
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="kitchen-section timeline-section">
        <div className="section-header">
          <div className="section-header-text">
            <h2 className="section-title">Cooking Log</h2>
            <p className="section-subtitle">A record of every stone-grind and tempering</p>
          </div>
        </div>
        <div className="timeline-container" ref={timelineRef}>
          {timeline.length === 0 ? (
            <div className="timeline-empty">
              Select ingredients and tempering actions to begin
            </div>
          ) : (
            timeline.map(entry => (
              <TimelineItem key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </section>

      {completedOrders.length > 0 && (
        <section className="kitchen-section summary-section">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="section-title">Served Orders Summary</h2>
              <p className="section-subtitle">Complete list of prepared Madras delicacies</p>
            </div>
            <div className="header-actions">
              <button 
                className="clear-summary-button"
                onClick={onClearSummary}
                title="Clear finished orders"
              >
                <span className="material-symbols-outlined">delete</span>
                Clear Summary
              </button>
            </div>
          </div>
          <div className="summary-list">
            <div className="summary-header-row">
              <div className="summary-cell id-cell">Order ID</div>
              <div className="summary-cell dish-cell">Menu Item</div>
              <div className="summary-cell detail-cell">Served Dish Details</div>
            </div>
            {completedOrders.map(order => (
              <div key={order.id} className="summary-row">
                <div className="summary-cell id-cell">#{order.id.split('-').pop()}</div>
                <div className="summary-cell dish-cell">{order.emoji} {order.name}</div>
                <div className="summary-cell detail-cell">
                  {order.status === 'completed' ? (
                    <span className="served-label">Prepared: {order.servedDish || 'Authentic Match'}</span>
                  ) : (
                    <span className="failed-label">Failed: {order.servedDish || 'Unfinished'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================================
// Cooking Agent Component (Layer 2)
// ============================================================================

interface CookingAgentProps {
  inventory: Ingredient[];
  setInventory: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  setTimeline: React.Dispatch<React.SetStateAction<TimelineEntry[]>>;
  setActiveAction: React.Dispatch<React.SetStateAction<string | null>>;
  setActionTriggerCount: React.Dispatch<React.SetStateAction<number>>;
  setActiveIngredients: React.Dispatch<React.SetStateAction<Set<string>>>;
  executeCombinationRef: React.MutableRefObject<((action: KitchenAction, ingredients: string[]) => Promise<Ingredient | null>) | null>;
  sendMessageRef: React.MutableRefObject<((message: string) => void) | null>;
  onServe: (servedDishName: string) => Promise<boolean>;
  onPass: () => void;
}

function CookingAgent({
  inventory,
  setInventory,
  setTimeline,
  setActiveAction,
  setActionTriggerCount,
  setActiveIngredients,
  executeCombinationRef,
  sendMessageRef,
  onServe,
  onPass,
}: CookingAgentProps) {
  const { client, setConfig, sendMessage } = useGeminiAPIContext();

  useEffect(() => {
    setConfig({
      systemInstruction: buildCookingAgentSystemInstruction(inventory),
      tools: generateCookingTools(),
    });
  }, [setConfig, inventory]);

  const pendingTextRef = useRef<string | null>(null);

  useEffect(() => {
    const handleLog = (log: any) => {
      if (log.type !== 'send-message' || log.direction !== 'receive') return;
      const response = log.message;
      if (!response) return;
      const text = response.text;
      if (text && text.trim()) {
        const hasFunctionCalls = response.candidates?.[0]?.content?.parts?.some((part: any) => part.functionCall) || response.functionCalls?.length > 0;
        if (hasFunctionCalls) {
          pendingTextRef.current = text;
        } else {
          setTimeline(prev => {
            if (prev.some(e => e.text === text && !e.action)) return prev;
            return [...prev, { id: `text-${Date.now()}-${Math.random()}`, timestamp: new Date(), text: text }];
          });
        }
      }
    };
    (client as any).on('log', handleLog);
    return () => (client as any).off('log', handleLog);
  }, [client, setTimeline]);

  useEffect(() => {
    const handleApprovedFunctionCalls = async (functionCalls: FunctionCall[]) => {
      if (functionCalls.length === 0) return;
      const fc = functionCalls[0];
      const actionName = fc.name || '';
      const args = fc.args as { ingredients?: string[]; dish?: string } || {};

      if (actionName === 'serve_on_leaf') {
        const dishName = args.dish || 'dish';
        setTimeline(prev => [...prev, { id: `serve-${Date.now()}`, timestamp: new Date(), text: `🍽️ Serving on Banana Leaf: ${dishName}` }]);
        const verificationSuccess = await onServe(dishName);
        await sendMessage([{
          functionResponse: {
            name: 'serve_on_leaf',
            response: verificationSuccess
              ? { success: true, message: `${dishName} served! Romba nalla iruku!` }
              : { success: false, error: `${dishName} is not what was ordered. Try again!` }
          }
        }]);
        return;
      }

      if (actionName === 'pass') {
        onPass();
        setTimeline(prev => [...prev, { id: `pass-${Date.now()}`, timestamp: new Date(), text: '🏳️ Gave up on the order' }]);
        await sendMessage([{ functionResponse: { name: 'pass', response: { success: true, message: 'Order abandoned.' } } }]);
        return;
      }

      const requestedIngredients = args.ingredients || [];
      const timelineId = `cooking-${Date.now()}`;
      const action = COOKING_ACTIONS.find(a => a.name === actionName);
      
      if (!action) {
        await sendMessage([{ functionResponse: { name: actionName, response: { success: false, error: `Unknown action: ${actionName}` } } }]);
        return;
      }

      const validatedIngredients: string[] = [];
      for (const requestedName of requestedIngredients) {
        const found = findIngredientInInventory(requestedName, inventory);
        if (found) {
          const normalizedFound = normalizeIngredientName(found.name);
          if (!validatedIngredients.some(v => normalizeIngredientName(v) === normalizedFound)) {
            validatedIngredients.push(found.name);
          }
        }
      }

      if (validatedIngredients.length === 0 && requestedIngredients.length > 0) {
        await sendMessage([{ functionResponse: { name: actionName, response: { success: false, error: "Ingredients missing from pantry." } } }]);
        return;
      }

      const pendingText = pendingTextRef.current;
      pendingTextRef.current = null;

      const loadingEntry: TimelineEntry = {
        id: timelineId,
        timestamp: new Date(),
        text: pendingText || undefined,
        action: actionName,
        ingredients: validatedIngredients,
        result: null,
      };
      setTimeline(prev => [...prev, loadingEntry]);
      setActiveAction(actionName);
      setActionTriggerCount(prev => prev + 1);
      setActiveIngredients(new Set(validatedIngredients));

      try {
        let newIngredient: Ingredient | null = null;
        if (executeCombinationRef.current) {
          newIngredient = await executeCombinationRef.current(action, validatedIngredients);
        }
        if (!newIngredient) {
          newIngredient = { name: `${action.displayName}ed items`, emoji: action.emoji };
        }

        setTimeline(prev => prev.map(entry => entry.id === timelineId ? { ...entry, result: newIngredient } : entry));
        setInventory(prev => {
          if (isDuplicateIngredient(newIngredient!.name, prev)) return prev;
          return [newIngredient!, ...prev];
        });

        await sendMessage([{
          functionResponse: {
            name: actionName,
            response: { success: true, result: newIngredient.name, emoji: newIngredient.emoji }
          }
        }]);
      } catch (error) {
        setTimeline(prev => prev.map(entry => entry.id === timelineId ? { ...entry, result: { name: 'error', emoji: '❌' } } : entry));
        await sendMessage([{ functionResponse: { name: actionName, response: { success: false, error: String(error) } } }]);
      } finally {
        setActiveAction(null);
        setActiveIngredients(new Set());
      }
    };
    (client as any).on('approvedfunctioncalls', handleApprovedFunctionCalls);
    return () => (client as any).off('approvedfunctioncalls', handleApprovedFunctionCalls);
  }, [client, sendMessage, setTimeline, setActiveAction, setActionTriggerCount, setActiveIngredients, setInventory, executeCombinationRef, onServe, onPass, inventory]);

  useEffect(() => {
    sendMessageRef.current = async (message: string) => {
      await sendMessage([{ text: message }]);
    };
    return () => (sendMessageRef.current = null);
  }, [sendMessage, sendMessageRef]);

  return null;
}

// ============================================================================
// Verification Agent Component (Layer 3)
// ============================================================================

interface VerificationAgentProps {
  orders: Order[];
  inventory: Ingredient[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setTimeline: React.Dispatch<React.SetStateAction<TimelineEntry[]>>;
  verifyServedDishRef: React.MutableRefObject<((servedDishName: string) => Promise<boolean>) | null>;
}

function VerificationAgent({
  orders,
  inventory,
  setOrders,
  setTimeline,
  verifyServedDishRef,
}: VerificationAgentProps) {
  const { generateContent, setConfig } = useGeminiAPIContext();
  const ordersRef = useRef(orders);
  const inventoryRef = useRef(inventory);
  
  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

  useEffect(() => {
    setConfig({
      systemInstruction: VERIFICATION_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: VERIFICATION_RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    });
  }, [setConfig]);

  useEffect(() => {
    verifyServedDishRef.current = async (servedDishName: string) => {
      const currentOrders = ordersRef.current;
      const inProgressOrders = currentOrders.filter(o => o.status === 'in_progress');

      if (inProgressOrders.length === 0) {
        setTimeline(prev => [...prev, { id: `verify-noorder-${Date.now()}`, type: 'text', action: '', ingredients: [], result: null, text: `✅ Served "${servedDishName}"`, timestamp: new Date() }]);
        return true;
      }

      // Try to match with ANY in-progress order
      for (const order of inProgressOrders) {
        try {
          const prompt = `Order: "${order.name}"\nServed: "${servedDishName}"\n\nIs this valid South Indian cuisine?`;
          const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];
          const response = await generateContent(contents);
          const text = response?.text || '{}';
          const result: VerificationResult = JSON.parse(text);

          if (result.matches && result.confidence > 0.7) {
            const servedIngredient = findIngredientInInventory(servedDishName, inventoryRef.current);
            const servedEmoji = servedIngredient?.emoji || '✅';

            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed', emoji: servedEmoji, servedDish: servedDishName } : o));
            setTimeline(prev => [...prev, { id: `verify-${Date.now()}`, type: 'text', action: '', ingredients: [], result: null, text: `✅ Delicious! "${servedDishName}" is a perfect match for "${order.name}".`, timestamp: new Date() }]);
            return true;
          }
        } catch (error) { console.error('Error verifying order:', error); }
      }

      setTimeline(prev => [...prev, { id: `verify-fail-${Date.now()}`, type: 'text', action: '', ingredients: [], result: null, text: `❌ That's not part of the current feast!`, timestamp: new Date() }]);
      return false;
    };
    return () => (verifyServedDishRef.current = null);
  }, [generateContent, setOrders, setTimeline, verifyServedDishRef]);

  return null;
}

// ============================================================================
// Kitchen App Container
// ============================================================================

function KitchenAppContainer() {
  const [inventory, setInventory] = useState<Ingredient[]>(STARTING_INGREDIENTS);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set(PRESELECTED_INGREDIENTS));
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionTriggerCount, setActionTriggerCount] = useState(0);
  const [activeIngredients, setActiveIngredients] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>(EXAMPLE_ORDERS);

  const [combinationAgentOpen, setCombinationAgentOpen] = useState(false);
  const [cookingAgentOpen, setCookingAgentOpen] = useState(false);
  const [verificationAgentOpen, setVerificationAgentOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const [isCooking, setIsCooking] = useState(false);
  const executeCombinationRef = useRef<((action: KitchenAction, ingredients: string[]) => Promise<Ingredient | null>) | null>(null);
  const sendCookingMessageRef = useRef<((message: string) => void) | null>(null);
  const verifyServedDishRef = useRef<((servedDishName: string) => Promise<boolean>) | null>(null);

  const handlePickUp = useCallback((orderId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) return { ...order, status: 'in_progress' as const };
      return order;
    }));
  }, []);

  const handleCookWithGemini = useCallback((order: Order) => {
    if (order.status === 'not_started') {
      handlePickUp(order.id);
    }
    
    setIsCooking(true);
    const isMobile = window.innerWidth < 600;
    if (!isMobile) {
      setCookingAgentOpen(true);
    }
    if (sendCookingMessageRef.current) {
      sendCookingMessageRef.current(`Please prepare: ${order.name}`);
    }
  }, [handlePickUp]);

  const handleCookBatchWithGemini = useCallback((selectedOrders: Order[]) => {
    // Start all selected orders
    setOrders(prev => prev.map(order => {
      if (selectedOrders.some(so => so.id === order.id)) return { ...order, status: 'in_progress' as const };
      return order;
    }));
    
    setIsCooking(true);
    if (window.innerWidth >= 600) setCookingAgentOpen(true);
    
    if (sendCookingMessageRef.current) {
      const dishNames = selectedOrders.map(o => o.name).join(', ');
      sendCookingMessageRef.current(`Vanakkam! Today we are preparing a grand feast! Please prepare the following items in sequence or together: ${dishNames}. Serve each one on the banana leaf when ready.`);
    }
  }, []);

  const handleVerifyServedDish = useCallback(async (servedDishName: string): Promise<boolean> => {
    if (verifyServedDishRef.current) {
      const result = await verifyServedDishRef.current(servedDishName);
      // We only stop cooking if NO in-progress orders remain
      setOrders(currentOrders => {
        const remaining = currentOrders.filter(o => o.status === 'in_progress');
        if (remaining.length === 0) setIsCooking(false);
        return currentOrders;
      });
      return result;
    }
    setIsCooking(false);
    return false;
  }, []);

  const handleAddOrder = useCallback((orderName: string) => {
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      name: orderName,
      emoji: '📜',
      status: 'not_started',
      difficulty: 'intermediate'
    };
    setOrders(prev => [...prev, newOrder]);
  }, []);

  const handleClearSummaryRequest = useCallback(() => {
    setIsConfirmingClear(true);
  }, []);

  const handlePerformClearSummary = useCallback(() => {
    setOrders(prev => prev.filter(order => order.status !== 'completed' && order.status !== 'failed'));
    setIsConfirmingClear(false);
  }, []);

  const handlePass = useCallback(() => {
    setOrders(prev => prev.map(order =>
      order.status === 'in_progress'
        ? { ...order, status: 'failed' as const, servedDish: 'Vanished' }
        : order
    ));
    setIsCooking(false);
  }, []);

  return (
    <div className="app-container">
      <GeminiAPIProvider>
        <CombinationAgent
          inventory={inventory}
          setInventory={setInventory}
          timeline={timeline}
          setTimeline={setTimeline}
          selectedIngredients={selectedIngredients}
          setSelectedIngredients={setSelectedIngredients}
          activeAction={activeAction}
          setActiveAction={setActiveAction}
          actionTriggerCount={actionTriggerCount}
          activeIngredients={activeIngredients}
          setActiveIngredients={setActiveIngredients}
          onExecuteActionRef={executeCombinationRef}
          orders={orders}
          onCookWithGemini={handleCookWithGemini}
          onCookBatchWithGemini={handleCookBatchWithGemini}
          onPickUp={handlePickUp}
          onAddOrder={handleAddOrder}
          onClearSummary={handleClearSummaryRequest}
          onServe={handleVerifyServedDish}
          onOpenCombinationAgent={() => { setCombinationAgentOpen(true); setCookingAgentOpen(false); setVerificationAgentOpen(false); setAssistantOpen(false); }}
          onOpenCookingAgent={() => { setCookingAgentOpen(true); setCombinationAgentOpen(false); setVerificationAgentOpen(false); setAssistantOpen(false); }}
          onOpenVerificationAgent={() => { setVerificationAgentOpen(true); setCombinationAgentOpen(false); setCookingAgentOpen(false); setAssistantOpen(false); }}
          isCooking={isCooking}
          isCookingAgentOpen={cookingAgentOpen}
          isAlchemyAgentOpen={combinationAgentOpen}
          isJudgeAgentOpen={verificationAgentOpen}
        />
        <GeminiDebug
          agentName="Spice Expert"
          isOpen={combinationAgentOpen}
          onClose={() => setCombinationAgentOpen(false)}
          welcomeMessage="I analyze the science of tempering and stone-grinding. Try a combination of mustard and curry leaves!"
          placeholder="Ask about culinary science..."
          showApprovalSelector={false}
        />
      </GeminiAPIProvider>

      <GeminiAPIProvider>
        <CookingAgent
          inventory={inventory}
          setInventory={setInventory}
          setTimeline={setTimeline}
          setActiveAction={setActiveAction}
          setActionTriggerCount={setActionTriggerCount}
          setActiveIngredients={setActiveIngredients}
          executeCombinationRef={executeCombinationRef}
          sendMessageRef={sendCookingMessageRef}
          onServe={handleVerifyServedDish}
          onPass={handlePass}
        />
        <GeminiDebug
          agentName="Head Chef"
          isOpen={cookingAgentOpen}
          onClose={() => setCookingAgentOpen(false)}
          welcomeMessage="Authentic Chennai flavors coming up. Ready to stone-grind some batter?"
          placeholder="What should we cook today?"
          initialAutoApprove={true}
          showApprovalSelector={true}
        />
      </GeminiAPIProvider>

      <GeminiAPIProvider>
        <VerificationAgent
          orders={orders}
          inventory={inventory}
          setOrders={setOrders}
          setTimeline={setTimeline}
          verifyServedDishRef={verifyServedDishRef}
        />
        <GeminiDebug
          agentName="Food Critic"
          isOpen={verificationAgentOpen}
          onClose={() => setVerificationAgentOpen(false)}
          welcomeMessage="I only accept perfection. Does the Dosa have the right crunch?"
          placeholder="Review culinary quality..."
          showApprovalSelector={false}
        />
      </GeminiAPIProvider>

      <GeminiAPIProvider>
        <GeminiDebug
          agentName="Kitchen Assistant"
          isOpen={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          welcomeMessage="Vanakkam! I'm your South Indian culinary assistant. How can I help you today?"
          placeholder="Ask about recipes, ingredients, or techniques..."
          showApprovalSelector={false}
          showModelSelector={true}
        />
      </GeminiAPIProvider>

      <button 
        className="floating-assistant-button" 
        onClick={() => setAssistantOpen(!assistantOpen)}
        title="Ask Kitchen Assistant"
      >
        <span className="material-symbols-outlined">spark</span>
      </button>

      {isConfirmingClear && (
        <div className="custom-modal-overlay" onClick={() => setIsConfirmingClear(false)}>
          <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-decorative-border"></div>
            <h3>Clear Madras Feasts?</h3>
            <p>This will permanently remove all served and failed orders from the summary list. Are you sure, Mami?</p>
            <div className="modal-actions">
              <button className="modal-button secondary" onClick={() => setIsConfirmingClear(false)}>No, Keep Them</button>
              <button className="modal-button primary" onClick={handlePerformClearSummary}>Yes, Clear All</button>
            </div>
          </div>
        </div>
      )}

      <footer className="attribution-footer">
        Authentic Madras Masala Lab experience
      </footer>
    </div>
  );
}

function App() {
  return <KitchenAppContainer />;
}

export default App;
