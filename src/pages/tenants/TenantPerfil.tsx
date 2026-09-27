import { useState } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useBackoffice } from '../../context/BackofficeContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDateTime, PROVINCES_ANGOLA } from '../../utils/formatters';
import { Building, User, FileText, Mail, Phone, Calendar, Globe, MapPin, Edit, X } from 'lucide-react';

export function TenantPerfil() {
  const tenant = useTenant();
  const { updateTenant, theme } = useBackoffice();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nif: '',
    province: '',
    city: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
  });

  if (!tenant) return null;

  const handleOpenEdit = () => {
    setFormData({
      name: tenant.name,
      nif: tenant.nif,
      province: tenant.province || 'Luanda',
      city: tenant.city || '',
      contactName: tenant.contactName || '',
      contactEmail: tenant.contactEmail || '',
      contactPhone: tenant.contactPhone || '',
      notes: tenant.notes || '',
    });
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenant(tenant.id, formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={Edit} onClick={handleOpenEdit}>
          Editar Perfil
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna 1: Dados Institucionais */}
        <div className="space-y-4">
          <Card variant="default" padding="lg">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-4">
              <Building className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-white">Dados da Instituição</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5 border-b border-slate-900/40 pb-2">
                <span className="text-slate-500">Nome Oficial:</span>
                <strong className="text-slate-200 dark:text-slate-900 font-medium text-right lg:text-left">{tenant.name}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2.5 border-b border-slate-900/40 pb-2">
                <span className="text-slate-500">NIF Contribuinte:</span>
                <strong className="text-slate-200 dark:text-slate-900 font-mono tracking-wide text-right lg:text-left">{tenant.nif}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2.5 border-b border-slate-900/40 pb-2">
                <span className="text-slate-500">Localização Física:</span>
                <span className="text-slate-200 dark:text-slate-800 text-right lg:text-left">
                  {tenant.city ? `${tenant.city}, ` : ''}{tenant.province}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 border-b border-slate-900/40 pb-2">
                <span className="text-slate-500">Data de Registo:</span>
                <strong className="text-slate-300 dark:text-slate-700 font-mono text-right lg:text-left">
                  {formatDateTime(tenant.registrationDate)}
                </strong>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <span className="text-slate-500">Identificador Interno:</span>
                <strong className="text-amber-500 font-mono text-right lg:text-left select-all">
                  {tenant.id.toUpperCase()}
                </strong>
              </div>
            </div>
          </Card>

          {/* Informações fiscais extras do domínio angolano */}
          <Card variant="muted" padding="md">
            <div className="flex items-start gap-2.5 text-xs">
              <Globe className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300 dark:text-slate-800">Regulamentação Fiscal AGT</p>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  Esta subscrição está integrada no regime geral de faturação angolano. Todas as guias e faturas emitidas por este tenant comunicam eletronicamente com o Control Plane via arquivos SAF-T mensais automáticos.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna 2: Dados do Administrador e Notas */}
        <div className="space-y-4">
          <Card variant="default" padding="lg">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-4">
              <User className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-white">Administrador Principal</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5 border-b border-slate-900/40 pb-2">
                <span className="text-slate-500">Nome do Gestor:</span>
                <strong className="text-slate-200 dark:text-slate-900 font-medium text-right lg:text-left">{tenant.contactName}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2.5 border-b border-slate-900/40 pb-2">
                <span className="text-slate-500">Endereço de Email:</span>
                <a
                  href={`mailto:${tenant.contactEmail}`}
                  className="text-amber-500 hover:underline text-right lg:text-left truncate font-mono"
                >
                  {tenant.contactEmail}
                </a>
              </div>
              <div className="grid grid-cols-2 gap-2.5 border-b border-slate-900/40 pb-2">
                <span className="text-slate-500">Telefone de Contacto:</span>
                <a
                  href={`tel:${tenant.contactPhone}`}
                  className="text-amber-500 hover:underline font-mono text-right lg:text-left"
                >
                  {tenant.contactPhone}
                </a>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <span className="text-slate-500">Código de Credencial:</span>
                <strong className="text-slate-400 dark:text-slate-700 font-mono text-right lg:text-left select-all bg-slate-950 dark:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-900 dark:border-slate-300">
                  {tenant.adminCode || 'Ainda não gerado'}
                </strong>
              </div>
            </div>
          </Card>

          {/* Notas de Operação */}
          <Card variant="default" padding="lg" className="flex flex-col h-full min-h-[160px]">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-3">
              <FileText className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-white">Observações de Operação</h3>
            </div>

            <div className="text-xs text-slate-400 flex-1 leading-relaxed whitespace-pre-wrap">
              {tenant.notes ? (
                tenant.notes
              ) : (
                <span className="text-slate-600 font-normal italic">
                  Nenhuma anotação administrativa registada para este cliente. Pode registar notas adicionando observações no processo de alteração de planos.
                </span>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-lg p-6 rounded-2xl shadow-xl border overflow-y-auto max-h-[90vh] ${
            theme === 'dark' ? 'bg-[#1E2329] border-[#2B3139] text-[#EAECEF]' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 dark:border-slate-100">
              <h2 className="text-base font-bold text-white dark:text-slate-900">Editar Cliente (Tenant)</h2>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Nome Oficial da Instituição</label>
                <input
                  type="text"
                  required
                  placeholder="Complexo Escolar..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">NIF Contribuinte</label>
                  <input
                    type="text"
                    required
                    placeholder="5412..."
                    value={formData.nif}
                    onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Cidade / Município</label>
                  <input
                    type="text"
                    required
                    placeholder="Sumbe"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Província de Angola</label>
                <select
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  {PROVINCES_ANGOLA.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3 dark:border-slate-200 dark:bg-slate-50">
                <span className="font-bold text-amber-500 uppercase tracking-wider text-[10px] block">Contacto do Administrador Principal</span>
                
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 mb-0.5 text-[10px] font-mono">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 mb-0.5 text-[10px] font-mono">E-mail</label>
                    <input
                      type="email"
                      required
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 dark:text-slate-500 mb-0.5 text-[10px] font-mono">Telefone</label>
                    <input
                      type="text"
                      required
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider text-[10px]">Observações / Notas Adicionais</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 dark:bg-slate-100 border border-slate-800 dark:border-slate-300 rounded-lg p-2 text-white dark:text-slate-900 focus:outline-none focus:border-amber-500 h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 dark:border-slate-100">
                <Button variant="ghost" onClick={() => setIsEditing(false)} type="button">
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  Guardar Alterações
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default TenantPerfil;
