import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    IconCheck,
    IconClock,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import { CheckCircle2Icon, Timer, XCircleIcon } from 'lucide-react';
import { getApprovalDuration, getDurationFromUpload, type ApprovalForSLA } from '@/lib/approval-sla';

export interface ApprovalUser {
    id?: number;
    name?: string;
    email?: string;
    profile?: {
        jabatan?: string;
    };
}

export interface MasterflowStepInfo {
    id?: number;
    step_order: number;
    step_name: string;
    jabatan?: {
        id?: number;
        name?: string;
    };
}

export interface ApprovalTimelineItemData {
    id: number;
    dokumen_id?: number;
    user_id?: number;
    approver_email?: string;
    approval_order?: number;
    masterflow_step_id?: number;
    approval_status: string;
    group_index?: string | null;
    jenis_group?: string | null;
    tgl_approve?: string | null;
    tgl_deadline?: string | null;
    alasan_reject?: string | null;
    comment?: string | null;
    user?: ApprovalUser;
    masterflow_step?: MasterflowStepInfo;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: any;
}

export interface ApprovalTimelineDokumen {
    id?: number;
    tgl_pengajuan?: string | null;
    created_at?: string | null;
    versions?: Array<{
        id?: number;
        tgl_upload?: string | null;
        [key: string]: any;
    }>;
    [key: string]: any;
}

export interface ApprovalTimelineProps {
    approvals?: ApprovalTimelineItemData[];
    dokumen?: ApprovalTimelineDokumen | null;
    currentApprovalId?: number;
    title?: string;
    description?: string;
    className?: string;
}

type TimelineItem =
    | { type: 'single'; data: ApprovalTimelineItemData }
    | {
          type: 'group';
          data: ApprovalTimelineItemData[];
          groupIndex: string;
          groupType: string;
          firstStepOrder: number;
      };

export function ApprovalTimeline({
    approvals = [],
    dokumen,
    currentApprovalId,
    title = 'Timeline Persetujuan',
    description = 'Proses approval untuk dokumen ini',
    className = '',
}: ApprovalTimelineProps) {
    // Resolve the earliest upload/submission time of the document
    const doc = dokumen || (approvals.length > 0 ? (approvals[0] as any).dokumen : null);
    const documentUploadTime: string | null = React.useMemo(() => {
        if (doc?.versions && doc.versions.length > 0) {
            const validTimes = doc.versions
                .map((v: any) => v?.tgl_upload)
                .filter((t: any): t is string => Boolean(t))
                .map((t: string) => new Date(t).getTime())
                .filter((t: number) => !isNaN(t));

            if (validTimes.length > 0) {
                return new Date(Math.min(...validTimes)).toISOString();
            }
        }
        return doc?.created_at || doc?.tgl_pengajuan || null;
    }, [doc]);

    // Format date & time helper
    const formatDateTime = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '-';
        }
    };

    // Status badge helper
    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; className: string; icon: any }> = {
            pending: {
                label: 'Menunggu',
                className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: IconClock,
            },
            approved: {
                label: 'Disetujui',
                className: 'bg-green-100 text-green-800 border-green-300',
                icon: IconCheck,
            },
            skipped: {
                label: 'Disetujui',
                className: 'bg-green-100 text-green-800 border-green-300',
                icon: IconCheck,
            },
            rejected: {
                label: 'Ditolak',
                className: 'bg-red-100 text-red-800 border-red-300',
                icon: IconX,
            },
            waiting: {
                label: 'Menunggu Giliran',
                className: 'bg-gray-100 text-gray-800 border-gray-300',
                icon: IconClock,
            },
            revision_requested: {
                label: 'Perlu Revisi',
                className: 'bg-purple-100 text-purple-800 border-purple-300',
                icon: IconClock,
            },
        };

        const { label, className: badgeClass, icon: Icon } = config[status] || config.pending;

        return (
            <Badge variant="outline" className={`font-sans ${badgeClass}`}>
                <Icon className="mr-1 h-3 w-3" />
                {label}
            </Badge>
        );
    };

    const getGroupRequirementText = (type: string) => {
        switch (type) {
            case 'any_one':
                return 'Salah Satu Setuju';
            case 'all_required':
                return 'Semua Harus Setuju';
            case 'majority':
                return 'Mayoritas Setuju';
            default:
                return 'Harus Setuju';
        }
    };

    // Sort approvals by step order or approval order
    const sortedApprovals = React.useMemo(() => {
        return [...(approvals || [])].sort((a, b) => {
            const orderA = a.masterflow_step?.step_order ?? a.approval_order ?? 0;
            const orderB = b.masterflow_step?.step_order ?? b.approval_order ?? 0;
            return orderA - orderB;
        });
    }, [approvals]);

    // Build timeline items (grouping & single items)
    const timelineItems: TimelineItem[] = React.useMemo(() => {
        const groupedApprovalsMap: Record<
            string,
            { approvals: ApprovalTimelineItemData[]; firstStepOrder: number; groupType: string }
        > = {};
        const singleApprovals: { approval: ApprovalTimelineItemData; stepOrder: number }[] = [];

        sortedApprovals.forEach((app) => {
            const stepOrder = app.masterflow_step?.step_order ?? app.approval_order ?? 0;

            if (app.group_index) {
                if (!groupedApprovalsMap[app.group_index]) {
                    groupedApprovalsMap[app.group_index] = {
                        approvals: [],
                        firstStepOrder: stepOrder,
                        groupType: app.jenis_group || 'parallel',
                    };
                }
                groupedApprovalsMap[app.group_index].approvals.push(app);
                if (stepOrder < groupedApprovalsMap[app.group_index].firstStepOrder) {
                    groupedApprovalsMap[app.group_index].firstStepOrder = stepOrder;
                }
            } else {
                singleApprovals.push({ approval: app, stepOrder });
            }
        });

        const allItems: { item: TimelineItem; stepOrder: number }[] = [];

        Object.entries(groupedApprovalsMap).forEach(([groupIndex, groupData]) => {
            allItems.push({
                item: {
                    type: 'group',
                    data: groupData.approvals,
                    groupIndex,
                    groupType: groupData.groupType,
                    firstStepOrder: groupData.firstStepOrder,
                },
                stepOrder: groupData.firstStepOrder,
            });
        });

        singleApprovals.forEach(({ approval: app, stepOrder }) => {
            allItems.push({
                item: { type: 'single', data: app },
                stepOrder,
            });
        });

        allItems.sort((a, b) => a.stepOrder - b.stepOrder);
        return allItems.map(({ item }) => item);
    }, [sortedApprovals]);

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="font-serif text-lg">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                {timelineItems.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        Belum ada data timeline persetujuan
                    </div>
                ) : (
                    <div className="relative space-y-0 pl-2">
                        {timelineItems.map((item, index) => {
                            const isLast = index === timelineItems.length - 1;

                            if (item.type === 'single') {
                                const app = item.data;
                                const isCompleted =
                                    app.approval_status === 'approved' || app.approval_status === 'skipped';
                                const isRejected = app.approval_status === 'rejected';
                                const isPending = app.approval_status === 'pending';
                                const isCustomApproval = !app.masterflow_step_id;

                                const duration = getApprovalDuration(
                                    app as unknown as ApprovalForSLA,
                                    approvals as unknown as ApprovalForSLA[],
                                    documentUploadTime,
                                );

                                const durationFromUpload = getDurationFromUpload(
                                    app as unknown as ApprovalForSLA,
                                    documentUploadTime,
                                );

                                return (
                                    <div key={app.id} className="relative flex gap-3 sm:gap-4 pb-8 last:pb-0">
                                        {!isLast && (
                                            <div className="absolute top-8 bottom-0 left-[15px] -ml-px w-0.5 bg-border" />
                                        )}

                                        {/* Status Dot */}
                                        <div
                                            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ${
                                                isCompleted
                                                    ? 'border-green-600 text-green-600'
                                                    : isRejected
                                                    ? 'border-red-600 text-red-600'
                                                    : isPending
                                                    ? 'border-yellow-500 text-yellow-500'
                                                    : 'border-muted text-muted-foreground'
                                            }`}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2Icon className="h-4 w-4" />
                                            ) : isRejected ? (
                                                <XCircleIcon className="h-4 w-4" />
                                            ) : (
                                                <span className="text-xs font-bold">{index + 1}</span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                                            <div className="flex min-w-0 items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="truncate font-sans text-sm font-semibold sm:text-base">
                                                        {app.masterflow_step?.step_name ||
                                                            (isCustomApproval
                                                                ? `Custom Approver ${
                                                                      app.approval_order
                                                                          ? `(Order: ${app.approval_order})`
                                                                          : ''
                                                                  }`
                                                                : 'Approval Step')}
                                                    </div>
                                                    <div className="truncate text-xs font-medium text-foreground sm:text-sm">
                                                        {app.user?.name ||
                                                            app.user?.email ||
                                                            app.approver_email ||
                                                            app.masterflow_step?.jabatan?.name ||
                                                            '-'}
                                                    </div>
                                                    {app.masterflow_step?.jabatan && (
                                                        <div className="text-[10px] text-muted-foreground sm:text-xs">
                                                            {app.masterflow_step.jabatan.name}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="shrink-0">{getStatusBadge(app.approval_status)}</div>
                                            </div>

                                            {/* Approval Timestamp */}
                                            {app.tgl_approve && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
                                                    <IconClock className="h-3 w-3 shrink-0" />
                                                    <span>
                                                        {isCompleted ? 'Disetujui' : 'Ditolak'} pada{' '}
                                                        {formatDateTime(app.tgl_approve)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Approval Duration (SLA per step) */}
                                            {duration && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
                                                    <Timer className="h-3 w-3 shrink-0" />
                                                    <span>Durasi approval: {duration}</span>
                                                </div>
                                            )}

                                            {/* Approval Duration from document upload */}
                                            {durationFromUpload && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
                                                    <Timer className="h-3 w-3 shrink-0" />
                                                    <span>Durasi dari dokumen diupload: {durationFromUpload}</span>
                                                </div>
                                            )}

                                            {/* Comments & Rejection Notes */}
                                            {(app.comment || app.alasan_reject) && (
                                                <div
                                                    className={`mt-2 rounded-md border p-3 text-sm ${
                                                        isRejected
                                                            ? 'border-red-200 bg-red-50 text-red-900'
                                                            : 'border-border bg-muted/30'
                                                    }`}
                                                >
                                                    {app.alasan_reject && (
                                                        <div className="mb-1">
                                                            <span className="font-semibold text-red-700">
                                                                Alasan Penolakan:
                                                            </span>{' '}
                                                            {app.alasan_reject}
                                                        </div>
                                                    )}
                                                    {app.comment && (
                                                        <div>
                                                            <span className="font-medium">Komentar:</span> {app.comment}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Current User Indicator */}
                                            {currentApprovalId !== undefined && app.id === currentApprovalId && (
                                                <div className="mt-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="border-primary text-[10px] text-primary"
                                                    >
                                                        Posisi Anda
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            } else {
                                // GROUP RENDERING
                                const group = item;
                                const allApproved = group.data.every(
                                    (a) => a.approval_status === 'approved' || a.approval_status === 'skipped',
                                );
                                const anyRejected = group.data.some((a) => a.approval_status === 'rejected');
                                const oneApproved = group.data.some((a) => a.approval_status === 'approved');
                                const isGroupApproved = group.groupType === 'any_one' ? oneApproved : allApproved;

                                const statusColor = isGroupApproved
                                    ? 'border-green-600 text-green-600'
                                    : anyRejected
                                    ? 'border-red-600 text-red-600'
                                    : 'border-yellow-500 text-yellow-500';

                                return (
                                    <div key={`group-${group.groupIndex}`} className="relative flex gap-3 sm:gap-4 pb-8 last:pb-0">
                                        {!isLast && (
                                            <div className="absolute top-8 bottom-0 left-[15px] -ml-px w-0.5 bg-border" />
                                        )}

                                        <div
                                            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ${statusColor}`}
                                        >
                                            <IconUsers className="h-4 w-4" />
                                        </div>

                                        <div className="flex-1 pt-1">
                                            <div className="mb-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                                <div className="flex items-center justify-between border-b bg-muted/20 p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold">
                                                            {group.data[0]?.masterflow_step?.step_name || 'Group Approval'}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className="h-5 px-1.5 text-[10px] tracking-wide uppercase"
                                                        >
                                                            {getGroupRequirementText(group.groupType)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="divide-y p-0">
                                                    {group.data.map((app) => {
                                                        const isAnyOneGroup = group.groupType === 'any_one';
                                                        const someoneElseApproved = group.data.some(
                                                            (a) => a.id !== app.id && a.approval_status === 'approved',
                                                        );
                                                        const isAutoSkipped =
                                                            isAnyOneGroup &&
                                                            someoneElseApproved &&
                                                            app.approval_status === 'pending';

                                                        const isSkipped = app.approval_status === 'skipped' || isAutoSkipped;
                                                        const isMemberRejected = app.approval_status === 'rejected';

                                                        const duration = getApprovalDuration(
                                                            app as unknown as ApprovalForSLA,
                                                            approvals as unknown as ApprovalForSLA[],
                                                            documentUploadTime,
                                                        );

                                                        const durationFromUpload = getDurationFromUpload(
                                                            app as unknown as ApprovalForSLA,
                                                            documentUploadTime,
                                                        );

                                                        return (
                                                            <div
                                                                key={app.id}
                                                                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between"
                                                            >
                                                                <div className="space-y-1">
                                                                    <div className="text-sm font-medium">
                                                                        {app.user?.name ||
                                                                            app.user?.email ||
                                                                            app.approver_email ||
                                                                            app.masterflow_step?.jabatan?.name ||
                                                                            'Unknown'}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {app.masterflow_step?.jabatan?.name}
                                                                    </div>
                                                                    {isSkipped && (
                                                                        <div className="text-[10px] text-muted-foreground italic">
                                                                            *Otomatis di-skip karena grup sudah menyelesaikan
                                                                            approval.
                                                                        </div>
                                                                    )}
                                                                    {(app.comment || app.alasan_reject) && (
                                                                        <div
                                                                            className={`mt-2 rounded p-2 text-xs ${
                                                                                isMemberRejected
                                                                                    ? 'border border-red-200 bg-red-50 text-red-900'
                                                                                    : 'bg-muted/40'
                                                                            }`}
                                                                        >
                                                                            {app.alasan_reject && (
                                                                                <div className="font-medium text-red-600">
                                                                                    Alasan Penolakan: {app.alasan_reject}
                                                                                </div>
                                                                            )}
                                                                            {app.comment && (
                                                                                <div className="text-muted-foreground">
                                                                                    Komentar: "{app.comment}"
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                                                                    {getStatusBadge(isSkipped ? 'skipped' : app.approval_status)}
                                                                    {app.tgl_approve && (
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            {formatDateTime(app.tgl_approve)}
                                                                        </span>
                                                                    )}
                                                                    {/* Approval Duration (SLA per step) */}
                                                                    {duration && (
                                                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                            <Timer className="h-2.5 w-2.5 shrink-0" />
                                                                            <span>Durasi: {duration}</span>
                                                                        </span>
                                                                    )}
                                                                    {/* Approval Duration from document upload */}
                                                                    {durationFromUpload && (
                                                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                            <Timer className="h-2.5 w-2.5 shrink-0" />
                                                                            <span>Dari upload: {durationFromUpload}</span>
                                                                        </span>
                                                                    )}
                                                                    {currentApprovalId !== undefined &&
                                                                        app.id === currentApprovalId && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="border-primary text-[10px] text-primary"
                                                                            >
                                                                                Posisi Anda
                                                                            </Badge>
                                                                        )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default ApprovalTimeline;
