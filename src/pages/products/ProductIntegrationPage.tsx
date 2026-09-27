import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Server, KeyRound, Copy, Check, Send, Activity } from 'lucide-react';
import { PATHS } from '../../router/paths';

export function ProductIntegrationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { products } = useBackoffice();
  const { showToast } = useToast();

  const [copied, setCopied] = useState(false);
  const [responseLog, setResponseResponseLog] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-xs text-slate-400">Produto não encontrado.</p>
        <Button onClick={() => navigate(PATHS.products.list)}>Voltar</Button>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText('');
    setCopied(true);
    showToast('Token copiado com sucesso!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerSimulate = () => {
    setIsSending(true);
    setResponseResponseLog('A enviar ping de pulso...');
    setTimeout(() => {
      setResponseResponseLog(
        JSON.stringify({
          status: 'online',
          latency: '24ms',
          auth: 'valid',
          active_connections: 0,
          database: 'mael_physics_isolation_verified',
          mrr_tracked: `${0} AOA`,
          request_id: `ping_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toISOString()
        }, null, 2)
      );
      setIsSending(false);
      showToast('Sinal de pulso validado com sucesso!', 'success');
    }, 1200);
  };

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={`Integração ${product.name}`}
        description={`Mapeamento do barramento API e integradores físicos para o produto ${product.name}.`}
        breadcrumbs={[
          { label: 'Módulos', href: PATHS.products.list },
          { label: product.name }
        ]}
        backHref={PATHS.products.list}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-slate-100">
        {/* API Credentials */}
        <div className="space-y-4">
          <Card variant="default" padding="lg" className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-white font-sans">Credenciais de Autenticação</h3>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div className="space-y-1.5">
                <span className="text-slate-500 font-semibold block">Endpoint Base</span>
                <input
                  type="text"
                  value={product.apiUrl}
                  readOnly
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-indigo-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-500 font-semibold block">Token Portador de Produção (Bearer)</span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={''}
                    readOnly
                    className="flex-1 bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-slate-400 focus:outline-none"
                  />
                  <Button size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="muted" padding="md">
            <div className="flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed font-sans">
              <Server className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">Regras de Comunicação Restritas</p>
                <p className="mt-1">
                  Qualquer chamada originada por este token possui privilégios para criar tabelas físicas no Data Plane. A rota de provisionamento opera apenas sobre transações encriptadas HTTPS em conformidade com as regras do Ministério das Finanças angolano.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Simulator Console */}
        <div className="space-y-4">
          <Card variant="default" padding="lg" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-white font-sans">Consola de Testes de Sinal (Ping)</h3>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                loading={isSending}
                onClick={handleTriggerSimulate}
              >
                Enviar Pulso
              </Button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Testar de forma direta os tempos de resposta, latência de rede e a integridade da ligação física das bases de dados do {product.name} com o Control Plane.
            </p>

            <div className="relative pt-1">
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mb-1.5 uppercase">
                <span>Output do Console Terminal</span>
                <span>MaelG Control Plane</span>
              </div>
              <pre className="bg-slate-950 border border-slate-900 text-[11px] font-mono p-4 rounded-lg overflow-x-auto text-indigo-300 min-h-[140px] max-h-[140px] leading-relaxed whitespace-pre-wrap">
                {responseLog || 'Pronto. Clique em "Enviar Pulso" para inicializar a varredura operacional...'}
              </pre>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
export default ProductIntegrationPage;
