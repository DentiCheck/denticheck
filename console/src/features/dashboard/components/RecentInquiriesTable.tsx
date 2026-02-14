import { cn } from '@/shared/lib/utils'

interface RecentInquiriesTableProps {
    data?: {
        id: string;
        userName: string;
        title: string;
        date: string;
        status: string;
    }[];
}

export function RecentInquiriesTable({ data }: RecentInquiriesTableProps) {
    const inquiries = data || [];

    return (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold">최근 문의 현황</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                        <tr>
                            <th className="px-6 py-3 font-medium">ID</th>
                            <th className="px-6 py-3 font-medium">사용자</th>
                            <th className="px-6 py-3 font-medium">제목</th>
                            <th className="px-6 py-3 font-medium">날짜</th>
                            <th className="px-6 py-3 font-medium">상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inquiries.length > 0 ? (
                            inquiries.map((inquiry) => (
                                <tr key={inquiry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{inquiry.id}</td>
                                    <td className="px-6 py-4 text-slate-600">{inquiry.userName}</td>
                                    <td className="px-6 py-4 text-slate-600">{inquiry.title}</td>
                                    <td className="px-6 py-4 text-slate-500">{inquiry.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                            inquiry.status === 'PENDING' && "bg-yellow-50 text-yellow-600 border-yellow-200",
                                            inquiry.status === 'OPEN' && "bg-yellow-50 text-yellow-600 border-yellow-200",
                                            inquiry.status === 'ANSWERED' && "bg-green-50 text-green-600 border-green-200",
                                            inquiry.status === '완료' && "bg-green-50 text-green-600 border-green-200"
                                        )}>
                                            {inquiry.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">최근 문의 내역이 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
