import { useEffect, useState } from 'react'
import { Users, Building, MessageSquare, TrendingUp } from 'lucide-react'
import { StatsCard } from '@/features/dashboard/components/StatsCard'
import { DailyUsersChart, WeeklyUsersChart } from '@/features/dashboard/components/Charts'
import { RecentInquiriesTable } from '@/features/dashboard/components/RecentInquiriesTable'
import { graphqlRequest, ADMIN_DASHBOARD_QUERIES } from '@/shared/lib/api'
import { useLanguage } from '@/features/dashboard/context/LanguageContext'

export function DashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        graphqlRequest(ADMIN_DASHBOARD_QUERIES.GET_STATS)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

    const stats = [
        { title: t('stat_total_users'), value: data?.adminDashboardStats?.totalUsers.toLocaleString() || "0", icon: Users, trend: { value: `${data?.adminDashboardStats?.userTrend}%`, isPositive: data?.adminDashboardStats?.userTrend >= 0 }, className: "border-l-4 border-l-blue-500" },
        { title: t('stat_partner_dentists'), value: data?.adminDashboardStats?.totalDentists.toString() || "0", icon: Building, trend: { value: `${data?.adminDailyUsage?.length || 0}`, isPositive: true }, className: "border-l-4 border-l-green-500" },
        { title: t('stat_new_inquiries'), value: data?.adminDashboardStats?.newInquiries.toString() || "0", icon: MessageSquare, trend: { value: "0", isPositive: true }, className: "border-l-4 border-l-orange-500" },
        { title: t('stat_recent_usage'), value: data?.adminDashboardStats?.weeklyUsage.toLocaleString() || "0", icon: TrendingUp, trend: { value: "0", isPositive: true }, className: "border-l-4 border-l-purple-500" },
    ]

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <DailyUsersChart data={data?.adminDailyUsage} />
                <WeeklyUsersChart data={data?.adminWeeklyUsage} />
            </div>

            <RecentInquiriesTable data={data?.adminRecentInquiries} />
        </div>
    )
}

