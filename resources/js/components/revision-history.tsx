import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { CheckCircle, ChevronRight, Clock, Download, FileEdit, FileText, RefreshCw, Send, User, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Version {
    id: number;
    version: string;
    nama_file: string;
    tgl_upload: string;
    tipe_file: string;
    file_url: string;
    size_file: number;
    status: string;
    created_at: string;
}

interface TimelineEntry {
    id: number;
    action: string;
    action_label: string;
    notes: string | null;
    changes: Record<string, unknown> | null;
    created_at: string;
    user: {
        id: number;
        name: string;
    } | null;
    version: {
        id: number;
        version: string;
    } | null;
}

interface RevisionHistoryProps {
    dokumenId: number;
    className?: string;
}

const actionIcons: Record<string, React.ReactNode> = {
    created: <FileText className="h-4 w-4 text-blue-500" />,
    revised: <FileEdit className="h-4 w-4 text-amber-500" />,
    submitted: <Send className="h-4 w-4 text-indigo-500" />,
    approved: <CheckCircle className="h-4 w-4 text-green-500" />,
    rejected: <XCircle className="h-4 w-4 text-red-500" />,
    revision_requested: <RefreshCw className="h-4 w-4 text-orange-500" />,
    cancelled: <XCircle className="h-4 w-4 text-gray-500" />,
};

const actionColors: Record<string, string> = {
    created: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    revised: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    submitted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    revision_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function RevisionHistory({ dokumenId, className = '' }: RevisionHistoryProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('timeline');

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await api.get(`/dokumen/${dokumenId}/history`);
                setVersions(response.data.versions || []);
                setTimeline(response.data.timeline || []);
            } catch (err: unknown) {
                console.error('Failed to fetch revision history:', err);
                setError('Gagal memuat riwayat revisi');
            } finally {
                setIsLoading(false);
            }
        };

        if (dokumenId) {
            fetchHistory();
        }
    }, [dokumenId]);

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-60" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={className}>
                <CardContent className="py-6">
                    <div className="text-center text-red-500">{error}</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Riwayat Revisi
                </CardTitle>
                <CardDescription>
                    {versions.length} versi • {timeline.length} aktivitas
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="versions">Versi ({versions.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="timeline" className="mt-4">
                        {timeline.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">Belum ada aktivitas tercatat</div>
                        ) : (
                            <div className="relative space-y-0">
                                {timeline.map((entry, index) => (
                                    <div key={entry.id} className="relative flex gap-4 pb-6">
                                        {/* Connector line */}
                                        {index < timeline.length - 1 && <div className="absolute top-10 left-5 h-full w-px bg-border" />}

                                        {/* Icon */}
                                        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background">
                                            {actionIcons[entry.action] || <FileText className="h-4 w-4" />}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pt-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary" className={actionColors[entry.action] || 'bg-gray-100'}>
                                                    {entry.action_label}
                                                </Badge>
                                                {entry.version && <span className="text-sm text-muted-foreground">v{entry.version.version}</span>}
                                            </div>

                                            {entry.notes && <p className="mt-1 text-sm text-foreground">{entry.notes}</p>}

                                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                                {entry.user && (
                                                    <>
                                                        <User className="h-3 w-3" />
                                                        <span>{entry.user.name}</span>
                                                        <ChevronRight className="h-3 w-3" />
                                                    </>
                                                )}
                                                <span>{formatDate(entry.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="versions" className="mt-4">
                        {versions.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">Belum ada versi tersedia</div>
                        ) : (
                            <div className="space-y-3">
                                {versions.map((version, index) => (
                                    <div
                                        key={version.id}
                                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-medium text-primary">
                                                v{version.version}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{version.nama_file}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatBytes(version.size_file)} • {formatDate(version.tgl_upload)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {index === 0 && (
                                                <Badge variant="default" className="bg-green-600">
                                                    Latest
                                                </Badge>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <a href={`/storage/${version.file_url}`} target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
