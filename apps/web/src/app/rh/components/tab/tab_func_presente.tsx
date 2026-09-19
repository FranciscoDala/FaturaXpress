interface Funcionario {
  id: string
  nome: string
  cargo: string
  area: string
  status: 'ativo' | 'ferias'
  email?: string
  telefone?: string
}

interface Props {
  funcionarios: Funcionario[]
  search: string
}

export default function TabPresente({ funcionarios, search }: Props) {
  if (funcionarios.length === 0) {
    return <p className="text-[13px] text-gray-500 text-center py-10">Nenhum funcionário presente {search? `para "${search}"` : ''}</p>
  }

  return (
    <div className="space-y-3">
      {funcionarios.map(f => (
        <div key={f.id} className="flex items-center gap-3 p-3 rounded-[16px] border border-gray-100 bg-white hover:shadow-[0_2px_12px_rgba(0,149,255,0.08)] transition">
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(f.nome)}&background=E8F2FF&color=0095ff`} className="w-11 h-11 rounded-full border-2 border-white shadow-sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold truncate">{f.nome}</p>
            <p className="text-[11px] text-gray-500 truncate">{f.cargo} • {f.area}</p>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full border font-medium bg-green-50 text-green-600 border-green-100">presente</span>
        </div>
      ))}
    </div>
  )
}
