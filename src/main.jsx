import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AppContextProvider } from './context/AppContext.jsx';
import { MantineProvider } from '@mantine/core';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider withNormalizeCSS withGlobalStyles>
        <AppContextProvider>
          <App />
        </AppContextProvider>
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>
);
