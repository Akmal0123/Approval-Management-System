import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@inertiajs/react';
import { Calendar, Eye, FileText, Tag } from 'lucide-react';
import React from 'react';

export interface UserDocumentItem {
    id: number;
    name: string;
    status: string;
    submitted_at: string;
    category: string;
    size?: string;
}

interface DocumentCardViewProps {
    documents: UserDocumentItem[];
    getStatusVariant?: (status: string) => 'default' | 'secondary' | 'destructive' | 'outline';
}

export function DocumentCardView({ documents, getStatusVariant }: DocumentCardViewProps) {
    const resolveStatusVariant = (status: string) => {
        if (getStatusVariant) return getStatusVariant(status);
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'default';
            case 'pending':
            case 'in_review':
                return 'secondary';
            case 'rejected':
                return 'destructive';
            case 'draft':
                return 'outline';
            default:
                return 'outline';
        }
    };

    if (!documents || documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 text-base font-semibold">No documents yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">Get started by creating your first document.</p>
                <Button asChild size="sm" className="mt-4">
                    <Link href="/dokumen">Create Document</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {documents.map((doc) => (
                <Card key={doc.id} className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm">
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            {/* Header: Title & Status Badge */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate font-serif text-sm font-semibold text-foreground" title={doc.name}>
                                        {doc.name}
                                    </h3>
                                </div>
                                <Badge variant={resolveStatusVariant(doc.status)} className="shrink-0 text-xs capitalize">
                                    {doc.status}
                                </Badge>
                            </div>

                            {/* Meta Info: Category & Submitted Date */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5 truncate">
                                    <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                    <span className="truncate">{doc.category || 'General'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 truncate justify-end">
                                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                    <span className="truncate">{doc.submitted_at || '-'}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="border-t pt-3 flex items-center justify-end">
                                <Button variant="outline" size="sm" asChild className="w-full sm:w-auto text-xs h-8">
                                    <Link href={`/dokumen/${doc.id}`} className="flex items-center justify-center gap-1.5">
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>Lihat Detail</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
