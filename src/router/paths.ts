// src/router/paths.ts

/**
 * Constantes de rotas da aplicação.
 *
 * Regra: nunca escrevas uma string de rota num componente.
 * Usa sempre PATHS.<recurso>.<acao>(args).
 *
 * Isto permite mudar uma rota num só sítio, e permite ao
 * TypeScript avisar-te se estiveres a usar uma rota inexistente.
 */

export const PATHS = {
  // ─────────────────────────────────────────────
  // Ecrãs principais
  // ─────────────────────────────────────────────
  dashboard: '/dashboard',
  reports: '/relatorios',

  // ─────────────────────────────────────────────
  // Tenants (clientes)
  // ─────────────────────────────────────────────
  tenants: {
    list: '/tenants',
    create: '/tenants/novo',
    detail: (id: string) => `/tenants/${id}`,
    subscription: (id: string) => `/tenants/${id}/assinatura`,
    billing: (id: string) => `/tenants/${id}/faturacao`,
    audit: (id: string) => `/tenants/${id}/auditoria`,
    maelgest: (id: string) => `/tenants/${id}/maelgest`,
  },

  // ─────────────────────────────────────────────
  // Produtos
  // ─────────────────────────────────────────────
  products: {
    list: '/produtos',
    integration: (slug: string) => `/produtos/${slug}/integracao`,
  },

  // ─────────────────────────────────────────────
  // Planos
  // ─────────────────────────────────────────────
  plans: {
    list: '/planos',
  },

  // ─────────────────────────────────────────────
  // Assinaturas
  // ─────────────────────────────────────────────
  subscriptions: {
    list: '/assinaturas',
  },

  // ─────────────────────────────────────────────
  // Pagamentos
  // ─────────────────────────────────────────────
  payments: {
    list: '/pagamentos',
  },

  // ─────────────────────────────────────────────
  // Auditoria
  // ─────────────────────────────────────────────
  audit: {
    list: '/auditoria',
  },

  // ─────────────────────────────────────────────
  // Super Admins (operadores do backoffice)
  // ─────────────────────────────────────────────
  superadmins: {
    list: '/superadmins',
    rbacMatrix: '/superadmins/permissoes',
  },

  // ─────────────────────────────────────────────
  // Configurações
  // ─────────────────────────────────────────────
  settings: {
    root: '/configuracoes',
    platform: '/configuracoes/plataforma',
    email: '/configuracoes/email',
    jobs: '/configuracoes/jobs',
  },
} as const;
