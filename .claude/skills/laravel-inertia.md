# Laravel + Inertia.js Skill

## Tech Stack

- **Backend**: Laravel 11 (PHP 8.2+)
- **Frontend**: React 18 + TypeScript + Inertia.js
- **Styling**: Tailwind CSS + ShadCN UI
- **Database**: MySQL/PostgreSQL
- **Build Tool**: Vite

## Project Structure

```
app/                    # Laravel application code
├── Http/Controllers/   # Controllers (Inertia responses)
├── Models/             # Eloquent models
├── Services/           # Business logic services
└── Policies/           # Authorization policies

resources/
├── js/
│   ├── components/     # React components
│   ├── pages/          # Inertia pages
│   ├── layouts/        # Layout components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Utilities
└── css/                # Stylesheets

routes/
├── web.php             # Web routes
└── api.php             # API routes

database/
├── migrations/         # Database migrations
└── seeders/            # Database seeders
```

## Commands

### Development

```bash
# Start Laravel dev server
php artisan serve

# Start Vite dev server
npm run dev

# Run both (recommended)
composer run dev
```

### Database

```bash
# Run migrations
php artisan migrate

# Fresh migration with seeders
php artisan migrate:fresh --seed

# Create migration
php artisan make:migration create_table_name
```

### Laravel Artisan

```bash
# Create controller
php artisan make:controller NameController

# Create model with migration
php artisan make:model Name -m

# Create request validation
php artisan make:request NameRequest

# Clear all caches
php artisan optimize:clear
```

### Testing

```bash
# Run PHP tests (Pest)
php artisan test

# Run specific test
php artisan test --filter=TestName
```

## Inertia.js Patterns

### Controller Response

```php
use Inertia\Inertia;

public function index()
{
    return Inertia::render('Dashboard', [
        'users' => User::all(),
    ]);
}
```

### Page Component

```tsx
import { Head } from '@inertiajs/react';

interface Props {
    users: User[];
}

export default function Dashboard({ users }: Props) {
    return (
        <>
            <Head title="Dashboard" />
            {/* content */}
        </>
    );
}
```

### Form Handling

```tsx
import { useForm } from '@inertiajs/react';

const { data, setData, post, processing, errors } = useForm({
    name: '',
    email: '',
});

const submit = (e: FormEvent) => {
    e.preventDefault();
    post(route('users.store'));
};
```

## ShadCN UI

Components are located in `resources/js/components/ui/`. To add new components:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

## Best Practices

1. Use TypeScript interfaces for all props
2. Use Laravel Form Requests for validation
3. Use Policies for authorization
4. Keep controllers thin, use Services for business logic
5. Use `route()` helper for named routes
6. Use Inertia's `preserveState` for partial reloads
