import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/app';
import { Providers } from './app/providers';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento raiz ausente.');
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </StrictMode>,
);
