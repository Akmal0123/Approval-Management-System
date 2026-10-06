import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebarHeader } from "./app-sidebar-header"
import { type BreadcrumbItem } from '@/types';

interface SiteHeaderProps {
    breadcrumbs?: Array<{ label?: string; title?: string; href: string }>;
}

export function SiteHeader({ breadcrumbs }: SiteHeaderProps) {
  const normalizedBreadcrumbs: BreadcrumbItem[] | undefined = breadcrumbs?.map(b => ({
    title: b.title || b.label || '',
    href: b.href
  }));

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        {normalizedBreadcrumbs && normalizedBreadcrumbs.length > 0 ? (
          <AppSidebarHeader breadcrumbs={normalizedBreadcrumbs} />
        ) : (
          <>
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
            <h1 className="text-base font-medium">Documents</h1>
          </>
        )}
      </div>
    </header>
  )
}
