import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DataProvider } from './store/data'
import { AuthProvider } from './store/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
