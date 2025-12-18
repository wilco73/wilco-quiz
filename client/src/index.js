import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { SocketProvider } from './contexts/SocketContext';
import ToastProvider from './components/ToastProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DarkModeProvider>
      <SocketProvider>
        <ToastProvider> 
          <App />
        </ToastProvider>
      </SocketProvider>
    </DarkModeProvider>
  </React.StrictMode>
);