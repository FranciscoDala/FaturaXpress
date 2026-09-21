import { FileText, Pencil, Trash2, Lock } from 'lucide-react'
import { useMemo } from 'react'
import { TabelaClientesSkeleton } from '../../../../components/CardsSkeleton'

interface Cliente {
    id: string
    nome: string
    nif: string
    email: string | null
    telefone: string | null
    endereco: string | null
    cidade: string | null
    provincia: string | null
}

interface Props {
    clientes: Cliente[]
    loading: boolean
    search: string
    setSearch: (v: string) => void
    page: number
    setPage: (v: number) => void
    total: number
    limit: number
    onEdit: (cliente: Cliente) => void
    onDelete: (id: string) => void
    onEmitirFatura: (cliente: Cliente) => void
    clientesComFatura?: Set<string>
}

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["ver_clientes", "editar_clientes", "emitir_ft", "emitir_pp", "ver_faturas"],
    recepcao: ["ver_clientes", "emitir_ft", "emitir_pp", "ver_faturas"],
    rh: ["ver_funcionarios"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

export default function TabelaClientes({ clientes, loading, onEdit, onDelete, onEmitirFatura, clientesComFatura }: Props) {
    const funcionarioLogado = useMemo(() => {
        try {
            const raw = localStorage.getItem("funcionario")
            if (!raw) return null
            return JSON.parse(raw)
        } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeVer = funcionarioLogado? temPermissao(cargoAtual, 'ver_clientes') || cargoAtual === 'admin' : true
    const podeEditar = funcionarioLogado? temPermissao(cargoAtual, 'editar_clientes') || cargoAtual === 'admin' : true
    const podeEmitir = funcionarioLogado? temPermissao(cargoAtual, 'emitir_ft') || cargoAtual === 'admin' : true
    const podeApagar = funcionarioLogado? cargoAtual === 'admin' : true

    if (loading) {
        return <TabelaClientesSkeleton />
    }

    if (!podeVer) {
        return (
            <div className="text-center py-16 bg-white rounded-[20px] border">
                <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                <p className="text-black/60 text-[13px]">Seu cargo <b>{cargoAtual}</b> não pode ver clientes</p>
            </div>
        )
    }

    if (clientes.length === 0) {
        return <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhum cliente cadastrado!</p>
    }

    return (
        <div className="w-full">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {clientes.map((cli) => (
                    <ClientCard
                        key={cli.id}
                        cliente={cli}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onEmitirFatura={onEmitirFatura}
                        bloqueado={clientesComFatura?.has(cli.id) || false}
                        podeEditar={podeEditar}
                        podeApagar={podeApagar}
                        podeEmitir={podeEmitir}
                        cargoAtual={cargoAtual}
                    />
                ))}
            </div>
        </div>
    )
}

function ClientCard({
    cliente,
    onEdit,
    onDelete,
    onEmitirFatura,
    bloqueado,
    podeEditar,
    podeApagar,
    podeEmitir,
    cargoAtual
}: {
    cliente: Cliente
    onEdit: Props['onEdit']
    onDelete: Props['onDelete']
    onEmitirFatura: Props['onEmitirFatura']
    bloqueado?: boolean
    podeEditar: boolean
    podeApagar: boolean
    podeEmitir: boolean
    cargoAtual: string
}) {
    const initials = cliente.nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    return (
        <div className="min-w-full md:min-w-[320px] md:max-w-[320px] max-w-[320px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
            <div className="relative h-[90px] bg-[#E6F0FF] shrink-0">
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[12px] font-medium shadow-sm border max-w-[55%] truncate ${bloqueado? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-700'}`}>
                    {bloqueado? 'TEM FT/Emitidas • SAFT' : 'Ativo'}
                </div>
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white shrink-0">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700 overflow-hidden">
                        {initials}
                    </div>
                </div>
                {!podeEditar && (
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-[9px] font-bold">{cargoAtual?.toUpperCase()} - SOMENTE LEITURA</div>
                )}
            </div>

            <div className="pt-14 px-5 pb-4 min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] text-gray-400">exp.</span>
                    <div className="flex gap-[2px]">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 5? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>

                <h3 className="font-bold text-[16px] text-gray-900 leading-tight truncate block w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={cliente.nome}>
                    {cliente.nome}
                </h3>

                <div className="mt-2 flex flex-col gap-0.5 min-w-0">
                    <p className="text-[12.5px] text-gray-500 truncate">NIF: {cliente.nif}</p>
                    <p className="text-[12.5px] text-gray-500 truncate" title={`${cliente.cidade} · ${cliente.provincia}`}>Endereço: {cliente.cidade || 'Saurimo'} · {cliente.provincia || 'Luanda'}</p>
                    <p className="text-[12.5px] text-gray-500 truncate" title={cliente.email || ''}>E-mail: {cliente.email || 'killerbless12@gmail.com'}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">Tel: {cliente.telefone || '---'}</p>
                </div>
                {bloqueado && (
                    <div className="mt-3 min-w-0">
                        <span className="inline-flex items-center max-w-full truncate px-2.5 py-[3px] rounded-full border border-[#F2C9B8] bg-[#FFF6F1] text-[10px] font-medium text-[#B85A3A] leading-tight">
                            Cliente com SAFT, não pode ser apagado!
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto shrink-0">
                {/* EMITIR - financeira, recepcao, admin */}
                <button
                    onClick={() => podeEmitir && onEmitirFatura(cliente)}
                    disabled={!podeEmitir}
                    className={`py-3.5 flex justify-center transition group ${podeEmitir? 'hover:bg-gray-50' : 'bg-gray-50 opacity-40 cursor-not-allowed'}`}
                    title={podeEmitir? "Emitir Fatura" : "Sem permissão"}>
                    <FileText className={`w-4 h-4 ${podeEmitir? 'text-gray-600 group-hover:text-green-600' : 'text-gray-400'}`} />
                </button>

                {/* EDITAR - financeira e admin */}
                <button
                    onClick={() => podeEditar && onEdit(cliente)}
                    disabled={!podeEditar}
                    className={`py-3.5 flex justify-center border-x border-gray-100 transition group ${podeEditar? 'hover:bg-gray-50' : 'bg-gray-50 opacity-40 cursor-not-allowed'}`}
                    title={podeEditar? "Editar" : "Só admin/financeira"}>
                    <Pencil className={`w-4 h-4 ${podeEditar? 'text-gray-600 group-hover:text-blue-600' : 'text-gray-400'}`} />
                </button>

                {/* APAGAR - só admin e sem SAFT */}
                {bloqueado? (
                    <div className="py-3.5 flex justify-center bg-gray-50 opacity-40 cursor-not-allowed" title="Não pode apagar - tem faturas">
                        <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                ) : (
                    <button
                        onClick={() => podeApagar && onDelete(cliente.id)}
                        disabled={!podeApagar}
                        className={`py-3.5 flex justify-center transition group ${podeApagar? 'hover:bg-gray-50' : 'bg-gray-50 opacity-40 cursor-not-allowed'}`}
                        title={podeApagar? "Apagar" : "Só admin apaga"}>
                        <Trash2 className={`w-4 h-4 ${podeApagar? 'text-gray-600 group-hover:text-red-600' : 'text-gray-400'}`} />
                    </button>
                )}
            </div>
        </div>
    )
}
