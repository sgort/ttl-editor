import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { initAuth } from './utils/auth';

// Once per page load: a returning user's session is restored silently (#163
// in linked-data-explorer); a first-time visitor is never sent to Keycloak.
void initAuth();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
