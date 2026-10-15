<?php

namespace Database\Factories;

use App\Models\MasterflowStep;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MasterflowStep>
 */
class MasterflowStepFactory extends Factory
{
    protected $model = MasterflowStep::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'masterflow_id' => \App\Models\Masterflow::factory(),
            'jabatan_id'    => \App\Models\Jabatan::factory(),
            'step_order'    => 1,
            'step_name'     => 'Step ' . $this->faker->word(),
            'description'   => $this->faker->sentence(),
            'is_required'   => true,
            'min_nominal'   => null,
            'group_index'   => null,
            'jenis_group'   => null,
            'users_in_group' => null,
        ];
    }
}
