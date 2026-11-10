import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/lib/toast';
import { IconCheck, IconPencil, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import React, { useEffect, useRef, useState } from 'react';

interface ParafDrawingPadProps {
    onSave: (dataUrl: string) => void;
    onCancel?: () => void;
    initialData?: string | null;
}

export default function ParafDrawingPad({ onSave, onCancel, initialData }: ParafDrawingPadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'draw' | 'upload'>('draw');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectedTab === 'draw') {
            initializeCanvas();
        }
    }, [selectedTab]);

    const initializeCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set 400x240 canvas size for horizontal paraf
        canvas.width = 400;
        canvas.height = 240;

        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Drawing styles
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        setHasDrawn(false);
    };

    const getCanvasCoordinates = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
        canvas: HTMLCanvasElement
    ) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        setIsDrawing(true);
        setHasDrawn(true);

        const { x, y } = getCanvasCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast.error('Harap pilih file gambar (PNG, JPG, dll).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setUploadedImage(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        if (selectedTab === 'draw') {
            const canvas = canvasRef.current;
            if (!canvas || !hasDrawn) {
                showToast.error('Silakan buat goresan paraf terlebih dahulu');
                return;
            }

            const dataUrl = canvas.toDataURL('image/png');
            onSave(dataUrl);
            showToast.success('Goresan paraf berhasil disimpan');
        } else {
            if (!uploadedImage) {
                showToast.error('Silakan unggah gambar paraf terlebih dahulu');
                return;
            }

            onSave(uploadedImage);
            showToast.success('Gambar paraf berhasil disimpan');
        }
    };

    return (
        <div className="space-y-4">
            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'draw' | 'upload')}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="draw" className="gap-1.5 text-xs font-semibold">
                        <IconPencil className="h-3.5 w-3.5" />
                        Gores Paraf
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="gap-1.5 text-xs font-semibold">
                        <IconUpload className="h-3.5 w-3.5" />
                        Unggah Gambar
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="draw" className="space-y-3 pt-2">
                    <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/30 bg-white p-1 shadow-inner">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="h-[180px] w-full touch-none cursor-crosshair rounded bg-white"
                        />
                        <div className="pointer-events-none absolute bottom-2 right-2 text-[10px] text-muted-foreground/50 select-none">
                            Sudut Kanan Bawah
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearCanvas}
                            className="gap-1 text-xs text-red-600 hover:bg-red-50"
                        >
                            <IconTrash className="h-3.5 w-3.5" />
                            Bersihkan
                        </Button>
                        <span className="text-[11px] text-muted-foreground">
                            Goreskan inisial/paraf singkat seperti di dokumen
                        </span>
                    </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-3 pt-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {uploadedImage ? (
                        <Card className="border bg-white">
                            <CardContent className="flex flex-col items-center justify-center p-4">
                                <div className="flex h-36 w-full items-center justify-center">
                                    <img
                                        src={uploadedImage}
                                        alt="Preview Paraf"
                                        className="max-h-full max-w-full object-contain filter contrast-125"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setUploadedImage(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="mt-3 gap-1 text-xs text-red-600 hover:bg-red-50"
                                >
                                    <IconTrash className="h-3.5 w-3.5" />
                                    Hapus & Ganti
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-center hover:bg-muted/30"
                        >
                            <IconUpload className="h-8 w-8 text-muted-foreground/70 mb-2" />
                            <p className="text-xs font-semibold text-foreground">Klik untuk memilih gambar paraf</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Format PNG atau JPG dengan latar belakang transparan/putih</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
                {onCancel && (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs">
                        Batal
                    </Button>
                )}
                <Button type="button" size="sm" onClick={handleSave} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    <IconCheck className="h-3.5 w-3.5" />
                    Terapkan Paraf
                </Button>
            </div>
        </div>
    );
}

