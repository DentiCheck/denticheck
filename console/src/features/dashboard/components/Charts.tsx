/**
 * Frontend Component: Dashboard Charts
 * Path: console/src/features/dashboard/components/Charts.tsx
 * Description: [관리자 기능] 대시보드 사용자/매출 추세 차트
 * - Recharts 라이브러리 사용, X축 날짜 포맷팅(CustomTick) 적용
 */
import { BarChart, Bar } from 'recharts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/features/dashboard/context/LanguageContext';

interface ChartProps {
    data?: { label: string; count: number }[];
}

const CustomTick = ({ x, y, payload }: any) => {
    const dateStr = payload.value;
    if (!dateStr || !dateStr.includes('-')) return <text x={x} y={y} dy={16}>{dateStr}</text>;

    // Assuming date format is YYYY-MM-DD
    const parts = dateStr.split('-');
    // Just show Day
    const day = parts[2];

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={15} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight="bold">
                {day}
            </text>
        </g>
    );
};

export function DailyUsersChart({ data }: ChartProps) {
    const chartData = data?.map(d => ({ name: d.label, users: d.count })) || [];
    const { t } = useLanguage();

    // Extract Year-Month from first data point if available
    const currentYearMonth = data && data.length > 0 ? data[0].label.substring(0, 7) : '';

    return (
        <div className="rounded-xl border bg-white shadow-sm p-6">
            <div className="flex justify-between items-end mb-4">
                <h3 className="text-lg font-bold">{t('daily_usage_title')}</h3>
                {currentYearMonth && <span className="text-sm text-slate-500 font-medium">{currentYearMonth}</span>}
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={<CustomTick />} tickLine={false} axisLine={false} interval={0} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function WeeklyUsersChart({ data }: ChartProps) {
    const chartData = data?.map(d => ({ name: d.label, users: d.count })) || [];
    const { t } = useLanguage();

    // Extract Year-Month
    const currentYearMonth = data && data.length > 0 ? data[0].label.substring(0, 7) : '';

    return (
        <div className="rounded-xl border bg-white shadow-sm p-6">
            <div className="flex justify-between items-end mb-4">
                <h3 className="text-lg font-bold">{t('weekly_usage_title')}</h3>
                {currentYearMonth && <span className="text-sm text-slate-500 font-medium">{currentYearMonth}</span>}
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={<CustomTick />} tickLine={false} axisLine={false} interval={0} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
