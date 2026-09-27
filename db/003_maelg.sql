-- 003_maelg.sql — pedidos de supervision de escola
--
-- Uma escola nao entra na supervisao comercial pelo caminho de sempre. O
-- director cria a escola na app do produto; o produto submete-a aqui; e ha
-- uma decisao da equipa MaelG em cima.
--
-- Este table e' o "pedido". Deliberadamente NAO e' uma linha em `tenant`:
--
--   - `tenant` significa "escola comercialmente supervisionada". Um pedido
--     ainda nao e' uma escola supervisionada, e nao deve contar para o MRR,
--     para as metricas nem para as contagens do dashboard.
--   - Um pedido rejeitado tem de deixar rasto sem deixar um tenant orfao.
--
-- Por isso o limiar decide entre dois caminhos na submissao:
--
--   limiar em cima  -> INSERT em escola_pedido, nada de tenant, a equipa decide
--   limiar em baixo -> nasce o tenant logo, e a equipa e' notificada depois
--
-- O preco e' sempre o do NOSSO plano (`plano.priceAoa`), nunca o que o produto
-- manda no corpo. E' a mesma regra que impede um produto de vender abaixo do
-- preco de tabela.

USE maelg;

CREATE TABLE IF NOT EXISTS escola_pedido (
  id                  INT NOT NULL AUTO_INCREMENT,
  produto_slug        VARCHAR(50) NOT NULL,

  -- A escola ja existe na base do produto: ele acabou de a criar. Estes dois
  -- campos sao a ligacao de volta, e' o que permite supervisionar sem recriar.
  escola_codigo       VARCHAR(36) NOT NULL,
  escola_id           INT NOT NULL,

  -- O que o director pediu. Copia do pedido para o produto nao conseguir
  -- alterar o que a equipa vai aprovar.
  nome                VARCHAR(255) NOT NULL,
  nif                 VARCHAR(64) NULL,
  tipo                VARCHAR(50) NULL,
  designacao          VARCHAR(100) NULL,
  regime_ensino       VARCHAR(100) NULL,
  contact_email       VARCHAR(255) NULL,
  contact_phone       VARCHAR(50) NULL,
  province            VARCHAR(100) NULL,
  city                VARCHAR(100) NULL,
  first_admin_name    VARCHAR(255) NULL,
  first_admin_email   VARCHAR(255) NULL,
  first_admin_phone   VARCHAR(50) NULL,
  notas               TEXT NULL,

  -- Tamanho declarado pelo director. So conta se o plano permitir mais do que
  -- isso; se nao permitir, o tecto do plano e' que vale (ver limiar).
  alunos_previstos    INT NULL,
  plano_id            INT NULL,
  trial_dias          INT NULL,

  -- Por que este pedido precisa (ou nao) de decisao humana. Fica escrito para
  -- a equipa nao ter de recalcular a regra para entender a fila.
  exige_aprovacao     TINYINT(1) NOT NULL DEFAULT 0,
  motivo_limiar       VARCHAR(255) NULL,

  estado              ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
  motivo_rejeicao     TEXT NULL,

  -- Preenchido quando a equipa aprova. E' a prova de que o tenant nasceu
  -- deste pedido e nao de outro sitio.
  tenant_id           INT NULL,
  decidido_por        INT NULL,
  decidido_em         DATETIME NULL,
  criado_em           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- Um pedido vivo por escola e por produto. Reenvio apos rejeicao actualiza
  -- esta mesma linha (contando uma tentativa) em vez de criar uma segunda.
  UNIQUE KEY uk_pedido_escola (produto_slug, escola_codigo),
  KEY idx_pedido_estado (estado, criado_em),
  KEY idx_pedido_produto (produto_slug),

  CONSTRAINT fk_pedido_produto
    FOREIGN KEY (produto_slug) REFERENCES produto (slug) ON UPDATE CASCADE,
  CONSTRAINT fk_pedido_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE SET NULL,
  CONSTRAINT fk_pedido_decidido_por
    FOREIGN KEY (decidido_por) REFERENCES super_admin_user (id) ON DELETE SET NULL,

  CONSTRAINT ck_pedido_alunos CHECK (alunos_previstos IS NULL OR alunos_previstos >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci
COMMENT='Pedidos de supervision de escola submetidos pelos produtos';

-- Uma escola supervisionada nao pode estar inscrita duas vezes no mesmo
-- produto. `escolaCodigo` e' o identificador que o produto da' a escola e ja
-- era a chave de idempotencia das duas pontas; sem esta restricao, um produto
-- que submetesse o mesmo pedido duas vezes criava duas inscricoes e duas
-- assinaturas para uma escola so.
--
-- NULL nao colide: os tenants criados pelo operador (caminho A) chegam sem
-- `escolaCodigo`, porque a escola ainda nao existe no produto, e o MySQL ignora
-- NULLs em indices unicos.
ALTER TABLE tenant
  ADD UNIQUE KEY uq_tenant_produto_escola (produto_slug, escolaCodigo);
