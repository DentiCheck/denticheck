/**
 * Frontend Component: Recent Inquiries Table
 * Path: console/src/features/dashboard/components/RecentInquiriesTable.tsx
 * Description: [관리자 기능] 대시보드 최근 문의 내역 테이블
 * - 상태별 배지 색상 및 다국어 지원 텍스트 표시
 */
import { cn } from '@/shared/lib/utils'
import { useLanguage } from '@/features/dashboard/context/LanguageContext'

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
    const { t } = useLanguage();

    return (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold">{t('recent_inquiries_title')}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    {/* [관리자 기능] 테이블 헤더 스타일 통일 (bg-slate-50) */}
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                        <tr>
                            <th className="px-6 py-3 font-medium">{t('th_id')}</th>
                            <th className="px-6 py-3 font-medium">{t('th_user')}</th>
                            <th className="px-6 py-3 font-medium">{t('th_title')}</th>
                            <th className="px-6 py-3 font-medium">{t('th_date')}</th>
                            <th className="px-6 py-3 font-medium">{t('th_status')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {inquiries.length > 0 ? (
                            inquiries.map((inquiry) => (
                                <tr key={inquiry.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{inquiry.id}</td>
                                    <td className="px-6 py-4 text-slate-600">{inquiry.userName}</td>
                                    <td className="px-6 py-4 text-slate-600">{t(inquiry.title)}</td>
                                    <td className="px-6 py-4 text-slate-500">{inquiry.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                            inquiry.status === 'PENDING' && "bg-yellow-50 text-yellow-600 border-yellow-200",
                                            inquiry.status === 'OPEN' && "bg-blue-50 text-blue-600 border-blue-200",
                                            inquiry.status === 'ANSWERED' && "bg-green-50 text-green-600 border-green-200",
                                            inquiry.status === 'RESOLVED' && "bg-gray-100 text-gray-600 border-gray-200",
                                            inquiry.status === '완료' && "bg-green-50 text-green-600 border-green-200"
                                        )}>
                                            {t(inquiry.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">{t('no_inquiries')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
