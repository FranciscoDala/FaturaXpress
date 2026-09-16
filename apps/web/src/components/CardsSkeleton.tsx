import { Shimmer } from "./ui/skeleton"

const CardShell = () => (
    <div className="min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
        <div className="relative h-[90px] bg-gray-100">
            <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white border-[4px] border-white shadow-md">
                <Shimmer className="w-full h-full rounded-full" />
            </div>
            <Shimmer className="absolute top-3 right-3 h-6 w-28 rounded-full" />
        </div>
        <div className="pt-14 px-5 pb-4 space-y-2">
            <Shimmer className="h-4 w-2/3 rounded" />
            <Shimmer className="h-3 w-1/2 rounded" />
            <Shimmer className="h-3 w-3/4 rounded" />
            <Shimmer className="h-3 w-2/3 rounded" />
            <Shimmer className="h-9 w-full rounded-full mt-3" />
        </div>
        <div className="grid grid-cols-3 border-t border-gray-100 mt-auto">
            <Shimmer className="h-[46px] rounded-none" />
            <Shimmer className="h-[46px] rounded-none" />
            <Shimmer className="h-[46px] rounded-none" />
        </div>
    </div>
)

export const TabCursoSkeleton = () => (
    <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {Array.from({ length: 3 }).map((_, i) => <CardShell key={i} />)}
    </div>
)

export const TabEmitidasSkeleton = TabCursoSkeleton

export const CardsProdutosSkeleton = TabCursoSkeleton

export const TabelaClientesSkeleton = TabCursoSkeleton

export const TabEmitirProdutosSkeleton = () => (
    <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-3.5 px-4 bg-white border border-gray-200 rounded-full">
                <div className="space-y-2 flex-1">
                    <Shimmer className="h-4 w-1/2 rounded" />
                    <Shimmer className="h-3 w-1/3 rounded" />
                </div>
                <Shimmer className="h-8 w-8 rounded-full" />
            </div>
        ))}
    </div>
)
