import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { SocketProvider } from './contexts/SocketContext';
import ToastProvider from './components/ToastProvider';
import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
    <DarkModeProvider>
      <SocketProvider>
        <ToastProvider> 
          <App />
        </ToastProvider>
      </SocketProvider>
    </DarkModeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);