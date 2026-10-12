import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from 'lucide-react';
import { useState } from 'react';

const PAGE_SIZE = 5;

interface ReportDoc {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    status: string;
    status_detail: string;
    tgl_pengajuan: string | null;
    user: string;
}

interface GroupedData {
    [company: string]: {
        [aplikasi: string]: {
            [transaksi: string]: ReportDoc[];
        };
    };
}

interface Props {
    groupedData: GroupedData;
}

// ─── Pagination helper ────────────────────────────────────────────────────────
function PaginatedTable({ docs, groupKey }: { docs: ReportDoc[]; groupKey: string }) {
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(docs.length / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const visibleDocs = docs.slice(start, start + PAGE_SIZE);

    return (
        <div>
            {/* Table – no horizontal scroll */}
            <div className="rounded-md border w-full">
                <Table className="w-full table-fixed">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[14%]">No Dokumen</TableHead>
                            <TableHead className="w-[34%]">Judul</TableHead>
                            <TableHead className="w-[12%]">Pengaju</TableHead>
                            <TableHead className="w-[28%]">Status</TableHead>
                            <TableHead className="w-[12%]">Tgl Pengajuan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleDocs.map(doc => (
                            <TableRow key={doc.id}>
                                <TableCell className="font-medium truncate">{doc.nomor_dokumen}</TableCell>
                                <TableCell className="truncate" title={doc.judul_dokumen}>{doc.judul_dokumen}</TableCell>
                                <TableCell className="truncate">{doc.user}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap items-center gap-1">
                                        <Badge
                                            variant={doc.status === 'Approved' ? 'default' : 'secondary'}
                                            className={doc.status === 'Approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                                        >
                                            {doc.status}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground truncate">{doc.status_detail}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{doc.tgl_pengajuan || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination bar */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 px-1">
                    <p className="text-xs text-muted-foreground">
                        Menampilkan {start + 1}–{Math.min(start + PAGE_SIZE, docs.length)} dari {docs.length} dokumen
                    </p>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeftIcon className="h-3.5 w-3.5" />
                        </Button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <Button
                                key={p}
                                variant={p === page ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 w-7 p-0 text-xs"
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </Button>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRightIcon className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportIndex({ groupedData }: Props) {
    const handleExport = () => {
        const rows = [
            ['Company', 'Aplikasi', 'Transaksi', 'No Dokumen', 'Judul', 'Pengaju', 'Status', 'Status Detail', 'Tgl Pengajuan'],
        ];

        Object.entries(groupedData).forEach(([company, aplikasiGroup]) => {
            Object.entries(aplikasiGroup).forEach(([aplikasi, transaksiGroup]) => {
                Object.entries(transaksiGroup).forEach(([transaksi, docs]) => {
                    docs.forEach(doc => {
                        rows.push([
                            company,
                            aplikasi,
                            transaksi,
                            doc.nomor_dokumen,
                            `"${doc.judul_dokumen}"`,
                            doc.user,
                            doc.status,
                            doc.status_detail,
                            doc.tgl_pengajuan || '-',
                        ]);
                    });
                });
            });
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', 'report_dokumen.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Report', href: '/report' }]}>
            <Head title="Report Dokumen" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Report Dokumen</h1>
                        <p className="text-muted-foreground text-sm">
                            Laporan dokumen berdasarkan company, aplikasi, dan transaksi.
                        </p>
                    </div>
                    <Button onClick={handleExport} className="flex items-center gap-2">
                        <DownloadIcon className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-6">
                    {Object.keys(groupedData).length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <p className="text-muted-foreground">Tidak ada data dokumen untuk ditampilkan.</p>
                            </CardContent>
                        </Card>
                    )}

                    {Object.entries(groupedData).map(([company, aplikasiGroup]) => (
                        <Card key={company} className="border-t-4 border-t-primary">
                            <CardHeader>
                                <CardTitle className="text-xl">Company: {company}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-6">
                                {Object.entries(aplikasiGroup).map(([aplikasi, transaksiGroup]) => (
                                    <div key={aplikasi} className="rounded-lg border p-4 shadow-sm">
                                        <h3 className="mb-4 text-lg font-semibold text-primary">
                                            Aplikasi: {aplikasi}
                                        </h3>

                                        <div className="flex flex-col gap-6">
                                            {Object.entries(transaksiGroup).map(([transaksi, docs]) => (
                                                <div key={transaksi} className="pl-4 border-l-2">
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <h4 className="font-medium">Transaksi: {transaksi}</h4>
                                                        <span className="text-xs text-muted-foreground">
                                                            {docs.length} dokumen
                                                        </span>
                                                    </div>
                                                    <PaginatedTable
                                                        docs={docs}
                                                        groupKey={`${company}-${aplikasi}-${transaksi}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
