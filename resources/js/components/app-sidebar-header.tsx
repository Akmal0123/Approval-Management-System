import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronRight, Home } from 'lucide-react';

interface AppSidebarHeaderProps {
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}

export function AppSidebarHeader({ breadcrumbs = [], className }: AppSidebarHeaderProps) {
    return (
        <>
            <Separator orientation="vertical" className="mr-2 h-4" />
            <nav className={cn('flex', className)} aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                    <li>
                        <Link href="/" className="flex items-center hover:text-foreground">
                            <Home className="h-4 w-4" />
                            <span className="sr-only">Home</span>
                        </Link>
                    </li>
                    {breadcrumbs.map((item, index) => (
                        <li key={item.href} className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4" />
                            {index === breadcrumbs.length - 1 ? (
                                <span className="font-medium text-foreground">{item.title}</span>
                            ) : (
                                <Link href={item.href} className="hover:text-foreground">
                                    {item.title}
                                </Link>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
        </>
    );
}
