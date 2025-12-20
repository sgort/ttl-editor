// index.js - Export all iKnow mapping configurations
// This file makes it easy to load all available configurations
// Add new configs by importing them here and adding to the array

import aowExample from './iknow-mapping-aow-example.json';

// Array of all available iKnow mapping configurations
export const iknowMappings = [aowExample];

// Default export for convenience
export default iknowMappings;

// Usage in App.js:
// import { iknowMappings } from './config/iknow-mappings';
// setAvailableIKnowMappings(iknowMappings);
