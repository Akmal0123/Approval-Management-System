# React + TypeScript Skill

## TypeScript Patterns

### Component Props

```tsx
interface ButtonProps {
    variant?: 'default' | 'destructive' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    onClick?: () => void;
}

export function Button({ variant = 'default', ...props }: ButtonProps) {
    // ...
}
```

### Inertia Page Props

```tsx
import { PageProps } from '@/types';

interface DashboardPageProps extends PageProps {
    documents: Document[];
    stats: {
        pending: number;
        approved: number;
    };
}

export default function Dashboard({ documents, stats, auth }: DashboardPageProps) {
    // auth.user tersedia dari PageProps
}
```

### Generic Types

```tsx
interface PaginatedResponse<T> {
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

type DocumentList = PaginatedResponse<Document>;
```

## React Patterns

### Custom Hooks

```tsx
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
```

### Form with Validation

```tsx
import { useForm } from '@inertiajs/react';
import { z } from 'zod';

const schema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
});

function DocumentForm() {
    const { data, setData, post, errors, processing } = useForm({
        title: '',
        description: '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const result = schema.safeParse(data);
        if (result.success) {
            post(route('documents.store'));
        }
    };
}
```

### Context Pattern

```tsx
interface AuthContextType {
    user: User | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
```

## File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `DocumentCard.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-debounce.ts`)
- Utils: `kebab-case.ts` (e.g., `format-date.ts`)
- Types: `kebab-case.ts` or inline in component

## Import Aliases

```tsx
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/utils';
import { PageProps } from '@/types';
```
