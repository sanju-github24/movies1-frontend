import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AppContextProvider } from './context/AppContext.jsx';
import { Analytics } from '@vercel/analytics/react';
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from './components/ErrorBoundary.jsx';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <AppContextProvider>
            <App />
            <Analytics />
          </AppContextProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);