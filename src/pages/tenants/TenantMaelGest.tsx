import { useState } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useBackoffice } from '../../context/BackofficeContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';
import {
  FileCode,
  Copy,
  Check,
  Eye,
  Server,
  Code2,
  Lock,
  ExternalLink
} from 'lucide-react';

export function TenantMaelGestPage() {
  const tenant = useTenant();
  const { startImpersonation, impersonatingTenant } = useBackoffice();
  const { showToast } = useToast();

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!tenant) return null;

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    showToast(`${section} copiado para a área de transferência!`, 'success');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const isImpersonatingThis = impersonatingTenant?.id === tenant.id;

  if (tenant.productSlug !== 'maelgest' || !tenant.maelgestOutput) {
    return (
      <EmptyState
        icon={FileCode}
        title="Mapeamento de Produto Diferente"
        description="Esta secção contém saídas administrativas exclusivas do provisionamento MaelGest (SaaS de Gestão Escolar). O cliente selecionado está registado num produto diferente."
      />
    );
  }

  const output = tenant.maelgestOutput;

  return (
    <div className="space-y-4 font-sans text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Consola de Integração e Saídas MaelGest</h3>
          <p className="text-[11px] text-slate-500">Credenciais geradas pelo Control Plane de forma idempotente e scripts de provisionamento físico</p>
        </div>
        
        {tenant.status !== 'cancelled' && (
          <Button
            variant={isImpersonatingThis ? 'danger' : 'primary'}
            size="sm"
            icon={Eye}
            onClick={() => startImpersonation(tenant.id)}
            disabled={isImpersonatingThis}
          >
            {isImpersonatingThis ? 'Impersonando Ativo...' : 'Iniciar Suporte'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* school code */}
        <Card variant="default" padding="md" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono">Código da Escola (BD)</span>
          <div className="text-base font-bold font-mono text-white flex items-center justify-between">
            <span>{output.schoolCode}</span>
            <button
              onClick={() => handleCopy(output.schoolCode, 'Código da Escola')}
              className="text-slate-500 hover:text-indigo-400 p-1 rounded"
              title="Copiar Código"
            >
              {copiedSection === 'Código da Escola' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </Card>

        {/* admin code */}
        <Card variant="default" padding="md" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono">Utilizador Diretor Geral (BD)</span>
          <div className="text-base font-bold font-mono text-white flex items-center justify-between">
            <span>{output.adminCode}</span>
            <button
              onClick={() => handleCopy(output.adminCode, 'Utilizador Administrativo')}
              className="text-slate-500 hover:text-indigo-400 p-1 rounded"
              title="Copiar Utilizador"
            >
              {copiedSection === 'Utilizador Administrativo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </Card>

        {/* 1.º acesso */}
        <Card variant="default" padding="md" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono">Estado do Primeiro Acesso</span>
          <div className="text-base font-bold font-mono text-white">
            {output.mysql ? 'Onboarding pendente (2 passos)' : 'Onboarding pendente (2 passos)'}
          </div>
          <p className="text-[10px] text-slate-500">
            A palavra-passe não é guardada pela plataforma — é definida no momento do aprovisionamento e apenas
            transposta para o email do Director Geral.
          </p>
        </Card>
      </div>

      {/* Resultado do aprovisionamento na BD MySQL do MaelGest */}
      {output.mysql && (
        <Card variant="default" padding="lg" className="space-y-3">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-white">Aprovisionamento na BD do MaelGest</h3>
            </div>
            <Button
              size="sm"
              icon={Copy}
              onClick={() => handleCopy(JSON.stringify(output.mysql, null, 2), 'IDs do MaelGest')}
            >
              {copiedSection === 'IDs do MaelGest' ? 'Copiado!' : 'Copiar JSON'}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-3">
              <div className="text-slate-500">escola_id</div>
              <div className="text-white font-bold">{output.mysql.escola_id}</div>
            </div>
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-3">
              <div className="text-slate-500">admin_id</div>
              <div className="text-white font-bold">{output.mysql.admin_id}</div>
            </div>
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-3">
              <div className="text-slate-500">funcionario_id</div>
              <div className="text-white font-bold">{output.mysql.funcionario_id}</div>
            </div>
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-3">
              <div className="text-slate-500">papel_id</div>
              <div className="text-white font-bold">{output.mysql.papel_id}</div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Executado numa transacção única: escola, utilizador, utilizador_escola, usuario_papel, funcionario e
            escola.primeiro_acesso_pendente.
          </p>
        </Card>
      )}

      {/* Tenant espelhado na plataforma */}
      <Card variant="default" padding="lg" className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
          <Code2 className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-white">Espelho na Plataforma (BD `maelg`)</h3>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span
            className={`px-2 py-1 rounded ${
              output.mysql?.tenant_mirrorado
                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900'
                : 'bg-amber-950/50 text-amber-400 border border-amber-900'
            }`}
          >
            {output.mysql?.tenant_mirrorado ? 'tenant espelhado' : 'tenant não espelhado'}
          </span>
          <ExternalLink className="w-3 h-3 text-slate-600" />
        </div>

        <p className="text-[10px] text-slate-500">
          O espelho em <code className="text-slate-400">maelg.tenant</code> é melhor-esforço: se o produto ou um
          plano activo não existirem, a escola continua criada no MaelGest e o motivo é registado no log.
        </p>
      </Card>
    </div>
  );
}
export default TenantMaelGestPage;
