import { Link } from '@inertiajs/react';
import { Activity, Cpu, LayoutDashboard, Settings2 } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';

const mainNavItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Monitoring & kontrol', href: '/monitoring', icon: Activity },
    { title: 'Kelola device', href: '/devices', icon: Cpu },
    { title: 'Pengaturan profil', href: '/settings/profile', icon: Settings2 },
];

export function AppSidebar() {
    const { isCurrentUrl } = useCurrentUrl();
    return <Sidebar collapsible="icon" variant="inset" className="border-0">
        <SidebarHeader className="px-3 pt-4">
            <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" asChild><Link href="/dashboard" prefetch><AppLogo /></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="px-2 pt-4">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</div>
            <SidebarMenu>{mainNavItems.map(item => <SidebarMenuItem key={item.title}><SidebarMenuButton asChild isActive={isCurrentUrl(item.href)} tooltip={{ children: item.title }} className="h-10 rounded-xl data-[active=true]:bg-blue-50 data-[active=true]:font-semibold data-[active=true]:text-blue-700"><Link href={item.href} prefetch><item.icon className="size-[18px]" /><span>{item.title}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-slate-100 px-2 py-3"><NavUser /></SidebarFooter>
    </Sidebar>;
}
