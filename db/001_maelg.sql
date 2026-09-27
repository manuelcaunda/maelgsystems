DROP TABLE IF EXISTS subscription_history;
DROP TABLE IF EXISTS pagamento;
DROP TABLE IF EXISTS subscription;
DROP TABLE IF EXISTS plano;
DROP TABLE IF EXISTS produto_acesso;
DROP TABLE IF EXISTS produto;
DROP TABLE IF EXISTS tenant;
DROP TABLE IF EXISTS super_admin_user;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS platform_settings;

-- =============================================================================
-- MaelG Systems — base de dados dedicada da plataforma
--
-- Aplica o schema definido em IDEIA.md (que nunca chegou a ser criado com
-- ENUMs, FKs e indices) e acrescenta o que faltava para o sistema funcionar:
--
--   produto_acesso          URL + credenciais de cada produto
--   super_admin_user.password_hash   sem isto ninguem consegue entrar
--   tenant.provisionamento  estado do fluxo de criacao de escola
--
-- Sem seed. Nenhuma linha inserida: tudo nasce pela plataforma.
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- produto
-- -----------------------------------------------------------------------------
CREATE TABLE produto (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(50)  NOT NULL,
  nome        VARCHAR(255) NOT NULL,
  descricao   TEXT,
  versao      VARCHAR(20),
  api_url     VARCHAR(255),
  status      ENUM('active','inactive','deprecated') NOT NULL DEFAULT 'active',
  criado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_produto_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- produto_acesso  (novo)
--
-- Cada produto tem o seu URL e as suas credenciais de API. Guardamo-los aqui
-- para que o maelgsystems nunca precise de codigo especifico por produto:
-- criar um produto novo = inserir uma linha nesta tabela.
-- -----------------------------------------------------------------------------
CREATE TABLE produto_acesso (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  produto_id       INT NOT NULL,
  chave            VARCHAR(100) NOT NULL,
  segredo          VARBINARY(255) NOT NULL,
  caminho_escolas  VARCHAR(255) NOT NULL DEFAULT '/api/v1/plataforma/escolas',
  caminho_dados    VARCHAR(255) NOT NULL DEFAULT '/api/v1/plataforma/escolas',
  escopo           VARCHAR(50)  NOT NULL DEFAULT 'provisionar',
  activo           TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_uso_em    DATETIME,
  UNIQUE KEY uk_acesso (produto_id, chave),
  KEY idx_acesso_activo (produto_id, activo),
  CONSTRAINT fk_acesso_produto FOREIGN KEY (produto_id)
    REFERENCES produto (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- plano
--
-- UNIQUE (produto_id, codigo) e nao UNIQUE (codigo): o IDEIA.md tinha o codigo
-- global, o que faz dois produtos com um plano "pro" colidirem.
-- -----------------------------------------------------------------------------
CREATE TABLE plano (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  produto_id   INT NOT NULL,
  codigo       VARCHAR(50)  NOT NULL,
  nome         VARCHAR(100) NOT NULL,
  priceAoa     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  maxStudents  INT NOT NULL DEFAULT 0,
  maxUsers     INT NOT NULL DEFAULT 0,
  maxStorageGb INT NOT NULL DEFAULT 0,
  isActive     TINYINT(1) NOT NULL DEFAULT 1,
  criado_em    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_plano (produto_id, codigo),
  KEY idx_plano_produto (produto_id, isActive),
  CONSTRAINT fk_plano_produto FOREIGN KEY (produto_id)
    REFERENCES produto (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- tenant
--
-- Sem planId: o plano vive em subscription. Duplicar aqui dava duas verdades
-- para o mesmo facto.
--
-- produto_slug e FK para produto(slug) — o slug e UNIQUE, por isso e legal.
-- -----------------------------------------------------------------------------
CREATE TABLE tenant (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  codigo                  VARCHAR(36) NOT NULL,
  produto_slug            VARCHAR(50) NOT NULL,
  escolaCodigo            VARCHAR(36),
  escolaId                INT,
  nome                    VARCHAR(255) NOT NULL,
  nif                     VARCHAR(20),
  tipo                    VARCHAR(20),
  designacao              VARCHAR(50),
  regimeEnsino            VARCHAR(50),
  contactEmail            VARCHAR(255),
  contactPhone            VARCHAR(50),
  province                VARCHAR(100),
  city                    VARCHAR(100),
  status                  ENUM('trial','active','suspended','cancelled') NOT NULL DEFAULT 'trial',
  trialEndsAt             DATE,
  nextBillingDate         DATE,
  firstAdminName          VARCHAR(255),
  firstAdminEmail         VARCHAR(255),
  firstAdminPhone         VARCHAR(50),
  firstAdminCodigo        VARCHAR(36),
  primeiroAcessoPendente  TINYINT(1) NOT NULL DEFAULT 1,
  suspendedReason         TEXT,
  suspendedAt             DATETIME,
  cancelledReason         TEXT,
  cancelledAt             DATETIME,
  provisionamento         ENUM('pendente','provisionado','erro') NOT NULL DEFAULT 'pendente',
  provisionamentoErro     TEXT,
  notas                   TEXT,
  criado_em               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_codigo (codigo),
  KEY idx_tenant_status (status),
  KEY idx_tenant_produto (produto_slug),
  KEY idx_tenant_provisionamento (provisionamento),
  CONSTRAINT fk_tenant_produto FOREIGN KEY (produto_slug)
    REFERENCES produto (slug) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- subscription
-- -----------------------------------------------------------------------------
CREATE TABLE subscription (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  tenantId       INT NOT NULL,
  planId         INT NOT NULL,
  status         ENUM('trial','active','suspended','cancelled') NOT NULL DEFAULT 'trial',
  `interval`     ENUM('monthly','quarterly','annual') NOT NULL DEFAULT 'monthly',
  priceAoa       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  startDate      DATE,
  trialEndsAt    DATE,
  nextBillingDate DATE,
  autoRenew      TINYINT(1) NOT NULL DEFAULT 0,
  criado_em      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_subscription_tenant (tenantId),
  KEY idx_subscription_status (status),
  CONSTRAINT fk_subscription_tenant FOREIGN KEY (tenantId)
    REFERENCES tenant (id) ON DELETE CASCADE,
  CONSTRAINT fk_subscription_plano FOREIGN KEY (planId)
    REFERENCES plano (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- subscription_history
-- -----------------------------------------------------------------------------
CREATE TABLE subscription_history (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  subscriptionId INT NOT NULL,
  evento         VARCHAR(50),
  nota           TEXT,
  data           DATE,
  CONSTRAINT fk_history_subscription FOREIGN KEY (subscriptionId)
    REFERENCES subscription (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- pagamento
--
-- subscriptionId: saber a que periodo o pagamento se refere.
-- referencia UNIQUE: evita registar o mesmo comprovativo duas vezes.
-- -----------------------------------------------------------------------------
CREATE TABLE pagamento (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  receiptNumber    VARCHAR(20) NOT NULL,
  tenantId         INT NOT NULL,
  subscriptionId   INT,
  amountAoa        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status           ENUM('paid','pending','failed','refunded') NOT NULL DEFAULT 'pending',
  paymentMethod    VARCHAR(50),
  reference        VARCHAR(100),
  proofVoucherName VARCHAR(255),
  notas            TEXT,
  paidAt           DATETIME,
  dueDate          DATE,
  criado_em        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_pagamento_recibo (receiptNumber),
  UNIQUE KEY uk_pagamento_referencia (reference),
  KEY idx_pagamento_status (status),
  KEY idx_pagamento_tenant (tenantId),
  CONSTRAINT fk_pagamento_tenant FOREIGN KEY (tenantId)
    REFERENCES tenant (id) ON DELETE CASCADE,
  CONSTRAINT fk_pagamento_subscription FOREIGN KEY (subscriptionId)
    REFERENCES subscription (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- super_admin_user
--
-- password_hash e novo: a tabela original nao tinha coluna nenhuma para a
-- password, portanto nao havia forma de entrar na plataforma.
-- -----------------------------------------------------------------------------
CREATE TABLE super_admin_user (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  role              ENUM('super_admin','product_admin','finance_admin','support_admin','auditor')
                    NOT NULL DEFAULT 'support_admin',
  twoFactorEnabled  TINYINT(1) NOT NULL DEFAULT 0,
  activo            TINYINT(1) NOT NULL DEFAULT 1,
  criado_por        INT,
  lastLoginAt       DATETIME,
  criado_em         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_operador_email (email),
  KEY idx_operador_role (role, activo),
  CONSTRAINT fk_operador_criado_por FOREIGN KEY (criado_por)
    REFERENCES super_admin_user (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- audit_log
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  actorName  VARCHAR(255),
  actorEmail VARCHAR(255),
  actorRole  VARCHAR(50),
  ipAddress  VARCHAR(50),
  action     VARCHAR(100) NOT NULL,
  entityType VARCHAR(50),
  entityId   VARCHAR(50),
  entityName VARCHAR(255),
  details    TEXT,
  changes    LONGTEXT,
  criado_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_criado (criado_em),
  KEY idx_audit_accao (action),
  KEY idx_audit_entidade (entityType, entityId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- platform_settings
-- -----------------------------------------------------------------------------
CREATE TABLE platform_settings (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  setting_key    VARCHAR(100) NOT NULL,
  setting_value  LONGTEXT,
  atualizado_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_setting_key (setting_key),
  CONSTRAINT ck_setting_json CHECK (JSON_VALID(setting_value))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
