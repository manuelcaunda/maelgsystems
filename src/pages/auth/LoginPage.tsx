import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import { Button } from '../../components/ui/Button';
import * as sessao from '../../services/sessao';
import { PAPEIS_OPERADOR, type PapelOperador } from '../../types';

/**
 * Porta de entrada do backoffice.
 *
 * Dois modos, decididos pelo servidor (`GET /operadores/estado`):
 *   - bootstrap: a plataforma nao tem nenhum operador. Cria-se a primeira
 *     conta, que e' o unico caminho para sair de um sistema vazio.
 *   - login: a plataforma ja tem contas. Entra-se com email e password.
 *
 * Nao ha atalho: sem token em `localStorage` nao se entra no backoffice, e o
 * servidor rejeita tudo o que nao vier com `Authorization: Bearer`.
 */
export function LoginPage() {
  const {
    currentUser,
    sessaoCarregada,
    precisaBootstrap,
    login: entrar,
  } = useBackoffice();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<PapelOperador>('super_admin');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (!sessaoCarregada) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  // Ja ha sessao: a login page nao tem nada para mostrar.
  if (currentUser) return <Navigate to="/" replace />;

  const bootstrap = precisaBootstrap;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      if (bootstrap) {
        await sessao.bootstrap({ name: nome, email, password, role: papel });
        // A conta ja existe; entramos com ela para nao pedir a password outra vez.
      }
      await entrar(email, password);
    } catch (e: any) {
      setErro(e?.message ?? 'Nao foi possivel entrar.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-white tracking-tight">MaelG Systems</h1>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {bootstrap ? 'Primeira configuracao' : 'Controlo de acesso'}
          </p>
        </div>

        <form
          onSubmit={submeter}
          className="space-y-4 rounded-2xl border border-slate-800 bg-[#1E2329] p-6 shadow-xl"
        >
          {bootstrap && (
            <>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  Papel
                </label>
                <select
                  value={papel}
                  onChange={(e) => setPapel(e.target.value as PapelOperador)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  {PAPEIS_OPERADOR.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete={bootstrap ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {erro && (
            <p role="alert" className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
              {erro}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={ocupado} className="w-full">
            {ocupado ? 'A entrar...' : bootstrap ? 'Criar conta e entrar' : 'Entrar'}
          </Button>

          {bootstrap && (
            <p className="text-center font-mono text-[10px] leading-relaxed text-slate-600">
              A plataforma esta vazia. A conta que criares aqui e' a de
              super_admin e podera criar as restantes.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
