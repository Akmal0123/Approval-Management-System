<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Company>
 */
class CompanyFactory extends Factory
{
    protected $model = Company::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name'         => $this->faker->company(),
            'address'      => $this->faker->address(),
            'phone_number' => $this->faker->phoneNumber(),
            'base_url'     => $this->faker->optional()->url(),
        ];
    }
}
