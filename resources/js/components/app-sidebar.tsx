import { Link } from '@inertiajs/react';
import { Activity, Cpu, LayoutDashboard, Settings2 } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Monitoring & kontrol', href: '/monitoring', icon: Activity },
    { title: 'Kelola device', href: '/devices', icon: Cpu },
    { title: 'Pengaturan profil', href: '/settings/account', icon: Settings2 },
];

export function AppSidebar() {
    return <Sidebar collapsible="icon" variant="inset" className="border-r-0">
        <SidebarHeader className="px-3 pt-4"><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" asChild><Link href="/dashboard" prefetch><AppLogo /></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader>
        <SidebarContent className="px-2 pt-4"><p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.18em] text-slate-400 group-data-[collapsible=icon]:hidden">WORKSPACE</p><NavMain items={mainNavItems}/></SidebarContent>
        <SidebarFooter><NavUser/></SidebarFooter>
    </Sidebar>;
}
