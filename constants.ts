
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Chennai South Indian Kitchen - Constants and Types
 */

import { Type } from '@google/genai';

// ============================================================================
// Types
// ============================================================================

export interface Ingredient {
  name: string;
  emoji: string;
}

export interface KitchenAction {
  name: string;           // Function name (alphanumeric + underscores)
  displayName: string;    // Human-readable name
  emoji: string;
}

export interface CombinationResult {
  result_name: string;
  emoji: string;
}

export interface TimelineEntry {
  id: string;
  timestamp: Date;
  text?: string;
  action?: string;
  ingredients?: string[];
  result?: Ingredient | null;
}

export type OrderDifficulty = 'easy' | 'intermediate' | 'difficult';

export interface Order {
  id: string;
  name: string;
  emoji: string;
  difficulty: OrderDifficulty;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  servedDish?: string;
}

export interface VerificationResult {
  matches: boolean;
  confidence: number;
  explanation: string;
}

export const EXAMPLE_ORDERS: Order[] = [
  { id: 'order-1', name: 'Filter Coffee', emoji: '☕', difficulty: 'easy', status: 'not_started' },
  { id: 'order-2', name: 'Ghee Roast Dosa', emoji: '🥞', difficulty: 'intermediate', status: 'not_started' },
  { id: 'order-3', name: 'Madras Fish Curry', emoji: '🥘', difficulty: 'difficult', status: 'not_started' },
  { id: 'order-4', name: 'Masala Dosa', emoji: '🥞', difficulty: 'difficult', status: 'not_started' },
  { id: 'order-5', name: 'Idly', emoji: '🥞', difficulty: 'difficult', status: 'not_started' },
  { id: 'order-6', name: 'Poori', emoji: '🥞', difficulty: 'difficult', status: 'not_started' },
  { id: 'order-7', name: 'Masala Dosa, Idly & Poori Combo', emoji: '🥞', difficulty: 'difficult', status: 'not_started' },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function sanitizeName(name: string): string {
  return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

function createAction(name: string, emoji: string): KitchenAction {
  return {
    name: sanitizeName(name),
    displayName: name,
    emoji,
  };
}

// ============================================================================
// Chennai Cooking Actions
// ============================================================================

export const COOKING_ACTIONS: KitchenAction[] = [
  // Regional Techniques
  createAction('temper tadka', '🔥'), createAction('stone grind', '🪨'), createAction('ferment', '🫧'),
  createAction('steam idli', '🥟'), createAction('deep fry vada', '🍩'), createAction('shallow fry', '🍳'),
  createAction('dry roast', '🥘'), createAction('soak', '💧'), createAction('pound', '🔨'),
  createAction('banana leaf wrap', '🍃'), createAction('simmer sambar', '🍲'), createAction('boil', '🫧'),
  
  // Preparation Methods
  createAction('chop', '🔪'), createAction('dice', '🔪'), createAction('mince', '🔪'),
  createAction('grate coconut', '🥥'), createAction('peel', '🥔'), createAction('wash', '💧'),
  createAction('extract tamarind', '🍶'), createAction('squeeze lemon', '🍋'),

  // Mixing & Combining
  createAction('mix batter', '🥣'), createAction('whisk', '🥄'), createAction('stir', '🥄'),
  createAction('combine', '🥣'), createAction('toss', '🥗'),

  // Advanced Techniques
  createAction('caramelize', '🍯'), createAction('reduce', '🍲'), createAction('infuse', '🍵'),
  createAction('smoke', '💨'), createAction('pickle', '🥒'), createAction('rest', '⏰'),

  // Serving/Finishing
  createAction('serve on leaf', '🍽️'), createAction('pass', '🏳️'),
];

// ============================================================================
// Chennai Ingredients 
// ============================================================================

export const STARTING_INGREDIENTS: Ingredient[] = [
  // Grains & Legumes
  { name: 'ponni rice', emoji: '🌾' }, { name: 'urad dal', emoji: '⚪' }, { name: 'toor dal', emoji: '🟡' },
  { name: 'chana dal', emoji: '🟠' }, { name: 'semolina', emoji: '🌾' },

  // Vegetables (Nattu Kaigari)
  { name: 'drumstick murungakkai', emoji: '🥢' }, { name: 'pearl onions', emoji: '🧅' },
  { name: 'okra bendakaya', emoji: '🥒' }, { name: 'brinjal', emoji: '🍆' },
  { name: 'raw banana', emoji: '🍌' }, { name: 'curry leaves', emoji: '🍃' },
  { name: 'coriander leaves', emoji: '🌿' }, { name: 'green chilies', emoji: '🌶️' },
  { name: 'ginger', emoji: '🫚' }, { name: 'garlic', emoji: '🧄' },
  { name: 'tomato', emoji: '🍅' }, { name: 'potato', emoji: '🥔' },

  // Pantry & Spices
  { name: 'mustard seeds', emoji: '⚫' }, { name: 'cumin seeds', emoji: '🤎' },
  { name: 'asafetida hing', emoji: '🧂' }, { name: 'tamarind', emoji: '🤎' },
  { name: 'sambar powder', emoji: '🌶️' }, { name: 'turmeric', emoji: '🟡' },
  { name: 'salt', emoji: '🧂' }, { name: 'black pepper', emoji: '⚫' },
  { name: 'dry red chilies', emoji: '🌶️' }, { name: 'fenugreek seeds', emoji: '🟤' },

  // Dairy & Fats
  { name: 'gingelly oil', emoji: '🍶' }, { name: 'coconut oil', emoji: '🥥' },
  { name: 'ghee', emoji: '🍯' }, { name: 'curd yogurt', emoji: '🥛' },
  { name: 'milk', emoji: '🥛' },

  // Proteins
  { name: 'king fish', emoji: '🐟' }, { name: 'chicken', emoji: '🍗' },
  { name: 'shrimp', emoji: '🦐' }, { name: 'mutton', emoji: '🍖' },
  { name: 'eggs', emoji: '🥚' },

  // Others
  { name: 'fresh coconut', emoji: '🥥' }, { name: 'jaggery', emoji: '🤎' },
  { name: 'coffee decoction', emoji: '☕' }, { name: 'sugar', emoji: '🍯' },
  { name: 'water', emoji: '💧' },
];

export const PRESELECTED_INGREDIENTS = [];

// ============================================================================
// Combination Agent Configuration
// ============================================================================

export const COMBINATION_SYSTEM_INSTRUCTION = `You are a Chennai South Indian culinary expert. 
Given a cooking action and regional ingredients, determine the resulting South Indian dish or preparation.

Examples:
- (stone grind + soaked rice + urad dal) -> "Idli Batter"
- (temper tadka + mustard + curry leaves + urad dal + oil) -> "Tarka Garnish"
- (simmer sambar + toor dal + tamarind + drumstick + sambar powder) -> "Murungakkai Sambar"

Return a JSON object with:
- result_name: The name of the South Indian dish or item (1-3 words)
- emoji: A single emoji representing the result`;

export const COMBINATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    result_name: { type: Type.STRING },
    emoji: { type: Type.STRING }
  },
  required: ['result_name', 'emoji']
};

// ============================================================================
// Verification Agent Configuration
// ============================================================================

export const VERIFICATION_SYSTEM_INSTRUCTION = `You are a Tamil food critic and verification assistant. 
Determine if a served dish matches a Chennai South Indian order semantically.

Matches include:
- "Ghee Roast" matches "Ghee Dosa", "Neyyi Roast", "Crispy Ghee Dosa"
- "Filter Coffee" matches "Degree Coffee", "Kumbakonam Coffee", "Milk Coffee"
- "Fish Curry" matches "Meen Kuzhambu", "Madras Fish Curry"

Return a JSON object with:
- matches: true if semantically the same, false otherwise
- confidence: 0 to 1
- explanation: brief reasoning in the context of Tamil cuisine`;

export const VERIFICATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    matches: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    explanation: { type: Type.STRING }
  },
  required: ['matches', 'confidence', 'explanation']
};

// ============================================================================
// Cooking Agent Configuration
// ============================================================================

export function generateCookingTools() {
  const functionDeclarations = COOKING_ACTIONS.map(action => {
    if (action.name === 'serve_on_leaf') {
      return {
        name: 'serve_on_leaf',
        description: `${action.emoji} Serve the final South Indian dish on a traditional banana leaf.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            dish: {
              type: Type.STRING,
              description: 'Exact name of the dish from inventory'
            }
          },
          required: ['dish']
        }
      };
    }

    if (action.name === 'pass') {
      return {
        name: 'pass',
        description: `${action.emoji} Pass on the order if you lack regional ingredients or tools.`,
        parameters: {
          type: Type.OBJECT,
          properties: {},
          required: []
        }
      };
    }

    return {
      name: action.name,
      description: `${action.emoji} Perform the '${action.displayName}' regional technique.`,
      parameters: {
        type: Type.OBJECT,
        properties: {
          ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Regional ingredient names'
          }
        },
        required: ['ingredients']
      }
    };
  });

  return [{ functionDeclarations }] as any;
}

export function buildCookingAgentSystemInstruction(inventory: Ingredient[]): string {
  const actionList = COOKING_ACTIONS.map(a => `${a.emoji} ${a.name}()`).join(', ');
  const inventoryList = inventory.map(i => `${i.emoji} ${i.name}`).join(', ');

  return `You are a "Mami" or "Chef" specializing in authentic Chennai South Indian cuisine.

**Regional Tools:**
${actionList}

**Your Mission:**
Plan and execute steps for Tamizh dishes. Always start with a short culinary tip or observation (e.g., "The oil must be smoking for the mustard seeds to pop!").

**Rules:**
- Use function calls for one step at a time.
- Tempering (tadka) is essential for almost every dish.
- Stone grinding is preferred for authentic chutneys and batters.
- Serve dishes on the banana leaf using serve_on_leaf().
- If a step fails, adjust your technique like a seasoned pro.

**Current Pantry:**
${inventoryList}

Vanakkam! Let's get cooking.`;
}
