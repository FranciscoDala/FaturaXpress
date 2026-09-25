// rh/tab/documentos/modelos.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { api } from '../../../../../lib/api'
import { toast } from 'sonner'
import { Plus, Trash2, Save, FileText, Check, ChevronDown } from 'lucide-react'

type Clausula = { id: string; titulo: string; texto: string }

const TIPOS_DOCUMENTO = [
  { tipo: 'contrato_efetivo', nome: 'Contrato Efetivo', categoria: 'admissao' },
  { tipo: 'contrato_estagio', nome: 'Contrato Estágio', categoria: 'admissao' },
  { tipo: 'contrato_temporario', nome: 'Contrato Temporário', categoria: 'admissao' },
  { tipo: 'contrato_experiencia', nome: 'Contrato Experiência', categoria: 'admissao' },
  { tipo: 'contrato_confidencialidade', nome: 'Contrato Confidencialidade', categoria: 'admissao' },
  { tipo: 'aditivo_contratual', nome: 'Aditivo Contratual', categoria: 'gestao' },
  { tipo: 'declaracao_trabalho', nome: 'Declaração de Trabalho', categoria: 'gestao' },
  { tipo: 'declaracao_vencimento', nome: 'Declaração de Vencimento', categoria: 'gestao' },
  { tipo: 'carta_recomendacao', nome: 'Carta Recomendação', categoria: 'gestao' },
  { tipo: 'carta_apresentacao', nome: 'Carta Apresentação', categoria: 'gestao' },
  { tipo: 'aviso_ferias', nome: 'Aviso de Férias', categoria: 'ferias_ponto' },
  { tipo: 'comunicacao_ferias', nome: 'Comunicação de Férias', categoria: 'ferias_ponto' },
  { tipo: 'mapa_ferias', nome: 'Mapa de Férias', categoria: 'ferias_ponto' },
  { tipo: 'justificacao_falta', nome: 'Justificação de Falta', categoria: 'ferias_ponto' },
  { tipo: 'comunicacao_falta', nome: 'Comunicação de Falta', categoria: 'ferias_ponto' },
  { tipo: 'horario_trabalho', nome: 'Horário de Trabalho', categoria: 'ferias_ponto' },
  { tipo: 'advertencia_verbal', nome: 'Advertência Verbal', categoria: 'disciplinar' },
  { tipo: 'advertencia_escrita', nome: 'Advertência Escrita', categoria: 'disciplinar' },
  { tipo: 'processo_disciplinar', nome: 'Processo Disciplinar', categoria: 'disciplinar' },
  { tipo: 'suspensao', nome: 'Suspensão', categoria: 'disciplinar' },
  { tipo: 'aumento_salarial', nome: 'Aumento Salarial', categoria: 'financeiro_carreira' },
  { tipo: 'alteracao_cargo', nome: 'Alteração de Cargo', categoria: 'financeiro_carreira' },
  { tipo: 'alteracao_salario', nome: 'Alteração de Salário', categoria: 'financeiro_carreira' },
  { tipo: 'comunicacao_bonus', nome: 'Comunicação de Bónus', categoria: 'financeiro_carreira' },
  { tipo: 'carta_demissao_funcionario', nome: 'Carta Demissão Funcionário', categoria: 'saida' },
  { tipo: 'carta_demissao_empresa', nome: 'Carta Demissão Empresa', categoria: 'saida' },
  { tipo: 'declaracao_desvinculacao', nome: 'Declaração Desvinculação', categoria: 'saida' },
  { tipo: 'certificado_trabalho', nome: 'Certificado de Trabalho', categoria: 'saida' },
  { tipo: 'acordo_rescisao', nome: 'Acordo Rescisão', categoria: 'saida' },
  { tipo: 'outro', nome: 'Outro', categoria: 'outros' },
] as const

type Modelo = {
  id: string
  codigo: string
  nome: string
  tipo: string
  categoria: string
  conteudo_json: any
  conteudo_html: string
  versao: number
  is_padrao: boolean
}

function CustomSelect({ value, options, onChange, placeholder }: { value: string, options: { value: string, label: string }[], onChange: (v: string) => void, placeholder: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current &&!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = options.find(o => o.value === value)
  return (
    <div ref={ref} className="relative w-full sm:w-[300px]">
      <button type="button" onClick={() => setOpen(!open)} className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13px] text-black flex items-center justify-between focus:outline-none focus:border-black">
        <span className="truncate text-black font-medium">{selected? selected.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-black/60 transition-transform shrink-0 ml-2 ${open? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5 max-h-[280px] overflow-y-auto">
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[13px] flex items-center justify-between transition ${value === o.value? 'bg-[#E6F0FF] font-bold text-black' : 'hover:bg-gray-50 text-black'}`}>
              <span className="truncate pr-2">{o.label}</span>
              {value === o.value && <Check className="w-4 h-4 text-[#0095ff] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TabDocumentos() {
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('contrato_efetivo')
  const [modelo, setModelo] = useState<Modelo | null>(null)
  const [clausulas, setClausulas] = useState<Clausula[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!tipoSelecionado) return
    const load = async () => {
      setLoading(true)
      try {
        const r = await api.get(`/api/documentos/modelos/by-tipo/${tipoSelecionado}`)
        const m = r.data as any
        let modeloCompleto = m
        if (!m.conteudo_json) {
          try {
            const r2 = await api.get(`/api/documentos/modelos/${m.id}`)
            modeloCompleto = {...m,...(r2.data as any) }
          } catch {}
        }
        setModelo(modeloCompleto)
        const lista = modeloCompleto.conteudo_json?.clausulas || [
          { id: '1', titulo: `Cláusula 1ª - ${modeloCompleto.nome}`, texto: '' },
        ]
        setClausulas(lista)
      } catch (e: any) {
        toast.error(e.response?.data?.detail || 'Erro ao carregar modelo')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tipoSelecionado])

  const addClausula = () => {
    setClausulas(p => [...p, { id: Date.now().toString(), titulo: `Cláusula ${p.length + 1}ª`, texto: '' }])
  }
  const update = (id: string, field: 'titulo' | 'texto', v: string) => {
    setClausulas(p => p.map(c => c.id === id? {...c, [field]: v } : c))
  }
  const remove = (id: string) => {
    setClausulas(p => p.filter(c => c.id!== id))
  }

  const salvar = async () => {
    if (!modelo?.id) return
    setSaving(true)
    try {
      const novoJson = {...(modelo?.conteudo_json || {}), clausulas }
      await api.put(`/api/documentos/modelos/${modelo.id}`, { conteudo_json: novoJson })
      toast.success(`${TIPOS_DOCUMENTO.find(t => t.tipo === tipoSelecionado)?.nome} salvo!`)
      const r = await api.get(`/api/documentos/modelos/by-tipo/${tipoSelecionado}`)
      const m = r.data as any
      let modeloCompleto = m
      if (!m.conteudo_json) {
        const r2 = await api.get(`/api/documentos/modelos/${m.id}`)
        modeloCompleto = {...m,...(r2.data as any) }
      }
      setModelo(modeloCompleto)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
        <div className="bg-white rounded-[22px] border overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          {/* HEADER igual tab ponto */}
          <div className="p-3 border-b bg-gray-50 flex flex-col gap-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[14px] font-bold uppercase tracking-wide text-black">Documentos</h2>
                  <p className="text-[11px] text-black/60 truncate">{modelo? `${modelo.codigo} • v${modelo.versao} ${modelo.is_padrao? '• Padrão' : ''}` : 'Selecione o tipo'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <CustomSelect
                  value={tipoSelecionado}
                  onChange={setTipoSelecionado}
                  placeholder="Selecione o documento"
                  options={TIPOS_DOCUMENTO.map(t => ({ value: t.tipo, label: t.nome }))}
                />
                <button
                  onClick={salvar}
                  disabled={saving || loading ||!modelo}
                  className="h-[44px] sm:h-[36px] w-full sm:w-auto px-6 bg-[#0095ff] text-white rounded-full text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  <Save className="w-4 h-4" /> {saving? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-black/60">Cada empresa edita as suas cláusulas • {TIPOS_DOCUMENTO.find(t => t.tipo === tipoSelecionado)?.nome}</p>
          </div>

          {/* VARIAVEIS */}
          <div className="m-3 bg-[#F0F7FF] border rounded-[12px] p-3 text-[11px] text-black">
            <b className="text-black">Variáveis:</b> {'{{nome_funcionario}}, {{bi}}, {{cargo}}, {{data_admissao}}, {{salario_base_formatado}}, {{local_trabalho}}, {{nome_empresa}}, {{nif_empresa}}, {{data_hoje}}, {{cidade_emissao}}'}
          </div>

          {/* CONTEUDO */}
          <div className="p-3">
            {loading? (
              <div className="py-10 text-center text-[13px] text-black">Carregando {TIPOS_DOCUMENTO.find(t => t.tipo === tipoSelecionado)?.nome}...</div>
            ) : (
              <div className="space-y-3">
                <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto no-scrollbar overscroll-contain space-y-3 pr-1">
                  {clausulas.map((c, idx) => (
                    <div key={c.id} className="bg-white border border-gray-200 rounded-[12px] p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[11px] font-bold bg-black text-white px-2 py-1 rounded-full shrink-0">{idx + 1}</span>
                          <input
                            value={c.titulo}
                            onChange={e => update(c.id, 'titulo', e.target.value)}
                            className="text-[13px] font-bold border-b border-gray-200 focus:border-black outline-none bg-transparent w-full text-black placeholder:text-black/40"
                            placeholder="Título da cláusula"
                          />
                        </div>
                        <button onClick={() => remove(c.id)} className="w-8 h-8 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={c.texto}
                        onChange={e => update(c.id, 'texto', e.target.value)}
                        rows={3}
                        className="w-full text-[13px] text-black border border-gray-200 rounded-[10px] p-3 outline-none focus:border-black resize-none placeholder:text-black/40"
                        placeholder="Texto da cláusula com {{variaveis}}"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={addClausula}
                  className="w-full h-12 border-2 border-dashed border-gray-300 rounded-[12px] text-[13px] font-bold text-black hover:border-black hover:text-black flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Adicionar Cláusula
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
