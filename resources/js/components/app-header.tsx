import { type BreadcrumbItem } from '@/types';

interface AppHeaderProps {
    breadcrumbs?: BreadcrumbItem[];
}

/**
 * App header component used in app-header-layout.
 * Currently unused - sidebar layout is the primary layout.
 */
export function AppHeader({ breadcrumbs }: AppHeaderProps) {
    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav aria-label="breadcrumb">
                    <ol className="flex items-center gap-1 text-sm text-muted-foreground">
                        {breadcrumbs.map((item, i) => (
                            <li key={i} className="flex items-center gap-1">
                                {i > 0 && <span>/</span>}
                                {item.href ? (
                                    <a href={item.href} className="hover:text-foreground">
                                        {item.title}
                                    </a>
                                ) : (
                                    <span className="text-foreground">{item.title}</span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            )}
        </header>
    );
}
