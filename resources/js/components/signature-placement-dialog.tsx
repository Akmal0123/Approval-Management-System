import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Check, ChevronDown, Copy, ExternalLink, FileText, GripHorizontal, Maximize2, Minimize2, QrCode, RefreshCw, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker using locally hosted worker (no unpkg.com dependency)
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs?v=${pdfjs.version}`;
} else {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export const isQrCodeId = (id: string | number | null | undefined): boolean =>
    typeof id === 'string' && id.startsWith('qr_code');

interface Approval {
    id: number | string;
    step_name?: string;
    jabatan_name?: string;
    user?: { name: string };
    approver_email?: string;
    approval_status?: string;
    signature_method?: string;
}

export interface BulkDocumentItem {
    id: number | string;
    title: string;
    documentNumber?: string;
    transactionCode?: string;
    nominal?: number;
}

interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    dokumenId?: number;
    fileUrl: string;
    approvals: Approval[];
    initialPositions?: SignaturePosition[];
    onSaved?: (positions: SignaturePosition[]) => void;
    onPositionsChange?: (positions: SignaturePosition[]) => void;
    isEmbedded?: boolean;
    readOnly?: boolean;
    defaultActiveApprovalId?: number | string;
    hideSidebar?: boolean;
    bulkDocuments?: BulkDocumentItem[];
    selectedDocumentId?: number | string;
    onDocumentSelect?: (id: number | string) => void;
}

export interface SignaturePosition {
    dokumen_approval_id: number | string; // Allow string IDs for offline mode
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

const SignaturePlacementDialog: React.FC<Props> = ({
    open,
    onOpenChange,
    dokumenId,
    fileUrl,
    approvals,
    initialPositions,
    onSaved,
    onPositionsChange,
    isEmbedded = false,
    readOnly = false,
    defaultActiveApprovalId,
    hideSidebar = false,
    bulkDocuments,
    selectedDocumentId,
    onDocumentSelect,
}) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    // Mobile tab state for the preview dialog
    const [mobilePanelTab, setMobilePanelTab] = useState<'pdf' | 'info'>('pdf');

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
            return () => { };
        }

        // Direct blob or data URL
        if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
            setBlobUrl(fileUrl);
            setFetchLoading(false);
            setFetchError(null);
            return () => { };
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
                console.error('Error fetching PDF blob in SignaturePlacementDialog:', err);
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

    // Positions map: approval_id -> SignaturePosition
    const [positions, setPositions] = useState<Record<string | number, SignaturePosition>>({});
    const positionsRef = useRef(positions);
    const [activeApprovalId, setActiveApprovalId] = useState<number | string | null>(null);

    useEffect(() => {
        positionsRef.current = positions;
        if (onPositionsChange && Object.keys(positions).length > 0) {
            onPositionsChange(Object.values(positions));
        }
    }, [positions, onPositionsChange]);

    // References for dragging
    const containerRef = useRef<HTMLDivElement>(null);
    const pageContainersRef = useRef<Record<number, HTMLDivElement | null>>({});
    const pageSizesRef = useRef<Record<number, { width: number; height: number }>>({});
    const pagesViewportRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
    const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
    const viewerRef = useRef<HTMLDivElement>(null);
    const hasAutoFit = useRef(false);

    const PDF_TO_MM = 25.4 / 72; // Exact: 1 point = 25.4 / 72 mm (~0.3527777777777778 mm)

    useEffect(() => {
        if (open || isEmbedded) {
            setLoading(true);
            setError(null);
            setMobilePanelTab('pdf'); // Always start on PDF tab when dialog opens/file changes
            if (dokumenId) {
                fetchExistingPositions();
            } else {
                initializePositions(initialPositions || []);
            }
            if (defaultActiveApprovalId) {
                setActiveApprovalId(defaultActiveApprovalId);
            } else if (approvals.length > 0 && !activeApprovalId) {
                setActiveApprovalId(approvals[0].id);
            }
        }
    }, [open, isEmbedded, dokumenId, fileUrl]);

    // Synchronize positions if approval signature_method changes dynamically or enforce 1:1 ratio
    useEffect(() => {
        setPositions((prev) => {
            let changed = false;
            const next = { ...prev };
            approvals.forEach((app) => {
                if (next[app.id]) {
                    const currentPos = next[app.id];
                    if (currentPos.width !== currentPos.height) {
                        const squareSize = Math.max(currentPos.width, 25);
                        next[app.id] = {
                            ...currentPos,
                            width: squareSize,
                            height: squareSize,
                        };
                        changed = true;
                    }
                }
            });
            return changed ? next : prev;
        });
    }, [approvals]);

    const MOBILE_MIN_SCALE = 0.45;

    const getMobileScale = (widthPt: number) => {
        const el = viewerRef.current;
        if (!el || widthPt <= 0) return 1;
        const style = getComputedStyle(el);
        const available = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        if (available <= 0) return 1;
        return Math.min(1, Math.max(MOBILE_MIN_SCALE, available / widthPt));
    };

    useEffect(() => {
        hasAutoFit.current = false;
        setNumPages(0);
        setCurrentPage(1);
        pageSizesRef.current = {};
    }, [fileUrl]);

    // Notify parent on positions changes
    useEffect(() => {
        if (Object.keys(positions).length > 0 && onPositionsChange) {
            onPositionsChange(Object.values(positions));
        }
    }, [positions]);

    const initializePositions = (existingPositions: SignaturePosition[]) => {
        const newPositions: Record<string | number, SignaturePosition> = {};

        if (existingPositions && existingPositions.length > 0) {
            existingPositions.forEach((pos: any, idx: number) => {
                const isQr = !pos.dokumen_approval_id || isQrCodeId(pos.dokumen_approval_id);
                const key = isQr ? `qr_code_page_${pos.page || idx + 1}` : pos.dokumen_approval_id;
                let width = pos.width;
                let height = pos.height;

                // Ensure 1:1 square ratio for all signatures
                if (width !== height) {
                    const size = Math.max(width, height, 25);
                    width = size;
                    height = size;
                }

                newPositions[key] = {
                    dokumen_approval_id: key,
                    page: pos.page,
                    x: pos.x,
                    y: pos.y,
                    width: width,
                    height: height,
                };
            });
        }

        // Ensure all approvals have a position even if missing from existingPositions
        approvals.forEach((app, idx) => {
            if (!newPositions[app.id]) {
                const defaultSquareSize = 25; // Standard 25x25 mm 1:1
                newPositions[app.id] = {
                    dokumen_approval_id: app.id,
                    page: 1,
                    x: 20 + idx * 35, // Default mm
                    y: 220, // Default mm
                    width: defaultSquareSize,
                    height: defaultSquareSize,
                };
            }
        });

        setPositions(newPositions);
    };

    const fetchExistingPositions = async () => {
        try {
            const response = await api.get(`/dokumen/${dokumenId}/signature-positions`);
            initializePositions(response.data.positions);
        } catch (error) {
            console.error('Failed to fetch positions:', error);
            showToast.error('Gagal mengambil data posisi tanda tangan.');
            initializePositions([]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const positionsArray = Object.values(positions);

            if (dokumenId) {
                await api.post(`/dokumen/${dokumenId}/signature-positions`, {
                    positions: positionsArray,
                });
                showToast.success('Posisi tanda tangan berhasil disimpan.');
            } else {
                showToast.success('Posisi tanda tangan disimpan sementara.');
            }

            if (onSaved) onSaved(positionsArray as any);
            if (!isEmbedded && onOpenChange) onOpenChange(false);
        } catch (error) {
            console.error('Failed to save positions:', error);
            showToast.error('Gagal menyimpan posisi tanda tangan.');
        } finally {
            setSaving(false);
        }
    };

    const autoSavePositions = async (customPositions?: Record<string | number, SignaturePosition>) => {
        if (!dokumenId || readOnly) return;
        const posToSave = customPositions || positionsRef.current || positions;
        const positionsArray = Object.values(posToSave);
        if (positionsArray.length === 0) return;
        try {
            await api.post(`/dokumen/${dokumenId}/signature-positions`, {
                positions: positionsArray,
            });
            if (onSaved) onSaved(positionsArray as any);
        } catch (error) {
            console.error('Failed to auto-save signature positions:', error);
        }
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoading(false);
        setError(null);
    }

    function onDocumentLoadError(error: Error) {
        console.error('Error loading PDF in SignaturePlacementDialog:', error);
        setError('Gagal merender dokumen PDF di browser. Silakan coba lagi atau gunakan tombol Buka Langsung.');
        setLoading(false);
    }

    const onPageLoadSuccess = (page: any, pageNumber: number) => {
        const viewport = page.getViewport ? page.getViewport({ scale: 1 }) : null;
        const widthPt = viewport ? viewport.width : (page.originalWidth || (page.width ? page.width / scale : 595.28));
        const heightPt = viewport ? viewport.height : (page.originalHeight || (page.height ? page.height / scale : 841.89));

        pageSizesRef.current[pageNumber] = { width: widthPt, height: heightPt };

        if (!hasAutoFit.current) {
            hasAutoFit.current = true;
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setScale(getMobileScale(widthPt));
            }
        }
    };

    useEffect(() => {
        const root = pagesViewportRef.current;
        if (!root || numPages === 0) return;

        const observer = new IntersectionObserver(
            () => {
                const rootRect = root.getBoundingClientRect();
                const viewportCenter = rootRect.top + rootRect.height / 2;
                let visiblePage: number | null = null;
                let closestDistance = Number.POSITIVE_INFINITY;

                Object.entries(pageContainersRef.current).forEach(([pageNumber, element]) => {
                    if (!element) return;
                    const rect = element.getBoundingClientRect();
                    if (rect.bottom <= rootRect.top || rect.top >= rootRect.bottom) return;

                    const pageCenter = rect.top + rect.height / 2;
                    const distance = Math.abs(pageCenter - viewportCenter);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        visiblePage = Number(pageNumber);
                    }
                });

                if (visiblePage !== null) {
                    const nextVisiblePage = visiblePage;
                    setCurrentPage((page) => (page === nextVisiblePage ? page : nextVisiblePage));
                }
            },
            { root, threshold: 0.01 },
        );

        Object.values(pageContainersRef.current).forEach((element) => {
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [numPages]);

    const goToPage = (pageNumber: number) => {
        const targetPage = Math.max(1, Math.min(numPages || pageNumber, pageNumber));
        setCurrentPage(targetPage);

        const root = pagesViewportRef.current;
        const target = pageContainersRef.current[targetPage];
        if (!root || !target) return;

        const rootRect = root.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        root.scrollTo({
            top: root.scrollTop + targetRect.top - rootRect.top,
            behavior: 'smooth',
        });
    };

    // Convert mm (PDF coordinate) to pixels (UI coordinate based on scale)
    const mmToPx = (mm: number) => {
        return (mm / PDF_TO_MM) * scale;
    };

    // Convert pixels to mm
    const pxToMm = (px: number) => {
        return (px / scale) * PDF_TO_MM;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, approvalId: number | string, pageNumber: number) => {
        if (readOnly) return;

        // Prevent editing already approved signatures
        if (!isQrCodeId(approvalId)) {
            const app = approvals.find((a) => a.id === approvalId);
            if (app && app.approval_status === 'approved') {
                return;
            }
        }

        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        containerRef.current = pageContainersRef.current[pageNumber];
        setActiveApprovalId(approvalId);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });

        const pos = positions[approvalId];
        if (pos) {
            setInitialPos({ x: mmToPx(pos.x), y: mmToPx(pos.y) });
        }
    };

    const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>, approvalId: number | string, pageNumber: number) => {
        if (readOnly) return;

        // Prevent editing already approved signatures
        if (!isQrCodeId(approvalId)) {
            const app = approvals.find((a) => a.id === approvalId);
            if (app && app.approval_status === 'approved') {
                return;
            }
        }

        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        containerRef.current = pageContainersRef.current[pageNumber];
        setActiveApprovalId(approvalId);
        setIsResizing(true);
        setResizeStart({ x: e.clientX, y: e.clientY });

        const pos = positions[approvalId];
        if (pos) {
            setInitialSize({ width: mmToPx(pos.width), height: mmToPx(pos.height) });
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!activeApprovalId || !containerRef.current) return;

        const currentPos = positions[activeApprovalId];
        if (!currentPos) return;

        const pageSize = pageSizesRef.current[currentPos.page];
        const containerWidth = pageSize ? pageSize.width * scale : containerRef.current.clientWidth;
        const containerHeight = pageSize ? pageSize.height * scale : containerRef.current.clientHeight;

        if (isDragging) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;

            let newX = initialPos.x + dx;
            let newY = initialPos.y + dy;

            // Boundaries using accurate page dimensions
            const boxWidth = mmToPx(currentPos.width);
            const boxHeight = mmToPx(currentPos.height);

            newX = Math.max(0, Math.min(newX, containerWidth - boxWidth));
            newY = Math.max(0, Math.min(newY, containerHeight - boxHeight));

            setPositions((prev) => {
                const next = {
                    ...prev,
                    [activeApprovalId]: {
                        ...prev[activeApprovalId],
                        x: pxToMm(newX),
                        y: pxToMm(newY),
                    },
                };
                positionsRef.current = next;
                return next;
            });
        } else if (isResizing) {
            const dx = e.clientX - resizeStart.x;
            const dy = e.clientY - resizeStart.y;

            // Maintain strict 1:1 square aspect ratio for all signatures
            const minSize = Math.max(15 * scale, 15);
            const delta = Math.max(dx, dy);
            const currentBoxX = mmToPx(currentPos.x);
            const currentBoxY = mmToPx(currentPos.y);
            const maxSize = Math.max(minSize, Math.min(containerWidth - currentBoxX, containerHeight - currentBoxY));
            const newSize = Math.min(maxSize, Math.max(minSize, initialSize.width + delta));

            setPositions((prev) => {
                const next = {
                    ...prev,
                    [activeApprovalId]: {
                        ...prev[activeApprovalId],
                        width: pxToMm(newSize),
                        height: pxToMm(newSize),
                    },
                };
                positionsRef.current = next;
                return next;
            });
        }
    };

    const handlePointerUp = () => {
        const wasInteracting = isDragging || isResizing;
        setIsDragging(false);
        setIsResizing(false);
        if (wasInteracting) {
            autoSavePositions(positionsRef.current);
        }
    };

    const moveToPage = (approvalId: number | string, targetPage: number) => {
        let updatedPositions: Record<string | number, SignaturePosition> = {};
        if (isQrCodeId(approvalId)) {
            const oldKey = String(approvalId);
            const newKey = `qr_code_page_${targetPage}`;
            setPositions((prev) => {
                const next = { ...prev };
                const currentPos = next[oldKey];
                if (currentPos) {
                    delete next[oldKey];
                    next[newKey] = {
                        ...currentPos,
                        dokumen_approval_id: newKey,
                        page: targetPage,
                    };
                }
                positionsRef.current = next;
                updatedPositions = next;
                return next;
            });
            setActiveApprovalId(newKey);
            goToPage(targetPage);
            autoSavePositions(updatedPositions);
            return;
        }

        setPositions((prev) => {
            const next = {
                ...prev,
                [approvalId]: {
                    ...prev[approvalId],
                    page: targetPage,
                },
            };
            positionsRef.current = next;
            updatedPositions = next;
            return next;
        });
        goToPage(targetPage);
        autoSavePositions(updatedPositions);
    };

    // Active QR code helpers
    const activeQrPositions = Object.entries(positions)
        .filter(([id]) => isQrCodeId(id))
        .map(([id, pos]) => ({ id, ...pos }))
        .sort((a, b) => a.page - b.page);

    const activeQrPages = new Set(activeQrPositions.map((p) => p.page));
    const isQrActive = activeQrPositions.length > 0;

    const maxPages = numPages > 0 ? numPages : Math.max(currentPage, ...Object.values(positions).map((p) => p.page || 1), 1);
    const availablePages = Array.from({ length: maxPages }, (_, i) => i + 1);

    const toggleQrForPage = (pageNum: number) => {
        if (readOnly) return;
        const key = `qr_code_page_${pageNum}`;
        let updatedPositions: Record<string | number, SignaturePosition> = {};

        setPositions((prev) => {
            const next = { ...prev };
            if (next[key]) {
                delete next[key];
                if (activeApprovalId === key) {
                    setActiveApprovalId(approvals.length > 0 ? approvals[0].id : null);
                }
            } else {
                const existingQr = Object.values(prev).find((p) => isQrCodeId(p.dokumen_approval_id));
                const coords = existingQr
                    ? { x: existingQr.x, y: existingQr.y, width: existingQr.width, height: existingQr.height }
                    : { x: 175, y: 20, width: 25, height: 25 };

                next[key] = {
                    dokumen_approval_id: key,
                    page: pageNum,
                    ...coords,
                };
                setActiveApprovalId(key);
            }
            positionsRef.current = next;
            updatedPositions = next;
            return next;
        });

        if (currentPage !== pageNum) {
            goToPage(pageNum);
        }
        autoSavePositions(updatedPositions);
    };

    const enableAllPages = () => {
        if (readOnly) return;
        const total = numPages > 0 ? numPages : 1;
        const existingQr = Object.values(positions).find((p) => isQrCodeId(p.dokumen_approval_id));
        const coords = existingQr
            ? { x: existingQr.x, y: existingQr.y, width: existingQr.width, height: existingQr.height }
            : { x: 175, y: 20, width: 25, height: 25 };

        let updatedPositions: Record<string | number, SignaturePosition> = {};
        setPositions((prev) => {
            const next = { ...prev };
            for (let p = 1; p <= total; p++) {
                const key = `qr_code_page_${p}`;
                if (!next[key]) {
                    next[key] = {
                        dokumen_approval_id: key,
                        page: p,
                        ...coords,
                    };
                }
            }
            positionsRef.current = next;
            updatedPositions = next;
            return next;
        });
        showToast.success(`QR Code diaktifkan untuk semua (${total}) halaman.`);
        autoSavePositions(updatedPositions);
    };

    const removeAllQrCodes = () => {
        if (readOnly) return;
        let updatedPositions: Record<string | number, SignaturePosition> = {};
        setPositions((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (isQrCodeId(key)) {
                    delete next[key];
                }
            });
            positionsRef.current = next;
            updatedPositions = next;
            return next;
        });
        if (isQrCodeId(activeApprovalId)) {
            setActiveApprovalId(approvals.length > 0 ? approvals[0].id : null);
        }
        autoSavePositions(updatedPositions);
    };

    const syncPositionToAllQrPages = (sourceKey: string) => {
        if (readOnly) return;
        const sourcePos = positions[sourceKey];
        if (!sourcePos) return;

        let updatedPositions: Record<string | number, SignaturePosition> = {};
        setPositions((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (isQrCodeId(key) && key !== sourceKey) {
                    next[key] = {
                        ...next[key],
                        x: sourcePos.x,
                        y: sourcePos.y,
                        width: sourcePos.width,
                        height: sourcePos.height,
                    };
                }
            });
            positionsRef.current = next;
            updatedPositions = next;
            return next;
        });
        showToast.success('Posisi & ukuran QR code diterapkan ke seluruh halaman QR.');
        autoSavePositions(updatedPositions);
    };

    const renderSignatureBoxes = (pageNumber: number) => {
        if (loading) return null;

        const boxes = approvals
            .map((approval) => {
                const pos = positions[approval.id];
                if (!pos || pos.page !== pageNumber) return null;

                const isActive = activeApprovalId === approval.id;
                const isApproved = approval.approval_status === 'approved';
                const isEditable = !readOnly && !isApproved;
                const isQr = approval.signature_method === 'qr';

                if (isQr) {
                    let qrBoxClass = 'border-amber-500 bg-amber-100/50 z-0';
                    if (isActive) {
                        qrBoxClass = 'border-amber-600 bg-amber-500/20 z-10';
                    } else if (isApproved) {
                        qrBoxClass = 'border-green-500 bg-green-500/10 z-0';
                    }

                    return (
                        <div
                            key={approval.id}
                            style={{
                                left: `${mmToPx(pos.x)}px`,
                                top: `${mmToPx(pos.y)}px`,
                                width: `${mmToPx(pos.width)}px`,
                                height: `${mmToPx(pos.height)}px`,
                                cursor: isEditable ? (isDragging ? 'grabbing' : 'grab') : 'default',
                            }}
                            className={`absolute flex touch-none flex-col items-center justify-center border-2 border-dashed shadow-sm transition-colors select-none ${qrBoxClass}`}
                            onPointerDown={isEditable ? (e) => handlePointerDown(e, approval.id, pageNumber) : undefined}
                        >
                            <div className="pointer-events-none flex flex-col items-center justify-center gap-1 p-1 text-center text-amber-700">
                                <div className="flex max-w-[90%] items-center gap-1 overflow-hidden rounded bg-white/90 px-1 py-0.5 text-[9px] font-semibold whitespace-nowrap shadow-xs sm:text-[10px]">
                                    {isEditable && <GripHorizontal className="h-3 w-3 flex-shrink-0" />}
                                    <span className="truncate">{approval.step_name || approval.user?.name || approval.approver_email}</span>
                                </div>
                                <div className="flex items-center justify-center rounded border border-amber-300 bg-white p-1 shadow-xs">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4 text-amber-600"
                                    >
                                        <rect width="5" height="5" x="3" y="3" rx="1" />
                                        <rect width="5" height="5" x="16" y="3" rx="1" />
                                        <rect width="5" height="5" x="3" y="16" rx="1" />
                                        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                                        <path d="M21 21v.01" />
                                        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                                        <path d="M12 12v.01" />
                                        <path d="M12 17v.01" />
                                        <path d="M17 12v.01" />
                                    </svg>
                                </div>
                                <span className="text-[8px] font-bold tracking-wider text-amber-800 uppercase sm:text-[9px]">
                                    {isApproved ? 'QR Stamped' : 'QR Signature'}
                                </span>
                            </div>

                            {/* Resize Handle */}
                            {isActive && isEditable && (
                                <div
                                    className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize rounded-tl-sm rounded-br-sm bg-amber-600"
                                    onPointerDown={(e) => handleResizePointerDown(e, approval.id, pageNumber)}
                                />
                            )}
                        </div>
                    );
                }

                let boxClass = 'border-blue-400 bg-blue-100/50 z-0';
                if (isActive) {
                    boxClass = 'border-primary bg-primary/20 z-10';
                } else if (isApproved) {
                    boxClass = 'border-green-500 bg-green-500/10 z-0';
                }

                return (
                    <div
                        key={approval.id}
                        className={`absolute flex flex-col items-center justify-center border-2 shadow-sm transition-colors select-none ${boxClass}`}
                        style={{
                            left: `${mmToPx(pos.x)}px`,
                            top: `${mmToPx(pos.y)}px`,
                            width: `${mmToPx(pos.width)}px`,
                            height: `${mmToPx(pos.height)}px`,
                            cursor: isEditable ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        }}
                        onPointerDown={isEditable ? (e) => handlePointerDown(e, approval.id, pageNumber) : undefined}
                    >
                        <div className="pointer-events-none flex max-w-[90%] items-center gap-1 overflow-hidden rounded bg-white/80 px-1 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-sm sm:text-xs">
                            {isEditable && <GripHorizontal className="h-3 w-3 flex-shrink-0" />}
                            <span className="truncate">{approval.step_name || approval.user?.name || approval.approver_email}</span>
                            {isApproved && (
                                <span className="ml-1 shrink-0 rounded border border-green-200 bg-green-100 px-1 text-[8px] font-bold text-green-700 uppercase">
                                    Stamped
                                </span>
                            )}
                        </div>

                        {/* Resize Handle */}
                        {isActive && isEditable && (
                            <div
                                className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize rounded-tl-sm rounded-br-sm bg-primary"
                                onPointerDown={(e) => handleResizePointerDown(e, approval.id, pageNumber)}
                            />
                        )}
                    </div>
                );
            })
            .filter(Boolean) as React.ReactNode[];

        // Render QR codes configured for currentPage
        const qrEntries = Object.entries(positions).filter(
            ([id, pos]) => isQrCodeId(id) && pos.page === pageNumber
        );

        qrEntries.forEach(([qrId, qrPos]) => {
            const isActive = activeApprovalId === qrId;
            const isQrEditable = !readOnly;
            boxes.push(
                <div
                    key={qrId}
                    className={`absolute flex touch-none flex-col items-center justify-center border-2 border-dashed shadow-sm transition-colors select-none ${isActive ? 'z-10 border-amber-600 bg-amber-500/20 ring-2 ring-amber-400' : 'z-0 border-amber-500 bg-amber-100/50 hover:border-amber-600'}`}
                    style={{
                        left: `${mmToPx(qrPos.x)}px`,
                        top: `${mmToPx(qrPos.y)}px`,
                        width: `${mmToPx(qrPos.width)}px`,
                        height: `${mmToPx(qrPos.height)}px`,
                        cursor: isQrEditable ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    }}
                    onPointerDown={isQrEditable ? (e) => handlePointerDown(e, qrId, pageNumber) : undefined}
                >
                    <div className="pointer-events-none flex flex-col items-center gap-0.5 p-1 text-amber-700">
                        <span className="text-center text-[8px] font-bold tracking-wider uppercase sm:text-[9px]">
                            QR Code (Hal. {qrPos.page})
                        </span>
                        <div className="rounded border border-amber-300 bg-white p-1">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5"
                            >
                                <rect width="5" height="5" x="3" y="3" rx="1" />
                                <rect width="5" height="5" x="16" y="3" rx="1" />
                                <rect width="5" height="5" x="3" y="16" rx="1" />
                                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                                <path d="M21 21v.01" />
                                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                                <path d="M12 12v.01" />
                                <path d="M12 17v.01" />
                                <path d="M17 12v.01" />
                            </svg>
                        </div>
                        <span className="font-mono text-[7px] text-amber-800 font-medium truncate max-w-full">
                            /approvals/{dokumenId || ':id'}
                        </span>
                    </div>

                    {/* Resize Handle */}
                    {isActive && isQrEditable && (
                        <div
                            className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize rounded-tl-sm rounded-br-sm bg-amber-600"
                            onPointerDown={(e) => handleResizePointerDown(e, qrId, pageNumber)}
                        />
                    )}
                </div>,
            );
        });

        return boxes;
    };

    const innerContent = (
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background md:flex-row">

            {/* ===== MOBILE TAB SWITCHER (< md only, when sidebar is visible) ===== */}
            {!hideSidebar && (
                <div className="flex shrink-0 border-b bg-muted/30 px-1.5 pt-1.5 pb-0 md:hidden">
                    <button
                        type="button"
                        onClick={() => setMobilePanelTab('pdf')}
                        className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-t-md transition-all ${mobilePanelTab === 'pdf'
                            ? 'bg-background text-foreground shadow-sm border border-b-0 border-border'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        📄 PDF Dokumen
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobilePanelTab('info')}
                        className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-t-md transition-all ${mobilePanelTab === 'info'
                            ? 'bg-background text-foreground shadow-sm border border-b-0 border-border'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        👥 Info Approver
                    </button>
                </div>
            )}

            {/* Sidebar Configuration */}
            {!hideSidebar && (
                <div className={`
                w-full shrink-0 flex-col gap-3 overflow-y-auto border-b bg-muted/20 p-3
                md:flex md:h-full md:max-h-none md:w-80 md:gap-6 md:border-r md:border-b-0 md:p-4
                ${mobilePanelTab === 'info' ? 'flex max-h-[calc(100%-42px)]' : 'hidden'}
            `}>
                    <div>
                        {/* Dropdown List Dokumen Khusus Skenario Bulk Approve */}
                        {bulkDocuments && bulkDocuments.length > 0 && (() => {
                            const currentDocId = selectedDocumentId ?? bulkDocuments[0]?.id;
                            const currentDoc = bulkDocuments.find((d) => String(d.id) === String(currentDocId)) || bulkDocuments[0];
                            const currentIdx = bulkDocuments.findIndex((d) => String(d.id) === String(currentDocId));

                            return (
                                <div className="mb-4 space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            Pilih Dokumen
                                        </label>
                                        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                            {currentIdx >= 0 ? currentIdx + 1 : 1} dari {bulkDocuments.length}
                                        </span>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full justify-between h-auto py-2 px-2.5 text-left border-border bg-background hover:bg-muted/60 shadow-xs cursor-pointer group"
                                            >
                                                <div className="flex flex-col min-w-0 pr-2">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                                        <span className="font-mono text-xs font-bold truncate text-foreground">
                                                            {currentDoc?.documentNumber || currentDoc?.title || 'Pilih Dokumen'}
                                                        </span>
                                                    </div>
                                                    {currentDoc?.documentNumber && currentDoc?.title && (
                                                        <span className="text-[11px] text-muted-foreground truncate pl-5">
                                                            {currentDoc.title}
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="start"
                                            sideOffset={4}
                                            className="w-[280px] sm:w-[300px] max-h-72 overflow-y-auto p-1.5 z-50 shadow-xl border bg-popover"
                                        >
                                            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                                                Daftar Dokumen Dipilih ({bulkDocuments.length})
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {bulkDocuments.map((doc, idx) => {
                                                const isSelected = String(doc.id) === String(currentDocId);
                                                return (
                                                    <DropdownMenuItem
                                                        key={doc.id}
                                                        onClick={() => {
                                                            if (onDocumentSelect) {
                                                                onDocumentSelect(doc.id);
                                                            }
                                                        }}
                                                        className={`flex flex-col items-start gap-1 p-2 cursor-pointer rounded-md ${
                                                            isSelected ? 'bg-primary/10 text-primary font-medium' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between w-full gap-2">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <span className="font-sans text-[10px] font-bold text-muted-foreground">
                                                                    #{idx + 1}
                                                                </span>
                                                                <span className="font-mono text-xs font-semibold truncate">
                                                                    {doc.documentNumber || doc.title}
                                                                </span>
                                                            </div>
                                                            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                                        </div>
                                                        {doc.documentNumber && doc.title && (
                                                            <span className="text-[11px] text-muted-foreground truncate w-full pl-3.5">
                                                                {doc.title}
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-2 pl-3.5 text-[10px]">
                                                            {doc.transactionCode && (
                                                                <span className="rounded bg-blue-100 text-blue-700 px-1 py-0.2 font-medium">
                                                                    {doc.transactionCode}
                                                                </span>
                                                            )}
                                                            {doc.nominal !== undefined && (
                                                                <span className="text-green-600 font-mono font-medium">
                                                                    Rp {Number(doc.nominal).toLocaleString('id-ID')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            );
                        })()}

                        <h3 className="mb-3 text-sm font-semibold">Daftar Approver</h3>
                        <div className="space-y-3">
                            {approvals.map((approval) => {
                                const pos = positions[approval.id];
                                const isActive = activeApprovalId === approval.id;
                                const isCurrentPage = pos?.page === currentPage;
                                const isApproved = approval.approval_status === 'approved';
                                const isQr = approval.signature_method === 'qr';


                                return (
                                    <div
                                        key={approval.id}
                                        className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${isActive ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/50'}`}
                                        onClick={() => {
                                            setActiveApprovalId(approval.id);
                                            if (pos && pos.page !== currentPage) {
                                                goToPage(pos.page);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-2 font-medium">
                                            <div className="flex items-center gap-1.5 truncate">
                                                {isQr && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                                                <span className="truncate">{approval.step_name || 'Approval'}</span>
                                            </div>
                                            {isApproved ? (
                                                <span className="shrink-0 rounded-full border border-green-200 bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700 uppercase">
                                                    Stamped
                                                </span>
                                            ) : isQr ? (
                                                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 uppercase">
                                                    QR Code
                                                </span>
                                            ) : (
                                                <span className="shrink-0 rounded-full border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                        <div className="truncate text-xs text-muted-foreground">{approval.user?.name || approval.approver_email}</div>

                                        {pos && (
                                            <>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Ukuran: {Math.round(pos.width)} x {Math.round(pos.height)} mm
                                                </div>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-xs ${isCurrentPage ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                                                    >
                                                        Hal. {pos.page}
                                                    </span>

                                                    {!isCurrentPage && !readOnly && !isApproved && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-xs"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveToPage(approval.id, currentPage);
                                                            }}
                                                        >
                                                            Pindah ke sini
                                                        </Button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="border-t pt-4">
                        <div className="mb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-sm font-semibold">
                                    <QrCode className="h-4 w-4 text-amber-600" />
                                    <span>QR Code Dokumen</span>
                                </div>
                                {activeQrPositions.length > 0 && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                        {activeQrPositions.length} Hal.
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* Master Toggle */}
                            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium select-none">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                                    checked={isQrActive}
                                    disabled={readOnly}
                                    onChange={(e) => {
                                        if (readOnly) return;
                                        if (e.target.checked) {
                                            toggleQrForPage(currentPage);
                                        } else {
                                            removeAllQrCodes();
                                        }
                                    }}
                                />
                                <span>Aktifkan QR Code Dokumen</span>
                            </label>

                            {isQrActive && (
                                <div className="space-y-3 rounded-lg border bg-background p-3 text-xs">
                                    {/* Quick Selection Presets */}
                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                            <span>Pilih Cepat:</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={readOnly}
                                                className="h-6 px-1 text-[11px]"
                                                onClick={enableAllPages}
                                                title="Beri QR code di semua halaman"
                                            >
                                                Semua Hal.
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={readOnly}
                                                className="h-6 px-1 text-[11px]"
                                                onClick={() => {
                                                    if (readOnly) return;
                                                    removeAllQrCodes();
                                                    toggleQrForPage(1);
                                                }}
                                                title="Hanya halaman 1"
                                            >
                                                Hal. 1 Saja
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={readOnly}
                                                className="h-6 px-1 text-[11px]"
                                                onClick={() => {
                                                    if (readOnly) return;
                                                    const lastPage = numPages > 0 ? numPages : 1;
                                                    removeAllQrCodes();
                                                    toggleQrForPage(lastPage);
                                                }}
                                                title="Hanya halaman terakhir"
                                            >
                                                Hal. Akhir
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Custom Pages Selection Chips */}
                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                            <span>Pilih Halaman QR:</span>
                                            <span className="font-semibold text-amber-600">
                                                {activeQrPositions.length} terpilih
                                            </span>
                                        </div>
                                        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-md border bg-muted/20 p-1.5">
                                            {availablePages.map((p) => {
                                                const isSelected = activeQrPages.has(p);
                                                const isCurrent = p === currentPage;
                                                return (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        disabled={readOnly}
                                                        onClick={() => toggleQrForPage(p)}
                                                        className={`relative flex h-7 min-w-[32px] items-center justify-center rounded px-1.5 text-xs font-semibold transition-all ${isSelected
                                                            ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600'
                                                            : 'border border-gray-200 bg-white text-gray-700 hover:bg-amber-50'
                                                            } ${isCurrent ? 'ring-2 ring-primary ring-offset-1 font-bold' : ''}`}
                                                        title={`Halaman ${p}${isSelected ? ' (QR Aktif - klik untuk menghapus)' : ' (Klik untuk menambahkan QR)'}`}
                                                    >
                                                        {p}
                                                        {isSelected && <Check className="ml-0.5 h-3 w-3" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Sync Position Tool */}
                                    {activeQrPositions.length > 1 && !readOnly && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 w-full gap-1.5 bg-amber-100/80 text-[11px] font-medium text-amber-900 hover:bg-amber-200/80"
                                            onClick={() => {
                                                const sourceId = isQrCodeId(activeApprovalId)
                                                    ? String(activeApprovalId)
                                                    : activeQrPositions[0].id;
                                                syncPositionToAllQrPages(sourceId);
                                            }}
                                            title="Samakan posisi X, Y, dan ukuran QR dari halaman yang aktif ke semua halaman QR lainnya"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            <span>Samakan Posisi ke Semua Hal.</span>
                                        </Button>
                                    )}

                                    {/* List of active QR code items */}
                                    <div className="space-y-1.5">
                                        <div className="text-[11px] font-medium text-muted-foreground">
                                            Daftar Posisi ({activeQrPositions.length}):
                                        </div>
                                        <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                                            {activeQrPositions.map((qr) => {
                                                const isCurrent = qr.page === currentPage;
                                                const isActive = activeApprovalId === qr.id;
                                                return (
                                                    <div
                                                        key={qr.id}
                                                        className={`cursor-pointer rounded-md border p-2 text-xs transition-colors ${isActive
                                                            ? 'border-amber-500 bg-amber-500/10'
                                                            : 'bg-background hover:bg-muted/50'
                                                            }`}
                                                        onClick={() => {
                                                            setActiveApprovalId(qr.id);
                                                            if (qr.page !== currentPage) {
                                                                goToPage(qr.page);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between font-medium">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                                                <span className="font-semibold text-amber-950">
                                                                    QR Code - Hal. {qr.page}
                                                                </span>
                                                            </div>
                                                            {!readOnly && (
                                                                <button
                                                                    type="button"
                                                                    className="rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleQrForPage(qr.page);
                                                                    }}
                                                                    title={`Hapus QR Code di halaman ${qr.page}`}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="mt-1 text-[11px] text-muted-foreground">
                                                            Ukuran: {Math.round(qr.width)} x {Math.round(qr.height)} mm
                                                        </div>

                                                        <div className="mt-1.5 flex items-center justify-between">
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isCurrent
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                    }`}
                                                            >
                                                                {isCurrent ? 'Halaman Ini' : `Hal. ${qr.page}`}
                                                            </span>

                                                            {!isCurrent && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-5 px-1.5 text-[10px]"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        goToPage(qr.page);
                                                                        setActiveApprovalId(qr.id);
                                                                    }}
                                                                >
                                                                    Lihat Halaman
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Kontrol Tampilan & Simpan Posisi */}
                    <div className="hidden space-y-3 border-t pt-4 md:block">
                        <div className="text-sm font-semibold">Kontrol Tampilan</div>

                        <div className="flex items-center justify-between gap-2 rounded-lg border bg-background p-1.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                                title="Zoom Out"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
                                title="Zoom In"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage <= 1 || loading}
                            >
                                Prev
                            </Button>
                            <span className="flex-1 text-center text-xs font-medium text-muted-foreground">
                                Hal {currentPage}/{numPages || '-'}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage >= numPages || loading}
                            >
                                Next
                            </Button>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-1.5"
                            onClick={() => setIsFullscreen(true)}
                            title="Tampilkan Dokumen Layar Penuh"
                        >
                            <Maximize2 className="h-4 w-4" />
                            <span>Layar Penuh (Fullscreen)</span>
                        </Button>

                        {!readOnly && (
                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="w-full bg-primary text-white hover:bg-primary/90 mt-1"
                            >
                                {saving ? 'Menyimpan...' : 'Simpan Posisi'}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* PDF Viewer Area */}
            <div
                ref={viewerRef}
                className={isFullscreen
                    ? "fixed inset-0 z-[99999] flex flex-col overflow-hidden bg-gray-950/95 backdrop-blur-md p-1 sm:p-4"
                    : `relative flex-col overflow-hidden bg-gray-100 p-1 sm:p-2 ${isEmbedded ? 'md:p-2.5' : 'md:p-6'} min-h-0 min-w-0 flex-1 ${!hideSidebar && mobilePanelTab === 'info'
                        ? 'hidden md:flex'
                        : 'flex'
                    }`}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div className="flex shrink-0 items-center justify-between gap-1.5 sm:gap-2 border-b bg-background/95 px-2 sm:px-3 py-1.5 sm:py-2 rounded-t-lg backdrop-blur-xs">
                    {/* Left: Zoom Controls + Fullscreen Title */}
                    <div className="flex items-center gap-0.5 sm:gap-1">
                        {isFullscreen && (
                            <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary mr-1">
                                Layar Penuh
                            </span>
                        )}
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => setScale((s) => Math.max(0.35, s - 0.15))} title="Zoom Out" aria-label="Zoom out">
                            <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <span className="min-w-8 sm:min-w-10 text-center text-[11px] sm:text-xs font-medium">{Math.round(scale * 100)}%</span>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => setScale((s) => Math.min(2.5, s + 0.15))} title="Zoom In" aria-label="Zoom in">
                            <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                    </div>

                    {/* Center: Page Navigation */}
                    <div className="flex items-center gap-0.5 sm:gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-1.5 sm:h-8 sm:px-2 text-[11px] sm:text-xs" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1 || loading}>
                            Prev
                        </Button>
                        <span className="min-w-10 sm:min-w-12 text-center text-[11px] sm:text-xs font-medium text-muted-foreground">
                            {currentPage}/{numPages || '-'}
                        </span>
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-1.5 sm:h-8 sm:px-2 text-[11px] sm:text-xs" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages || loading}>
                            Next
                        </Button>
                    </div>

                    {/* Right: Fullscreen / Close Fullscreen Button */}
                    <div className="flex items-center gap-1">
                        {isFullscreen ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsFullscreen(false)}
                                className="h-7 sm:h-8 gap-1 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 font-semibold px-2 sm:px-2.5 text-[11px] sm:text-xs"
                                title="Tutup Layar Penuh (Esc)"
                            >
                                <X className="h-3.5 w-3.5" />
                                <span>Tutup<span className="hidden sm:inline"> Fullscreen</span></span>
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsFullscreen(true);
                                    if (window.innerWidth < 768) {
                                        setScale(Math.max(0.45, Math.min(1.0, (window.innerWidth - 24) / 595)));
                                    }
                                }}
                                className="h-7 sm:h-8 gap-1 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium"
                                title="Tampilkan Dokumen Layar Penuh"
                            >
                                <Maximize2 className="h-3.5 w-3.5" />
                                <span>Fullscreen</span>
                            </Button>
                        )}
                    </div>
                </div>

                <div
                    ref={pagesViewportRef}
                    className="relative flex min-h-0 min-w-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain"
                >
                    {(fetchLoading || loading) && !(fetchError || error) && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-xs">
                            <div className="text-center p-4">
                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                                <p className="mt-2 text-sm text-muted-foreground font-medium">
                                    {fetchLoading ? 'Mengunduh dokumen...' : 'Menyiapkan halaman PDF...'}
                                </p>
                            </div>
                        </div>
                    )}
                    {(fetchError || error) && (
                        <div className="flex h-full min-h-[300px] w-full items-center justify-center p-6">
                            <div className="max-w-md text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                                    <X className="h-6 w-6" />
                                </div>
                                <h4 className="font-semibold text-foreground text-sm sm:text-base">Gagal Membuka Dokumen</h4>
                                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{fetchError || error}</p>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setError(null);
                                            setFetchError(null);
                                            setLoading(true);
                                            setFetchLoading(true);
                                            setReloadKey((prev) => prev + 1);
                                        }}
                                        className="gap-1.5"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Coba Lagi
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                            if (blobUrl) {
                                                window.open(blobUrl, '_blank');
                                            } else if (fileUrl) {
                                                const fullUrl = fileUrl.startsWith('http')
                                                    ? fileUrl
                                                    : `${window.location.origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
                                                window.open(fullUrl, '_blank');
                                            }
                                        }}
                                        className="gap-1.5"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Buka Langsung PDF
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    {!(fetchError || error) && blobUrl && (
                        <Document
                            file={blobUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading=""
                            error=""
                            className="flex w-max min-w-full flex-col items-center gap-4"
                        >
                            {Array.from({ length: numPages }, (_, index) => {
                                const pageNumber = index + 1;
                                return (
                                    <div key={pageNumber} className="flex w-full shrink-0 justify-center">
                                        <div
                                            ref={(element) => {
                                                pageContainersRef.current[pageNumber] = element;
                                            }}
                                            data-page-number={pageNumber}
                                            className={`relative w-fit shrink-0 bg-white shadow-xl select-none ${loading ? 'hidden' : ''}`}
                                        >
                                            <Page
                                                pageNumber={pageNumber}
                                                scale={scale}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                                className="relative block !m-0 !p-0 !max-w-none !shadow-none"
                                                onLoadSuccess={(page) => onPageLoadSuccess(page, pageNumber)}
                                            >
                                                {renderSignatureBoxes(pageNumber)}
                                            </Page>
                                        </div>
                                    </div>
                                );
                            })}
                        </Document>
                    )}
                </div>
                {isEmbedded && !readOnly && (
                    <div className="shrink-0 border-t bg-background p-2 md:hidden">
                        <Button type="button" onClick={handleSave} disabled={saving || loading} className="h-9 w-full">
                            {saving ? 'Menyimpan...' : 'Simpan Posisi'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    if (isEmbedded) {
        return innerContent;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[90vh] max-w-5xl flex-col overflow-hidden p-0">
                <DialogHeader className="shrink-0 border-b px-6 py-4">
                    <DialogTitle>Atur Posisi Tanda Tangan</DialogTitle>
                    <DialogDescription>
                        Geser kotak tanda tangan ke lokasi yang Anda inginkan di dokumen PDF ini. Tanda tangan approver akan otomatis ditempatkan pada
                        posisi tersebut.
                    </DialogDescription>
                </DialogHeader>

                {innerContent}

                <DialogFooter className="shrink-0 border-t px-6 py-4">
                    <Button variant="outline" onClick={() => onOpenChange && onOpenChange(false)}>
                        Batal
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving ? 'Menyimpan...' : 'Simpan Posisi Tanda Tangan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SignaturePlacementDialog;
