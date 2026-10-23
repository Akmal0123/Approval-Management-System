import { type LucideIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export interface NavSubItem {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: NavSubItem[];
}

function NavGroupMenu({ item, currentUrl }: { item: NavItem; currentUrl: string }) {
    // Check if current URL matches any sub-item or the parent item
    const isSubActive = Boolean(
        item.items?.some(sub => currentUrl === sub.url || currentUrl.startsWith(sub.url + '?')) ||
        (item.url !== '#' && item.url !== '' && (currentUrl === item.url || currentUrl.startsWith(item.url + '/')))
    );

    const [isOpen, setIsOpen] = useState(isSubActive);

    // Keep dropdown open when user navigates to any sub-item
    useEffect(() => {
        if (isSubActive) {
            setIsOpen(true);
        }
    }, [isSubActive, currentUrl]);

    return (
        <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
                tooltip={item.title}
                onClick={() => setIsOpen(prev => !prev)}
                isActive={isSubActive}
                className="justify-between cursor-pointer w-full"
            >
                <div className="flex items-center gap-2">
                    {item.icon && <item.icon className="h-4 w-4" />}
                    <span>{item.title}</span>
                </div>
                {isOpen ? (
                    <ChevronUpIcon className="h-4 w-4 shrink-0 transition-transform duration-200" />
                ) : (
                    <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200" />
                )}
            </SidebarMenuButton>

            {isOpen && item.items && item.items.length > 0 && (
                <SidebarMenuSub className="my-1 ml-4 pl-2 border-l border-sidebar-border/60 flex flex-col gap-1">
                    {item.items.map(subItem => {
                        const isThisActive = currentUrl === subItem.url || currentUrl.startsWith(subItem.url + '?');
                        return (
                            <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={isThisActive} size="sm">
                                    <Link
                                        href={subItem.url}
                                        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                                            isThisActive
                                                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                                                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                                        }`}
                                    >
                                        {subItem.icon && <subItem.icon className="h-3.5 w-3.5 shrink-0" />}
                                        <span className="truncate">{subItem.title}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        );
                    })}
                </SidebarMenuSub>
            )}
        </SidebarMenuItem>
    );
}

export function NavMain({ items }: { items: NavItem[] }) {
    const { url: currentUrl } = usePage();

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    {items.map(item => {
                        if (item.items && item.items.length > 0) {
                            return <NavGroupMenu key={item.title} item={item} currentUrl={currentUrl} />;
                        }

                        const isActive = item.isActive ?? (currentUrl === item.url || currentUrl.startsWith(item.url + '/'));

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton tooltip={item.title} asChild isActive={isActive}>
                                    <Link href={item.url}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
