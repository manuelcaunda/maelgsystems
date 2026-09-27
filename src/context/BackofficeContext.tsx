import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { Tenant, NovoTenant, NovoPagamento, Product, Plan, Subscription, Payment, AuditLog, Operator, PlatformSettings } from '../types';
import { useToast } from './ToastContext';
import * as sessao from '../services/sessao';
import type { Permissao } from '../services/sessao';

/**
 * O que a UI tem para criar um produto.
 *
 * `Product` (a resposta da API) nao serve: a credencial nunca volta do
 * servidor, porque nao ha endpoint que a devolva. Por isso o pedido tem o
 * seu proprio tipo.
 */
interface NovoProdutoUI extends Partial<Product> {
  produtoChave: string;
  produtoSegredo: string;
  primeiroPlano: NovoPlanoUI;
}

/**
 * O plano que traz o produto no momento em que e' criado. A API exige pelo
 * menos um (`criarProdutoComEsqueleto`), porque um produto sem plano nao e
 * contratavel.
 */
interface NovoPlanoUI {
  codigo: string;
  nome: string;
  priceAoa: number;
  maxStudents: number;
  maxUsers: number;
  maxStorageGb: number;
  isActive: boolean;
}

interface BackofficeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  products: Product[];
  plans: Plan[];
  tenants: Tenant[];
  subscriptions: Subscription[];
  payments: Payment[];
  auditLogs: AuditLog[];
  operators: Operator[];
  currentUser: Operator | null;
  settings: PlatformSettings;

  // Sessao real: o token vive no localStorage, o operador vem da base.
  // Enquanto `sessaoCarregada` for false, a UI ainda nao sabe quem entrou.
  sessaoCarregada: boolean;
  precisaBootstrap: boolean;
  permissoes: Permissao[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  temPermissao: (p: Permissao) => boolean;

  // Role based access checks (RBAC)
  canManageTenants: boolean;
  canManagePayments: boolean;
  isSuperAdmin: boolean;
  
  // Refetch
  fetchData: () => Promise<void>;
  
  // Actions
  
  // Products CRUD
  addProduct: (data: NovoProdutoUI) => Promise<void>;
  updateProduct: (slug: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (slug: string) => Promise<void>;
  
  // Plans CRUD
  addPlan: (data: Partial<Plan>) => Promise<void>;
  updatePlan: (slug: string, data: Partial<Plan>) => Promise<void>;
  deletePlan: (slug: string) => Promise<void>;
  
  // Tenants CRUD
  createTenant: (data: Partial<NovoTenant>) => Promise<number>;
  reprovisionarTenant: (id: number) => Promise<void>;
  updateTenant: (id: number, data: Partial<Tenant>) => Promise<void>;
  deleteTenant: (id: number) => Promise<void>;
  
  // Payments CRUD
  registerPayment: (data: Partial<NovoPagamento>) => Promise<void>;
  deletePayment: (id: number) => Promise<void>;
  
  // Operators CRUD
  addOperator: (data: Partial<Operator>) => Promise<void>;
  updateOperator: (id: number, data: Partial<Operator>) => Promise<void>;
  deleteOperator: (id: number) => Promise<void>;
  
  suspendTenant: (id: number, reason: string) => Promise<void>;
  reactivateTenant: (id: number) => Promise<void>;
  cancelTenant: (id: number, reason: string) => Promise<void>;
  extendTrial: (id: number, days: number) => Promise<void>;
  changePlan: (id: number, planSlug: string) => Promise<void>;
  updateSettings: (data: Partial<PlatformSettings>) => Promise<void>;
}

const BackofficeContext = createContext<BackofficeContextType | undefined>(undefined);

export function BackofficeProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('maelg_theme');
    return (saved as any) || 'dark';
  });

  // Client States
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [currentUser, setCurrentUser] = useState<Operator | null>(null);
  const [sessaoCarregada, setSessaoCarregada] = useState(false);
  const [precisaBootstrap, setPrecisaBootstrap] = useState(false);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'MaelG Control Plane',
    platformUrl: 'https://admin.maelg.ao',
    supportEmail: 'suporte@maelg.ao',
    activeMaintenance: false,
    emailTemplates: { provisioned: '', suspended: '', invoicePending: '' },
  });

  // Sync html class for theme
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('maelg_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Fetch data function from Fullstack express backend API
  const fetchData = useCallback(async () => {
    try {
      const [
        resTenants,
        resProducts,
        resPlans,
        resSubscriptions,
        resPayments,
        resOperators,
        resSettings,
        resAudits
      ] = await Promise.all([
        sessao.pedir<Tenant[]>('/tenants'),
        sessao.pedir<Product[]>('/products'),
        sessao.pedir<Plan[]>('/plans'),
        sessao.pedir<Subscription[]>('/subscriptions'),
        sessao.pedir<Payment[]>('/payments'),
        sessao.pedir<Operator[]>('/operators'),
        sessao.pedir<PlatformSettings>('/settings'),
        sessao.pedir<AuditLog[]>('/audit_logs')
      ]);

      setTenants(resTenants);
      setProducts(resProducts);
      setPlans(resPlans);
      setSubscriptions(resSubscriptions);
      setPayments(resPayments);
      setOperators(resOperators);
      setSettings(resSettings);
      setAuditLogs(resAudits);
    } catch (e) {
      console.error('Error fetching backend data:', e);
    }
  }, []);

  // Carrega os dados so depois de haver token: antes disso a plataforma
  // rejeita os oito pedidos e nao ha nada a mostrar.
  useEffect(() => {
    if (sessaoCarregada && currentUser) fetchData();
  }, [sessaoCarregada, currentUser, fetchData]);

  // Determine permissions based on role
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canManageTenants =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'product_admin' ||
    currentUser?.role === 'support_admin';
  const canManagePayments =
    currentUser?.role === 'super_admin' || currentUser?.role === 'finance_admin';

  const temPermissao = useCallback(
    (p: Permissao) => permissoes.includes(p),
    [permissoes],
  );

  // --- sessao ---------------------------------------------------------------
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [s, estado] = await Promise.all([
        sessao.eu(),
        sessao.estadoPlataforma(),
      ]);
      if (!vivo) return;
      if (s) {
        setCurrentUser(s.operador);
        setPermissoes(s.permissoes);
      }
      setPrecisaBootstrap(estado.bootstrapNecessario);
      setSessaoCarregada(true);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await sessao.login(email, password);
    sessao.guardarToken(r.token);
    setCurrentUser(r.operador);
    setPermissoes(r.permissoes);
    setPrecisaBootstrap(false);
  }, []);

  const logout = useCallback(() => {
    sessao.limparToken();
    setCurrentUser(null);
    setPermissoes([]);
    // Os dados que ficaram em memoria eram do operador que acabou de sair.
    setTenants([]);
    setProducts([]);
    setPlans([]);
    setSubscriptions([]);
    setPayments([]);
    setOperators([]);
    setAuditLogs([]);
  }, []);

  // --- CRUD Actions calling Backend REST Endpoints (100% Real, No Mock) ---

  /**
   * Cria um produto com o primeiro plano.
   *
   * A API espera os nomes em portugues (`nome`, `versao`) e exige pelo menos
   * um plano — um produto sem plano nao e contratavel. A traducao do que a UI
   * tem para o que a API quer fica aqui, e nao espalhada pelas paginas.
   */
  const addProduct = useCallback(
    async (data: NovoProdutoUI) => {
      const planos = [data.primeiroPlano];
      try {
        await sessao.pedir('/products', {
          method: 'POST',
          body: JSON.stringify({
            slug: data.slug,
            nome: data.name,
            descricao: data.description,
            versao: data.version,
            apiUrl: data.apiUrl,
            produtoChave: data.produtoChave,
            produtoSegredo: data.produtoSegredo,
            planos,
          }),
        });
        showToast(`Produto "${data.name}" criado.`, 'success');
        await fetchData();
      } catch (e: any) {
        showToast(e.message, 'error');
      }
    },
    [fetchData, showToast],
  );

  const updateProduct = useCallback(async (slug: string, data: Partial<Product>) => {
    try {
      await sessao.pedir(`/products/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({
          nome: data.name,
          descricao: data.description,
          versao: data.version,
          apiUrl: data.apiUrl,
          status: data.status,
        }),
      });
      showToast(`Produto actualizado.`, 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const deleteProduct = useCallback(async (slug: string) => {
    try {
      await sessao.pedir(`/products/${slug}`, { method: 'DELETE' });
      showToast(`Produto removido.`, 'warning');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const addPlan = useCallback(async (data: Partial<Plan>) => {
    try {
      await sessao.pedir('/plans', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast(`Plano "${data.nome}" criado.`, 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const updatePlan = useCallback(async (slug: string, data: Partial<Plan>) => {
    try {
      await sessao.pedir(`/plans/${slug}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast(`Plano actualizado.`, 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const deletePlan = useCallback(async (slug: string) => {
    try {
      await sessao.pedir(`/plans/${slug}`, { method: 'DELETE' });
      showToast(`Plano removido.`, 'warning');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  /**
   * Cria a inscricao (tenant). O backend e' que chama a API do produto: se a
   * escola nao nascer la, o tenant vem de volta em `erro` e ha `reprovisionar`
   * para tentar outra vez. Nao ha defaults inventados -- o que faltar, o
   * formulario tem de pedir.
   */
  const createTenant = useCallback(async (data: Partial<NovoTenant>): Promise<number> => {
    try {
      const resData = await sessao.pedir<{ id: number; provisionamento: string; provisionamentoErro: string | null }>(
        '/tenants',
        {
        method: 'POST',
        body: JSON.stringify({
          nome: data.nome,
          produtoSlug: data.produtoSlug,
          planoId: data.planoId,
          nif: data.nif,
          tipo: data.tipo,
          designacao: data.designacao,
          regimeEnsino: data.regimeEnsino,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          province: data.province,
          city: data.city,
          firstAdminName: data.firstAdminName,
          firstAdminEmail: data.firstAdminEmail,
          firstAdminPhone: data.firstAdminPhone,
          trialDias: data.trialDias,
          notas: data.notas,
        }),
        },
      );

      if (resData.provisionamento === 'erro') {
        showToast(
          `Inscricao criada, mas a escola nao respondeu: ${resData.provisionamentoErro || 'erro desconhecido'}`,
          'warning',
        );
      } else {
        showToast(`Inscricao criada e escola confirmada no produto.`, 'success');
      }
      await fetchData();
      return resData.id;
    } catch (e: any) {
      showToast(e.message, 'error');
      throw e;
    }
  }, [fetchData, showToast]);

  /** Tenta de novo a criacao da escola depois de um `provisionamento: erro`. */
  const reprovisionarTenant = useCallback(async (id: number) => {
    try {
      const resData = await sessao.pedir<{ provisionamento: string; provisionamentoErro: string | null }>(
        `/tenants/${id}/aprovisionar`,
        { method: 'POST' },
      );
      showToast(
        resData.provisionamento === 'provisionado'
          ? 'Escola confirmada no produto.'
          : `O produto ainda nao confirmou: ${resData.provisionamentoErro || ''}`,
        resData.provisionamento === 'provisionado' ? 'success' : 'warning',
      );
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const updateTenant = useCallback(async (id: number, data: Partial<Tenant>) => {
    try {
      await sessao.pedir(`/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast(`Tenant actualizado.`, 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const deleteTenant = useCallback(async (id: number) => {
    try {
      await sessao.pedir(`/tenants/${id}`, { method: 'DELETE' });
      showToast(`Tenant removido.`, 'warning');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const registerPayment = useCallback(async (data: Partial<NovoPagamento>) => {
    try {
      await sessao.pedir('/payments', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('Pagamento registado.', 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const deletePayment = useCallback(async (id: number) => {
    try {
      await sessao.pedir(`/payments/${id}`, { method: 'DELETE' });
      showToast(`Pagamento removido.`, 'warning');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const addOperator = useCallback(async (data: Partial<Operator>) => {
    try {
      await sessao.pedir('/operators', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast(`Operador adicionado.`, 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const updateOperator = useCallback(async (id: number, data: Partial<Operator>) => {
    try {
      await sessao.pedir(`/operators/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast(`Operador actualizado.`, 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  const deleteOperator = useCallback(async (id: number) => {
    try {
      await sessao.pedir(`/operators/${id}`, { method: 'DELETE' });
      showToast(`Operador removido.`, 'warning');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  // Specific state change workflows calling updateTenant endpoints
  const suspendTenant = useCallback(async (id: number, reason: string) => {
    await updateTenant(id, { status: 'suspended', notas: reason });
  }, [updateTenant]);

  const reactivateTenant = useCallback(async (id: number) => {
    const target = tenants.find(t => t.id === id);
    if (target) {
      const hasTrialRemaining = target.trialEndsAt && new Date(target.trialEndsAt).getTime() > Date.now();
      const status = hasTrialRemaining ? 'trial' : 'active';
      await updateTenant(id, { status });
    }
  }, [tenants, updateTenant]);

  const cancelTenant = useCallback(async (id: number, reason: string) => {
    await updateTenant(id, { status: 'cancelled', notas: reason });
  }, [updateTenant]);

  const extendTrial = useCallback(async (id: number, days: number) => {
    const target = tenants.find(t => t.id === id);
    if (target) {
      const currentEnds = target.trialEndsAt ? new Date(target.trialEndsAt) : new Date();
      const nextEnds = new Date(currentEnds.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      await updateTenant(id, { trialEndsAt: nextEnds, status: 'trial' });
    }
  }, [tenants, updateTenant]);

  const changePlan = useCallback(async (id: number, planSlug: string) => {
    await updateTenant(id, { planoNome: planSlug });
  }, [updateTenant]);

  const updateSettings = useCallback(async (updated: Partial<PlatformSettings>) => {
    try {
      await sessao.pedir('/settings', {
        method: 'PUT',
        body: JSON.stringify(updated)
      });
      showToast('Configurações actualizadas.', 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [fetchData, showToast]);

  return (
    <BackofficeContext.Provider
      value={{
        theme,
        toggleTheme,

        products,
        plans,
        tenants,
        subscriptions,
        payments,
        auditLogs,
        operators,
        currentUser,
        sessaoCarregada,
        precisaBootstrap,
        permissoes,
        login,
        logout,
        temPermissao,
        settings,
        
        canManageTenants,
        canManagePayments,
        isSuperAdmin,
        
        fetchData,
        
        addProduct,
        updateProduct,
        deleteProduct,
        
        addPlan,
        updatePlan,
        deletePlan,
        
        createTenant,
        reprovisionarTenant,
        updateTenant,
        deleteTenant,
        
        registerPayment,
        deletePayment,
        
        addOperator,
        updateOperator,
        deleteOperator,
        
        suspendTenant,
        reactivateTenant,
        cancelTenant,
        extendTrial,
        changePlan,
        updateSettings,
      }}
    >
      {children}
    </BackofficeContext.Provider>
  );
}

export function useBackoffice() {
  const context = useContext(BackofficeContext);
  if (!context) {
    throw new Error('useBackoffice deve ser usado dentro de um BackofficeProvider');
  }
  return context;
}
