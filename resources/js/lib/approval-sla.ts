/**
 * Approval SLA and Duration Helper Utilities
 */

export interface ApprovalForSLA {
    id: number;
    approval_order?: number;
    masterflow_step_id?: number;
    masterflow_step?: {
        id?: number;
        step_order: number;
        step_name?: string;
    };
    approval_status: string;
    group_index?: string | null;
    jenis_group?: string | null;
    tgl_approve?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * Get the step order for an approval item.
 */
export function getStepOrder(approval: ApprovalForSLA): number {
    return approval.masterflow_step?.step_order ?? approval.approval_order ?? 0;
}

/**
 * Determine the start time for a specific approval.
 * - Step 1: approval created_at (or document submission date).
 * - Step N (N > 1): max tgl_approve from all completed approvals in previous steps.
 */
export function getApprovalStartTime(
    approval: ApprovalForSLA,
    allApprovals?: ApprovalForSLA[],
    documentCreatedAt?: string | null,
): Date | null {
    if (!allApprovals || allApprovals.length === 0) {
        if (approval.created_at) return new Date(approval.created_at);
        if (documentCreatedAt) return new Date(documentCreatedAt);
        return null;
    }

    const currentStepOrder = getStepOrder(approval);

    // Find all distinct step orders sorted ascending
    const stepOrders = Array.from(new Set(allApprovals.map(getStepOrder))).sort((a, b) => a - b);
    const minStepOrder = stepOrders[0] ?? 0;

    // If lowest step order (Level 1), start time is when approval was created
    if (currentStepOrder <= minStepOrder) {
        if (approval.created_at) return new Date(approval.created_at);
        if (documentCreatedAt) return new Date(documentCreatedAt);
        return null;
    }

    // For step > minStepOrder, find all approvals in previous steps that finished
    const previousCompletedApprovals = allApprovals.filter((a) => {
        const step = getStepOrder(a);
        return step < currentStepOrder && a.tgl_approve;
    });

    if (previousCompletedApprovals.length > 0) {
        const timestamps = previousCompletedApprovals
            .map((a) => new Date(a.tgl_approve!).getTime())
            .filter((t) => !isNaN(t));

        if (timestamps.length > 0) {
            return new Date(Math.max(...timestamps));
        }
    }

    // Fallback to approval's created_at or document submission date
    if (approval.created_at) return new Date(approval.created_at);
    if (documentCreatedAt) return new Date(documentCreatedAt);
    return null;
}

/**
 * Format milliseconds into human readable duration string.
 * Examples: '25 menit', '4 jam 27 menit', '1 hari 3 jam', '2 hari 5 jam 15 menit', '< 1 menit'
 */
export function formatDuration(diffMs: number): string {
    if (diffMs < 0 || isNaN(diffMs)) {
        return '< 1 menit';
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    if (totalMinutes < 1) {
        return '< 1 menit';
    }

    const days = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutes = totalMinutes % (24 * 60);
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} hari`);
    if (hours > 0) parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);

    return parts.join(' ');
}

/**
 * Calculate the actual approval duration for display in the timeline card.
 * Returns formatted string or null if not applicable (e.g. waiting, skipped, cancelled).
 */
export function getApprovalDuration(
    approval: ApprovalForSLA,
    allApprovals?: ApprovalForSLA[],
    documentCreatedAt?: string | null,
): string | null {
    // Only show duration for approved, rejected, or pending status
    if (!['approved', 'rejected', 'pending'].includes(approval.approval_status)) {
        return null;
    }

    const startTime = getApprovalStartTime(approval, allApprovals, documentCreatedAt);
    if (!startTime || isNaN(startTime.getTime())) {
        return null;
    }

    let endTime: Date;
    if (approval.approval_status === 'pending') {
        endTime = new Date();
    } else if (approval.tgl_approve) {
        endTime = new Date(approval.tgl_approve);
    } else {
        return null;
    }

    if (isNaN(endTime.getTime())) {
        return null;
    }

    const diffMs = endTime.getTime() - startTime.getTime();
    return formatDuration(diffMs);
}
