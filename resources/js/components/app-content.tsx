import { cn } from '@/lib/utils';
import React from 'react';

interface AppContentProps {
    children: React.ReactNode;
    variant?: 'default' | 'sidebar';
    className?: string;
}

export function AppContent({ children, variant = 'default', className }: AppContentProps) {
    return <main className={cn('flex-1', variant === 'sidebar' && 'flex flex-col', className)}>{children}</main>;
}
