export const formatarTexto = (t: string) => {
    if (!t) return ''
    const mapa: any = { 'NAO_APARECEU': 'Não apareceu', 'DOENTE': 'Doente', 'ATESTADO': 'Atestado', 'DECLARACAO': 'Declaração' }
    const u = t.toUpperCase().trim()
    if (mapa[u]) return mapa[u]
    return t.replace(/_/g, ' ').toLowerCase().replace(/(^\w|\s\w)/g, s => s.toUpperCase())
}
export const getMotivo = (n: any) => {
    const raw = (n.falta?.motivo || '').split('|')[0].trim()
    return formatarTexto(raw.replace(/^(FALTA|OUTROS)\s*/i, '').trim() || raw) || 'Não informado'
}
export const formatarTempo = (iso: string) => {
    if (!iso) return 'agora'
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (min < 1) return 'agora'
    if (min < 60) return `há ${min}min`
    const h = Math.floor(min / 60)
    if (h < 24) return `há ${h}h`
    const d = Math.floor(h / 24)
    if (d === 1) return 'há 1d'
    if (d < 7) return `há ${d}d`
    return `há ${Math.floor(d / 7)} sem`
}
export const formatarDataCurta = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`
}
export const getDataChave = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
