-- 002_maelg.sql — saga de criacao de escola
--
-- O MaelG Systems e' quem orquestra: quando um operador cria uma escola na
-- plataforma, somos nos que vamos chamar a API do produto para a criar la. O
-- 001 tinha so tres estados e nao tinha forma de dizer "estamos a ligar agora".
--
--   pendente     ainda nao tentamos
--   em_curso     a chamada ao produto esta a decorrer
--   provisionado o produto confirmou e devolveu o codigo da escola
--   erro         o produto falhou; ha `provisionamentoErro` com o motivo
--
-- Guardamos quando foi a ultima tentativa e quantas foram, para o operador ver
-- se um erro e recente ou esta a repetir-se ha dias.

USE maelg;

ALTER TABLE tenant
  MODIFY provisionamento ENUM('pendente','em_curso','provisionado','erro')
    NOT NULL DEFAULT 'pendente';

ALTER TABLE tenant
  ADD COLUMN provisionamentoTentativas  INT NOT NULL DEFAULT 0 AFTER provisionamentoErro,
  ADD COLUMN provisionamentoEm          DATETIME NULL AFTER provisionamentoTentativas,
  ADD COLUMN provisionamentoConcluidoEm DATETIME NULL AFTER provisionamentoEm;

-- Mesma escola nao entra duas vezes na mesma plataforma. O NIF e' o identificador
-- fiscal, e' o unico que o director da escola controla de fora do sistema — o
-- nome muda-se, o NIF nao. Como o MySQL ignora NULLs em indices unicos, as
-- escolas registadas sem NIF nao ficam presas por esta restricao.
ALTER TABLE tenant
  ADD UNIQUE KEY uq_tenant_produto_nif (produto_slug, nif);
