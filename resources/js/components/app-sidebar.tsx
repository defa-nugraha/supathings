import { Link } from '@inertiajs/react';
import {
    Activity,
    ChartNoAxesColumn,
    ChevronDown,
    Cpu,
    History,
    LayoutDashboard,
    NotebookPen,
    Sprout,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useCurrentUrl } from '@/hooks/use-current-url';

const mainNavItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Monitoring & kontrol', href: '/monitoring', icon: Activity },
    { title: 'Kelola device', href: '/devices', icon: Cpu },
];

export function AppSidebar() {
    const { isCurrentUrl } = useCurrentUrl();
    return (
        <Sidebar collapsible="icon" variant="inset" className="border-0">
            <SidebarHeader className="px-3 pt-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="px-2 pt-4">
                <div className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                    Workspace
                </div>
                <SidebarMenu>
                    {mainNavItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
                                className="h-10 rounded-xl data-[active=true]:bg-blue-50 data-[active=true]:font-semibold data-[active=true]:text-blue-700"
                            >
                                <Link href={item.href} prefetch>
                                    <item.icon className="size-[18px]" />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                    <Collapsible
                        defaultOpen={
                            isCurrentUrl('/cultivation') ||
                            isCurrentUrl('/cultivation/history') ||
                            isCurrentUrl('/cultivation/journal')
                        }
                        className="group/cultivation"
                    >
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                    isActive={
                                        isCurrentUrl('/cultivation') ||
                                        isCurrentUrl('/cultivation/history') ||
                                        isCurrentUrl('/cultivation/journal')
                                    }
                                    tooltip={{ children: 'Budidaya jamur' }}
                                    className="h-10 rounded-xl data-[active=true]:bg-blue-50 data-[active=true]:font-semibold data-[active=true]:text-blue-700"
                                >
                                    <Sprout className="size-[18px]" />
                                    <span>Budidaya jamur</span>
                                    <ChevronDown className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="mt-1 ml-4 space-y-1 border-l border-slate-200 pl-3">
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentUrl('/cultivation')}
                                        className="h-9 rounded-lg text-sm"
                                    >
                                        <Link href="/cultivation" prefetch>
                                            <Sprout className="size-4" />
                                            <span>Ringkasan</span>
                                        </Link>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentUrl(
                                            '/cultivation/history',
                                        )}
                                        className="h-9 rounded-lg text-sm"
                                    >
                                        <Link
                                            href="/cultivation/history"
                                            prefetch
                                        >
                                            <History className="size-4" />
                                            <span>Riwayat panen</span>
                                        </Link>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentUrl(
                                            '/cultivation/journal',
                                        )}
                                        className="h-9 rounded-lg text-sm"
                                    >
                                        <Link
                                            href="/cultivation/journal"
                                            prefetch
                                        >
                                            <NotebookPen className="size-4" />
                                            <span>Jurnal budidaya</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </div>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl('/reports')}
                            tooltip={{ children: 'Laporan budidaya' }}
                            className="h-10 rounded-xl data-[active=true]:bg-blue-50 data-[active=true]:font-semibold data-[active=true]:text-blue-700"
                        >
                            <Link href="/reports" prefetch>
                                <ChartNoAxesColumn className="size-[18px]" />
                                <span>Laporan budidaya</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="border-t border-slate-100 px-2 py-3">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
