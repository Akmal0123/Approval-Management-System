import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/lib/toast';
import axios from 'axios';
import { CheckCircle2, FileSignature, PenTool, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Signature {
    id: number;
    signature_path: string;
    signature_url: string;
    signature_type: 'manual' | 'uploaded';
    is_default: boolean;
    created_at: string;
}

// Helper to get CSRF token
function getCsrfToken(): string {
    // Try XSRF-TOKEN cookie first (preferred by Laravel)
    const xsrfMatches = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (xsrfMatches) {
        return decodeURIComponent(xsrfMatches[1]);
    }
    // Fallback to meta tag
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

export default function SignatureManager() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [signatureToDelete, setSignatureToDelete] = useState<number | null>(null);

    // Fetch signatures on mount
    useEffect(() => {
        fetchSignatures();
    }, []);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas drawing style
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const fetchSignatures = async () => {
        try {
            const response = await axios.get(route('signatures.index'), {
                headers: {
                    Accept: 'application/json',
                },
                withCredentials: true,
            });
            setSignatures(response.data.signatures || []);
        } catch (error) {
            console.error('Failed to fetch signatures:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    // Get canvas coordinates accounting for scale
    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // Calculate scale between canvas internal size and display size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Get coordinates relative to canvas and apply scale
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        return { x, y };
    };

    // Canvas drawing functions
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent scrolling on touch devices

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure canvas is properly initialized
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        setIsDrawing(true);

        const { x, y } = getCanvasCoordinates(e, canvas);

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        e.preventDefault(); // Prevent scrolling on touch devices

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

        // Clear and refill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const saveCanvasSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setLoading(true);
        try {
            const dataUrl = canvas.toDataURL('image/png');

            const response = await axios.post(
                route('signatures.store'),
                {
                    signature: dataUrl,
                    signature_type: 'manual',
                    is_default: signatures.length === 0, // Set as default if first signature
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    withCredentials: true,
                },
            );

            showToast.success('✅ Tanda tangan berhasil disimpan!');
            clearCanvas();
            await fetchSignatures();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal menyimpan tanda tangan';
            showToast.error(`❌ ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast.error('❌ Pilih file gambar (PNG, JPG, JPEG)');
                return;
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                showToast.error('❌ Ukuran file maksimal 2MB');
                return;
            }

            setUploadFile(file);
        }
    };

    const uploadSignature = async () => {
        if (!uploadFile) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('signature_file', uploadFile);
            formData.append('signature_type', 'uploaded');
            formData.append('is_default', signatures.length === 0 ? '1' : '0');

            await axios.post(route('signatures.upload'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                withCredentials: true,
            });

            showToast.success('✅ Tanda tangan berhasil diupload!');
            setUploadFile(null);
            // Reset file input
            const fileInput = document.getElementById('signature-file') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            await fetchSignatures();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal mengupload tanda tangan';
            showToast.error(`❌ ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const setAsDefault = async (signatureId: number) => {
        setLoading(true);
        try {
            await axios.post(
                route('signatures.setDefault', signatureId),
                {},
                {
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    withCredentials: true,
                },
            );

            showToast.success('✅ Tanda tangan default berhasil diupdate!');
            await fetchSignatures();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal mengupdate tanda tangan default';
            showToast.error(`❌ ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const deleteSignature = async (signatureId: number) => {
        setLoading(true);
        try {
            await axios.delete(route('signatures.destroy', signatureId), {
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                withCredentials: true,
            });

            showToast.success('✅ Tanda tangan berhasil dihapus');
            await fetchSignatures();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal menghapus tanda tangan';
            showToast.error(`❌ ${message}`);
        } finally {
            setLoading(false);
            setDeleteDialogOpen(false);
            setSignatureToDelete(null);
        }
    };

    const handleDeleteClick = (signatureId: number) => {
        setSignatureToDelete(signatureId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (signatureToDelete) {
            deleteSignature(signatureToDelete);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Digital Signature Management</CardTitle>
                    <CardDescription>Buat dan kelola tanda tangan digital Anda untuk proses approval dokumen</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="draw" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="draw">
                                <PenTool className="mr-2 h-4 w-4" />
                                Gambar Tanda Tangan
                            </TabsTrigger>
                            <TabsTrigger value="upload">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Tanda Tangan
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="draw" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Gambar tanda tangan Anda di bawah ini</Label>
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={200}
                                    className="w-full cursor-crosshair touch-none rounded-md border-2 border-dashed border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-950"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={clearCanvas}>
                                    <X className="mr-2 h-4 w-4" />
                                    Hapus
                                </Button>
                                <Button type="button" onClick={saveCanvasSignature} disabled={loading}>
                                    {loading ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="upload" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="signature-file">Upload gambar tanda tangan</Label>
                                <Input id="signature-file" type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleFileChange} />
                                <p className="text-sm text-muted-foreground">Format yang didukung: PNG, JPG, JPEG. Maksimal 2MB</p>
                            </div>
                            {uploadFile && (
                                <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
                                    <p className="text-sm font-medium">File dipilih: {uploadFile.name}</p>
                                    <p className="text-sm text-muted-foreground">Ukuran: {(uploadFile.size / 1024).toFixed(2)} KB</p>
                                </div>
                            )}
                            <Button type="button" onClick={uploadSignature} disabled={!uploadFile || loading}>
                                <Upload className="mr-2 h-4 w-4" />
                                {loading ? 'Mengupload...' : 'Upload Tanda Tangan'}
                            </Button>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Signatures List */}
            <Card>
                <CardHeader>
                    <CardTitle>Tanda Tangan Saya</CardTitle>
                    <CardDescription>Kelola tanda tangan yang telah disimpan</CardDescription>
                </CardHeader>
                <CardContent>
                    {initialLoading ? (
                        /* Loading skeleton */
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2].map((i) => (
                                <Card key={i} className="relative">
                                    <CardContent className="p-4">
                                        <div className="mb-2 flex items-start justify-between">
                                            <Skeleton className="h-5 w-16" />
                                            <Skeleton className="h-5 w-20" />
                                        </div>
                                        <Skeleton className="mb-4 h-32 w-full rounded" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-8 w-24" />
                                            <Skeleton className="h-8 w-8" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : signatures.length === 0 ? (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="mb-4 rounded-full bg-muted p-4">
                                <FileSignature className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="mb-1 text-lg font-medium">Belum ada tanda tangan</h3>
                            <p className="max-w-sm text-sm text-muted-foreground">
                                Gambar atau upload tanda tangan Anda di atas untuk memulai. Tanda tangan akan digunakan untuk proses approval dokumen.
                            </p>
                        </div>
                    ) : (
                        /* Signatures grid */
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {signatures.map((signature) => (
                                <Card key={signature.id} className="relative">
                                    <CardContent className="p-4">
                                        <div className="mb-2 flex items-start justify-between">
                                            <Badge variant={signature.is_default ? 'default' : 'secondary'}>
                                                {signature.signature_type === 'manual' ? 'Digambar' : 'Diupload'}
                                            </Badge>
                                            {signature.is_default && (
                                                <Badge variant="outline" className="ml-2">
                                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="mb-4 flex h-32 items-center justify-center rounded border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-950">
                                            <img
                                                src={signature.signature_url}
                                                alt="Tanda Tangan"
                                                className="max-h-full max-w-full object-contain"
                                                onError={(e) => {
                                                    console.error('Failed to load signature image:', signature.signature_url);
                                                    e.currentTarget.src =
                                                        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
                                                }}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            {!signature.is_default && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setAsDefault(signature.id)}
                                                    disabled={loading}
                                                >
                                                    Set as Default
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteClick(signature.id)}
                                                disabled={loading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-serif">Hapus Tanda Tangan</DialogTitle>
                        <DialogDescription className="font-sans">
                            Apakah Anda yakin ingin menghapus tanda tangan ini? Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} className="font-sans" disabled={loading}>
                            Batal
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete} className="font-sans" disabled={loading}>
                            {loading ? 'Menghapus...' : 'Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
