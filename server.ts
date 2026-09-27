import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { getDb, saveDb, generateMaelgCode, logCredentialEmission, getCredentialsLogs } from './server_db';
import bcrypt from 'bcryptjs';

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Log all request metrics
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // --- API Routes ---

  // Healthz check
  app.get('/api/healthz', (req, res) => {
    res.json({ status: 'ok', runtime: 'node-express', database: 'json-persistent' });
  });

  // Credentials Log Viewer (Simulated Emails)
  app.get('/api/credenciais', (req, res) => {
    res.send(getCredentialsLogs());
  });

  // 1. PROVISION SCHOOL + DIRECTORS (Core Python Saga Port)
  app.post('/api/provisionar', async (req, res) => {
    try {
      const data = req.body;
      const escola_nome = (data.escola_nome || '').trim();
      const admin_nome = (data.admin_nome || '').trim();
      const admin_email = (data.admin_email || '').trim();
      const admin_password = data.admin_password || '';

      if (escola_nome.length < 3) {
        return res.status(400).json({ erro: 'Nome da escola deve ter pelo menos 3 caracteres.' });
      }
      if (admin_nome.length < 3) {
        return res.status(400).json({ erro: 'Nome do Director Geral deve ter pelo menos 3 caracteres.' });
      }
      if (admin_password.length < 8) {
        return res.status(400).json({ erro: 'A palavra-passe deve ter pelo menos 8 caracteres.' });
      }

      const db = getDb();

      // Check duplicate school or email
      const escolaExiste = db.escola.some(e => e.nome.toLowerCase() === escola_nome.toLowerCase());
      if (escolaExiste) {
        return res.status(409).json({ erro: 'Já existe uma escola com este nome.' });
      }

      const utilizadorExiste = db.utilizador.some(u => u.email.toLowerCase() === admin_email.toLowerCase());
      if (utilizadorExiste) {
        return res.status(409).json({ erro: 'Este email já está em uso. Escolha outro.' });
      }

      // Generate codes
      let codigo_escola = generateMaelgCode();
      while (db.escola.some(e => e.codigo === codigo_escola)) {
        codigo_escola = generateMaelgCode();
      }

      let codigo_admin = generateMaelgCode();
      while (db.utilizador.some(u => u.codigo === codigo_admin)) {
        codigo_admin = generateMaelgCode();
      }

      const escola_id = db.escola.length + 1001;
      const admin_id = db.utilizador.length + 2001;
      const funcionario_id = db.funcionario.length + 3001;

      // Hashing password
      const password_hash = bcrypt.hashSync(admin_password, 10);

      // Insert into scuola (MaelGest)
      const novaEscola = {
        id: escola_id,
        codigo: codigo_escola,
        nome: escola_nome,
        tipo: data.escola_tipo || 'publica',
        designacao: data.escola_designacao || 'colegio',
        regime_ensino: data.escola_regime_ensino || 'geral',
        endereco: data.escola_endereco || '',
        contacto_telefone: data.escola_contacto_telefone || '',
        director_id: funcionario_id,
        primeiro_acesso_pendente: 1
      };
      db.escola.push(novaEscola);

      // Insert into Utilizador
      const novoUtilizador = {
        id: admin_id,
        codigo: codigo_admin,
        email: admin_email,
        nome: admin_nome,
        password_hash,
        ativo: 1,
        is_super_admin: 0
      };
      db.utilizador.push(novoUtilizador);

      // Bind roles and school
      db.utilizador_escola.push({
        id: db.utilizador_escola.length + 1,
        utilizador_id: admin_id,
        escola_id,
        papel_id: 1 // Director Geral ID
      });

      db.usuario_papel.push({
        id: db.usuario_papel.length + 1,
        usuario_id: admin_id,
        papel_id: 1,
        escola_id
      });

      // Funcionario
      db.funcionario.push({
        id: funcionario_id,
        nome: admin_nome,
        escola_id,
        data_admissao: new Date().toISOString().substring(0, 10),
        categoria: 'PEPS',
        tipo_professor: 'especialista',
        numero_agente: null,
        utilizador_id: admin_id,
        cargo: 'Director Geral'
      });

      // Platform Database (maelg) Tenant mapping
      const tenantCode = `TEN-0${escola_id}`;
      const trialDays = 14;
      const registrationDate = new Date().toISOString();
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

      const schoolCode = `SCH-${escola_id}`;
      const adminCode = `ADM-${escola_nome.replace(/\s+/g, '').toUpperCase().substring(0, 8)}`;
      const adminRole = 'director_geral';

      const newTenant = {
        id: `ten-${escola_id}`,
        name: escola_nome,
        code: tenantCode,
        nif: data.nif || '5401928123',
        province: data.province || 'Luanda',
        city: data.city || '',
        status: 'trial' as const,
        planSlug: data.planSlug || 'maelgest-basic',
        productSlug: 'maelgest',
        registrationDate,
        contactName: admin_nome,
        contactEmail: admin_email,
        contactPhone: data.escola_contacto_telefone || '',
        trialEndsAt,
        notes: data.notes || 'Criado através do Assistente de Adesão / Simulador unificado MaelG Systems.',
        schoolCode,
        adminCode,
        adminPassword: admin_password,
        adminRole,
        maelgestOutput: {
          schoolCode,
          adminCode,
          adminRole,
          adminPassword: admin_password,
          firstAccess: new Date().toISOString(),
          apiPayload: JSON.stringify({
            tenant_code: tenantCode,
            root: {
              name: escola_nome,
              nif: data.nif || '5401928123',
              attributes: {
                tipo: novaEscola.tipo,
                designacao: novaEscola.designacao,
                regime_ensino: novaEscola.regime_ensino
              }
            },
            admin: {
              name: admin_nome,
              email: admin_email,
              password: admin_password,
              role: adminRole
            },
            metadata: { plan_slug: data.planSlug || 'maelgest-basic', trial_days: trialDays }
          }, null, 2),
          sqlAtomic: `INSERT INTO \`schools\` (\`id\`, \`name\`, \`code\`, \`nif\`, \`province\`, \`city\`) VALUES (${escola_id}, '${escola_nome}', '${tenantCode}', '${data.nif || '5401928123'}', '${data.province || 'Luanda'}', '${data.city || ''}');\nINSERT INTO \`users\` (\`id\`, \`school_id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`) VALUES (${admin_id}, ${escola_id}, '${admin_nome}', '${admin_email}', '${password_hash}', 'director_geral');`
        }
      };

      db.tenants.push(newTenant);

      // Associated subscription
      const selectedPlan = db.plans.find(p => p.slug === newTenant.planSlug);
      db.subscriptions.push({
        id: `sub-${escola_id}`,
        tenantId: newTenant.id,
        tenantName: newTenant.name,
        planSlug: newTenant.planSlug,
        planName: selectedPlan?.name || 'MaelGest Básico',
        productSlug: 'maelgest',
        status: 'trial',
        startDate: registrationDate,
        nextBillingDate: trialEndsAt,
        amount: selectedPlan?.price || 150000,
        billingInterval: selectedPlan?.billingInterval || 'monthly',
        history: [
          {
            id: 'h-prov',
            action: 'Aprovisionamento do Produto',
            date: registrationDate,
            operator: 'Sistema (MaelG)',
            notes: 'Aprovisionamento e envio automático de credenciais por e-mail.'
          }
        ]
      });

      // Save credentials logging to disk (simulated email file)
      const emailBody = `
================================================================================
MaelG Systems - CONFIRMAÇÃO DE ADESÃO OPERACIONAL
================================================================================
Prezado(a) ${admin_nome},

Confirmamos que a escola "${escola_nome}" foi integrada com sucesso na plataforma!

DADOS DE ACESSO ADMINISTRATIVO:
--------------------------------------------------------------------------------
Código da Escola : ${codigo_escola}
Código do Admin   : ${codigo_admin}
Email do Diretor  : ${admin_email}
Palavra-passe     : ${admin_password}

Após o primeiro login, poderá configurar o calendário lectivo, registrar turmas
e enturmar alunos de acordo com a legislação angolana RAA 424/25.

Atenciosamente,
A Equipa MaelG Systems (AO)
================================================================================
`;
      logCredentialEmission(codigo_escola, admin_email, emailBody);

      // Audit Log
      db.auditLogs.unshift({
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        action: 'tenant.provision',
        operatorName: 'MaelG Systems',
        operatorRole: 'super_admin',
        operatorIp: '197.231.42.100',
        timestamp: new Date().toISOString(),
        entityType: 'tenant',
        entityId: newTenant.id,
        details: `Escola "${escola_nome}" e primeiro administrador "${admin_nome}" provisionados com sucesso no MaelGest.`
      });

      // Increment product analytics
      const p = db.products.find(prod => prod.slug === 'maelgest');
      if (p) {
        p.tenantsCount += 1;
      }

      saveDb();

      res.status(200).json({
        sucesso: true,
        escola_id,
        escola_codigo: codigo_escola,
        escola_nome,
        admin_id,
        admin_codigo: codigo_admin,
        admin_email,
        admin_password,
        papel: 'director_geral',
        funcionario_id,
        primeiro_acesso: 'onboarding_pendente',
        nota: 'Simulação — em produção as credenciais seriam enviadas por email pela Equipa MaelG.'
      });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ erro: `Falha ao provisionar: ${e.message}` });
    }
  });

  // 2. TENANTS CRUD
  app.get('/api/tenants', (req, res) => {
    res.json(getDb().tenants);
  });

  app.post('/api/tenants', (req, res) => {
    const db = getDb();
    const data = req.body;
    const id = `ten-${db.tenants.length + 101}`;
    const code = `TEN-${db.tenants.length + 101}`;
    const registrationDate = new Date().toISOString();
    
    const newTenant = {
      id,
      code,
      name: data.name,
      nif: data.nif || '',
      province: data.province || 'Luanda',
      city: data.city || '',
      status: data.status || 'trial',
      planSlug: data.planSlug || '',
      productSlug: data.productSlug || '',
      contactName: data.contactName || '',
      contactEmail: data.contactEmail || '',
      contactPhone: data.contactPhone || '',
      registrationDate,
      notes: data.notes || '',
      trialEndsAt: data.status === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      nextBillingAt: data.status !== 'trial' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    };

    db.tenants.push(newTenant);
    saveDb();
    res.status(201).json(newTenant);
  });

  app.put('/api/tenants/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const index = db.tenants.findIndex(t => t.id === id);
    if (index !== -1) {
      db.tenants[index] = { ...db.tenants[index], ...req.body };
      saveDb();
      return res.json(db.tenants[index]);
    }
    res.status(404).json({ error: 'Tenant não encontrado' });
  });

  app.delete('/api/tenants/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    db.tenants = db.tenants.filter(t => t.id !== id);
    db.subscriptions = db.subscriptions.filter(s => s.tenantId !== id);
    db.payments = db.payments.filter(p => p.tenantId !== id);
    saveDb();
    res.json({ success: true });
  });

  // 3. PRODUCTS CRUD
  app.get('/api/products', (req, res) => {
    res.json(getDb().products);
  });

  app.post('/api/products', (req, res) => {
    const db = getDb();
    const data = req.body;
    const slug = data.slug || `prod-${Math.random().toString(36).substring(2, 9)}`;
    const newProduct = {
      name: data.name,
      slug,
      status: data.status || 'beta',
      description: data.description || '',
      iconName: data.iconName || 'Terminal',
      apiEndpoint: data.apiEndpoint || '',
      token: data.token || '',
      tenantsCount: 0,
      mrr: 0,
      adminName: data.adminName || '',
      adminEmail: data.adminEmail || '',
      adminPhone: data.adminPhone || '',
    };
    db.products.push(newProduct);
    saveDb();
    res.status(201).json(newProduct);
  });

  app.put('/api/products/:slug', (req, res) => {
    const db = getDb();
    const { slug } = req.params;
    const index = db.products.findIndex(p => p.slug === slug);
    if (index !== -1) {
      db.products[index] = { ...db.products[index], ...req.body };
      saveDb();
      return res.json(db.products[index]);
    }
    res.status(404).json({ error: 'Produto não encontrado' });
  });

  app.delete('/api/products/:slug', (req, res) => {
    const db = getDb();
    const { slug } = req.params;
    db.products = db.products.filter(p => p.slug !== slug);
    saveDb();
    res.json({ success: true });
  });

  // 4. PLANS CRUD
  app.get('/api/plans', (req, res) => {
    res.json(getDb().plans);
  });

  app.post('/api/plans', (req, res) => {
    const db = getDb();
    const data = req.body;
    const newPlan = {
      name: data.name,
      slug: data.slug,
      price: data.price,
      billingInterval: data.billingInterval || 'monthly',
      status: data.status || 'active',
      description: data.description || '',
      productSlug: data.productSlug || '',
      limits: data.limits || [],
    };
    db.plans.push(newPlan);
    saveDb();
    res.status(201).json(newPlan);
  });

  app.put('/api/plans/:slug', (req, res) => {
    const db = getDb();
    const { slug } = req.params;
    const index = db.plans.findIndex(p => p.slug === slug);
    if (index !== -1) {
      db.plans[index] = { ...db.plans[index], ...req.body };
      saveDb();
      return res.json(db.plans[index]);
    }
    res.status(404).json({ error: 'Plano não encontrado' });
  });

  app.delete('/api/plans/:slug', (req, res) => {
    const db = getDb();
    const { slug } = req.params;
    db.plans = db.plans.filter(p => p.slug !== slug);
    saveDb();
    res.json({ success: true });
  });

  // 5. PAYMENTS CRUD
  app.get('/api/payments', (req, res) => {
    res.json(getDb().payments);
  });

  app.post('/api/payments', (req, res) => {
    const db = getDb();
    const data = req.body;
    const isEdit = data.id !== undefined;

    if (isEdit) {
      const index = db.payments.findIndex(p => p.id === data.id);
      if (index !== -1) {
        db.payments[index] = { ...db.payments[index], ...data };
        saveDb();
        return res.json(db.payments[index]);
      }
    } else {
      const id = `pay-${db.payments.length + 101}`;
      const invoiceNumber = `FT-2026/00${db.payments.length + 42}`;
      const newPayment = {
        id,
        invoiceNumber,
        tenantId: data.tenantId,
        tenantName: data.tenantName || 'Cliente',
        amount: data.amount,
        status: data.status || 'pending',
        paymentMethod: data.paymentMethod || 'bank_transfer',
        dueDate: data.dueDate || new Date().toISOString(),
        notes: data.notes || '',
      };
      db.payments.push(newPayment);
      saveDb();
      return res.status(201).json(newPayment);
    }
    res.status(404).json({ error: 'Pagamento não encontrado' });
  });

  app.delete('/api/payments/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    db.payments = db.payments.filter(p => p.id !== id);
    saveDb();
    res.json({ success: true });
  });

  // 6. OPERATORS CRUD
  app.get('/api/operators', (req, res) => {
    res.json(getDb().operators);
  });

  app.post('/api/operators', (req, res) => {
    const db = getDb();
    const data = req.body;
    const id = `op-${db.operators.length + 101}`;
    const newOp = {
      id,
      name: data.name,
      email: data.email,
      role: data.role || 'support_admin',
      avatarUrl: data.avatarUrl || '/src/assets/images/operator_suporte_1790456700351.jpg',
      lastAccess: new Date().toISOString(),
      active: data.active !== undefined ? data.active : true,
    };
    db.operators.push(newOp);
    saveDb();
    res.status(201).json(newOp);
  });

  app.put('/api/operators/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const index = db.operators.findIndex(o => o.id === id);
    if (index !== -1) {
      db.operators[index] = { ...db.operators[index], ...req.body };
      saveDb();
      return res.json(db.operators[index]);
    }
    res.status(404).json({ error: 'Operador não encontrado' });
  });

  app.delete('/api/operators/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    db.operators = db.operators.filter(o => o.id !== id);
    saveDb();
    res.json({ success: true });
  });

  // 7. SUBSCRIPTIONS CRUD
  app.get('/api/subscriptions', (req, res) => {
    res.json(getDb().subscriptions);
  });

  // 8. AUDIT LOGS
  app.get('/api/audit_logs', (req, res) => {
    res.json(getDb().auditLogs);
  });

  // 9. SETTINGS
  app.get('/api/settings', (req, res) => {
    res.json(getDb().settings);
  });

  app.put('/api/settings', (req, res) => {
    const db = getDb();
    db.settings = { ...db.settings, ...req.body };
    saveDb();
    res.json(db.settings);
  });

  // --- Serve Frontend Application ---

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Fullstack MaelG Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start fullstack server:', err);
});
