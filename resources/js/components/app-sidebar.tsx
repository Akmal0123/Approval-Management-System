import {
    BriefcaseIcon,
    BuildingIcon,
    CheckSquareIcon,
    FileTextIcon,
    FolderKanbanIcon,
    GlobeIcon,
    LayoutDashboardIcon,
    ShieldIcon,
    UserIcon,
    UsersIcon,
} from 'lucide-react';
import * as React from 'react';

import ContextSwitcher from '@/components/context-switcher';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { usePage } from '@inertiajs/react';

// Super Admin Menu Items
const superAdminNavMain = [
    {
        title: 'Dashboard',
        url: '/super-admin/dashboard',
        icon: LayoutDashboardIcon,
    },
    {
        title: 'Profile',
        url: '/profile',
        icon: UserIcon,
    },
    {
        title: 'Dokumen Saya',
        url: '/dokumen',
        icon: FileTextIcon,
    },
    {
        title: 'Persetujuan Dokumen',
        url: '/approvals',
        icon: CheckSquareIcon,
    },
    {
        title: 'Role Management',
        url: '/super-admin/role-management',
        icon: ShieldIcon,
    },
    {
        title: 'Company Management',
        url: '/super-admin/company-management',
        icon: BuildingIcon,
    },
    {
        title: 'Jabatan Management',
        url: '/super-admin/jabatan-management',
        icon: BriefcaseIcon,
    },
    {
        title: 'Aplikasi Management',
        url: '/super-admin/aplikasi-management',
        icon: GlobeIcon,
    },
    {
        title: 'User Management',
        url: '/super-admin/user-management',
        icon: UsersIcon,
    },
];

// Admin Menu Items
const adminNavMain = [
    {
        title: 'Dashboard',
        url: '/admin/dashboard',
        icon: LayoutDashboardIcon,
    },
    {
        title: 'Profile',
        url: '/profile',
        icon: UserIcon,
    },
    {
        title: 'Dokumen Saya',
        url: '/dokumen',
        icon: FileTextIcon,
    },
    {
        title: 'Persetujuan Dokumen',
        url: '/approvals',
        icon: CheckSquareIcon,
    },
    {
        title: 'Masterflow Management',
        url: '/admin/masterflows',
        icon: FolderKanbanIcon,
    },
];

// User Menu Items
const userNavMain = [
    {
        title: 'Dashboard',
        url: '/user/dashboard',
        icon: LayoutDashboardIcon,
    },
    {
        title: 'Profile',
        url: '/profile',
        icon: UserIcon,
    },
    {
        title: 'Dokumen Saya',
        url: '/dokumen',
        icon: FileTextIcon,
    },
    {
        title: 'Persetujuan Dokumen',
        url: '/approvals',
        icon: CheckSquareIcon,
    },
];

interface PageProps {
    auth: {
        user: {
            name: string;
            email: string;
            avatar?: string;
            user_auths?: Array<{ role?: { role_name: string } }>;
            userAuths?: Array<{ role?: { role_name: string } }>;
        } | null;
    };
    context: {
        current: {
            role?: { name: string };
        } | null;
        is_super_admin: boolean;
    };
    [key: string]: unknown;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { props: pageProps } = usePage<PageProps>();
    const user = pageProps.auth?.user;
    const context = pageProps.context;

    // Use current context for role detection (context-aware)
    const currentRole = context?.current?.role?.name?.toLowerCase() || '';
    const isSuperAdmin = context?.is_super_admin || false;

    // Determine menu items based on CURRENT CONTEXT role
    let navMainItems = userNavMain;
    let sidebarTitle = 'Document Approval';

    if (isSuperAdmin) {
        navMainItems = superAdminNavMain;
        sidebarTitle = 'Super Admin Panel';
    } else if (currentRole === 'admin') {
        navMainItems = adminNavMain;
        sidebarTitle = 'Admin Panel';
    } else {
        navMainItems = userNavMain;
        sidebarTitle = 'User Panel';
    }

    const userData = {
        name: user?.name || 'User',
        email: user?.email || 'user@example.com',
        avatar: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=4ba443&color=ffffff`,
    };

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                            <a href="/">
                                <FileTextIcon className="h-5 w-5" />
                                <span className="text-base font-semibold">{sidebarTitle}</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                {/* Context Switcher */}
                <div className="mt-2">
                    <ContextSwitcher />
                </div>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMainItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={userData} />
            </SidebarFooter>
        </Sidebar>
    );
}
