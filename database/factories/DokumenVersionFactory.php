<?php

namespace Database\Factories;

use App\Models\DokumenVersion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DokumenVersion>
 */
class DokumenVersionFactory extends Factory
{
    protected $model = DokumenVersion::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'dokumen_id'   => \App\Models\Dokumen::factory(),
            'version'      => '1.0',
            'nama_file'    => $this->faker->word() . '.pdf',
            'tgl_upload'   => now(),
            'tipe_file'    => 'pdf',
            'file_url'     => 'dokumen/original/' . $this->faker->uuid() . '.pdf',
            'size_file'    => $this->faker->numberBetween(1024, 10240000),
            'signed_file_url' => null,
        ];
    }
}
