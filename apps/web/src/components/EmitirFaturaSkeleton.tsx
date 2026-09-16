import { Shimmer } from "./ui/skeleton"

export function EmitirFaturaSkeleton() {
    return (
        <div className="max-w-[1100px] mx-auto">
            <div className="px-4 sm:px-8 lg:px-12 pt-8 pb-6 border-b bg-gradient-to-br from-[#E8F2FF] to-white">
                <div className="flex gap-5">
                    <Shimmer className="h-[96px] w-[96px] sm:h-[132px] sm:w-[132px] rounded-full" />
                    <div className="flex-1 space-y-3">
                        <Shimmer className="h-6 w-1/2 rounded" />
                        <Shimmer className="h-4 w-1/3 rounded" />
                        <Shimmer className="h-4 w-2/3 rounded" />
                        <div className="mt-6 flex gap-px border rounded overflow-hidden max-w-[520px]">
                            <Shimmer className="h-12 flex-1 rounded-none" />
                            <Shimmer className="h-12 flex-1 rounded-none" />
                            <Shimmer className="h-12 flex-[1.2] rounded-none" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-4 space-y-4">
                <Shimmer className="h-32 w-full rounded-xl" />
                <Shimmer className="h-64 w-full rounded-xl" />
            </div>
        </div>
    )
}
