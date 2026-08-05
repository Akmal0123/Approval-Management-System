import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Download, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    fileUrl: string;
    fileName?: string;
    onDownload?: () => void;
    onFullscreen?: () => void;
    showControls?: boolean;
    height?: string;
}

export default function PDFViewer({
    fileUrl,
    fileName = 'document.pdf',
    onDownload,
    onFullscreen,
    showControls = true,
    height = '600px',
}: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoading(false);
        setError(null);
    }

    function onDocumentLoadError(error: Error) {
        console.error('Error loading PDF:', error);
        setError('Gagal memuat dokumen PDF. Silakan coba lagi.');
        setLoading(false);
    }

    const changePage = (offset: number) => {
        setPageNumber((prevPageNumber) => {
            const newPageNumber = prevPageNumber + offset;
            return Math.min(Math.max(1, newPageNumber), numPages);
        });
    };

    const previousPage = () => changePage(-1);
    const nextPage = () => changePage(1);

    const zoomIn = () => {
        setScale((prevScale) => Math.min(prevScale + 0.2, 3.0));
    };

    const zoomOut = () => {
        setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
    };

    const resetZoom = () => {
        setScale(1.0);
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            {showControls && (
                <Card className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Page Navigation */}
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={previousPage} disabled={pageNumber <= 1 || loading}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-sans text-sm">
                                Halaman {pageNumber} dari {numPages || '...'}
                            </span>
                            <Button variant="outline" size="sm" onClick={nextPage} disabled={pageNumber >= numPages || loading}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5 || loading}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="font-mono text-sm font-medium">{Math.round(scale * 100)}%</span>
                            <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3.0 || loading}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={resetZoom} disabled={loading}>
                                Reset
                            </Button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            {onFullscreen && (
                                <Button variant="outline" size="sm" onClick={onFullscreen}>
                                    <Maximize2 className="mr-2 h-4 w-4" />
                                    Fullscreen
                                </Button>
                            )}
                            {onDownload && (
                                <Button variant="outline" size="sm" onClick={onDownload}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* PDF Viewer */}
            <div className="overflow-auto rounded-lg border border-border bg-muted/30" style={{ height }}>
                {loading && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                            <p className="mt-2 text-sm text-muted-foreground">Memuat dokumen...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <p className="text-sm text-red-600">{error}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                                Coba Lagi
                            </Button>
                        </div>
                    </div>
                )}

                {!error && (
                    <div className="flex justify-center p-4">
                        <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading=""
                            error=""
                            className="flex justify-center"
                        >
                            <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} className="shadow-lg" />
                        </Document>
                    </div>
                )}
            </div>

            {/* Page Info */}
            {!loading && !error && numPages > 0 && (
                <div className="text-center">
                    <p className="font-sans text-xs text-muted-foreground">
                        Total {numPages} halaman • Zoom {Math.round(scale * 100)}%
                    </p>
                </div>
            )}
        </div>
    );
}
