# Como os sistemas falam e como a equipa se liga aos produtos

> Estado em 2026-09-27. Fonte: `db/001_maelg.sql`, `src/server/routes/plataforma.ts`,
> `src/server/auth.ts`, `src/server/repos/produtos.ts`, `src/server/registo_escola.ts`.

## 1. As duas portas de entrada

O MaelG Systems tem **um** banco de dados (`maelg`) e **duas** maneiras de alguém
entrar nele. São diferentes porque quem entra tem que poder diferente.

| | Entrada do operador | Entrada do produto |
|---|---|---|
| Quem | Equipa interna (backoffice) | Outro sistema (ex.: a app do director) |
| Credencial | JWT de utilizador | Par chave/segredo do produto |
| Headers | `Authorization: Bearer <jwt>` | `X-Maelg-Produto`, `X-Maelg-Segredo` |
| Tabela | `super_admin_user` | `produto_acesso` |
| Rotas | `/api/*` | `/api/v1/plataforma/*` |
| Quem decide | A role do operador | O `produto_slug` da credencial |

Não há sobreposição: as rotas de plataforma **não** aceitam JWT, e as rotas de
gestão **não** aceitam credencial de produto.

## 2. Credencial de produto (o par chave/segredo)

Criada quando o operador regista um produto e preenche `produtoChave` +
`produtoSegredo`. Em `produto_acesso`:

- `chave` — em claro, para localizar o registo (como um username).
- `segredo` — **cifrado** em AES-256-GCM (`varbinary`), nunca em claro.
- `caminho_escolas` — o endereço da API do produto.
- `escopo`, `activo`, `ultimo_uso_em`.

A verificação (`verificarCredencialProduto`) faz lookup pela chave, decifra e
compara com `crypto.timingSafeEqual`. A resposta é **a mesma** para "chave não
existe" e "segredo errado", para não revelar que chaves existem.

Se a chave estiver `activo = 0`, a credencial deixa de valer na mesma hora.

## 3. A relação equipa ↔ produto

**Hoje essa relação não existe por coluna.** Foi esta a decisão, e vale a pena
sabê-lo antes de grow:

- `super_admin_user` **não tem** `produto_id`. Um operador pertence à
  plataforma, não a um produto.
- Quem liga uma escola a um produto é a **coluna `tenant.produto_slug`** (FK
  para `produto.slug`), com índice `idx_tenant_produto`.

Consequência prática: um `product_admin` gere **todos** os produtos, não só um.
Para o MaelG Systems ser multi-marca a sério, falta o âmbito de produto por
operador.

## 4. Roles da equipa

`src/server/auth.ts` — cada role é uma lista explícita de permissões
(`produtos:*`, `planos:*`, `tenants:*`, `financeiro:*`, `operadores:*`,
`auditoria:ler`, `config:*`).

| Role | essence |
|---|---|
| `super_admin` | tudo |
| `product_admin` | produtos, planos, tenants. **Sem** financeiro e **sem** operadores |
| `finance_admin` | financeiro + configuração. **Sem** escrever em produtos/tenants |
| `support_admin` | escreve em tenants, não toca em dinheiro |
| `auditor` | só lê |

Duas coisas by design: o `auditor` nunca escreve, e **nenhum** role, por mais
alto que seja, concentra as duas coisas — não há role com ler *e* escrever em
tudo. `product_admin` não vê `financeiro:ler`.

## 5. As duas portas de criação de escola

A distinção é uma coisa só: **o `escolaCodigo` vem preenchido?**

### Caminho A — o operador cria (a escola ainda não existe no produto)

1. `POST /api/tenants` com JWT. Nasce o tenant em `provisionamento: 'pendente'`.
2. O MaelG Systems chama o produto: `POST {caminho_escolas}` com a credencial
   dele e `X-Maelg-Idempotencia: <codigo do tenant>`.
3. Se responder bem: `provisionamento: 'provisionado'`, grava `escolaId` +
   `escolaCodigo` que o produto devolveu.
4. Se falhar: `provisionamento: 'erro'` + `provisionamentoErro` legível. O
   operador vê o erro e carrega **Retry** (`POST /tenants/:id/aprovisionar`).

O `codigo` do tenant viaja como chave de idempotência. É o que impede que dois
cliques em "Criar" paguem a inscrição duas vezes — o produto vê a mesma chave e
devolve a escola que já criou.

### Caminho B — o director cria na app do produto

1. O produto cria a escola na sua base.
2. O produto chama `POST /api/v1/plataforma/escolas` **para nós**.
3. Registo do tenant + assinatura e a partir daí o MaelG Systems manda.

Em caminho B não se volta a pedir nada ao produto: seria criar a mesma escola
duas vezes. O produto continua dono dos dados pedagógicos; nós somos dono do
estado comercial.

O `produtoSlug` **nunca** vem do corpo do pedido em caminho B: vem da
credencial (`req.produtoSlug`). Sem isso, um produto com credenciais válidas
inscrevia escolas em nome de outro.

## 6. A regra que mantém tudo honesto

> **Um produto só vê os seus dados.** Cada rota de plataforma filtra por
> `req.produtoSlug`; se não filtrar, está a dar leitura cruzada.

Isto é verificado a correr: `GET`/`PUT` devolvem **404** (não 403) quando o slug
não bate, para não confirmar que a escola existe noutro produto.

## 7. O que ainda está por fazer

- **Âmbito de produto por operador.** Base para multi-marca.
- **Prova com o backend real.** O round-trip foi provado contra um produto stub
  que valida credencial e idempotência; falta contra a `:8100` a sério.
- **A escola criada em caminho A sem `escolaCodigo` fica órfã no produto.** A
  mensagem de erro avisa o operador para confirmar lá antes de repetir.
- **2FA existe como coluna** (`twoFactorEnabled`) e não tem implementação.
