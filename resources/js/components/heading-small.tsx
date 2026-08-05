import { cn } from '@/lib/utils';

interface HeadingSmallProps {
    title: string;
    description?: string;
    className?: string;
}

export default function HeadingSmall({ title, description, className }: HeadingSmallProps) {
    return (
        <div className={cn('space-y-1', className)}>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
    );
}
