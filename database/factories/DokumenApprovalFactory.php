<?php

namespace Database\Factories;

use App\Models\DokumenApproval;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DokumenApproval>
 */
class DokumenApprovalFactory extends Factory
{
    protected $model = DokumenApproval::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'dokumen_id'           => \App\Models\Dokumen::factory(),
            'user_id'              => \App\Models\User::factory(),
            'approver_email'       => null,
            'dokumen_version_id'   => null,
            'masterflow_step_id'   => \App\Models\MasterflowStep::factory(),
            'approval_order'       => 1,
            'approval_status'      => 'pending',
            'tgl_approve'          => null,
            'tgl_deadline'         => null,
            'group_index'          => null,
            'jenis_group'          => null,
            'alasan_reject'        => null,
            'comment'              => null,
            'signature_path'       => null,
            'signature_method'     => null,
            'verification_token'   => null,
            'revision_notes'       => null,
            'revision_requested_by' => null,
            'revision_requested_at' => null,
        ];
    }

    /**
     * Indicate approval is approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'approval_status' => 'approved',
            'tgl_approve'     => now(),
        ]);
    }

    /**
     * Indicate approval is rejected.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'approval_status' => 'rejected',
            'tgl_approve'     => now(),
            'alasan_reject'   => $this->faker->sentence(),
        ]);
    }

    /**
     * Indicate approval has QR signature.
     */
    public function withQrSignature(): static
    {
        return $this->state(fn (array $attributes) => [
            'approval_status'    => 'approved',
            'tgl_approve'        => now(),
            'signature_method'   => 'qr',
            'verification_token' => Str::uuid()->toString(),
        ]);
    }
}
