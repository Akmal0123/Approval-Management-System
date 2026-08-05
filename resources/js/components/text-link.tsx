import { cn } from '@/lib/utils';
import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function TextLink({ className, children, ...props }: InertiaLinkProps) {
    return (
        <Link {...props} className={cn('text-sm text-primary underline-offset-4 hover:underline', className)}>
            {children}
        </Link>
    );
}
