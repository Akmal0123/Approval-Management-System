import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { NotificationListener } from '@/components/NotificationListener';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { auth } = usePage<SharedData>().props;

    return (
        <SidebarProvider>
            <NotificationListener />
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 shadow-sm">
                    <SidebarTrigger className="-ml-1 transition-colors hover:bg-accent hover:text-accent-foreground" />
                    <div className="h-6 w-px bg-border" />
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                </header>
                <main className="flex flex-1 flex-col gap-6 bg-background p-6">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
