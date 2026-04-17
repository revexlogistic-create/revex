if (!Array.prototype.toSorted) {
  Array.prototype.toSorted = function(fn) { return [...this].sort(fn); };
}
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
