import { Tenant, Product, Plan, Subscription, Payment, AuditLog, Operator, PlatformSettings } from '../types';

export const mockProducts: Product[] = [
  {
    name: 'MaelGest',
    slug: 'maelgest',
    status: 'active',
    description: 'SaaS integrado de Gestão Escolar, propinas, turmas e pautas.',
    iconName: 'GraduationCap',
    apiEndpoint: 'https://api.maelgest.ao/internal/v1',
    token: 'mgest_prod_tok_7c8d9e2f1a0b',
    tenantsCount: 4,
    mrr: 1000000,
  },
  {
    name: 'MaelFinance',
    slug: 'maelfinance',
    status: 'active',
    description: 'SaaS de Gestão Financeira, faturação certificada AGT e tesouraria.',
    iconName: 'DollarSign',
    apiEndpoint: 'https://api.maelfinance.ao/internal/v1',
    token: 'mfin_prod_tok_9b8a7c6d5e4f',
    tenantsCount: 2,
    mrr: 730000,
  },
  {
    name: 'MaelRH',
    slug: 'maelrh',
    status: 'beta',
    description: 'SaaS de Processamento de Salários, Segurança Social e IRT.',
    iconName: 'Users',
    apiEndpoint: 'https://api.maelrh.ao/internal/v1',
    token: 'mrh_beta_tok_1a2b3c4d5e6f',
    tenantsCount: 1,
    mrr: 120000,
  }
];

export const mockPlans: Plan[] = [
  {
    name: 'MaelGest Básico',
    slug: 'maelgest-basic',
    price: 150000,
    billingInterval: 'monthly',
    status: 'active',
    description: 'Até 300 alunos, pautas básicas, sem gestão de transporte.',
    productSlug: 'maelgest',
    limits: [
      { label: 'Limite de Alunos', value: '300 alunos' },
      { label: 'Utilizadores Administrativos', value: '5 utilizadores' },
      { label: 'Espaço de Armazenamento', value: '5 GB' }
    ]
  },
  {
    name: 'MaelGest Profissional',
    slug: 'maelgest-pro',
    price: 350000,
    billingInterval: 'monthly',
    status: 'active',
    description: 'Alunos ilimitados, pautas avançadas, SMS, gestão de transporte e refeitório.',
    productSlug: 'maelgest',
    limits: [
      { label: 'Limite de Alunos', value: 'Ilimitado' },
      { label: 'Utilizadores Administrativos', value: '25 utilizadores' },
      { label: 'Espaço de Armazenamento', value: '50 GB' }
    ]
  },
  {
    name: 'MaelFinance Básico',
    slug: 'maelfinance-basic',
    price: 850000, // Annual or multi-tier (e.g. 85.000 monthly)
    billingInterval: 'monthly',
    status: 'active',
    description: 'Até 500 faturas/mês, módulo de clientes e stocks básico.',
    productSlug: 'maelfinance',
    limits: [
      { label: 'Volume de Faturação', value: '500 faturas/mês' },
      { label: 'Utilizadores', value: '3 utilizadores' },
      { label: 'Armazenamento', value: '2 GB' }
    ]
  },
  {
    name: 'MaelFinance Premium',
    slug: 'maelfinance-pro',
    price: 195000,
    billingInterval: 'monthly',
    status: 'active',
    description: 'Faturamento ilimitado, stocks avançados, multi-caixas e integrador ERP.',
    productSlug: 'maelfinance',
    limits: [
      { label: 'Volume de Faturação', value: 'Ilimitado' },
      { label: 'Utilizadores', value: '15 utilizadores' },
      { label: 'Armazenamento', value: '20 GB' }
    ]
  },
  {
    name: 'MaelRH Profissional',
    slug: 'maelrh-pro',
    price: 120000,
    billingInterval: 'monthly',
    status: 'active',
    description: 'Processamento até 100 colaboradores, emissão de guias IRT e SS.',
    productSlug: 'maelrh',
    limits: [
      { label: 'Colaboradores', value: 'Até 100 ativos' },
      { label: 'Utilizadores', value: '5 utilizadores' },
      { label: 'Emissão de Guias', value: 'Automática' }
    ]
  }
];

export const mockTenants: Tenant[] = [
  {
    id: 'ten-0042',
    name: 'Complexo Escolar Girassol',
    code: 'TEN-0042',
    nif: '5417082910',
    province: 'Cuanza Sul',
    city: 'Sumbe',
    status: 'active',
    planSlug: 'maelgest-pro',
    productSlug: 'maelgest',
    registrationDate: '2026-03-12T09:15:00Z',
    contactName: 'Prof. António Morais',
    contactEmail: 'a.morais@colegiogirassol.ao',
    contactPhone: '+244 923 456 789',
    nextBillingAt: '2026-10-12T00:00:00Z',
    notes: 'Cliente de referência no Sumbe. Pagamentos sempre por transferência direta pré-faturada.',
    schoolCode: 'SCH-42',
    adminCode: 'ADM-GIRASSOL',
    adminPassword: 'MaelG@2026xY',
    adminRole: 'director_geral',
    maelgestOutput: {
      schoolCode: 'SCH-42',
      adminCode: 'ADM-GIRASSOL',
      adminRole: 'director_geral',
      adminPassword: 'MaelG@2026xY',
      firstAccess: '2026-03-12T10:02:44Z',
      apiPayload: JSON.stringify({
        tenant_code: "TEN-0042",
        root: {
          name: "Complexo Escolar Girassol",
          nif: "5417082910",
          attributes: {
            tipo: "privada",
            designacao: "complexo_escolar",
            regime_ensino: "geral"
          }
        },
        admin: {
          name: "Prof. António Morais",
          email: "a.morais@colegiogirassol.ao",
          password: "MaelG@2026xY",
          role: "director_geral"
        },
        metadata: { plan_slug: "maelgest-pro", trial_days: 14 }
      }, null, 2),
      sqlAtomic: `INSERT INTO \`schools\` (\`id\`, \`name\`, \`code\`, \`nif\`, \`province\`, \`city\`) VALUES (42, 'Complexo Escolar Girassol', 'TEN-0042', '5417082910', 'Cuanza Sul', 'Sumbe');\nINSERT INTO \`users\` (\`id\`, \`school_id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`) VALUES (104, 42, 'Prof. António Morais', 'a.morais@colegiogirassol.ao', '$2b$12$K89s7dy8f...', 'director_geral');`
    }
  },
  {
    id: 'ten-0043',
    name: 'Colégio Pitruca',
    code: 'TEN-0043',
    nif: '5028472912',
    province: 'Benguela',
    city: 'Lobito',
    status: 'trial',
    planSlug: 'maelgest-basic',
    productSlug: 'maelgest',
    registrationDate: '2026-09-14T11:30:00Z',
    contactName: 'Dra. Maria Pitruca',
    contactEmail: 'm.pitruca@pitruca.ao',
    contactPhone: '+244 931 887 221',
    trialEndsAt: '2026-09-28T11:30:00Z', // 2 days remaining (since today is Sept 26)
    notes: 'Avaliação inicial para expansão do software às 3 filiais em Benguela.',
    schoolCode: 'SCH-43',
    adminCode: 'ADM-PITRUCA',
    adminPassword: 'MaelG@Pitruca26',
    adminRole: 'director_geral',
    maelgestOutput: {
      schoolCode: 'SCH-43',
      adminCode: 'ADM-PITRUCA',
      adminRole: 'director_geral',
      adminPassword: 'MaelG@Pitruca26',
      firstAccess: '2026-09-14T11:35:00Z',
      apiPayload: JSON.stringify({
        tenant_code: "TEN-0043",
        root: { name: "Colégio Pitruca", nif: "5028472912" },
        admin: { name: "Dra. Maria Pitruca", email: "m.pitruca@pitruca.ao", role: "director_geral" }
      }, null, 2),
      sqlAtomic: `INSERT INTO \`schools\` (\`id\`, \`name\`, \`code\`) VALUES (43, 'Colégio Pitruca', 'TEN-0043');`
    }
  },
  {
    id: 'ten-0044',
    name: 'Clínica Sagrada Esperança - Huambo',
    code: 'TEN-0044',
    nif: '5403912803',
    province: 'Huambo',
    city: 'Huambo',
    status: 'suspended',
    planSlug: 'maelfinance-pro',
    productSlug: 'maelfinance',
    registrationDate: '2026-01-20T14:00:00Z',
    contactName: 'Dr. João Baptista',
    contactEmail: 'j.baptista@sagradaesperanca.ao',
    contactPhone: '+244 912 345 678',
    nextBillingAt: '2026-09-08T00:00:00Z', // Overdue since Sep 8 (18 days overdue!)
    notes: 'Suspenso temporariamente por falta de pagamento da fatura FT-2026/0044 vencida a 8 de Setembro.',
  },
  {
    id: 'ten-0045',
    name: 'Soba RH & Associados',
    code: 'TEN-0045',
    nif: '7402910492',
    province: 'Luanda',
    city: 'Belas',
    status: 'active',
    planSlug: 'maelrh-pro',
    productSlug: 'maelrh',
    registrationDate: '2026-06-05T08:00:00Z',
    contactName: 'Sra. Sandra Soba',
    contactEmail: 'sandra@sobarh.ao',
    contactPhone: '+244 944 332 110',
    nextBillingAt: '2026-10-05T00:00:00Z',
    notes: 'Beta tester de prestígio para o módulo MaelRH.',
  },
  {
    id: 'ten-0046',
    name: 'Escola Primária 11 de Novembro',
    code: 'TEN-0046',
    nif: '5409123891',
    province: 'Huíla',
    city: 'Lubango',
    status: 'trial',
    planSlug: 'maelgest-basic',
    productSlug: 'maelgest',
    registrationDate: '2026-09-21T10:00:00Z',
    contactName: 'Sr. Mateus Damião',
    contactEmail: 'm.damiao@11nov-huila.ao',
    contactPhone: '+244 925 112 004',
    trialEndsAt: '2026-10-05T10:00:00Z', // 9 days remaining
  },
  {
    id: 'ten-0047',
    name: 'Logística Nacional Lda',
    code: 'TEN-0047',
    nif: '5402918809',
    province: 'Cabinda',
    city: 'Cabinda',
    status: 'active',
    planSlug: 'maelfinance-basic',
    productSlug: 'maelfinance',
    registrationDate: '2026-05-18T16:45:00Z',
    contactName: 'Eng. Carlos Pires',
    contactEmail: 'c.pires@logistica.ao',
    contactPhone: '+244 911 223 344',
    nextBillingAt: '2026-10-18T00:00:00Z',
  },
  {
    id: 'ten-0048',
    name: 'Colégio Santa Teresa',
    code: 'TEN-0048',
    nif: '5418902123',
    province: 'Uíge',
    city: 'Uíge',
    status: 'cancelled',
    planSlug: 'maelgest-pro',
    productSlug: 'maelgest',
    registrationDate: '2026-02-02T11:00:00Z',
    contactName: 'Irmã Ana Lúcia',
    contactEmail: 'lucia@santateresa-uige.ao',
    contactPhone: '+244 928 334 556',
    notes: 'Cancelado a pedido do cliente por encerramento das atividades pedagógicas presenciais.',
  }
];

export const mockSubscriptions: Subscription[] = [
  {
    id: 'sub-0042',
    tenantId: 'ten-0042',
    tenantName: 'Complexo Escolar Girassol',
    planSlug: 'maelgest-pro',
    planName: 'MaelGest Profissional',
    productSlug: 'maelgest',
    status: 'active',
    startDate: '2026-03-26T00:00:00Z',
    nextBillingDate: '2026-10-12T00:00:00Z',
    amount: 350000,
    billingInterval: 'monthly',
    history: [
      { id: 'h-1', action: 'Provisionamento de Trial', date: '2026-03-12T09:15:00Z', operator: 'António Morais', notes: 'Ativado trial de 14 dias automaticamente' },
      { id: 'h-2', action: 'Conversão em Subscrição Paga', date: '2026-03-26T10:00:00Z', operator: 'Teresa Bento', notes: 'Primeiro pagamento processado com sucesso' },
      { id: 'h-3', action: 'Renovação Mensal', date: '2026-09-12T00:00:00Z', operator: 'Sistema (MaelG)', notes: 'Cobrança mensal efetuada automaticamente' }
    ]
  },
  {
    id: 'sub-0043',
    tenantId: 'ten-0043',
    tenantName: 'Colégio Pitruca',
    planSlug: 'maelgest-basic',
    planName: 'MaelGest Básico',
    productSlug: 'maelgest',
    status: 'trial',
    startDate: '2026-09-14T11:30:00Z',
    nextBillingDate: '2026-09-28T11:30:00Z',
    amount: 150000,
    billingInterval: 'monthly',
    history: [
      { id: 'h-4', action: 'Provisionamento de Trial', date: '2026-09-14T11:30:00Z', operator: 'António Morais', notes: 'Trial ativo válido por 14 dias' }
    ]
  },
  {
    id: 'sub-0044',
    tenantId: 'ten-0044',
    tenantName: 'Clínica Sagrada Esperança - Huambo',
    planSlug: 'maelfinance-pro',
    planName: 'MaelFinance Premium',
    productSlug: 'maelfinance',
    status: 'suspended',
    startDate: '2026-01-20T14:00:00Z',
    nextBillingDate: '2026-09-08T00:00:00Z',
    amount: 195000,
    billingInterval: 'monthly',
    history: [
      { id: 'h-5', action: 'Provisionamento Direto', date: '2026-01-20T14:00:00Z', operator: 'António Morais', notes: 'Ativação direta sem trial prévio' },
      { id: 'h-6', action: 'Suspensão de Serviço', date: '2026-09-22T08:30:00Z', operator: 'Teresa Bento', notes: 'Suspensão aplicada após 14 dias de tolerância' }
    ]
  },
  {
    id: 'sub-0045',
    tenantId: 'ten-0045',
    tenantName: 'Soba RH & Associados',
    planSlug: 'maelrh-pro',
    planName: 'MaelRH Profissional',
    productSlug: 'maelrh',
    status: 'active',
    startDate: '2026-06-05T08:00:00Z',
    nextBillingDate: '2026-10-05T00:00:00Z',
    amount: 120000,
    billingInterval: 'monthly',
    history: [
      { id: 'h-7', action: 'Provisionamento Beta', date: '2026-06-05T08:00:00Z', operator: 'Miguel Silva', notes: 'Campanha de testes com 50% de desconto inicial' }
    ]
  },
  {
    id: 'sub-0046',
    tenantId: 'ten-0046',
    tenantName: 'Escola Primária 11 de Novembro',
    planSlug: 'maelgest-basic',
    planName: 'MaelGest Básico',
    productSlug: 'maelgest',
    status: 'trial',
    startDate: '2026-09-21T10:00:00Z',
    nextBillingDate: '2026-10-05T10:00:00Z',
    amount: 150000,
    billingInterval: 'monthly',
    history: [
      { id: 'h-8', action: 'Provisionamento de Trial', date: '2026-09-21T10:00:00Z', operator: 'Miguel Silva' }
    ]
  },
  {
    id: 'sub-0047',
    tenantId: 'ten-0047',
    tenantName: 'Logística Nacional Lda',
    planSlug: 'maelfinance-basic',
    planName: 'MaelFinance Básico',
    productSlug: 'maelfinance',
    status: 'active',
    startDate: '2026-05-18T16:45:00Z',
    nextBillingDate: '2026-10-18T00:00:00Z',
    amount: 85000,
    billingInterval: 'monthly',
    history: [
      { id: 'h-9', action: 'Provisionamento Inicial', date: '2026-05-18T16:45:00Z', operator: 'Teresa Bento' }
    ]
  },
  {
    id: 'sub-0048',
    tenantId: 'ten-0048',
    tenantName: 'Colégio Santa Teresa',
    planSlug: 'maelgest-pro',
    planName: 'MaelGest Profissional',
    productSlug: 'maelgest',
    status: 'cancelled',
    startDate: '2026-02-02T11:00:00Z',
    nextBillingDate: '2026-08-02T00:00:00Z',
    amount: 350000,
    billingInterval: 'monthly',
    history: [
      { id: 'h-10', action: 'Provisionamento Direto', date: '2026-02-02T11:00:00Z', operator: 'António Morais' },
      { id: 'h-11', action: 'Cancelamento por mútuo acordo', date: '2026-08-01T15:00:00Z', operator: 'António Morais', notes: 'Rescisão antecipada sem penalidades.' }
    ]
  }
];

export const mockPayments: Payment[] = [
  {
    id: 'pay-001',
    tenantId: 'ten-0042',
    tenantName: 'Complexo Escolar Girassol',
    invoiceNumber: 'FT-2026/0012',
    amount: 350000,
    paymentMethod: 'bank_transfer',
    status: 'paid',
    paymentDate: '2026-09-12T10:00:00Z',
    dueDate: '2026-09-15T00:00:00Z',
    notes: 'Comprovativo enviado via email e validado pela contabilidade.',
    receiptUrl: 'REC-2026-0012.pdf'
  },
  {
    id: 'pay-002',
    tenantId: 'ten-0044',
    tenantName: 'Clínica Sagrada Esperança - Huambo',
    invoiceNumber: 'FT-2026/0044',
    amount: 195000,
    paymentMethod: 'multicaixa_referencia',
    status: 'pending',
    dueDate: '2026-09-08T00:00:00Z', // Overdue!
    notes: 'Referência MC #294-819-381 enviada ao departamento financeiro da Clínica.'
  },
  {
    id: 'pay-003',
    tenantId: 'ten-0045',
    tenantName: 'Soba RH & Associados',
    invoiceNumber: 'FT-2026/0021',
    amount: 120000,
    paymentMethod: 'bank_transfer',
    status: 'paid',
    paymentDate: '2026-09-04T16:00:00Z',
    dueDate: '2026-09-05T00:00:00Z',
    receiptUrl: 'REC-2026-0021.pdf'
  },
  {
    id: 'pay-004',
    tenantId: 'ten-0047',
    tenantName: 'Logística Nacional Lda',
    invoiceNumber: 'FT-2026/0019',
    amount: 85000,
    paymentMethod: 'multicaixa_referencia',
    status: 'paid',
    paymentDate: '2026-09-18T09:24:00Z',
    dueDate: '2026-09-18T00:00:00Z',
    receiptUrl: 'REC-2026-0019.pdf'
  },
  {
    id: 'pay-005',
    tenantId: 'ten-0044',
    tenantName: 'Clínica Sagrada Esperança - Huambo',
    invoiceNumber: 'FT-2026/0005',
    amount: 195000,
    paymentMethod: 'bank_transfer',
    status: 'failed',
    dueDate: '2026-08-08T00:00:00Z',
    notes: 'Fatura de Agosto tentada por débito direto interbancário falhado (saldo insuficiente).'
  },
  {
    id: 'pay-006',
    tenantId: 'ten-0048',
    tenantName: 'Colégio Santa Teresa',
    invoiceNumber: 'FT-2026/0003',
    amount: 350000,
    paymentMethod: 'bank_transfer',
    status: 'refunded',
    paymentDate: '2026-07-01T10:00:00Z',
    dueDate: '2026-07-05T00:00:00Z',
    notes: 'Reembolso efetuado a 2 de Agosto devido ao encerramento escolar antecipado.',
    receiptUrl: 'REEMB-2026-0003.pdf'
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'log-001',
    action: 'tenant.provision',
    operatorName: 'António Morais',
    operatorRole: 'super_admin',
    operatorIp: '197.231.42.88',
    timestamp: '2026-09-21T10:00:00Z',
    entityType: 'tenant',
    entityId: 'ten-0046',
    details: 'Provisionamento com sucesso do tenant "Escola Primária 11 de Novembro" no plano "MaelGest Básico" via API.'
  },
  {
    id: 'log-002',
    action: 'tenant.suspend',
    operatorName: 'Teresa Bento',
    operatorRole: 'finance_admin',
    operatorIp: '197.231.11.12',
    timestamp: '2026-09-22T08:30:00Z',
    entityType: 'tenant',
    entityId: 'ten-0044',
    details: 'Serviço da "Clínica Sagrada Esperança - Huambo" suspenso temporariamente devido a incumprimento contratual e fatura em atraso.',
    before: JSON.stringify({ status: 'active' }),
    after: JSON.stringify({ status: 'suspended' })
  },
  {
    id: 'log-003',
    action: 'payment.register',
    operatorName: 'Teresa Bento',
    operatorRole: 'finance_admin',
    operatorIp: '197.231.11.12',
    timestamp: '2026-09-18T10:15:00Z',
    entityType: 'payment',
    entityId: 'pay-004',
    details: 'Registo de pagamento liquidado no montante de 85.000 AOA referente ao plano MaelFinance Básico.',
    after: JSON.stringify({ status: 'paid', paymentMethod: 'multicaixa_referencia' })
  },
  {
    id: 'log-004',
    action: 'tenant.provision',
    operatorName: 'António Morais',
    operatorRole: 'super_admin',
    operatorIp: '197.231.42.88',
    timestamp: '2026-09-14T11:30:00Z',
    entityType: 'tenant',
    entityId: 'ten-0043',
    details: 'Provisionamento do tenant "Colégio Pitruca" em modo experimental de 14 dias com limites standard.'
  },
  {
    id: 'log-005',
    action: 'settings.update',
    operatorName: 'António Morais',
    operatorRole: 'super_admin',
    operatorIp: '197.231.42.88',
    timestamp: '2026-09-25T15:20:00Z',
    entityType: 'settings',
    entityId: 'settings-root',
    details: 'Atualização do modelo de email para faturas pendentes de pagamento.',
    before: 'Template antigo de faturamento',
    after: 'Template novo de faturamento com alerta de suspensão'
  }
];

export const mockOperators: Operator[] = [
  {
    id: 'op-01',
    name: 'António Morais',
    email: 'a.morais@maelg.ao',
    role: 'super_admin',
    avatarUrl: '/src/assets/images/operator_super_admin_1790456679041.jpg',
    lastAccess: '2026-09-26T13:45:00Z',
    active: true
  },
  {
    id: 'op-02',
    name: 'Teresa Bento',
    email: 't.bento@maelg.ao',
    role: 'finance_admin',
    avatarUrl: '/src/assets/images/operator_financeiro_1790456690656.jpg',
    lastAccess: '2026-09-26T11:20:00Z',
    active: true
  },
  {
    id: 'op-03',
    name: 'Miguel Silva',
    email: 'm.silva@maelg.ao',
    role: 'support_admin',
    avatarUrl: '/src/assets/images/operator_suporte_1790456700351.jpg',
    lastAccess: '2026-09-25T17:50:00Z',
    active: true
  }
];

export const mockSettings: PlatformSettings = {
  platformName: 'MaelG Control Plane',
  platformUrl: 'https://admin.maelg.ao',
  supportEmail: 'suporte@maelg.ao',
  activeMaintenance: false,
  emailTemplates: {
    provisioned: 'Prezado(a) {{contactName}},\n\nÉ com satisfação que confirmamos a criação bem-sucedida do seu ambiente para o produto {{productName}}.\n\nCódigo do seu Tenant: {{tenantCode}}\nAs credenciais administrativas foram enviadas de forma imutável ao Diretor Geral.\n\nAtenciosamente,\nEquipa MaelG Systems',
    suspended: 'Aviso Importante: A sua conta {{tenantName}} para o produto {{productName}} foi suspensa temporariamente devido a incumprimento de pagamento.\n\nPara reativar de forma imediata o serviço, por favor proceda ao pagamento da fatura em atraso.\n\nAtenciosamente,\nDepartamento Financeiro MaelG',
    invoicePending: 'Prezado cliente,\n\nInformamos que a fatura no valor de {{amount}} AOA referente ao plano {{planName}} encontra-se disponível para pagamento.\n\nPor favor utilize os canais indicados.\n\nAtenciosamente,\nMaelG Systems'
  },
  jobs: [
    { id: 'job-1', name: 'Billing Scheduler', schedule: '0 0 * * *', lastRun: '2026-09-26T00:00:00Z', status: 'success', nextRun: '2026-09-27T00:00:00Z' },
    { id: 'job-2', name: 'Trial Expiry Monitor', schedule: '*/15 * * * *', lastRun: '2026-09-26T13:45:00Z', status: 'success', nextRun: '2026-09-26T14:00:00Z' },
    { id: 'job-3', name: 'Product Analytics Sync', schedule: '0 */4 * * *', lastRun: '2026-09-26T12:00:00Z', status: 'success', nextRun: '2026-09-26T16:00:00Z' }
  ]
};
