// useArrayHandlers.js - Reusable hook for array CRUD operations
// DRY pattern for rules, parameters, CPRMV rules, etc.

import { useCallback } from 'react';

/**
 * Custom hook for managing array state with CRUD operations
 * Provides add, update, remove handlers for array-based state
 *
 * @param {Array} items - Current array state
 * @param {Function} setItems - State setter function
 * @param {Function} createDefaultItem - Function that returns a new default item
 * @returns {Object} Handler functions for array operations
 */
export const useArrayHandlers = (items, setItems, createDefaultItem) => {
  /**
   * Add a new item to the array
   */
  const handleAdd = useCallback(() => {
    const newItem = createDefaultItem();
    // Generate unique ID based on existing items
    const maxId = items.reduce((max, item) => Math.max(max, item.id || 0), 0);
    setItems([...items, { ...newItem, id: maxId + 1 }]);
  }, [items, setItems, createDefaultItem]);

  /**
   * Update a specific item by ID
   * @param {number} id - Item ID to update
   * @param {Object} updates - Fields to update
   */
  const handleUpdate = useCallback(
    (id, updates) => {
      setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    },
    [items, setItems]
  );

  /**
   * Remove an item by ID
   * @param {number} id - Item ID to remove
   */
  const handleRemove = useCallback(
    (id) => {
      setItems(items.filter((item) => item.id !== id));
    },
    [items, setItems]
  );

  /**
   * Update a specific field of an item
   * Convenience method for single field updates
   * @param {number} id - Item ID
   * @param {string} field - Field name
   * @param {*} value - New value
   */
  const handleUpdateField = useCallback(
    (id, field, value) => {
      handleUpdate(id, { [field]: value });
    },
    [handleUpdate]
  );

  /**
   * Clear all items (set to empty array)
   */
  const handleClear = useCallback(() => {
    setItems([]);
  }, [setItems]);

  /**
   * Replace entire array
   * @param {Array} newItems - New items array
   */
  const handleReplace = useCallback(
    (newItems) => {
      setItems(newItems);
    },
    [setItems]
  );

  return {
    handleAdd,
    handleUpdate,
    handleRemove,
    handleUpdateField,
    handleClear,
    handleReplace,
  };
};

/**
 * Factory function to create default items for different types
 * These match the DEFAULT_* constants from constants.js
 */
export const createDefaultTemporalRule = () => ({
  identifier: '',
  title: '',
  uri: '',
  extends: '',
  validFrom: '',
  validUntil: '',
  confidenceLevel: 'high',
  description: '',
});

export const createDefaultParameter = () => ({
  notation: '',
  label: '',
  value: '',
  unit: 'EUR',
  description: '',
  validFrom: '',
  validUntil: '',
});

export const createDefaultCprmvRule = () => ({
  ruleId: '',
  rulesetId: '',
  definition: '',
  situatie: '',
  norm: '',
  ruleIdPath: '',
});

/**
 * Pre-configured hooks for specific array types
 * Use these in components for convenience
 */

/**
 * Hook for managing temporal rules
 */
export const useTemporalRulesHandlers = (temporalRules, setTemporalRules) => {
  return useArrayHandlers(temporalRules, setTemporalRules, createDefaultTemporalRule);
};

/**
 * Hook for managing parameters
 */
export const useParametersHandlers = (parameters, setParameters) => {
  return useArrayHandlers(parameters, setParameters, createDefaultParameter);
};

/**
 * Hook for managing CPRMV rules
 */
export const useCprmvRulesHandlers = (cprmvRules, setCprmvRules) => {
  return useArrayHandlers(cprmvRules, setCprmvRules, createDefaultCprmvRule);
};
