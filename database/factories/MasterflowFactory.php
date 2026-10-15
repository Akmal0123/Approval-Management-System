<?php

namespace Database\Factories;

use App\Models\Masterflow;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Masterflow>
 */
class MasterflowFactory extends Factory
{
    protected $model = Masterflow::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'company_id'   => \App\Models\Company::factory(),
            'transaksi_id' => null,
            'name'         => 'Masterflow ' . $this->faker->word(),
            'description'  => $this->faker->sentence(),
            'is_active'    => true,
            'total_steps'  => 0,
        ];
    }

    /**
     * Indicate that the masterflow is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
