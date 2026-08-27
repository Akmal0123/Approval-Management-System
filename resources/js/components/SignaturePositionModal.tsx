import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { QrCode, User, FileTextIcon, GripHorizontal, X } from 'lucide-react';

export interface ApproverBox {
    id: string;
    label: string;
    subLabel: string;
    x: number;
    y: number;
    page: string;
    color: string;
}

export interface QRBox {
    active: boolean;
    x: number;
    y: number;
    page: string;
}

interface SignaturePositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    initialApprovers: ApproverBox[];
    initialQr: QRBox;
    onSave: (approvers: ApproverBox[], qr: QRBox) => void;
}

export default function SignaturePositionModal({
    isOpen,
    onClose,
    pdfUrl,
    initialApprovers,
    initialQr,
    onSave
}: SignaturePositionModalProps) {
    const [approvers, setApprovers] = useState<ApproverBox[]>(initialApprovers);
    const [qr, setQr] = useState<QRBox>(initialQr);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setApprovers(initialApprovers);
            setQr(initialQr);
        }
    }, [isOpen, initialApprovers, initialQr]);

    const handleMouseDown = (e: ReactMouseEvent | ReactTouchEvent, id: string) => {
        e.preventDefault();
        setDraggingId(id);
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            if (!draggingId || !containerRef.current) return;

            let clientX, clientY;
            if ('touches' in e) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const rect = containerRef.current.getBoundingClientRect();
            let newX = ((clientX - rect.left) / rect.width) * 100;
            let newY = ((clientY - rect.top) / rect.height) * 100;

            newX = Math.max(0, Math.min(100, newX));
            newY = Math.max(0, Math.min(100, newY));

            if (draggingId === 'qr') {
                setQr((prev) => ({ ...prev, x: newX, y: newY }));
            } else {
                setApprovers((prev) =>
                    prev.map((app) => (app.id === draggingId ? { ...app, x: newX, y: newY } : app))
                );
            }
        };

        const handleMouseUp = () => {
            setDraggingId(null);
            document.body.style.userSelect = '';
        };

        if (draggingId) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleMouseMove, { passive: false });
            document.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [draggingId]);

    const handleSave = () => {
        onSave(approvers, qr);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl w-[90vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col font-sans">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-green-50/50">
                    <div>
                        <DialogTitle className="text-xl font-bold text-green-900">Atur Posisi Tanda Tangan</DialogTitle>
                        <DialogDescription className="text-green-700/80 text-sm mt-1">
                            Geser kotak tanda tangan ke lokasi yang Anda inginkan di dokumen PDF ini.
                        </DialogDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:bg-green-100">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden bg-gray-50">
                    {/* Left Sidebar */}
                    <div className="w-[300px] border-r bg-white p-4 overflow-y-auto flex flex-col gap-6">
                        
                        {/* Approvers List */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                <User className="w-4 h-4" /> Daftar Approver
                            </h3>
                            {approvers.map((app) => (
                                <div key={app.id} className="border border-green-200 bg-green-50/30 rounded-lg p-3 shadow-sm hover:border-green-300 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-semibold text-gray-800 text-sm">{app.label}</div>
                                            <div className="text-xs text-gray-500">{app.subLabel}</div>
                                        </div>
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]">PENDING</Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                                            {app.page === 'all' ? 'Semua Halaman' : app.page === 'first' ? 'Hal Pertama' : 'Hal Terakhir'}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {approvers.length === 0 && (
                                <div className="text-sm text-gray-400 text-center py-4">Belum ada approver</div>
                            )}
                        </div>

                        {/* QR Code */}
                        <div className="space-y-3 pt-4 border-t">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                <QrCode className="w-4 h-4" /> QR Code Dokumen
                            </h3>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="qr-active" 
                                    checked={qr.active}
                                    onCheckedChange={(checked) => setQr(prev => ({ ...prev, active: checked as boolean }))}
                                />
                                <Label htmlFor="qr-active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Aktifkan QR Code
                                </Label>
                            </div>
                            
                            {qr.active && (
                                <div className="border border-orange-200 bg-orange-50/30 rounded-lg p-3 shadow-sm mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                        <div className="font-medium text-gray-800 text-sm">Posisi QR Code</div>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">Ukuran: 25 x 25 mm</div>
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                                        {qr.page === 'all' ? 'Semua Halaman' : qr.page === 'first' ? 'Hal Pertama' : 'Hal Terakhir'}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right PDF Area */}
                    <div className="flex-1 relative flex justify-center items-center p-6 bg-gray-200/50">
                        {pdfUrl ? (
                            <div 
                                ref={containerRef}
                                className="relative bg-white shadow-xl rounded-sm overflow-hidden h-full max-w-full w-[800px] border border-gray-300"
                            >
                                <iframe
                                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                    className="pointer-events-none w-full h-full border-0"
                                    title="PDF Preview"
                                />
                                
                                {/* Approvers */}
                                {approvers.map((app) => (
                                    <div
                                        key={app.id}
                                        onMouseDown={(e) => handleMouseDown(e, app.id)}
                                        onTouchStart={(e) => handleMouseDown(e, app.id)}
                                        className={`absolute cursor-move border-2 border-dashed bg-white/80 p-2 shadow-lg transition-transform active:scale-95 ${draggingId === app.id ? 'z-50 shadow-xl ring-2 ring-blue-400' : 'z-10'}`}
                                        style={{
                                            left: `${app.x}%`,
                                            top: `${app.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            borderColor: app.color || '#3b82f6',
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <GripHorizontal className="w-4 h-4 text-gray-400" />
                                            <div className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                                                {app.label}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* QR Code */}
                                {qr.active && (
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, 'qr')}
                                        onTouchStart={(e) => handleMouseDown(e, 'qr')}
                                        className={`absolute cursor-move border-2 border-dashed border-orange-400 bg-orange-50/80 p-2 shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center w-[80px] h-[80px] ${draggingId === 'qr' ? 'z-50 shadow-xl ring-2 ring-orange-400' : 'z-10'}`}
                                        style={{
                                            left: `${qr.x}%`,
                                            top: `${qr.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                        }}
                                    >
                                        <QrCode className="w-8 h-8 text-orange-500 mb-1" />
                                        <span className="text-[9px] font-bold text-orange-600">QR CODE</span>
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400">
                                <FileTextIcon className="w-16 h-16 mb-2 text-gray-300" />
                                <p>Silakan upload file PDF terlebih dahulu</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-4 border-t bg-white gap-2">
                    <Button variant="outline" onClick={onClose} className="font-sans">
                        Batal
                    </Button>
                    <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-sans">
                        Simpan Posisi Tanda Tangan
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
