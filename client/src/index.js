import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { DarkModeProvider } from './contexts/DarkModeContext';
import ToastProvider from './components/ToastProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DarkModeProvider>
      <ToastProvider> 
        <App />
      </ToastProvider>
    </DarkModeProvider>
  </React.StrictMode>
);