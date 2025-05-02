import React, { Suspense } from 'react'; // Import Suspense
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n'; // <-- Import the i18n configuration

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Wrap App with Suspense for i18n loading */}
    <Suspense fallback="Loading..."> 
      <App />
    </Suspense>
  </React.StrictMode>,
);
