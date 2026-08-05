import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock, Eye, FileText, MoreHorizontal, XCircle } from 'lucide-react';
import React from 'react';

// Simple Badge component
interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
}

function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
    const variantClasses = {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background',
    };

    return <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</span>;
}

interface Document {
    id: string;
    title: string;
    type: string;
    status: 'pending' | 'approved' | 'rejected' | 'review';
    submittedBy: string;
    submittedAt: string;
    priority: 'high' | 'medium' | 'low';
}

const mockDocuments: Document[] = [
    {
        id: '1',
        title: 'Annual Report 2024',
        type: 'Report',
        status: 'pending',
        submittedBy: 'John Doe',
        submittedAt: '2 hours ago',
        priority: 'high',
    },
    {
        id: '2',
        title: 'Budget Proposal Q1',
        type: 'Proposal',
        status: 'approved',
        submittedBy: 'Jane Smith',
        submittedAt: '4 hours ago',
        priority: 'medium',
    },
    {
        id: '3',
        title: 'Marketing Strategy',
        type: 'Strategy',
        status: 'review',
        submittedBy: 'Mike Johnson',
        submittedAt: '6 hours ago',
        priority: 'medium',
    },
    {
        id: '4',
        title: 'HR Policy Update',
        type: 'Policy',
        status: 'rejected',
        submittedBy: 'Sarah Wilson',
        submittedAt: '1 day ago',
        priority: 'low',
    },
];

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'pending':
            return <Clock className="h-4 w-4 text-orange-500" />;
        case 'approved':
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'rejected':
            return <XCircle className="h-4 w-4 text-red-500" />;
        case 'review':
            return <AlertCircle className="h-4 w-4 text-blue-500" />;
        default:
            return <FileText className="h-4 w-4 text-gray-500" />;
    }
};

const getStatusBadge = (status: string) => {
    const variants = {
        pending: 'default',
        approved: 'default',
        rejected: 'destructive',
        review: 'secondary',
    } as const;

    const colors = {
        pending: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
        approved: 'bg-green-100 text-green-800 hover:bg-green-100',
        rejected: 'bg-red-100 text-red-800 hover:bg-red-100',
        review: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    };

    return (
        <Badge variant={status === 'rejected' ? 'destructive' : 'secondary'} className={colors[status as keyof typeof colors]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
};

const getPriorityBadge = (priority: string) => {
    const colors = {
        high: 'bg-red-100 text-red-800 hover:bg-red-100',
        medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        low: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    };

    return (
        <Badge variant="outline" className={colors[priority as keyof typeof colors]}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </Badge>
    );
};

export function EnhancedDocumentTable() {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="mb-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <FileText className="h-5 w-5" />
                        Recent Documents
                    </h3>
                </div>
                <div className="space-y-4">
                    {mockDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">{getStatusIcon(doc.status)}</div>
                                <div className="space-y-1">
                                    <h4 className="leading-none font-medium">{doc.title}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {doc.type} • Submitted by {doc.submittedBy}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{doc.submittedAt}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {getPriorityBadge(doc.priority)}
                                {getStatusBadge(doc.status)}
                                <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {mockDocuments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">No documents found</h3>
                        <p className="text-sm text-muted-foreground">No documents have been submitted yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
