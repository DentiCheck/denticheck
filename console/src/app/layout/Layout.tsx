/**
 * Frontend Component: Main Layout
 * Path: console/src/app/layout/Layout.tsx
 * Description: [관리자 기능] 관리자 시스템 전체 레이아웃
 * - 사이드바, 헤더, 다국어 토글, 콘텐츠 영역 구성
 */
import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Building, Package, Shield, Globe } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { LanguageProvider, useLanguage } from '@/features/dashboard/context/LanguageContext'

const sidebarItems = [
    { name: 'menu_dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'menu_users', href: '/users', icon: Users },
    { name: 'menu_dentists', href: '/dentists', icon: Building },
    { name: 'menu_products', href: '/products', icon: Package },
    { name: 'menu_insurances', href: '/insurances', icon: Shield },
]

function LayoutContent() {
    const location = useLocation()
    const { lang, toggleLang, t } = useLanguage()

    return (
        <div className="flex h-screen w-full bg-slate-50">
            {/* Sidebar */}
            <aside className="hidden w-64 flex-col border-r bg-white sm:flex">
                <div className="flex items-center justify-between p-6">
                    <div className="font-bold text-xl text-slate-800">{t('admin_system')}</div>
                </div>

                <div className="px-6 pb-4">
                    <button
                        onClick={toggleLang}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                        <Globe className="w-3 h-3" />
                        <span>{lang === 'ko' ? '한국어' : 'English'}</span>
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname.startsWith(item.href)
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Icon className="h-5 w-5" />
                                {t(item.name)}
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            <main className="flex flex-1 flex-col overflow-y-auto">
                <header className="flex h-16 items-center gap-4 bg-white px-8 border-b border-slate-100/50">
                    <h1 className="font-bold text-xl text-slate-800">
                        {t(sidebarItems.find(item => location.pathname.startsWith(item.href))?.name || 'menu_dashboard')}
                    </h1>
                </header>
                <div className="flex-1 p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export function Layout() {
    return (
        <LanguageProvider>
            <LayoutContent />
        </LanguageProvider>
    )
}

