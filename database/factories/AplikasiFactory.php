<?php

namespace Database\Factories;

use App\Models\Aplikasi;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Aplikasi>
 */
class AplikasiFactory extends Factory
{
    protected $model = Aplikasi::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name'       => $this->faker->word() . ' App',
            'company_id' => \App\Models\Company::factory(),
            'path_api'   => $this->faker->optional()->url(),
        ];
    }
}
