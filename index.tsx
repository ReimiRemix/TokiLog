import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // 失敗したクエリは1度だけ再試行
      staleTime: 1000 * 60 * 5, // 5分間はキャッシュを新鮮なものとして扱う
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// --- Service Worker Cleanup ---
// Forcefully unregister any existing service workers to prevent stale cache issues.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(const registration of registrations) {
      registration.unregister();
      console.log('Stale service worker unregistered.');
    }
  }).catch(function(err) {
    console.error('Service Worker unregistration failed: ', err);
  });
}