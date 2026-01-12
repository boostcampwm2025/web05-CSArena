import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/index.css';

import { UserProvider } from '@/feature/auth/useUser.tsx';
import { SceneProvider } from '@/feature/useScene.tsx';
import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProvider>
      <SceneProvider>
        <App />
      </SceneProvider>
    </UserProvider>
  </React.StrictMode>,
);
