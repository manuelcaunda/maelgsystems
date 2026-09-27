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

        {/* first access password */}
        <Card variant="default" padding="md" className="space-y-1">
          <span className="text-[10px] text-slate-500 font-mono">Senha Temporária de Primeiro Acesso</span>
          <div className="text-base font-bold font-mono text-white flex items-center justify-between">
            <span className="select-all">{output.adminPassword || 'Definida pelo cliente'}</span>
            {output.adminPassword && (
              <button
                onClick={() => handleCopy(output.adminPassword || '', 'Senha Provisória')}
                className="text-slate-500 hover:text-indigo-400 p-1 rounded"
                title="Copiar Senha"
              >
                {copiedSection === 'Senha Provisória' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* JSON Payload representation */}
      <Card variant="default" padding="lg" className="space-y-3">
        <div className="flex justify-between items-center border-b border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-white">Payload de Provisionamento JSON (Control Plane Contract)</h3>
          </div>
          <Button size="sm" icon={Copy} onClick={() => handleCopy(output.apiPayload, 'JSON Payload')}>
            {copiedSection === 'JSON Payload' ? 'Copiado!' : 'Copiar JSON'}
          </Button>
        </div>

        <div className="relative">
          <pre className="bg-slate-950 border border-slate-900 text-[11px] font-mono p-4 rounded-lg overflow-x-auto text-indigo-300 max-h-72 leading-relaxed">
            {output.apiPayload}
          </pre>
        </div>
      </Card>

      {/* Atomic SQL Commands */}
      <Card variant="default" padding="lg" className="space-y-3">
        <div className="flex justify-between items-center border-b border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-white">Queries SQL Atómicas Executadas no Data Plane</h3>
          </div>
          <Button size="sm" icon={Copy} onClick={() => handleCopy(output.sqlAtomic, 'Queries SQL')}>
            {copiedSection === 'Queries SQL' ? 'Copiadas!' : 'Copiar SQL'}
          </Button>
        </div>

        <div className="relative">
          <pre className="bg-slate-950 border border-slate-900 text-[11px] font-mono p-4 rounded-lg overflow-x-auto text-slate-300 max-h-60 leading-relaxed">
            {output.sqlAtomic}
          </pre>
        </div>
      </Card>
    </div>
  );
}
export default TenantMaelGestPage;
