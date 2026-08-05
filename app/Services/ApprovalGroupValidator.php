<?php

namespace App\Services;

use App\Models\DokumenApproval;
use Illuminate\Support\Collection;

/**
 * Service for validating group approval logic.
 * Handles three types of group approvals:
 * - all_required: All approvers must approve
 * - any_one: At least one approver must approve
 * - majority: More than 50% must approve
 */
class ApprovalGroupValidator
{
    /**
     * Check if a group approval is complete based on its jenis_group.
     *
     * @param int $dokumenId
     * @param string $groupIndex
     * @return array ['is_complete' => bool, 'status' => string, 'details' => array]
     */
    public function isGroupComplete(int $dokumenId, string $groupIndex): array
    {
        $approvals = DokumenApproval::where('dokumen_id', $dokumenId)
            ->where('group_index', $groupIndex)
            ->get();

        if ($approvals->isEmpty()) {
            return [
                'is_complete' => false,
                'status' => 'pending',
                'details' => [
                    'message' => 'No approvals found for this group',
                    'total' => 0,
                    'approved' => 0,
                    'rejected' => 0,
                    'pending' => 0,
                ],
            ];
        }

        // Get jenis_group from first approval (all in same group have same jenis_group)
        $jenisGroup = $approvals->first()->jenis_group;

        // If no jenis_group is set, treat as regular approval
        if (is_null($jenisGroup)) {
            return $this->checkRegularApproval($approvals);
        }

        // Check based on jenis_group type
        return match ($jenisGroup) {
            'all_required' => $this->checkAllRequired($approvals),
            'any_one' => $this->checkAnyOne($approvals),
            'majority' => $this->checkMajority($approvals),
            default => $this->checkRegularApproval($approvals),
        };
    }

    /**
     * Check if all approvers in group have approved.
     * Returns complete if ALL are approved.
     * Returns rejected if ANY is rejected.
     *
     * @param Collection $approvals
     * @return array
     */
    public function checkAllRequired(Collection $approvals): array
    {
        $total = $approvals->count();
        $approved = $approvals->where('approval_status', 'approved')->count();
        $rejected = $approvals->where('approval_status', 'rejected')->count();
        $pending = $approvals->where('approval_status', 'pending')->count();

        // If any rejected, group is rejected
        if ($rejected > 0) {
            return [
                'is_complete' => true,
                'status' => 'rejected',
                'details' => [
                    'message' => 'Group rejected: At least one approver rejected',
                    'total' => $total,
                    'approved' => $approved,
                    'rejected' => $rejected,
                    'pending' => $pending,
                    'type' => 'all_required',
                ],
            ];
        }

        // If all approved, group is complete
        if ($approved === $total) {
            return [
                'is_complete' => true,
                'status' => 'approved',
                'details' => [
                    'message' => 'Group approved: All approvers approved',
                    'total' => $total,
                    'approved' => $approved,
                    'rejected' => $rejected,
                    'pending' => $pending,
                    'type' => 'all_required',
                ],
            ];
        }

        // Still waiting for some approvals
        return [
            'is_complete' => false,
            'status' => 'pending',
            'details' => [
                'message' => "Waiting for all approvers ({$approved}/{$total} approved)",
                'total' => $total,
                'approved' => $approved,
                'rejected' => $rejected,
                'pending' => $pending,
                'type' => 'all_required',
            ],
        ];
    }

    /**
     * Check if at least one approver has approved.
     * Returns complete if ANY ONE is approved.
     * Returns rejected only if ALL are rejected.
     *
     * @param Collection $approvals
     * @return array
     */
    public function checkAnyOne(Collection $approvals): array
    {
        $total = $approvals->count();
        $approved = $approvals->where('approval_status', 'approved')->count();
        $rejected = $approvals->where('approval_status', 'rejected')->count();
        $pending = $approvals->where('approval_status', 'pending')->count();

        // If at least one approved, group is complete
        if ($approved > 0) {
            return [
                'is_complete' => true,
                'status' => 'approved',
                'details' => [
                    'message' => 'Group approved: At least one approver approved',
                    'total' => $total,
                    'approved' => $approved,
                    'rejected' => $rejected,
                    'pending' => $pending,
                    'type' => 'any_one',
                ],
            ];
        }

        // If all rejected, group is rejected
        if ($rejected === $total) {
            return [
                'is_complete' => true,
                'status' => 'rejected',
                'details' => [
                    'message' => 'Group rejected: All approvers rejected',
                    'total' => $total,
                    'approved' => $approved,
                    'rejected' => $rejected,
                    'pending' => $pending,
                    'type' => 'any_one',
                ],
            ];
        }

        // Still waiting for at least one approval
        return [
            'is_complete' => false,
            'status' => 'pending',
            'details' => [
                'message' => 'Waiting for at least one approval',
                'total' => $total,
                'approved' => $approved,
                'rejected' => $rejected,
                'pending' => $pending,
                'type' => 'any_one',
            ],
        ];
    }

    /**
     * Check if majority (>50%) have approved.
     * Returns complete if >50% approved OR if it's impossible to reach majority.
     *
     * @param Collection $approvals
     * @return array
     */
    public function checkMajority(Collection $approvals): array
    {
        $total = $approvals->count();
        $approved = $approvals->where('approval_status', 'approved')->count();
        $rejected = $approvals->where('approval_status', 'rejected')->count();
        $pending = $approvals->where('approval_status', 'pending')->count();

        $majorityThreshold = ceil($total / 2); // >50% means at least ceil(total/2)

        // If majority approved, group is approved
        if ($approved >= $majorityThreshold) {
            return [
                'is_complete' => true,
                'status' => 'approved',
                'details' => [
                    'message' => "Group approved: Majority reached ({$approved}/{$total})",
                    'total' => $total,
                    'approved' => $approved,
                    'rejected' => $rejected,
                    'pending' => $pending,
                    'majority_threshold' => $majorityThreshold,
                    'type' => 'majority',
                ],
            ];
        }

        // Check if it's impossible to reach majority (too many rejected)
        $maxPossibleApproved = $approved + $pending;
        if ($maxPossibleApproved < $majorityThreshold) {
            return [
                'is_complete' => true,
                'status' => 'rejected',
                'details' => [
                    'message' => "Group rejected: Cannot reach majority ({$rejected} rejected, need {$majorityThreshold})",
                    'total' => $total,
                    'approved' => $approved,
                    'rejected' => $rejected,
                    'pending' => $pending,
                    'majority_threshold' => $majorityThreshold,
                    'type' => 'majority',
                ],
            ];
        }

        // Still waiting for more votes
        return [
            'is_complete' => false,
            'status' => 'pending',
            'details' => [
                'message' => "Waiting for majority ({$approved}/{$majorityThreshold} approved)",
                'total' => $total,
                'approved' => $approved,
                'rejected' => $rejected,
                'pending' => $pending,
                'majority_threshold' => $majorityThreshold,
                'type' => 'majority',
            ],
        ];
    }

    /**
     * Regular approval check (no group logic).
     *
     * @param Collection $approvals
     * @return array
     */
    private function checkRegularApproval(Collection $approvals): array
    {
        $total = $approvals->count();
        $approved = $approvals->where('approval_status', 'approved')->count();
        $rejected = $approvals->where('approval_status', 'rejected')->count();
        $pending = $approvals->where('approval_status', 'pending')->count();

        if ($approved === $total) {
            return [
                'is_complete' => true,
                'status' => 'approved',
                'details' => [
                    'message' => 'All approvals completed',
                    'total' => $total,
                    'approved' => $approved,
                    'rejected' => $rejected,
                    'pending' => $pending,
                    'type' => 'regular',
                ],
            ];
        }

        if ($rejected > 0) {
            return [
                'is_complete' => true,
                'status' => 'rejected',
                'details' => [
                    'message' => 'At least one approval rejected',
                    'total' => $total,
                    'approved' => $approved,
                    'rejected' => $rejected,
                    'pending' => $pending,
                    'type' => 'regular',
                ],
            ];
        }

        return [
            'is_complete' => false,
            'status' => 'pending',
            'details' => [
                'message' => 'Waiting for approvals',
                'total' => $total,
                'approved' => $approved,
                'rejected' => $rejected,
                'pending' => $pending,
                'type' => 'regular',
            ],
        ];
    }

    /**
     * Get all unique groups for a document.
     *
     * @param int $dokumenId
     * @return Collection
     */
    public function getDocumentGroups(int $dokumenId): Collection
    {
        return DokumenApproval::where('dokumen_id', $dokumenId)
            ->whereNotNull('group_index')
            ->select('group_index', 'jenis_group')
            ->distinct()
            ->get();
    }

    /**
     * Check all groups for a document and return their statuses.
     *
     * @param int $dokumenId
     * @return array
     */
    public function checkAllGroups(int $dokumenId): array
    {
        $groups = $this->getDocumentGroups($dokumenId);
        $results = [];

        foreach ($groups as $group) {
            $results[$group->group_index] = $this->isGroupComplete($dokumenId, $group->group_index);
        }

        return $results;
    }
}
