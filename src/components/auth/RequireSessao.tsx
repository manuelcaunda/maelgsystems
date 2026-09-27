import { Navigate, useLocation } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';

/**
 * Sessional da area protegida.
 *
 * Enquanto a sessao nao esta resolvida mostramos um ecrã vazio, para nao
 * chegar a renderizar o backoffice (e a disparar pedidos sem token) antes de
 * sabermos se o token e' valido. Sem operador, vai para o login e leva atras
 * a rota pretendida.
 */
export function RequireSessao({ children }: { children: React.ReactNode }) {
  const { currentUser, sessaoCarregada } = useBackoffice();
  const local = useLocation();

  if (!sessaoCarregada) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }

  return <>{children}</>;
}
