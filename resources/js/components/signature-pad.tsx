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
        <div className="space-y-3">
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'draw' | 'saved')}>
                <TabsList className="grid h-9 w-full grid-cols-2 gap-1 p-1">
                    <TabsTrigger value="draw" className="h-7 text-xs font-medium font-sans flex items-center justify-center gap-1.5">
                        <IconPencil className="h-3.5 w-3.5 shrink-0" />
                        <span>Gambar</span>
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="h-7 text-xs font-medium font-sans flex items-center justify-center gap-1.5">
                        <IconUpload className="h-3.5 w-3.5 shrink-0" />
                        <span>Tersimpan</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="draw" className="space-y-3 mt-2">
                    <div className="space-y-1.5">
                        <Label className="font-sans text-xs text-muted-foreground">Gambar tanda tangan Anda (Format 1:1)</Label>
                        <Card className="overflow-hidden">
                            <CardContent className="p-3">
                                <div className="flex justify-center">
                                    <div className="w-full max-w-[220px]">
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
                                <div className="mt-2.5 flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">400 × 400 px</span>
                                    <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} className="font-sans text-xs h-7 px-2 text-muted-foreground hover:text-red-600">
                                        <IconTrash className="mr-1 h-3.5 w-3.5" />
                                        Hapus
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        {onCancel && (
                            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 font-sans text-xs h-8">
                                Batal
                            </Button>
                        )}
                        <Button type="button" onClick={handleUseDrawnSignature} className="flex-1 font-sans text-xs h-8">
                            Gunakan
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="saved" className="space-y-3 mt-2">
                    {signatures.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-5 px-3 text-center">
                                <div className="mb-2 rounded-full bg-muted p-2.5">
                                    <IconSignature className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <h3 className="font-serif text-sm font-semibold">Belum ada tanda tangan tersimpan</h3>
                                <p className="mt-1 font-sans text-xs text-muted-foreground leading-relaxed">
                                    Buat tanda tangan di halaman{' '}
                                    <a href="/profile" className="font-medium text-primary underline hover:text-primary/80">
                                        Profile
                                    </a>{' '}
                                    atau gambar manual.
                                </p>
                                <div className="mt-3 flex flex-col gap-2 w-full">
                                    <Button type="button" variant="outline" size="sm" className="font-sans text-xs h-8 w-full" onClick={() => setSelectedTab('draw')}>
                                        <IconPencil className="mr-1.5 h-3.5 w-3.5" />
                                        Gambar Manual
                                    </Button>
                                    <Button type="button" variant="default" size="sm" className="font-sans text-xs h-8 w-full" asChild>
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
                            <Label className="font-sans text-xs text-muted-foreground">Pilih tanda tangan (1:1)</Label>
                            <div className="grid gap-2 grid-cols-2 max-h-48 overflow-y-auto p-0.5">
                                {signatures.map((signature) => (
                                    <Card
                                        key={signature.id}
                                        className={`cursor-pointer transition-all ${
                                            selectedSignature?.id === signature.id
                                                ? 'border-primary ring-2 ring-primary ring-offset-1'
                                                : 'hover:border-gray-400'
                                        }`}
                                        onClick={() => setSelectedSignature(signature)}
                                    >
                                        <CardContent className="p-2">
                                            <div className="relative flex aspect-square w-full items-center justify-center rounded border bg-white p-1.5">
                                                <img
                                                    src={`/signatures/${signature.id}/file`}
                                                    alt="Signature"
                                                    className="max-h-full max-w-full object-contain"
                                                />
                                                {signature.is_default && (
                                                    <div className="absolute top-1 right-1">
                                                        <span className="rounded bg-primary px-1 py-0.2 font-sans text-[9px] text-white">Default</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-1 text-center">
                                                <p className="font-sans text-[10px] text-muted-foreground truncate">
                                                    {signature.signature_type === 'manual' ? 'Manual' : 'Upload'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {signatures.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                            {onCancel && (
                                <Button type="button" variant="outline" onClick={onCancel} className="flex-1 font-sans text-xs h-8">
                                    Batal
                                </Button>
                            )}
                            <Button type="button" onClick={handleUseSavedSignature} disabled={!selectedSignature} className="flex-1 font-sans text-xs h-8">
                                Gunakan
                            </Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
