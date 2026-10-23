import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Maximize2, Minimize2, RefreshCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker using locally hosted worker (no unpkg.com dependency)
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs?v=${pdfjs.version}`;
} else {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

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
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const viewerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const hasAutoFit = useRef(false);

    // Authenticated blob state
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [fetchLoading, setFetchLoading] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState<number>(0);

    const loadPdfBlob = useCallback(() => {
        let isCancelled = false;
        let createdBlobUrl: string | null = null;

        if (!fileUrl) {
            setBlobUrl(null);
            setFetchLoading(false);
            setFetchError(null);
            return () => {};
        }

        // Direct blob or data URL
        if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
            setBlobUrl(fileUrl);
            setFetchLoading(false);
            setFetchError(null);
            return () => {};
        }

        setFetchLoading(true);
        setFetchError(null);

        const fullUrl = fileUrl.startsWith('http')
            ? fileUrl
            : `${window.location.origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;

        fetch(fullUrl, {
            credentials: 'include',
            headers: {
                Accept: 'application/pdf, */*',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (response) => {
                if (!response.ok) {
                    let errorMsg = '';
                    try {
                        const json = await response.json();
                        errorMsg = json.message || json.error;
                    } catch {
                        // ignore
                    }

                    if (response.status === 401 || response.status === 403) {
                        throw new Error(errorMsg || 'Sesi login tidak valid atau Anda tidak memiliki izin untuk melihat dokumen ini.');
                    }
                    if (response.status === 404) {
                        throw new Error(errorMsg || 'File dokumen tidak ditemukan di server.');
                    }
                    throw new Error(errorMsg || `Gagal mengambil dokumen (HTTP status ${response.status}).`);
                }
                return response.blob();
            })
            .then((blob) => {
                if (isCancelled) return;
                if (blob.size === 0) {
                    throw new Error('Dokumen PDF kosong (0 bytes).');
                }
                createdBlobUrl = URL.createObjectURL(blob);
                setBlobUrl(createdBlobUrl);
                setFetchLoading(false);
            })
            .catch((err: any) => {
                if (isCancelled) return;
                console.error('Error fetching PDF blob:', err);
                setFetchError(err.message || 'Gagal memuat dokumen PDF.');
                setFetchLoading(false);
            });

        return () => {
            isCancelled = true;
            if (createdBlobUrl) {
                URL.revokeObjectURL(createdBlobUrl);
            }
        };
    }, [fileUrl]);

    useEffect(() => {
        const cleanup = loadPdfBlob();
        return () => {
            if (cleanup) cleanup();
        };
    }, [loadPdfBlob, reloadKey]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    useEffect(() => {
        hasAutoFit.current = false;
        setPageNumber(1);
        setScale(1.0);
        pageRefs.current = {};
        setLoading(true);
        setError(null);
    }, [blobUrl]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoading(false);
        setError(null);
    }

    function onDocumentLoadError(error: Error) {
        console.error('Error loading PDF in react-pdf:', error);
        setError('Gagal merender dokumen PDF di browser. Silakan gunakan tombol Buka Langsung.');
        setLoading(false);
    }

    const onPageLoadSuccess = (page: any) => {
        if (hasAutoFit.current || window.innerWidth >= 768) return;

        const pageWidth = page.getViewport({ scale: 1 }).width;
        const availableWidth = (viewerRef.current?.clientWidth ?? 0) - 32;
        if (pageWidth > 0 && availableWidth > 0) {
            setScale(Math.min(1, Math.max(0.3, availableWidth / pageWidth)));
            hasAutoFit.current = true;
        }
    };

    const changePage = (offset: number) => {
        const targetPage = Math.min(Math.max(1, pageNumber + offset), numPages);
        setPageNumber(targetPage);
        pageRefs.current[targetPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const previousPage = () => changePage(-1);
    const nextPage = () => changePage(1);

    const zoomIn = () => {
        setScale((prevScale) => Math.min(prevScale + 0.2, 3.0));
    };

    const zoomOut = () => {
        setScale((prevScale) => Math.max(prevScale - 0.2, 0.3));
    };

    const resetZoom = () => {
        setScale(1.0);
    };

    const handleRetry = () => {
        setError(null);
        setFetchError(null);
        setLoading(true);
        setFetchLoading(true);
        setReloadKey((prev) => prev + 1);
    };

    const handleDirectOpen = () => {
        if (blobUrl) {
            window.open(blobUrl, '_blank');
        } else if (fileUrl) {
            const fullUrl = fileUrl.startsWith('http')
                ? fileUrl
                : `${window.location.origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
            window.open(fullUrl, '_blank');
        }
    };

    const handleDownloadClick = () => {
        if (onDownload) {
            onDownload();
            return;
        }
        const link = document.createElement('a');
        link.href = blobUrl || fileUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isAnyLoading = fetchLoading || loading;
    const activeError = fetchError || error;

    return (
        <div className={isFullscreen ? "fixed inset-0 z-[99999] flex flex-col bg-background p-3 sm:p-4 shadow-2xl" : "flex h-full min-h-0 min-w-0 flex-col gap-3 sm:gap-4"}>
            {/* Controls */}
            {showControls && (
                <Card className="shrink-0 p-2 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                        {/* Title when Fullscreen */}
                        {isFullscreen && (
                            <div className="flex items-center gap-2 max-w-[280px] sm:max-w-md truncate">
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                    Layar Penuh
                                </span>
                                <span className="truncate text-xs sm:text-sm font-medium text-foreground" title={fileName}>
                                    {fileName}
                                </span>
                            </div>
                        )}

                        {/* Page Navigation */}
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={previousPage} disabled={pageNumber <= 1 || isAnyLoading}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-sans text-sm">
                                Halaman {pageNumber} dari {numPages || '...'}
                            </span>
                            <Button variant="outline" size="sm" onClick={nextPage} disabled={pageNumber >= numPages || isAnyLoading}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5 || isAnyLoading}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="font-mono text-sm font-medium">{Math.round(scale * 100)}%</span>
                            <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3.0 || isAnyLoading}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={resetZoom} disabled={isAnyLoading} className="hidden sm:inline-flex">
                                Reset
                            </Button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleDirectOpen}
                                title="Buka PDF langsung di browser / viewer bawaan"
                                className="hidden sm:inline-flex gap-1.5"
                            >
                                <ExternalLink className="h-4 w-4" />
                                <span>Buka Tab Baru</span>
                            </Button>

                            {isFullscreen ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsFullscreen(false)}
                                    className="gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 font-semibold"
                                    title="Tutup Layar Penuh (Esc)"
                                >
                                    <X className="h-4 w-4" />
                                    <span>Tutup Fullscreen</span>
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (onFullscreen) {
                                            onFullscreen();
                                        } else {
                                            setIsFullscreen(true);
                                        }
                                    }}
                                    className="gap-1.5"
                                    title="Tampilkan Layar Penuh"
                                >
                                    <Maximize2 className="h-4 w-4" />
                                    <span>Fullscreen</span>
                                </Button>
                            )}

                            <Button variant="outline" size="sm" onClick={handleDownloadClick} title="Download PDF">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* PDF Viewer */}
            <div
                ref={viewerRef}
                className="relative min-h-0 min-w-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain rounded-lg border border-border bg-muted/30"
                style={{ height: isFullscreen ? 'calc(100vh - 90px)' : height, maxHeight: '100%' }}
                onScroll={() => {
                    const viewportTop = viewerRef.current?.getBoundingClientRect().top ?? 0;
                    const visiblePage = Object.entries(pageRefs.current).find(([, element]) => {
                        if (!element) return false;
                        return element.getBoundingClientRect().bottom > viewportTop + 16;
                    });
                    if (visiblePage) setPageNumber(Number(visiblePage[0]));
                }}
            >
                {isAnyLoading && !activeError && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-xs">
                        <div className="text-center p-4">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                            <p className="mt-2 text-sm text-muted-foreground font-medium">
                                {fetchLoading ? 'Mengunduh dokumen...' : 'Menyiapkan halaman PDF...'}
                            </p>
                        </div>
                    </div>
                )}

                {activeError && (
                    <div className="flex h-full min-h-[300px] items-center justify-center p-6">
                        <div className="max-w-md text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                                <X className="h-6 w-6" />
                            </div>
                            <h4 className="font-semibold text-foreground text-sm sm:text-base">Gagal Membuka Preview Dokumen</h4>
                            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{activeError}</p>
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1.5">
                                    <RefreshCw className="h-4 w-4" />
                                    Coba Lagi
                                </Button>
                                <Button variant="default" size="sm" onClick={handleDirectOpen} className="gap-1.5">
                                    <ExternalLink className="h-4 w-4" />
                                    Buka Langsung / Unduh
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {!activeError && blobUrl && (
                    <div className="flex min-w-max justify-center p-4">
                        <Document
                            file={blobUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading=""
                            error=""
                            className="flex w-max min-w-full flex-col items-center gap-4"
                        >
                            {Array.from({ length: numPages }, (_, index) => {
                                const page = index + 1;
                                return (
                                    <div
                                        key={page}
                                        ref={(element) => {
                                            pageRefs.current[page] = element;
                                        }}
                                        className="flex w-full shrink-0 justify-center"
                                    >
                                        <Page
                                            pageNumber={page}
                                            scale={scale}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            className="shadow-lg"
                                            onLoadSuccess={onPageLoadSuccess}
                                        />
                                    </div>
                                );
                            })}
                        </Document>
                    </div>
                )}
            </div>

            {/* Page Info */}
            {!isAnyLoading && !activeError && numPages > 0 && (
                <div className="text-center">
                    <p className="font-sans text-xs text-muted-foreground">
                        Total {numPages} halaman • Zoom {Math.round(scale * 100)}%
                    </p>
                </div>
            )}
        </div>
    );
}
