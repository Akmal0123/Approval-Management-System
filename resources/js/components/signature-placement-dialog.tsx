import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { GripHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
    const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

    const PDF_TO_MM = 0.352778; // 1 point = 0.352778 mm

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
            existingPositions.forEach((pos: any) => {
                const key = pos.dokumen_approval_id || 'qr_code';
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
        setPageDimensions({
            width: page.originalWidth * scale,
            height: page.originalHeight * scale,
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

    const handleMouseDown = (e: React.MouseEvent, approvalId: number | string) => {
        if (readOnly) return;

        // Prevent editing already approved signatures
        if (approvalId !== 'qr_code') {
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
        setInitialPos({ x: mmToPx(pos.x), y: mmToPx(pos.y) });
    };

    const handleResizeMouseDown = (e: React.MouseEvent, approvalId: number | string) => {
        if (readOnly) return;

        // Prevent editing already approved signatures
        if (approvalId !== 'qr_code') {
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
        setInitialSize({ width: mmToPx(pos.width), height: mmToPx(pos.height) });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!activeApprovalId || !containerRef.current) return;

        if (isDragging) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;

            let newX = initialPos.x + dx;
            let newY = initialPos.y + dy;

            // Boundaries using accurate page dimensions
            const boxWidth = mmToPx(positions[activeApprovalId].width);
            const boxHeight = mmToPx(positions[activeApprovalId].height);
            const containerWidth = pageDimensions.width > 0 ? pageDimensions.width : containerRef.current.clientWidth;
            const containerHeight = pageDimensions.height > 0 ? pageDimensions.height : containerRef.current.clientHeight;

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
            const newSize = Math.max(minSize, initialSize.width + delta);

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
        setPositions((prev) => ({
            ...prev,
            [approvalId]: {
                ...prev[approvalId],
                page: targetPage,
            },
        }));
        setCurrentPage(targetPage);
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

        const qrPos = positions['qr_code'];
        if (qrPos && qrPos.page === currentPage) {
            const isActive = activeApprovalId === 'qr_code';
            const isQrEditable = !readOnly;
            boxes.push(
                <div
                    key="qr_code"
                    className={`absolute flex flex-col items-center justify-center border-2 border-dashed shadow-sm transition-colors select-none ${isActive ? 'z-10 border-amber-600 bg-amber-500/20' : 'z-0 border-amber-500 bg-amber-100/50'}`}
                    style={{
                        left: `${mmToPx(qrPos.x)}px`,
                        top: `${mmToPx(qrPos.y)}px`,
                        width: `${mmToPx(qrPos.width)}px`,
                        height: `${mmToPx(qrPos.height)}px`,
                        cursor: isQrEditable ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    }}
                    onMouseDown={isQrEditable ? (e) => handleMouseDown(e, 'qr_code') : undefined}
                >
                    <div className="pointer-events-none flex flex-col items-center gap-1 p-2 text-amber-700">
                        <span className="text-center text-[8px] font-bold tracking-wider uppercase sm:text-[10px]">QR Code</span>
                        <div className="rounded border border-amber-300 bg-white p-1">
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
                                className="h-4 w-4"
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
                            onMouseDown={(e) => handleResizeMouseDown(e, 'qr_code')}
                        />
                    )}
                </div>,
            );
        }

        return boxes;
    };

    const innerContent = (
        <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-background">
            {/* Sidebar Configuration */}
            <div className="flex w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-muted/20 p-4">
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
                    <h3 className="mb-3 text-sm font-semibold">QR Code Dokumen</h3>
                    <div className="flex flex-col gap-3">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium select-none">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                                checked={!!positions['qr_code']}
                                disabled={readOnly}
                                onChange={(e) => {
                                    if (readOnly) return;
                                    const checked = e.target.checked;
                                    if (checked) {
                                        setPositions((prev) => ({
                                            ...prev,
                                            qr_code: {
                                                dokumen_approval_id: 'qr_code',
                                                page: currentPage,
                                                x: 175,
                                                y: 20,
                                                width: 25,
                                                height: 25,
                                            },
                                        }));
                                        setActiveApprovalId('qr_code');
                                    } else {
                                        setPositions((prev) => {
                                            const next = { ...prev };
                                            delete next['qr_code'];
                                            return next;
                                        });
                                        if (activeApprovalId === 'qr_code') {
                                            setActiveApprovalId(approvals.length > 0 ? approvals[0].id : null);
                                        }
                                    }
                                }}
                            />
                            Aktifkan QR Code
                        </label>

                        {positions['qr_code'] && (
                            <div
                                className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${activeApprovalId === 'qr_code' ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/50'}`}
                                onClick={() => {
                                    setActiveApprovalId('qr_code');
                                    const qrPos = positions['qr_code'];
                                    if (qrPos.page !== currentPage) {
                                        setCurrentPage(qrPos.page);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-1.5 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    Posisi QR Code
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Ukuran: {Math.round(positions['qr_code'].width)} x {Math.round(positions['qr_code'].height)} mm
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs ${positions['qr_code'].page === currentPage ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                                    >
                                        Hal. {positions['qr_code'].page}
                                    </span>
                                    {positions['qr_code'].page !== currentPage && !readOnly && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPositions((prev) => ({
                                                    ...prev,
                                                    qr_code: {
                                                        ...prev['qr_code'],
                                                        page: currentPage,
                                                    },
                                                }));
                                            }}
                                        >
                                            Pindah ke sini
                                        </Button>
                                    )}
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
                    <div ref={containerRef} className={`relative shrink-0 bg-white shadow-xl select-none ${loading ? 'hidden' : ''}`}>
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
                                className="shadow-sm"
                                onLoadSuccess={onPageLoadSuccess}
                            />
                        </Document>

                        {renderSignatureBoxes()}
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
