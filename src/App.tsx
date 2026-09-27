import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { BackofficeProvider } from './context/BackofficeContext';
import { AppRouter } from './router/AppRouter';

/**
 * Ponto de entrada da aplicação.
 *
 * Responsabilidades (nesta ordem):
 *   1. BrowserRouter — fornece o contexto de navegação
 *   2. ToastProvider — fornece o sistema de toasts flutuantes
 *   3. BackofficeProvider — fornece o estado global (tenants, etc.)
 *   4. AppRouter — monta as rotas
 */
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <BackofficeProvider>
          <AppRouter />
        </BackofficeProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
