import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { AppWindow, Briefcase, Building2, Check, ChevronDown, Loader2, Shield } from 'lucide-react';
import { useState } from 'react';

interface Context {
    id: number;
    company: { id: number; name: string } | null;
    aplikasi: { id: number; name: string } | null;
    jabatan: { id: number; name: string } | null;
    role: { id: number; name: string } | null;
}

interface PageProps {
    context: {
        current: Context | null;
        available: Context[];
        is_super_admin: boolean;
    };
    [key: string]: unknown;
}

export default function ContextSwitcher() {
    const pageData = usePage<PageProps>();
    const { context } = pageData.props;
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const currentContext = context?.current;
    const availableContexts = context?.available || [];
    const isSuperAdmin = context?.is_super_admin || false;

    // Debug logging - see ALL props
    console.log('ContextSwitcher Full Debug:', {
        allProps: pageData.props,
        context: context,
        currentContext,
        availableContexts,
        availableContextsLength: availableContexts.length,
        isSuperAdmin,
    });

    // Show switcher if user has more than 1 context OR is super admin
    // Only hide completely if no context and no available contexts
    if (availableContexts.length === 0 && !currentContext) {
        return null;
    }

    // If only one context and not super admin, show static badge
    if (!isSuperAdmin && availableContexts.length <= 1) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="max-w-[160px] truncate">{currentContext?.company?.name || 'No Company'}</span>
            </div>
        );
    }

    const handleSwitchContext = async (contextId: number) => {
        if (contextId === currentContext?.id) {
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(
                '/contexts/switch',
                { context_id: contextId },
                {
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                },
            );
            // Redirect to dashboard - the backend will redirect to the correct dashboard based on new context's role
            router.visit('/dashboard');
        } catch (error) {
            console.error('Failed to switch context:', error);
        } finally {
            setIsLoading(false);
            setIsOpen(false);
        }
    };

    const formatContextLabel = (ctx: Context) => {
        const parts: string[] = [];
        if (ctx.company?.name) parts.push(ctx.company.name);
        if (ctx.aplikasi?.name) parts.push(ctx.aplikasi.name);
        return parts.length > 0 ? parts.join(' - ') : 'Unknown Context';
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between gap-2 px-3" disabled={isLoading}>
                    <div className="flex items-center gap-2 truncate">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4 shrink-0" />}
                        <span className="truncate text-left">{currentContext ? formatContextLabel(currentContext) : 'Select Context'}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="start">
                <DropdownMenuLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Switch Context
                    {isSuperAdmin && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                            Super Admin
                        </Badge>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {availableContexts.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">No contexts available</div>
                ) : (
                    availableContexts.map((ctx) => (
                        <DropdownMenuItem
                            key={ctx.id}
                            onClick={() => handleSwitchContext(ctx.id)}
                            className="flex cursor-pointer flex-col items-start gap-1 py-2"
                        >
                            <div className="flex w-full items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{ctx.company?.name || 'No Company'}</span>
                                </div>
                                {ctx.id === currentContext?.id && <Check className="h-4 w-4 text-primary" />}
                            </div>
                            <div className="ml-6 flex flex-wrap gap-1.5">
                                {ctx.aplikasi && (
                                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                        <AppWindow className="h-3 w-3" />
                                        {ctx.aplikasi.name}
                                    </Badge>
                                )}
                                {ctx.jabatan && (
                                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                        <Briefcase className="h-3 w-3" />
                                        {ctx.jabatan.name}
                                    </Badge>
                                )}
                                {ctx.role && (
                                    <Badge variant={ctx.role.name.toLowerCase().includes('admin') ? 'default' : 'secondary'} className="text-xs">
                                        {ctx.role.name}
                                    </Badge>
                                )}
                            </div>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
