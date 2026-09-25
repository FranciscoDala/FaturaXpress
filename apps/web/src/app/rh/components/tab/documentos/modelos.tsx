// rh/tab/documentos/modelos.tsx
'use client'

import { useEffect, useState } from 'react'
import { api } from '../../../../../lib/api'
import { toast } from 'sonner'
import { Plus, Trash2, Save, FileText } from 'lucide-react'

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
        // NOVO BACKEND: get-or-create, sempre retorna um modelo da empresa
        const r = await api.get(`/api/documentos/modelos/by-tipo/${tipoSelecionado}`)
        const m = r.data as any

        // Como o response_model filtrava conteudo_json, buscamos o detalhe completo se precisar
        let modeloCompleto = m
        if (!m.conteudo_json) {
          try {
            const r2 = await api.get(`/api/documentos/modelos/${m.id}`)
            modeloCompleto = {...m,...(r2.data as any) }
          } catch {
            // se ainda não tiver, usa o m mesmo
          }
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
      // Backend novo espera só conteudo_json com clausulas
      const novoJson = {...(modelo?.conteudo_json || {}), clausulas }
      await api.put(`/api/documentos/modelos/${modelo.id}`, {
        conteudo_json: novoJson
      })
      toast.success(`${TIPOS_DOCUMENTO.find(t=>t.tipo===tipoSelecionado)?.nome} salvo!`)

      // recarrega versão
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
    <div className="space-y-5">
      <div className="bg-white border rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wide">Documentos</h2>
            <p className="text-[11px] text-gray-500">{modelo? `${modelo.codigo} • v${modelo.versao} ${modelo.is_padrao? '• Padrão' : ''}` : 'Carregando...'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={tipoSelecionado}
            onChange={e => setTipoSelecionado(e.target.value)}
            className="h-10 min-w-[280px] rounded-full border border-gray-200 bg-gray-50 px-4 text-[13px] font-medium outline-none focus:border-black"
          >
            {TIPOS_DOCUMENTO.map(t => (
              <option key={t.tipo} value={t.tipo}>{t.nome}</option>
            ))}
          </select>

          <button
            onClick={salvar}
            disabled={saving || loading ||!modelo}
            className="h-10 px-6 bg-[#0095ff] text-white rounded-full text-[13px] font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="bg-[#F0F7FF] border rounded-[12px] p-3 text-[11px] text-gray-700">
        <b>Variáveis:</b> {'{{nome_funcionario}}, {{bi}}, {{cargo}}, {{data_admissao}}, {{salario_base_formatado}}, {{local_trabalho}}, {{nome_empresa}}, {{nif_empresa}}, {{data_hoje}}, {{cidade_emissao}}'}
      </div>

      {loading? (
        <div className="p-6 text-[13px] text-center">Carregando {TIPOS_DOCUMENTO.find(t=>t.tipo===tipoSelecionado)?.nome}...</div>
      ) : (
        <>
          <div className="space-y-3">
            {clausulas.map((c, idx) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-[12px] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-black text-white px-2 py-1 rounded-full">{idx + 1}</span>
                    <input
                      value={c.titulo}
                      onChange={e => update(c.id, 'titulo', e.target.value)}
                      className="text-[13px] font-bold border-b border-gray-200 focus:border-black outline-none bg-transparent w-[300px]"
                    />
                  </div>
                  <button onClick={() => remove(c.id)} className="w-8 h-8 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={c.texto}
                  onChange={e => update(c.id, 'texto', e.target.value)}
                  rows={3}
                  className="w-full text-[13px] border border-gray-200 rounded-[8px] p-3 outline-none focus:border-black resize-none"
                />
              </div>
            ))}
          </div>

          <button
            onClick={addClausula}
            className="w-full h-12 border-2 border-dashed border-gray-300 rounded-[12px] text-[13px] font-bold text-gray-600 hover:border-black hover:text-black flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar Cláusula
          </button>
        </>
      )}
    </div>
  )
}
