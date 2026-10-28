import { Breadcrumbs } from '@/components/breadcrumbs';
import { usePage } from '@inertiajs/react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { url } = usePage();
    const routeTitle = url.startsWith('/cultivation/journal')
        ? 'Jurnal budidaya'
        : url.startsWith('/cultivation/history')
          ? 'Riwayat panen'
          : url.startsWith('/cultivation')
            ? 'Budidaya jamur'
            : url.startsWith('/reports')
              ? 'Laporan budidaya'
              : '';
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                {routeTitle ? (
                    <span className="text-sm font-semibold text-slate-800">
                        {routeTitle}
                    </span>
                ) : (
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                )}
            </div>
        </header>
    );
}
