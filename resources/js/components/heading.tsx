import { cn } from '@/lib/utils';

interface HeadingProps {
    title: string;
    description?: string;
    className?: string;
}

export default function Heading({ title, description, className }: HeadingProps) {
    return (
        <div className={cn('space-y-2', className)}>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
        </div>
    );
}
