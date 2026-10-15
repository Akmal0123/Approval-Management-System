<?php

namespace Database\Factories;

use App\Models\UserRole;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UserRole>
 */
class UserRoleFactory extends Factory
{
    protected $model = UserRole::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'role_name' => $this->faker->randomElement(['User', 'Admin', 'Super Admin']),
        ];
    }

    /**
     * Create a User role.
     */
    public function user(): static
    {
        return $this->state(fn (array $attributes) => [
            'role_name' => 'User',
        ]);
    }

    /**
     * Create an Admin role.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role_name' => 'Admin',
        ]);
    }

    /**
     * Create a Super Admin role.
     */
    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role_name' => 'Super Admin',
        ]);
    }
}
