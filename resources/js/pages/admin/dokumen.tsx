import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Head } from '@inertiajs/react';
import { IconEdit, IconFileText, IconPlus, IconTrash } from '@tabler/icons-react';
import { CalendarIcon, FileTextIcon, SearchIcon, UserIcon } from 'lucide-react';
import { useState } from 'react';

interface Document {
    id: number;
    title: string;
    type: string;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    submitter: string;
    date: string;
    description: string;
}

// Sample data - nanti akan diganti dengan data dari backend
const sampleDocuments: Document[] = [
    {
        id: 1,
        title: 'Annual Report 2024',
        type: 'Report',
        status: 'approved',
        submitter: 'John Doe',
        date: '2024-10-10',
        description: 'Annual financial report for year 2024',
    },
    {
        id: 2,
        title: 'Budget Proposal Q1',
        type: 'Proposal',
        status: 'pending',
        submitter: 'Jane Smith',
        date: '2024-10-12',
        description: 'First quarter budget allocation proposal',
    },
    {
        id: 3,
        title: 'Marketing Strategy',
        type: 'Strategy',
        status: 'draft',
        submitter: 'Bob Johnson',
        date: '2024-10-08',
        description: 'Marketing strategy for new product launch',
    },
];

export default function DokumenManagement() {
    const [documents, setDocuments] = useState<Document[]>(sampleDocuments);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const getStatusBadge = (status: Document['status']) => {
        const statusConfig = {
            draft: { label: 'Draft', variant: 'secondary' as const },
            pending: { label: 'Pending', variant: 'default' as const },
            approved: { label: 'Approved', variant: 'default' as const },
            rejected: { label: 'Destructive', variant: 'destructive' as const },
        };

        const config = statusConfig[status];
        return (
            <Badge variant={config.variant} className="font-sans">
                {config.label}
            </Badge>
        );
    };

    const handleEdit = (document: Document) => {
        setSelectedDocument(document);
        setIsEditDialogOpen(true);
    };

    const handleDelete = (document: Document) => {
        setSelectedDocument(document);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (selectedDocument) {
            setDocuments(documents.filter((d) => d.id !== selectedDocument.id));
            setIsDeleteDialogOpen(false);
            setSelectedDocument(null);
        }
    };

    const filteredDocuments = documents.filter(
        (doc) =>
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.submitter.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.type.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <>
            <Head title="Dokumen Management" />
            <SidebarProvider>
                <NotificationListener />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                            <div className="space-y-8">
                                {/* Header Section */}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-foreground">
                                            <IconFileText className="h-6 w-6 text-primary" />
                                            Dokumen Management
                                        </h1>
                                        <p className="font-sans text-sm text-muted-foreground">Manage and track all documents in the system</p>
                                    </div>
                                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="font-sans">
                                                <IconPlus className="mr-2 h-4 w-4" />
                                                Create Document
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[600px]">
                                            <DialogHeader>
                                                <DialogTitle className="font-serif">Create New Document</DialogTitle>
                                                <DialogDescription className="font-sans">
                                                    Add a new document to the system. Click save when you're done.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="title" className="font-sans">
                                                        Document Title
                                                    </Label>
                                                    <Input id="title" placeholder="Enter document title" className="font-sans" />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="type" className="font-sans">
                                                        Document Type
                                                    </Label>
                                                    <Select>
                                                        <SelectTrigger className="font-sans">
                                                            <SelectValue placeholder="Select document type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="report" className="font-sans">
                                                                Report
                                                            </SelectItem>
                                                            <SelectItem value="proposal" className="font-sans">
                                                                Proposal
                                                            </SelectItem>
                                                            <SelectItem value="strategy" className="font-sans">
                                                                Strategy
                                                            </SelectItem>
                                                            <SelectItem value="memo" className="font-sans">
                                                                Memo
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="description" className="font-sans">
                                                        Description
                                                    </Label>
                                                    <Textarea
                                                        id="description"
                                                        placeholder="Enter document description"
                                                        className="font-sans"
                                                        rows={4}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="file" className="font-sans">
                                                        Upload File
                                                    </Label>
                                                    <Input id="file" type="file" className="font-sans" />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setIsCreateDialogOpen(false)}
                                                    className="font-sans"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button type="submit" className="font-sans">
                                                    Save Document
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid gap-4 md:grid-cols-4">
                                    <Card className="border-border bg-card">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="font-sans text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
                                            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="font-sans text-2xl font-bold text-foreground">{documents.length}</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="font-sans text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="font-sans text-2xl font-bold text-foreground">
                                                {documents.filter((d) => d.status === 'pending').length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="font-sans text-sm font-medium text-muted-foreground">Approved</CardTitle>
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="font-sans text-2xl font-bold text-foreground">
                                                {documents.filter((d) => d.status === 'approved').length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="font-sans text-sm font-medium text-muted-foreground">Draft</CardTitle>
                                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="font-sans text-2xl font-bold text-foreground">
                                                {documents.filter((d) => d.status === 'draft').length}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Documents Table */}
                                <Card className="border-border bg-card">
                                    <CardHeader>
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <CardTitle className="font-serif text-foreground">All Documents</CardTitle>
                                                <CardDescription className="font-sans">View and manage all documents in the system</CardDescription>
                                            </div>
                                            <div className="relative w-full sm:w-64">
                                                <SearchIcon className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="search"
                                                    placeholder="Search documents..."
                                                    className="pl-8 font-sans"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="font-sans font-semibold text-foreground">Title</TableHead>
                                                    <TableHead className="font-sans font-semibold text-foreground">Type</TableHead>
                                                    <TableHead className="font-sans font-semibold text-foreground">Status</TableHead>
                                                    <TableHead className="font-sans font-semibold text-foreground">Submitter</TableHead>
                                                    <TableHead className="font-sans font-semibold text-foreground">Date</TableHead>
                                                    <TableHead className="text-right font-sans font-semibold text-foreground">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredDocuments.length > 0 ? (
                                                    filteredDocuments.map((document) => (
                                                        <TableRow key={document.id}>
                                                            <TableCell className="font-sans font-medium text-foreground">{document.title}</TableCell>
                                                            <TableCell className="font-sans text-muted-foreground">{document.type}</TableCell>
                                                            <TableCell>{getStatusBadge(document.status)}</TableCell>
                                                            <TableCell className="font-sans text-muted-foreground">{document.submitter}</TableCell>
                                                            <TableCell className="font-sans text-muted-foreground">{document.date}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleEdit(document)}
                                                                        className="font-sans"
                                                                    >
                                                                        <IconEdit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => handleDelete(document)}
                                                                        className="font-sans"
                                                                    >
                                                                        <IconTrash className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center font-sans text-muted-foreground">
                                                            No documents found
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Edit Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle className="font-serif">Edit Document</DialogTitle>
                                <DialogDescription className="font-sans">Update document information. Click save when you're done.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-title" className="font-sans">
                                        Document Title
                                    </Label>
                                    <Input
                                        id="edit-title"
                                        defaultValue={selectedDocument?.title}
                                        placeholder="Enter document title"
                                        className="font-sans"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-type" className="font-sans">
                                        Document Type
                                    </Label>
                                    <Select defaultValue={selectedDocument?.type.toLowerCase()}>
                                        <SelectTrigger className="font-sans">
                                            <SelectValue placeholder="Select document type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="report" className="font-sans">
                                                Report
                                            </SelectItem>
                                            <SelectItem value="proposal" className="font-sans">
                                                Proposal
                                            </SelectItem>
                                            <SelectItem value="strategy" className="font-sans">
                                                Strategy
                                            </SelectItem>
                                            <SelectItem value="memo" className="font-sans">
                                                Memo
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-description" className="font-sans">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="edit-description"
                                        defaultValue={selectedDocument?.description}
                                        placeholder="Enter document description"
                                        className="font-sans"
                                        rows={4}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        setSelectedDocument(null);
                                    }}
                                    className="font-sans"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="font-sans">
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Confirm Delete</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Are you sure you want to delete "{selectedDocument?.title}"? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false);
                                        setSelectedDocument(null);
                                    }}
                                    className="font-sans"
                                >
                                    Cancel
                                </Button>
                                <Button type="button" variant="destructive" onClick={confirmDelete} className="font-sans">
                                    Delete
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
