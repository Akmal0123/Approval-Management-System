import { cn } from '@/lib/utils';
import React from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'default' | 'sidebar';
    className?: string;
}

export function AppShell({ children, variant = 'default', className }: AppShellProps) {
    return <div className={cn('min-h-screen bg-background', variant === 'sidebar' && 'flex flex-row', className)}>{children}</div>;
}
