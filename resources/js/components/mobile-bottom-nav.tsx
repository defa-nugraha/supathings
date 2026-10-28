import { Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    ChartNoAxesColumn,
    Cpu,
    LayoutDashboard,
    LogOut,
    MoreHorizontal,
    NotebookPen,
    Settings,
    Sprout,
    Wallet,
    History,
} from 'lucide-react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

const primaryItems = [
    { label: 'Beranda', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Pantau', href: '/monitoring', icon: Activity },
    { label: 'Budidaya', href: '/cultivation', icon: Sprout },
    { label: 'Perangkat', href: '/devices', icon: Cpu },
];

const moreItems = [
    { label: 'Riwayat panen', href: '/cultivation/history', icon: History },
    { label: 'Jurnal budidaya', href: '/cultivation/journal', icon: NotebookPen },
    { label: 'Biaya operasional', href: '/cultivation/expenses', icon: Wallet },
    { label: 'Laporan budidaya', href: '/reports', icon: ChartNoAxesColumn },
    { label: 'Pengaturan akun', href: '/settings/profile', icon: Settings },
];

export function MobileBottomNav() {
    const { isCurrentUrl, currentUrl } = useCurrentUrl();
    const page = usePage();
    const user = page.props.auth?.user;

    const isActive = (href: string) =>
        href === '/cultivation'
            ? currentUrl === href
            : href === '/dashboard'
              ? isCurrentUrl(href)
              : currentUrl === href || currentUrl.startsWith(`${href}/`);

    return (
        <nav
            aria-label="Navigasi utama mobile"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
        >
            <div className="mx-auto grid min-h-16 max-w-lg grid-cols-5 items-stretch px-1">
                {primaryItems.map((item) => {
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch
                            aria-current={active ? 'page' : undefined}
                            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${
                                active
                                    ? 'text-emerald-700'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span
                                className={`grid size-8 place-items-center rounded-xl transition-colors ${
                                    active ? 'bg-emerald-50' : ''
                                }`}
                            >
                                <item.icon
                                    aria-hidden="true"
                                    className="size-[19px]"
                                    strokeWidth={active ? 2.4 : 1.9}
                                />
                            </span>
                            <span className="max-w-full truncate">{item.label}</span>
                        </Link>
                    );
                })}

                <Sheet>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                            aria-label="Buka menu lainnya"
                        >
                            <span className="grid size-8 place-items-center rounded-xl">
                                <MoreHorizontal aria-hidden="true" className="size-5" />
                            </span>
                            <span>Lainnya</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent
                        side="bottom"
                        className="max-h-[85dvh] rounded-t-3xl border-slate-200 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
                    >
                        <SheetHeader className="px-1 pb-2 text-left">
                            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200" />
                            <SheetTitle className="text-lg">Menu Supathings</SheetTitle>
                            <SheetDescription>
                                Akses catatan, laporan, dan pengaturan akun.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-1 overflow-y-auto">
                            {moreItems.map((item) => {
                                const active = isActive(item.href);

                                return (
                                    <SheetClose asChild key={item.href}>
                                        <Link
                                            href={item.href}
                                            prefetch
                                            aria-current={active ? 'page' : undefined}
                                            className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none ${
                                                active
                                                    ? 'bg-emerald-50 text-emerald-800'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <item.icon
                                                aria-hidden="true"
                                                className="size-5 shrink-0"
                                            />
                                            <span className="min-w-0 flex-1">{item.label}</span>
                                        </Link>
                                    </SheetClose>
                                );
                            })}
                            {user && (
                                <button
                                    type="button"
                                    onClick={() => router.post('/logout')}
                                    className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border-t border-slate-100 px-3 pt-3 text-sm font-medium text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                                >
                                    <LogOut aria-hidden="true" className="size-5 shrink-0" />
                                    Keluar dari akun
                                </button>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </nav>
    );
}
