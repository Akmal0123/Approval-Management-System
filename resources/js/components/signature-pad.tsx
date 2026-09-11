import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/lib/toast';
import { IconPencil, IconSignature, IconTrash, IconUpload } from '@tabler/icons-react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

interface Signature {
    id: number;
    signature_path: string;
    signature_url: string;
    signature_type: 'manual' | 'uploaded';
    is_default: boolean;
    created_at: string;
}

interface SignaturePadProps {
    onSignatureComplete: (signatureData: string) => void;
    onCancel?: () => void;
}

export default function SignaturePad({ onSignatureComplete, onCancel }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [selectedTab, setSelectedTab] = useState<'draw' | 'saved'>('draw');
    const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);

    // Fetch signatures on mount
    useEffect(() => {
        fetchSignatures();
    }, []);

    // Initialize canvas when tab changes to draw
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

        // Set standard 400x400 canvas size (1:1 square ratio)
        canvas.width = 400;
        canvas.height = 400;

        // Set canvas drawing style
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const fetchSignatures = async () => {
        try {
            const response = await axios.get(route('signatures.index'), {
                headers: { Accept: 'application/json' },
                withCredentials: true,
            });
            const data = response.data;
            setSignatures(data.signatures || []);

            // Auto-select default signature if exists
            const defaultSig = data.signatures?.find((sig: Signature) => sig.is_default);
            if (defaultSig) {
                setSelectedSignature(defaultSig);
                setSelectedTab('saved');
            }
        } catch (error) {
            console.error('Failed to fetch signatures:', error);
        }
    };

    // Get canvas coordinates accounting for scale
    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        return { x, y };
    };

    // Canvas drawing functions
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        setIsDrawing(true);

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

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleUseDrawnSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Check if canvas is blank
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let isBlank = true;

        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) {
                isBlank = false;
                break;
            }
        }

        if (isBlank) {
            showToast.error('❌ Silakan gambar tanda tangan terlebih dahulu');
            return;
        }

        // Standard 400x400 PNG DataURL
        const dataUrl = canvas.toDataURL('image/png');
        onSignatureComplete(dataUrl);
    };

    const handleUseSavedSignature = () => {
        if (!selectedSignature) {
            showToast.error('❌ Silakan pilih tanda tangan terlebih dahulu');
            return;
        }

        // Use the storage path directly to ensure it works regardless of APP_URL
        const signatureUrl = `/signatures/${selectedSignature.id}/file`;
        onSignatureComplete(signatureUrl);
    };

    return (
        <div className="space-y-4">
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'draw' | 'saved')}>
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1">
                    <TabsTrigger value="draw" className="h-auto py-2.5 text-center font-sans leading-tight whitespace-normal">
                        <IconPencil className="mr-2 hidden h-4 w-4 shrink-0 sm:inline" />
                        <span>Gambar Tanda Tangan</span>
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="h-auto py-2.5 text-center font-sans leading-tight whitespace-normal">
                        <IconUpload className="mr-2 hidden h-4 w-4 shrink-0 sm:inline" />
                        <span>Tanda Tangan Tersimpan</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="draw" className="space-y-4">
                    <div className="space-y-2">
                        <Label className="font-sans">Gambar tanda tangan Anda di dalam area 1:1 di bawah ini</Label>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex justify-center">
                                    <div className="w-full max-w-[280px]">
                                        <canvas
                                            ref={canvasRef}
                                            width={400}
                                            height={400}
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                            className="aspect-square w-full cursor-crosshair touch-none rounded border-2 border-dashed border-gray-300 bg-white shadow-xs"
                                        />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground">Format 1:1 (400 × 400 px)</span>
                                    <Button type="button" variant="outline" size="sm" onClick={clearCanvas} className="font-sans">
                                        <IconTrash className="mr-2 h-4 w-4" />
                                        Hapus
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {onCancel && (
                            <Button type="button" variant="outline" onClick={onCancel} className="font-sans">
                                Batal
                            </Button>
                        )}
                        <Button type="button" onClick={handleUseDrawnSignature} className="font-sans">
                            Gunakan Tanda Tangan Ini
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="saved" className="space-y-4">
                    {signatures.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-8">
                                <div className="mb-3 rounded-full bg-muted p-3">
                                    <IconSignature className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="font-serif text-base font-semibold">Belum ada tanda tangan tersimpan</h3>
                                <p className="mt-1 max-w-xs text-center font-sans text-xs text-muted-foreground">
                                    Anda belum memiliki tanda tangan yang tersimpan. Buat tanda tangan di halaman{' '}
                                    <a href="/profile" className="font-medium text-primary underline hover:text-primary/80">
                                        Profile
                                    </a>{' '}
                                    atau gambar manual pada tab sebelah.
                                </p>
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                    <Button type="button" variant="outline" size="sm" className="font-sans text-xs" onClick={() => setSelectedTab('draw')}>
                                        <IconPencil className="mr-1.5 h-3.5 w-3.5" />
                                        Gambar Manual
                                    </Button>
                                    <Button type="button" variant="default" size="sm" className="font-sans text-xs" asChild>
                                        <a href="/profile">
                                            <IconSignature className="mr-1.5 h-3.5 w-3.5" />
                                            Kelola di Profile
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            <Label className="font-sans">Pilih tanda tangan yang akan digunakan (1:1)</Label>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {signatures.map((signature) => (
                                    <Card
                                        key={signature.id}
                                        className={`cursor-pointer transition-all ${
                                            selectedSignature?.id === signature.id
                                                ? 'border-primary ring-2 ring-primary ring-offset-2'
                                                : 'hover:border-gray-400'
                                        }`}
                                        onClick={() => setSelectedSignature(signature)}
                                    >
                                        <CardContent className="p-3">
                                            <div className="relative flex aspect-square w-full items-center justify-center rounded border bg-white p-2">
                                                <img
                                                    src={`/signatures/${signature.id}/file`}
                                                    alt="Signature"
                                                    className="max-h-full max-w-full object-contain"
                                                />
                                                {signature.is_default && (
                                                    <div className="absolute top-1.5 right-1.5">
                                                        <span className="rounded bg-primary px-1.5 py-0.5 font-sans text-[10px] text-white">Default</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-2 text-center">
                                                <p className="font-sans text-[11px] text-muted-foreground">
                                                    {signature.signature_type === 'manual' ? 'Tanda tangan manual' : 'Tanda tangan upload'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {signatures.length > 0 && (
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            {onCancel && (
                                <Button type="button" variant="outline" onClick={onCancel} className="font-sans">
                                    Batal
                                </Button>
                            )}
                            <Button type="button" onClick={handleUseSavedSignature} disabled={!selectedSignature} className="font-sans">
                                Gunakan Tanda Tangan Ini
                            </Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
