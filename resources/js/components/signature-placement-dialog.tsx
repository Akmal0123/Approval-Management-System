import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Check, Copy, GripHorizontal, QrCode, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
}) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Positions map: approval_id -> SignaturePosition
    const [positions, setPositions] = useState<Record<string | number, SignaturePosition>>({});
    const [activeApprovalId, setActiveApprovalId] = useState<number | string | null>(null);

    // References for dragging
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
    const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
    const [pageSizePt, setPageSizePt] = useState({ width: 595.28, height: 841.89 });
    const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

    const PDF_TO_MM = 25.4 / 72; // Exact: 1 point = 25.4 / 72 mm (~0.3527777777777778 mm)

    useEffect(() => {
        if (open || isEmbedded) {
            setLoading(true);
            setError(null);
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

    const onPageLoadSuccess = (page: any) => {
        const viewport = page.getViewport ? page.getViewport({ scale: 1 }) : null;
        const widthPt = viewport ? viewport.width : (page.originalWidth || (page.width ? page.width / scale : 595.28));
        const heightPt = viewport ? viewport.height : (page.originalHeight || (page.height ? page.height / scale : 841.89));

        setPageSizePt({ width: widthPt, height: heightPt });
        setPageDimensions({
            width: widthPt * scale,
            height: heightPt * scale,
        });
    };

    // Keep pageDimensions synchronized with zoom scale changes
    useEffect(() => {
        if (pageSizePt.width > 0 && pageSizePt.height > 0) {
            setPageDimensions({
                width: pageSizePt.width * scale,
                height: pageSizePt.height * scale,
            });
        }
    }, [scale, pageSizePt]);

    // Convert mm (PDF coordinate) to pixels (UI coordinate based on scale)
    const mmToPx = (mm: number) => {
        return (mm / PDF_TO_MM) * scale;
    };

    // Convert pixels to mm
    const pxToMm = (px: number) => {
        return (px / scale) * PDF_TO_MM;
    };

    const handleMouseDown = (e: React.MouseEvent, approvalId: number | string) => {
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
        setActiveApprovalId(approvalId);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });

        const pos = positions[approvalId];
        if (pos) {
            setInitialPos({ x: mmToPx(pos.x), y: mmToPx(pos.y) });
        }
    };

    const handleResizeMouseDown = (e: React.MouseEvent, approvalId: number | string) => {
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
        setActiveApprovalId(approvalId);
        setIsResizing(true);
        setResizeStart({ x: e.clientX, y: e.clientY });

        const pos = positions[approvalId];
        if (pos) {
            setInitialSize({ width: mmToPx(pos.width), height: mmToPx(pos.height) });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!activeApprovalId || !containerRef.current) return;

        const currentPos = positions[activeApprovalId];
        if (!currentPos) return;

        const containerWidth = pageDimensions.width > 0 ? pageDimensions.width : containerRef.current.clientWidth;
        const containerHeight = pageDimensions.height > 0 ? pageDimensions.height : containerRef.current.clientHeight;

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

            setPositions((prev) => ({
                ...prev,
                [activeApprovalId]: {
                    ...prev[activeApprovalId],
                    x: pxToMm(newX),
                    y: pxToMm(newY),
                },
            }));
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

            setPositions((prev) => ({
                ...prev,
                [activeApprovalId]: {
                    ...prev[activeApprovalId],
                    width: pxToMm(newSize),
                    height: pxToMm(newSize),
                },
            }));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    const moveToPage = (approvalId: number | string, targetPage: number) => {
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
                return next;
            });
            setActiveApprovalId(newKey);
            setCurrentPage(targetPage);
            return;
        }

        setPositions((prev) => ({
            ...prev,
            [approvalId]: {
                ...prev[approvalId],
                page: targetPage,
            },
        }));
        setCurrentPage(targetPage);
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
            return next;
        });

        if (currentPage !== pageNum) {
            setCurrentPage(pageNum);
        }
    };

    const enableAllPages = () => {
        if (readOnly) return;
        const total = numPages > 0 ? numPages : 1;
        const existingQr = Object.values(positions).find((p) => isQrCodeId(p.dokumen_approval_id));
        const coords = existingQr
            ? { x: existingQr.x, y: existingQr.y, width: existingQr.width, height: existingQr.height }
            : { x: 175, y: 20, width: 25, height: 25 };

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
            return next;
        });
        showToast.success(`QR Code diaktifkan untuk semua (${total}) halaman.`);
    };

    const removeAllQrCodes = () => {
        if (readOnly) return;
        setPositions((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (isQrCodeId(key)) {
                    delete next[key];
                }
            });
            return next;
        });
        if (isQrCodeId(activeApprovalId)) {
            setActiveApprovalId(approvals.length > 0 ? approvals[0].id : null);
        }
    };

    const syncPositionToAllQrPages = (sourceKey: string) => {
        if (readOnly) return;
        const sourcePos = positions[sourceKey];
        if (!sourcePos) return;

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
            return next;
        });
        showToast.success('Posisi & ukuran QR code diterapkan ke seluruh halaman QR.');
    };

    const renderSignatureBoxes = () => {
        if (loading) return null;

        const boxes = approvals
            .map((approval) => {
                const pos = positions[approval.id];
                if (!pos || pos.page !== currentPage) return null;

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
                            className={`absolute flex flex-col items-center justify-center border-2 border-dashed shadow-sm transition-colors select-none ${qrBoxClass}`}
                            style={{
                                left: `${mmToPx(pos.x)}px`,
                                top: `${mmToPx(pos.y)}px`,
                                width: `${mmToPx(pos.width)}px`,
                                height: `${mmToPx(pos.height)}px`,
                                cursor: isEditable ? (isDragging ? 'grabbing' : 'grab') : 'default',
                            }}
                            onMouseDown={isEditable ? (e) => handleMouseDown(e, approval.id) : undefined}
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
                                    onMouseDown={(e) => handleResizeMouseDown(e, approval.id)}
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
                        onMouseDown={isEditable ? (e) => handleMouseDown(e, approval.id) : undefined}
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
                                onMouseDown={(e) => handleResizeMouseDown(e, approval.id)}
                            />
                        )}
                    </div>
                );
            })
            .filter(Boolean) as React.ReactNode[];

        // Render QR codes configured for currentPage
        const qrEntries = Object.entries(positions).filter(
            ([id, pos]) => isQrCodeId(id) && pos.page === currentPage
        );

        qrEntries.forEach(([qrId, qrPos]) => {
            const isActive = activeApprovalId === qrId;
            const isQrEditable = !readOnly;
            boxes.push(
                <div
                    key={qrId}
                    className={`absolute flex flex-col items-center justify-center border-2 border-dashed shadow-sm transition-colors select-none ${isActive ? 'z-10 border-amber-600 bg-amber-500/20 ring-2 ring-amber-400' : 'z-0 border-amber-500 bg-amber-100/50 hover:border-amber-600'}`}
                    style={{
                        left: `${mmToPx(qrPos.x)}px`,
                        top: `${mmToPx(qrPos.y)}px`,
                        width: `${mmToPx(qrPos.width)}px`,
                        height: `${mmToPx(qrPos.height)}px`,
                        cursor: isQrEditable ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    }}
                    onMouseDown={isQrEditable ? (e) => handleMouseDown(e, qrId) : undefined}
                >
                    <div className="pointer-events-none flex flex-col items-center gap-1 p-1.5 text-amber-700">
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
                    </div>

                    {/* Resize Handle */}
                    {isActive && isQrEditable && (
                        <div
                            className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize rounded-tl-sm rounded-br-sm bg-amber-600"
                            onMouseDown={(e) => handleResizeMouseDown(e, qrId)}
                        />
                    )}
                </div>,
            );
        });

        return boxes;
    };

    const innerContent = (
        <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-background">
            {/* Sidebar Configuration */}
            <div className="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-muted/20 p-4">
                <div>
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
                                            setCurrentPage(pos.page);
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
                    <div className="mb-3 flex items-center justify-between">
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
                                                    className={`relative flex h-7 min-w-[32px] items-center justify-center rounded px-1.5 text-xs font-semibold transition-all ${
                                                        isSelected
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
                                                    className={`cursor-pointer rounded-md border p-2 text-xs transition-colors ${
                                                        isActive
                                                            ? 'border-amber-500 bg-amber-500/10'
                                                            : 'bg-background hover:bg-muted/50'
                                                    }`}
                                                    onClick={() => {
                                                        setActiveApprovalId(qr.id);
                                                        if (qr.page !== currentPage) {
                                                            setCurrentPage(qr.page);
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
                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                                isCurrent
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
                                                                    setCurrentPage(qr.page);
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

                <div className="mt-auto">
                    <h3 className="mb-3 text-sm font-semibold">Kontrol Tampilan</h3>
                    <div className="mb-3 flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center text-sm">{Math.round(scale * 100)}%</span>
                        <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage <= 1 || loading}
                        >
                            Prev
                        </Button>
                        <span className="w-16 text-center text-sm">
                            Hal {currentPage}/{numPages || '-'}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                            disabled={currentPage >= numPages || loading}
                        >
                            Next
                        </Button>
                    </div>

                    {isEmbedded && !readOnly && (
                        <div className="mt-4 border-t pt-4">
                            <Button onClick={handleSave} disabled={saving || loading} className="w-full bg-primary text-white">
                                {saving ? 'Menyimpan...' : 'Simpan Posisi'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* PDF Viewer Area */}
            <div
                className="relative flex flex-1 justify-center overflow-auto bg-gray-100 p-8"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {loading && (
                    <div className="flex h-full min-h-[300px] w-full items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                            <p className="mt-2 text-sm text-muted-foreground">Memuat dokumen...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex h-full min-h-[300px] w-full items-center justify-center">
                        <div className="text-center">
                            <p className="text-sm text-red-600">{error}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                                Coba Lagi
                            </Button>
                        </div>
                    </div>
                )}

                {!error && (
                    <div ref={containerRef} className={`relative w-fit shrink-0 bg-white shadow-xl select-none ${loading ? 'hidden' : ''}`}>
                        <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading=""
                            error=""
                        >
                            <Page
                                pageNumber={currentPage}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="relative block !m-0 !p-0 !max-w-none !shadow-none"
                                onLoadSuccess={onPageLoadSuccess}
                            >
                                {renderSignatureBoxes()}
                            </Page>
                        </Document>
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
