import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackoffice } from '../../context/BackofficeContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatAOA, PROVINCES_ANGOLA } from '../../utils/formatters';
import { GraduationCap, Building, User, CheckCircle, ChevronRight, ChevronLeft, Lock, Eye, Sparkles, FileCheck } from 'lucide-react';
import { PATHS } from '../../router/paths';

export function CreateTenantPage() {
  const navigate = useNavigate();
  const { products, plans, createTenant, canManageTenants } = useBackoffice();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  // Form states
  const [productSlug, setProductSlug] = useState('maelgest');
  const [planId, setPlanId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [province, setProvince] = useState('Luanda');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<'trial' | 'active'>('trial');

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Filter plans based on product choice
  const availablePlans = plans.filter((p) => p.produtoSlug === productSlug && p.isActive === true);

  const selectedProduct = products.find((p) => p.slug === productSlug);
  const selectedPlan = plans.find((p) => p.id === planId);

  const handleNextStep = () => {
    // Basic validation
    if (step === 2) {
      if (!name.trim() || !nif || !city.trim()) {
        alert('Por favor, preencha todos os campos obrigatórios (Nome, NIF, Município).');
        return;
      }
      if (nif.length !== 10) {
        alert('O NIF de contribuinte em Angola deve conter exatamente 10 dígitos.');
        return;
      }
    }
    if (step === 3) {
      if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
        alert('Por favor, preencha todos os campos de contacto administrativo.');
        return;
      }
      if (!contactEmail.includes('@')) {
        alert('Insira um endereço de email válido.');
        return;
      }
    }

    setStep((s) => s + 1);
  };

  const handlePrevStep = () => {
    setStep((s) => s - 1);
  };

  const handleProductChange = (slug: string) => {
    setProductSlug(slug);
    // Auto-select first active plan for this product
    const firstPlan = plans.find((p) => p.produtoSlug === slug && p.isActive === true);
    setPlanId(firstPlan?.id ?? null);
  };

  const handleProvision = async () => {
    setLoading(true);
    try {
      // A senha nao passa por aqui: a plataforma nao a guarda. Quem cria a
      // escola no produto e' que define a senha do director, na propria app.
      const tenantId = await createTenant({
        nome: name,
        produtoSlug: productSlug,
        planoId: planId ?? undefined,
        nif: nif || undefined,
        province,
        city: city || undefined,
        firstAdminName: contactName || undefined,
        firstAdminEmail: contactEmail || undefined,
        firstAdminPhone: contactPhone || undefined,
        trialDias: status === 'trial' ? 14 : 0,
        notas: notes || undefined });
      setCreatedId(tenantId);
      setStep(5); // Success step
    } catch (e: any) {
      alert(e.message || 'Erro ao provisionar escola e primeiro administrador.');
    } finally {
      setLoading(false);
    }
  };

  if (!canManageTenants) {
    return (
      <div className="min-h-[400px] flex items-center justify-center font-sans">
        <div className="text-center max-w-sm">
          <Lock className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-white mt-4 uppercase tracking-wider font-mono">Acesso Negado</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            A sua função de operador não possui permissões necessárias para provisionar novos ambientes no Control Plane. Por favor contacte um Administrador de Sistemas.
          </p>
          <Button className="mt-4" size="sm" onClick={() => navigate(PATHS.tenants.list)}>
            Voltar aos Clientes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Provisionar Novo Ambiente"
        description="Wizard administrativo guiado para criação de bases de dados físicas e emissão de credenciais AGT de forma idempotente."
        breadcrumbs={[{ label: 'Clientes', href: PATHS.tenants.list }, { label: 'Novo Ambiente' }]}
        backHref={PATHS.tenants.list}
      />

      {/* STEP INDICATORS */}
      <div className="flex items-center justify-between text-[11px] font-mono select-none px-1">
        <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-indigo-400 font-bold' : step > 1 ? 'text-slate-400' : 'text-slate-600'}`}>
          <span>1. Produto</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
        <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-indigo-400 font-bold' : step > 2 ? 'text-slate-400' : 'text-slate-600'}`}>
          <span>2. Instituição</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
        <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-indigo-400 font-bold' : step > 3 ? 'text-slate-400' : 'text-slate-600'}`}>
          <span>3. Administrador</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
        <div className={`flex items-center gap-1.5 ${step === 4 ? 'text-indigo-400 font-bold' : step > 4 ? 'text-slate-400' : 'text-slate-600'}`}>
          <span>4. Revisão</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
        <div className={`flex items-center ${step === 5 ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
          <span>5. Concluído</span>
        </div>
      </div>

      {/* Progress line */}
      <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${step === 5 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      {/* STEP 1: CHOICE OF PRODUCT AND PLAN */}
      {step === 1 && (
        <Card variant="default" padding="lg" className="space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
            <GraduationCap className="w-5 h-5 text-indigo-400 shrink-0" />
            <h3 className="text-sm font-semibold text-white">Escolha de Produto & Plano de Licença</h3>
          </div>

          {/* Product Select cards */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-semibold">Selecione o Produto Data Plane</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {products.map((p) => (
                <div
                  key={p.slug}
                  onClick={() => handleProductChange(p.slug)}
                  className={`p-4 rounded-xl border cursor-pointer select-none transition-colors relative ${
                    productSlug === p.slug
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : 'border-slate-850 bg-slate-900 hover:bg-slate-900/60'
                  }`}
                >
                  <strong className="text-xs font-bold text-white block">{p.name}</strong>
                  <span className="text-[10px] text-slate-500 mt-1 block leading-normal line-clamp-2">
                    {p.description || ''}
                  </span>
                  {p.status !== 'active' && (
                    <span className="absolute top-2 right-2 text-[8px] font-bold bg-indigo-600/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wide">
                      {p.status.toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Plan selectors */}
          <div className="space-y-2.5">
            <label className="text-xs text-slate-500 font-semibold">Selecione o Plano Tarifário Associado</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availablePlans.map((p) => (
                <label
                  key={p.codigo}
                  className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer select-none transition-colors ${
                    planId === p.id
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : 'border-slate-850 bg-slate-900/40 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="plan"
                      value={p.id}
                      checked={planId === p.id}
                      onChange={() => setPlanId(p.id)}
                      className="text-indigo-500 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">{p.nome}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        {formatAOA(p.priceAoa)}
                      </div>
                    </div>
                  </div>
                  <strong className="text-slate-300 font-mono text-[11px] shrink-0 ml-3">{formatAOA(p.priceAoa)}</strong>
                </label>
              ))}
            </div>
          </div>

          {/* Trial / Commercial mode toggle */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs text-slate-500 font-semibold block">Modo de Implementação</label>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-900 text-xs max-w-xs">
              <button
                type="button"
                onClick={() => setStatus('trial')}
                className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all ${
                  status === 'trial'
                    ? 'bg-indigo-600/15 border border-indigo-500/25 text-indigo-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Trial Experimental (14d)
              </button>
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all ${
                  status === 'active'
                    ? 'bg-indigo-600/15 border border-indigo-500/25 text-indigo-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Ativação Produtiva
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-900">
            <Button variant="primary" size="md" onClick={handleNextStep}>
              Continuar <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: INSTITUTION DADOS */}
      {step === 2 && (
        <Card variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
            <Building className="w-5 h-5 text-indigo-400 shrink-0" />
            <h3 className="text-sm font-semibold text-white">Identificação da Instituição Cliente</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-500 font-semibold">Nome Oficial do Estabelecimento *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ex: Complexo Escolar Girassol"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">NIF Contribuinte (10 dígitos) *</label>
              <input
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value.replace(/\D/g, '').substring(0, 10))}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                placeholder="Ex: 5402910492"
                maxLength={10}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">Província *</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {PROVINCES_ANGOLA.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">Município / Cidade *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ex: Sumbe"
                required
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-900 mt-2">
            <Button variant="secondary" size="md" icon={ChevronLeft} onClick={handlePrevStep}>
              Voltar
            </Button>
            <Button variant="primary" size="md" onClick={handleNextStep}>
              Continuar <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: ADMINISTRADOR / SYSTEM MANAGER CONTACT */}
      {step === 3 && (
        <Card variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
            <User className="w-5 h-5 text-indigo-400 shrink-0" />
            <h3 className="text-sm font-semibold text-white">Administrador Principal do Sistema</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-500 font-semibold">Nome do Administrador de Sistema *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ex: Prof. António Morais"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">Endereço de Email Administrador *</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                placeholder="Ex: admin@escola.ao"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold">Telefone de Contacto (+244) *</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                placeholder="Ex: +244 923 456 789"
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-500 font-semibold">Notas e Observações Operacionais</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                placeholder="Ex: Cliente de alta prioridade na província. Contactar preferencialmente à tarde."
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-900 mt-2">
            <Button variant="secondary" size="md" icon={ChevronLeft} onClick={handlePrevStep}>
              Voltar
            </Button>
            <Button variant="primary" size="md" onClick={handleNextStep}>
              Rever Contrato <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: REVISAO GERAL DO CONTRATO */}
      {step === 4 && (
        <Card variant="default" padding="lg" className="space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
            <FileCheck className="w-5 h-5 text-indigo-400 shrink-0" />
            <h3 className="text-sm font-semibold text-white">Revisão Geral e Orquestração do Provisionamento</h3>
          </div>

          <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <span className="text-slate-500 block mb-1">Produto Associado</span>
              <strong className="text-white font-medium">{selectedProduct?.name} ({selectedProduct?.slug.toUpperCase()})</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Plano & Taxa Comercial</span>
              <strong className="text-white font-mono font-black">{selectedPlan?.nome} · {formatAOA(selectedPlan?.priceAoa || 0)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Modo do Serviço</span>
              <strong className="text-indigo-400 font-medium uppercase font-mono">{status === 'trial' ? 'Experimental (14 dias)' : 'Subscrição Produtiva'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Instituição Contribuinte</span>
              <strong className="text-white font-medium">{name} (NIF: {nif})</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Sede Regional</span>
              <strong className="text-white font-medium">{city}, {province} (Angola)</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Administrador Geral</span>
              <strong className="text-white font-medium">{contactName} ({contactEmail} · {contactPhone})</strong>
            </div>
          </div>

          <Card variant="muted" padding="md">
            <div className="flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed font-sans">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-semibold text-slate-300">Conformidade e Idempotência Garantida</p>
                <p className="mt-1">
                  Ao clicar em "Provisionar Data Plane", o sistema criará a escola na base de dados do {selectedProduct?.name} de forma isolada, gerará as chaves encriptadas de primeiro acesso e inicializará o ficheiro XML legal da AGT para esta instância.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-4 border-t border-slate-900 mt-2">
            <Button variant="secondary" size="md" icon={ChevronLeft} onClick={handlePrevStep} disabled={loading}>
              Voltar
            </Button>
            <Button variant="primary" size="md" onClick={handleProvision} loading={loading}>
              {loading ? 'Provisionando Data Plane...' : 'Confirmar e Provisionar'}
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 5: PROVISIONING IN PROGRESS / SUCCESS */}
      {step === 5 && (
        <Card variant="default" padding="lg" className="space-y-5 text-center font-sans">
          <div className="py-6">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-bounce-slow" />
            <h2 className="text-xl sm:text-2xl font-black text-white mt-4 tracking-tight">Provisionado com Sucesso!</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              O ambiente para a instituição <strong>{name}</strong> foi isolado fisicamente e está pronto no Data Plane.
            </p>
          </div>

          <div className="max-w-md mx-auto bg-slate-950 border border-slate-900 rounded-xl p-4 text-xs font-mono text-left space-y-3.5">
            <div className="border-b border-slate-900 pb-2 flex justify-between">
              <span className="text-slate-500">Estado da BD:</span>
              <span className="text-emerald-400 font-bold uppercase">Online e Isolada</span>
            </div>
            <div className="border-b border-slate-900 pb-2 flex justify-between">
              <span className="text-slate-500">Módulo Provisionado:</span>
              <span className="text-indigo-300 uppercase">{selectedProduct?.name} ({status})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ficheiro SAF-T Inicial:</span>
              <span className="text-slate-400 font-semibold">Ativado</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 justify-center pt-4 border-t border-slate-900">
            <Button size="sm" variant="secondary" onClick={() => navigate(PATHS.tenants.list)}>
              Voltar para Lista
            </Button>
            <Button size="sm" variant="primary" icon={Eye} onClick={() => navigate(`/tenants/${createdId}`)}>
              Ir para o Gestor de Cliente
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
export default CreateTenantPage;
