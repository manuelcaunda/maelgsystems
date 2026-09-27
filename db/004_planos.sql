-- 004_planos.sql — o plano como catalogo, e as referencias que o entregam
--
-- ate aqui um plano era um preco e tres numeros soltos (`maxStudents`,
-- `maxUsers`, `maxStorageGb`). Isso nao escala para o que o plano passou a
-- governar: o director escolhe o plano e o plano tem de valer no uso da
-- escola, nao so na fatura.
--
-- A mudanca e' de fundo: o limite deixa de estar no codigo e passa a ser
-- DADOS. Um `if alunos > N` so serviria para alunos; a tolerancia que o
-- director combinou vale para todos os recursos, e recursos vao aparecer.
-- Por isso o plano passa a descrever o que limita, num catalogo, e cada
-- inscricao carrega um retrato desse catalogo.
--
-- Quatro tabelas:
--
--   plano_recurso            o catalogo: que tipos de recurso existem e como
--                            o produto conta cada um
--   plano_limite             os valores de um plano (plano x recurso)
--   plano_referencia         a referencia de 9 digitos que a EQUIPE emite
--   plano_referencia_recurso o retrato: o que essa referencia entrega
--
-- Porque a referencia tem relacao propria e nao le o plano a serio:
--
--   o `plano_limite` e' o catalogo corrente — o que uma venda nova entrega.
--   A `plano_referencia_recurso` e' o contrato. Se amanha a MaelG mexer no
--   plano "pro", quem emitiu a referencia anteontem continua a receber 300
--   alunos, porque e' isso que foi vendido. Sem esta copia, mudar o catalogo
--   mudaria retroactivamente o que os clientes compraram — e uma reducao
--   feita a serio (300 -> 200) atirpava escolas que nunca escolheram
--   descer. Por isso a regra adoptada e': melhorias propagam, reducoes nao.
--
-- A tolerancia e' em MESES, nao em dias. Um mes nao tem sempre 30 dias, e
-- "cortes de recursos" ao fim de um mes tem de cair no mes seguinte ao que a
-- escola ate' entendeu, nao numa data calculada a partir de 30 dias.

-- -----------------------------------------------------------------------------
-- O catalogo de recursos
--
-- `como_contar` e' o nome do contador no produto. Nao e' decorativo: e' o
-- contrato com o `escola_limite` do produto. Se o produto nao tiver esse
-- contador, o recurso nao pode ser dado como respeitado — tem de aparecer
-- como nao-aplicavel, nunca como ilimitado.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plano_recurso (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  produto_id   INT NOT NULL,
  chave        VARCHAR(40) NOT NULL,
  nome         VARCHAR(80) NOT NULL,
  unidade      VARCHAR(20) NOT NULL,
  como_contar  VARCHAR(40) NOT NULL,
  bloqueia     TINYINT(1) NOT NULL DEFAULT 1,
  ativo        TINYINT(1) NOT NULL DEFAULT 1,
  criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_recurso (produto_id, chave),
  KEY idx_recurso_produto (produto_id, ativo),
  CONSTRAINT fk_recurso_produto FOREIGN KEY (produto_id)
    REFERENCES produto (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- Os valores de um plano
--
-- valor 0 = ilimitado, como ja estava em `plano.maxStudents`. Mantem-se a
-- convencao em vez de inventar outra: NULL seria ambiguo entre "ilimitado" e
-- "a empresa nao disse", e sao coisas diferentes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plano_limite (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  plano_id     INT NOT NULL,
  recurso_id   INT NOT NULL,
  valor        INT NOT NULL DEFAULT 0,
  criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_plano_recurso (plano_id, recurso_id),
  KEY idx_limite_recurso (recurso_id),
  CONSTRAINT fk_limite_plano FOREIGN KEY (plano_id)
    REFERENCES plano (id) ON DELETE CASCADE,
  CONSTRAINT fk_limite_recurso FOREIGN KEY (recurso_id)
    REFERENCES plano_recurso (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- A referencia
--
-- 9 digitos sao 10^9, e um codigo adivinhado dava um plano gratis. Por isso:
--   - `uk_referencia_codigo` impede duas referencias com o mesmo codigo
--   - o resgate no produto tem rate limit apertado (a defesa de metade)
--   - o resgate responde igual para codigo inexistente, valido, usado ou
--     expirado, para nao dizer a um atacante quais existem
--   - `emitido_por` NOT NULL: so a equipa emite. Um downgrade NAO vem por
--     referencia — reduzir receita exige uma conversa, nao um codigo que o
--     proprio director aplicava.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plano_referencia (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  codigo         CHAR(9) NOT NULL,
  produto_id     INT NOT NULL,
  plano_id       INT NOT NULL,
  produto_escola VARCHAR(60) NOT NULL,
  tenant_id      INT NULL,
  tipo           ENUM('subscricao','upgrade') NOT NULL,
  estado         ENUM('emitida','usada','expirada','anulada') NOT NULL DEFAULT 'emitida',
  expira_em      DATETIME NOT NULL,
  usada_em       DATETIME NULL,
  emitido_por    INT NOT NULL,
  criado_em      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_referencia_codigo (codigo),
  KEY idx_referencia_escola (produto_id, produto_escola, estado),
  KEY idx_referencia_plano (plano_id),
  KEY idx_referencia_vencimento (estado, expira_em),
  CONSTRAINT fk_ref_produto FOREIGN KEY (produto_id)
    REFERENCES produto (id) ON DELETE CASCADE,
  CONSTRAINT fk_ref_plano FOREIGN KEY (plano_id) REFERENCES plano (id),
  CONSTRAINT fk_ref_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE SET NULL,
  CONSTRAINT fk_ref_emitido_por FOREIGN KEY (emitido_por)
    REFERENCES super_admin_user (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- O retrato que a referencia entrega
--
-- `tolerancia_meses` e' 1: um mes de folga antes de cortar, em todos os
-- recursos, conforme combinado.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plano_referencia_recurso (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  referencia_id    INT NOT NULL,
  recurso_id       INT NOT NULL,
  valor            INT NOT NULL,
  tolerancia_meses TINYINT UNSIGNED NOT NULL DEFAULT 1,
  criado_em        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ref_recurso (referencia_id, recurso_id),
  KEY idx_refrecurso_recurso (recurso_id),
  CONSTRAINT fk_rr_referencia FOREIGN KEY (referencia_id)
    REFERENCES plano_referencia (id) ON DELETE CASCADE,
  CONSTRAINT fk_rr_recurso FOREIGN KEY (recurso_id) REFERENCES plano_recurso (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- -----------------------------------------------------------------------------
-- O catalogo, semeado para cada produto
--
-- INSERT IGNORE: um produto novo tem de receber o catalogo sem duplicar o que
-- ja la esta, e `uk_recurso (produto_id, chave)` e' o que garante isso.
--
-- `duracao` nao bloqueia: a validade da subscricao nao se cumpre recusando
-- um pedido, resolve-se expirando a subscricao. Fica no mesmo catalogo porque
-- e' uma especificacao do plano da mesma maneira que as outras.
--
-- ESTA LISTA TEM DE SER A MESMA de `CATALOGO_RECURSOS` em
-- `src/server/repos/produtos.ts`. A migration semeia os produtos que ja
-- existem; aquela funcao semeia os que nascem depois. Se as duas divergirem,
-- um produto novo fica com um catalogo diferente de um produto antigo, e o
-- catalogo deixa de ser uma coisa unica.
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO plano_recurso
  (produto_id, chave, nome, unidade, como_contar, bloqueia)
SELECT p.id, r.chave, r.nome, r.unidade, r.como_contar, r.bloqueia
FROM produto p
JOIN (
        SELECT 'alunos' AS chave, 'Alunos' AS nome, 'aluno' AS unidade,
               'alunos_matriculados' AS como_contar, 1 AS bloqueia
  UNION ALL SELECT 'funcionarios', 'Funcionarios', 'funcionario',
               'funcionarios_ativos', 1
  UNION ALL SELECT 'turmas', 'Turmas', 'turma', 'turmas_ativas', 1
  UNION ALL SELECT 'utilizadores', 'Utilizadores', 'utilizador',
               'utilizadores_ativos', 1
  UNION ALL SELECT 'armazenamento', 'Armazenamento', 'GB',
               'armazenamento_gb', 1
  UNION ALL SELECT 'duracao', 'Duracao da subscricao', 'mes',
               'validade_subscricao', 0
) r;

-- -----------------------------------------------------------------------------
-- Os planos que ja existem passam a ter limites no catalogo
--
-- INSERT IGNORE ... SELECT, porque o valor tem de vir da linha que ja existe
-- e nao de um valor escrito a mao. Idempotente: se `plano_limite` ja tem o
-- par, nao mexe.
--
-- As tres colunas antigas ficam em `plano` por agora, e sao lidas ainda por
-- `listarPlanos` (usada pela supervisao e pelos testes). Vao deixar de ser a
-- verdade quando a execucao passar a ler `plano_limite`; so entao se dropam.
-- Ate' la, `plano_limite` e' o que conta.
--
-- Nota sobre `max_alunos_turma` no produto: e' outra coisa. Limita alunos por
-- turma, nao alunos da escola. Nao entra no catalogo.
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO plano_limite (plano_id, recurso_id, valor)
SELECT pl.id, r.id, pl.maxStudents
FROM plano pl
JOIN produto pr ON pr.id = pl.produto_id
JOIN plano_recurso r ON r.produto_id = pr.id AND r.chave = 'alunos';

INSERT IGNORE INTO plano_limite (plano_id, recurso_id, valor)
SELECT pl.id, r.id, pl.maxUsers
FROM plano pl
JOIN produto pr ON pr.id = pl.produto_id
JOIN plano_recurso r ON r.produto_id = pr.id AND r.chave = 'utilizadores';

INSERT IGNORE INTO plano_limite (plano_id, recurso_id, valor)
SELECT pl.id, r.id, pl.maxStorageGb
FROM plano pl
JOIN produto pr ON pr.id = pl.produto_id
JOIN plano_recurso r ON r.produto_id = pr.id AND r.chave = 'armazenamento';
