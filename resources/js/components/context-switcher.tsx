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
    const availableContexts = Array.isArray(context?.available) ? context.available : [];
    const isSuperAdmin = context?.is_super_admin || false;

    // Group contexts by company
    const groupedContexts = availableContexts.reduce((acc, ctx) => {
        const companyId = ctx?.company?.id || 0;
        if (!acc[companyId]) {
            acc[companyId] = {
                company: ctx?.company,
                contexts: [],
                primaryContextId: ctx?.id,
            };
        }
        acc[companyId].contexts.push(ctx);
        return acc;
    }, {} as Record<number, { company: Context['company']; contexts: Context[]; primaryContextId: number }>);

    const companyGroups = Object.values(groupedContexts);

    // Hide completely if no context and no available contexts
    if (availableContexts.length === 0 && !currentContext) {
        return null;
    }

    // Helper to group a company's contexts by Application
    const renderAppGroups = (contexts: Context[]) => {
        const appsGroup = contexts.reduce((acc, ctx) => {
            const appId = ctx.aplikasi?.id || 0;
            if (!acc[appId]) {
                acc[appId] = {
                    aplikasi: ctx.aplikasi,
                    contexts: [],
                };
            }
            acc[appId].contexts.push(ctx);
            return acc;
        }, {} as Record<number, { aplikasi: Context['aplikasi']; contexts: Context[] }>);

        return (
            <div className="flex flex-col gap-2.5">
                {Object.values(appsGroup).map((group, idx) => (
                    <div key={`app-group-${idx}`} className="flex flex-col gap-1">
                        {group.aplikasi && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                <AppWindow className="h-3.5 w-3.5 text-muted-foreground" />
                                {group.aplikasi.name}
                            </div>
                        )}
                        <div className="ml-5 flex flex-wrap gap-1.5">
                            {group.contexts.map((ctx) => (
                                <div key={ctx.id} className="flex flex-wrap gap-1">
                                    {ctx.jabatan && (
                                        <Badge variant="outline" className="flex items-center gap-1 text-[10px] px-1.5 py-0 h-5 bg-background">
                                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                                            {ctx.jabatan.name}
                                        </Badge>
                                    )}
                                    {ctx.role && (
                                        <Badge
                                            variant={ctx.role.name.toLowerCase().includes('admin') ? 'default' : 'secondary'}
                                            className="text-[10px] px-1.5 py-0 h-5"
                                        >
                                            {ctx.role.name}
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const handleSwitchContext = async (contextId: number) => {
        const targetGroup = companyGroups.find((g) => g.contexts.some((c) => c.id === contextId));
        const currentGroup = currentContext ? companyGroups.find((g) => g.contexts.some((c) => c.id === currentContext.id)) : null;

        if (targetGroup && currentGroup && targetGroup.company?.id === currentGroup.company?.id) {
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
            router.visit('/dashboard');
        } catch (error) {
            console.error('Failed to switch context:', error);
        } finally {
            setIsLoading(false);
            setIsOpen(false);
        }
    };

    const formatContextLabel = (ctx: Context) => {
        return ctx?.company?.name || 'Unknown Context';
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
            <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-72 sm:w-72" align="start">
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

                {companyGroups.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">No contexts available</div>
                ) : (
                    companyGroups.map((group) => {
                        const isCurrentCompany = currentContext?.company?.id === group.company?.id;

                        return (
                            <DropdownMenuItem
                                key={group.company?.id || 'unknown'}
                                onClick={() => handleSwitchContext(group.primaryContextId)}
                                className="flex cursor-pointer flex-col items-start gap-1 py-2"
                            >
                                <div className="flex w-full items-center justify-between pb-1">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{group.company?.name || 'No Company'}</span>
                                    </div>
                                    {isCurrentCompany && <Check className="h-4 w-4 text-primary" />}
                                </div>
                                <div className="ml-6 mt-1">
                                    {renderAppGroups(group.contexts)}
                                </div>
                            </DropdownMenuItem>
                        );
                    })
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
