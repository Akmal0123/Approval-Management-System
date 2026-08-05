import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import { Eye, FileText } from 'lucide-react';

interface Document {
    id: number;
    name: string;
    status: string;
    submitted_at: string;
    category: string;
    size: string;
}

interface UserDocumentTableProps {
    documents?: Document[];
}

export default function UserDocumentTable({ documents = [] }: UserDocumentTableProps) {
    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'default';
            case 'pending':
            case 'in_review':
                return 'secondary';
            case 'rejected':
                return 'destructive';
            case 'draft':
                return 'outline';
            default:
                return 'outline';
        }
    };

    if (!documents || documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first document.</p>
                <Button asChild className="mt-4">
                    <Link href="/dokumen">Create Document</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell className="text-muted-foreground">{doc.category}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(doc.status)}>{doc.status}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{doc.submitted_at}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/dokumen/${doc.id}`}>
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
