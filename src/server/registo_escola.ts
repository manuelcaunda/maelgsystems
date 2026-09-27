/**
 * Registo de uma escola no MaelG Systems.
 *
 * Ha **duas portas de entrada** e as duas acabam aqui, porque quem tem de
 * saber o que existe no mundo comercial e' sempre o MaelG Systems.
 *
 *   A) O operador cria na plataforma.
 *      A escola ainda nao existe no produto, e' nos que vamos cria-la:
 *      chamamos a API do produto com a credencial dele.
 *
 *   B) O director cria na app do produto.
 *      A escola ja existe no produto — ele acabou de a fazer. O produto
 *      chama-nos, e nos registamos, supervisamos e ligamos a assinatura.
 *      Nao voltamos a criar nada no produto: seria duplicar.
 *
 * A distincao e' uma coisa so: `escolaCodigo`.
 *
 *   - veio preenchido  -> caminho B, a escola existe, marcar e supervisionar
 *   - veio vazio       -> caminho A, a escola nao existe, criar no produto
 *
 * Nos dois casos o que fica guardado e' o mesmo: um tenant, um plano e um
 * plano de facturacao. A diferenca e' so quem manda criar a escola.
 */
import {
  marcarErroProvisionamento,
  marcarProvisionado,
  procurarTenant,
  provisionarEscola,
} from './repos/tenants';
import { criarEscolaNoProduto, ErroProduto } from './produto_cliente';
import type { NovoTenant } from './repos/tenants';
import type { Tenant } from '../types';

/**
 * Corre a saga de um tenant que ja nasceu: ou pede ao produto que crie a
 * escola, ou marca-a como ja criada.
 */
export async function aprovisionar(
  tenant: Tenant,
  aoCorrer?: (d: { produtoSlug: string; tenantCodigo: string; motivo: string }) => Promise<void>,
): Promise<Tenant> {
  // Caminho B: a escola ja foi criada pelo director na app do produto. Nao ha
  // nada para pedir ao produto — so falta confirmar o estado.
  if (tenant.escolaCodigo && tenant.escolaId) {
    await marcarProvisionado(
      tenant.id,
      tenant.escolaId,
      tenant.escolaCodigo,
      tenant.firstAdminCodigo === null,
      tenant.firstAdminCodigo ?? undefined,
    );
    const guardado = await procurarTenant(tenant.id);
    if (!guardado) throw new Error(`Tenant ${tenant.id} desapareceu durante o aprovisionamento.`);
    return guardado;
  }

  // Caminho A: vamos pedir ao produto que crie a escola.
  return provisionarEscola(
    tenant.id,
    async () => {
      const criada = await pedirEscolaAoProduto(tenant);
      // A resposta do produto e' o unico ponto onde um contrato renomeado
      // entra na base de dados. Sem esta guarda, um `escola_id` em falta
      // chega ao mysql2 como `undefined` e o operador le "Bind parameters
      // must not contain undefined", que nao diz nada sobre o produto.
      if (typeof criada.escola_id !== 'number' || !criada.escola_codigo) {
        throw new ErroProduto(
          `O produto ${tenant.produtoSlug} respondeu sem o codigo da escola que acabou de criar. ` +
            'A escola pode ter ficado criada la sem ligacao a este tenant — confirme no produto antes de tentar de novo.',
          502,
        );
      }
      try {
        await marcarProvisionado(
          tenant.id,
          criada.escola_id,
          criada.escola_codigo,
          !criada.admin,
          criada.admin?.username,
        );
      } catch (e) {
        // `uq_tenant_produto_escola`: outra inscricao ja guarda este codigo de
        // escola. Nao e' um erro de driver, e' um produto que devolveu um codigo
        // ja usado, e o operador tem de saber qual e' a escola a cuddle.
        if ((e as { code?: string }).code === 'ER_DUP_ENTRY') {
          throw new ErroProduto(
            `O produto ${tenant.produtoSlug} devolveu o codigo de escola ${criada.escola_codigo}, ` +
              'que ja pertence a outra inscricao. Confirme se a escola nao foi criada duas vezes no produto.',
            502,
          );
        }
        throw e;
      }
    },
    async (saga) => {
      await marcarErroProvisionamento(tenant.id, saga.motivo);
      if (aoCorrer) await aoCorrer({ ...saga, motivo: saga.motivo });
    },
  );
}

/** Traduz o tenant para o corpo que o produto espera. */
async function pedirEscolaAoProduto(tenant: Tenant) {
  return criarEscolaNoProduto(tenant.produtoSlug, tenant.codigo, {
    nome: tenant.nome,
    nif: tenant.nif ?? undefined,
    tipo: tenant.tipo ?? undefined,
    designacao: tenant.designacao ?? undefined,
    regimeEnsino: tenant.regimeEnsino ?? undefined,
    contactEmail: tenant.contactEmail ?? undefined,
    contactPhone: tenant.contactPhone ?? undefined,
    province: tenant.province ?? undefined,
    city: tenant.city ?? undefined,
    firstAdminName: tenant.firstAdminName ?? undefined,
    firstAdminEmail: tenant.firstAdminEmail ?? undefined,
    firstAdminPhone: tenant.firstAdminPhone ?? undefined,
    planoId: tenant.planoId ?? undefined,
  });
}

/** O pedido traz `escolaCodigo`? Then e' o caminho B. */
export function vemDaAppDoProduto(d: Partial<NovoTenant>): boolean {
  return Boolean(d.escolaCodigo && d.escolaId);
}

export { ErroProduto };
