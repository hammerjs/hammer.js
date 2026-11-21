import './index.css';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {KitchensinkApp} from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KitchensinkApp />
  </StrictMode>
);
