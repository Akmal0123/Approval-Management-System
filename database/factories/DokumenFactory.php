<?php

namespace Database\Factories;

use App\Models\Dokumen;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Dokumen>
 */
class DokumenFactory extends Factory
{
    protected $model = Dokumen::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'nomor_dokumen'  => 'DOC-' . $this->faker->unique()->numerify('####'),
            'judul_dokumen'  => $this->faker->sentence(4),
            'nominal'        => $this->faker->optional()->randomFloat(2, 1000, 1000000),
            'user_id'        => \App\Models\User::factory(),
            'company_id'     => \App\Models\Company::factory(),
            'aplikasi_id'    => \App\Models\Aplikasi::factory(),
            'transaksi_id'   => null,
            'tipe_dokumen'   => $this->faker->optional()->word(),
            'masterflow_id'  => null,
            'comment_id'     => null,
            'status'         => 'draft',
            'tgl_pengajuan'  => now(),
            'tgl_deadline'   => $this->faker->optional()->dateTimeBetween('now', '+30 days'),
            'deskripsi'      => $this->faker->optional()->paragraph(),
            'status_current' => null,
        ];
    }

    /**
     * Indicate document is under review.
     */
    public function underReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'under_review',
        ]);
    }

    /**
     * Indicate document is approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
        ]);
    }

    /**
     * Indicate document is rejected.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
        ]);
    }
}
