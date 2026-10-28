import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    ChartNoAxesColumn,
    Cpu,
    LayoutDashboard,
    Sprout,
} from 'lucide-react';

const items = [
    { label: 'Beranda', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Monitoring', href: '/monitoring', icon: Activity },
    { label: 'Perangkat', href: '/devices', icon: Cpu },
    { label: 'Budidaya', href: '/cultivation', icon: Sprout },
    { label: 'Laporan', href: '/reports', icon: ChartNoAxesColumn },
];

export function MobileBottomNav() {
    const { url } = usePage();
    const pathname = new URL(
        url,
        typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost',
    ).pathname;

    return (
        <nav
            aria-label="Navigasi utama mobile"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden"
        >
            <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1">
                {items.map(({ label, href, icon: Icon }) => {
                    const active =
                        pathname === href ||
                        (href !== '/dashboard' &&
                            pathname.startsWith(href + '/'));

                    return (
                        <li key={href} className="min-w-0">
                            <Link
                                href={href}
                                prefetch
                                aria-current={active ? 'page' : undefined}
                                className={
                                    'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ' +
                                    (active
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')
                                }
                            >
                                <Icon
                                    aria-hidden="true"
                                    className="size-5 shrink-0"
                                    strokeWidth={active ? 2.4 : 1.9}
                                />
                                <span className="max-w-full truncate">
                                    {label}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
