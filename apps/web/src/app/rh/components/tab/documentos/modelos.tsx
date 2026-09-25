// rh/tab/documentos/modelos.tsx
'use client'

import { useEffect, useState } from 'react'
import { api } from '../../../../../lib/api'
import { toast } from 'sonner'
import { Plus, Trash2, Save, FileText } from 'lucide-react'

type Clausula = { id: string; titulo: string; texto: string }
type Modelo = {
  id: string
  codigo: string
  nome: string
  tipo: string
  categoria: string
  conteudo_json: any
}

export default function TabDocumentos() {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [modeloId, setModeloId] = useState<string>('')
  const [modelo, setModelo] = useState<Modelo | null>(null)
  const [clausulas, setClausulas] = useState<Clausula[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 1. lista todos os modelos da empresa (igual tu tens no select de funcionario)
  useEffect(() => {
    const fetchModelos = async () => {
      try {
        const r = await api.get('/api/documentos/modelos')
        setModelos(r.data)
        if (r.data.length > 0) {
          setModeloId(r.data[0].id)
        }
      } catch {
        toast.error('Erro ao listar modelos')
      } finally {
        setLoading(false)
      }
    }
    fetchModelos()
  }, [])

  // 2. quando troca select, carrega cláusulas desse modelo
  useEffect(() => {
    if (!modeloId) return
    const load = async () => {
      const r = await api.get(`/api/documentos/modelos/${modeloId}`)
      setModelo(r.data)
      const lista = r.data.conteudo_json?.clausulas || [
        { id: '1', titulo: 'Cláusula 1ª - Objecto', texto: 'O trabalhador é admitido para exercer as funções de {{cargo}} em {{local_trabalho}} com início em {{data_admissao}}.' },
      ]
      setClausulas(lista)
    }
    load()
  }, [modeloId])

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
    if (!modeloId) return
    setSaving(true)
    try {
      const novoJson = {...(modelo?.conteudo_json || {}), clausulas }
      await api.put(`/api/documentos/modelos/${modeloId}`, { conteudo_json: novoJson })
      toast.success('Cláusulas da empresa atualizadas!')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-[13px]">Carregando modelos...</div>

  return (
    <div className="space-y-5">
      {/* HEADER COM SELECT IGUAL DOS OUTROS TABS */}
      <div className="bg-white border rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wide">Documentos</h2>
            <p className="text-[11px] text-gray-500">Cada empresa edita as suas cláusulas</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={modeloId}
            onChange={e => setModeloId(e.target.value)}
            className="h-10 min-w-[260px] rounded-full border border-gray-200 bg-gray-50 px-4 text-[13px] font-medium outline-none focus:border-black"
          >
            {modelos.map(m => (
              <option key={m.id} value={m.id}>{m.nome} - {m.codigo}</option>
            ))}
          </select>

          <button
            onClick={salvar}
            disabled={saving}
            className="h-10 px-6 bg-[#0095ff] text-white rounded-full text-[13px] font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* DICA VARIAVEIS */}
      <div className="bg-[#F0F7FF] border rounded-[12px] p-3 text-[11px] text-gray-700">
        <b>Variáveis:</b> {'{{nome_funcionario}}, {{bi}}, {{cargo}}, {{data_admissao}}, {{salario_base_formatado}}, {{local_trabalho}}, {{nome_empresa}}, {{nif_empresa}}'}
      </div>

      {/* LISTA DE CLÁUSULAS */}
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
              placeholder="Texto da cláusula com {{variaveis}}"
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
    </div>
  )
}
