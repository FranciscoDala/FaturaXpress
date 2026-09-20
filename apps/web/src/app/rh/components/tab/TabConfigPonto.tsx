import { useEffect, useState } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

export default function TabConfigPonto(){
    const [cfg,setCfg] = useState<any>({hora_entrada:"08:00", tolerancia_min:15, regra_atraso_ativa:false, qtd_atrasos_para_falta:3, periodo_regra:"semana"})
    const [saving,setSaving] = useState(false)

    useEffect(()=>{ api.get('/api/rh/ponto/config').then(r=>setCfg(r.data)) },[])

    const save = async () => {
        setSaving(true)
        try{
            await api.put('/api/rh/ponto/config', cfg)
            toast.success('Configuração salva')
        }catch{ toast.error('Erro ao salvar') }
        finally{ setSaving(false) }
    }

    return (
        <div className="bg-white rounded-[16px] border p-5 space-y-4">
            <h3 className="font-bold">Configurações de Ponto</h3>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[11px]">Hora Entrada</label><input value={cfg.hora_entrada} onChange={e=>setCfg({...cfg, hora_entrada:e.target.value})} className="w-full border rounded p-2 text-sm" type="time"/></div>
                <div><label className="text-[11px]">Tolerância (min)</label><input value={cfg.tolerancia_min} onChange={e=>setCfg({...cfg, tolerancia_min:parseInt(e.target.value)||0})} className="w-full border rounded p-2 text-sm" type="number"/></div>
            </div>
            <hr/>
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-semibold text-[13px]">Regra: X atrasos = 1 falta</p>
                    <p className="text-[11px] text-gray-500">Ative para que o sistema gere falta automaticamente</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={cfg.regra_atraso_ativa} onChange={e=>setCfg({...cfg, regra_atraso_ativa:e.target.checked})} className="sr-only peer"/>
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
            </div>
            {cfg.regra_atraso_ativa && (
                <div className="grid grid-cols-2 gap-4 bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <div><label className="text-[11px]">Qtd atrasos para virar falta</label><input min={2} max={10} value={cfg.qtd_atrasos_para_falta} onChange={e=>setCfg({...cfg, qtd_atrasos_para_falta:parseInt(e.target.value)||3})} className="w-full border rounded p-2 text-sm" type="number"/></div>
                    <div><label className="text-[11px]">Período</label><select value={cfg.periodo_regra} onChange={e=>setCfg({...cfg, periodo_regra:e.target.value})} className="w-full border rounded p-2 text-sm"><option value="semana">Semana</option><option value="mes">Mês</option></select></div>
                </div>
            )}
            <button disabled={saving} onClick={save} className="px-5 py-2 bg-black text-white rounded-full text-sm disabled:opacity-50">{saving?'Salvando...':'Salvar Config'}</button>
        </div>
    )
}
