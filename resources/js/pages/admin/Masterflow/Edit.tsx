import { Head, Link, router } from '@inertiajs/react';
import { IconArrowLeft, IconBuilding, IconEdit, IconPlus, IconSettings, IconTrash } from '@tabler/icons-react';
import { FormEvent, useState } from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';

interface Jabatan {
    id: number;
    name: string;
}

interface Company {
    id: number;
    name: string;
}

interface MasterflowStep {
    id?: number;
    step_order: number;
    step_name: string;
    description: string;
    is_required: boolean;
    jabatan_id: number;
    jabatan?: Jabatan;
}

interface Masterflow {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    total_steps: number;
    company: Company;
    steps: MasterflowStep[];
}

interface Props {
    masterflow: Masterflow;
    jabatans: Jabatan[];
    company: Company;
}

export default function Edit({ masterflow, jabatans, company }: Props) {
    const [formData, setFormData] = useState({
        name: masterflow.name,
        description: masterflow.description || '',
        is_active: masterflow.is_active,
        steps: masterflow.steps.map((step) => ({
            id: step.id,
            step_order: step.step_order,
            step_name: step.step_name,
            description: step.description || '',
            is_required: step.is_required,
            jabatan_id: step.jabatan_id,
        })),
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const addStep = () => {
        setFormData({
            ...formData,
            steps: [
                ...formData.steps,
                {
                    id: undefined,
                    step_order: formData.steps.length + 1,
                    step_name: '',
                    description: '',
                    is_required: true,
                    jabatan_id: 0,
                },
            ],
        });
    };

    const removeStep = (index: number) => {
        const newSteps = formData.steps.filter((_, i) => i !== index);
        // Reorder steps
        const reorderedSteps = newSteps.map((step, i) => ({
            ...step,
            step_order: i + 1,
        }));

        setFormData({
            ...formData,
            steps: reorderedSteps,
        });
    };

    const updateStep = (index: number, field: keyof MasterflowStep, value: any) => {
        const newSteps = [...formData.steps];
        newSteps[index] = {
            ...newSteps[index],
            [field]: value,
        };

        setFormData({
            ...formData,
            steps: newSteps,
        });
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.put(route('admin.masterflows.update', masterflow.id), formData as any, {
            onSuccess: () => {
                showToast.success('Masterflow berhasil diperbarui.');
            },
            onError: (errors) => {
                setErrors(errors);
                showToast.error('Gagal memperbarui masterflow. Periksa form Anda.');
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <>
            <Head title={`Edit Masterflow - ${masterflow.name}`} />
            <SidebarProvider>
                <NotificationListener />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                            <div className="space-y-8">
                                {/* Header Section */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-foreground">
                                            <IconEdit className="h-6 w-6 text-primary" />
                                            Edit Masterflow
                                        </h1>
                                        <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
                                            <IconBuilding className="h-4 w-4" />
                                            {company?.name || 'Unknown Company'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link href={route('admin.masterflows.show', masterflow.id)}>
                                            <Button variant="outline" className="font-sans">
                                                <IconSettings className="mr-2 h-4 w-4" />
                                                Lihat Detail
                                            </Button>
                                        </Link>
                                        <Link href={route('admin.masterflows.index')}>
                                            <Button variant="outline" className="font-sans">
                                                <IconArrowLeft className="mr-2 h-4 w-4" />
                                                Kembali
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <Card className="border-border bg-card">
                                        <CardHeader>
                                            <CardTitle className="font-serif text-foreground">Informasi Masterflow</CardTitle>
                                            <CardDescription className="font-sans">Perbarui informasi dasar masterflow.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="font-sans">
                                                    Nama Masterflow *
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    placeholder="Contoh: Approval Surat Permohonan"
                                                    className="font-sans"
                                                />
                                                {errors.name && <p className="font-sans text-sm text-red-600">{errors.name}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="description" className="font-sans">
                                                    Deskripsi
                                                </Label>
                                                <Textarea
                                                    id="description"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    placeholder="Deskripsi singkat tentang masterflow ini"
                                                    rows={3}
                                                    className="font-sans"
                                                />
                                                {errors.description && <p className="font-sans text-sm text-red-600">{errors.description}</p>}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border bg-card">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="font-serif text-foreground">Langkah Approval</CardTitle>
                                                    <CardDescription className="font-sans">
                                                        Perbarui urutan langkah approval yang diperlukan.
                                                    </CardDescription>
                                                </div>
                                                <Button type="button" onClick={addStep} variant="outline" size="sm" className="font-sans">
                                                    <IconPlus className="mr-2 h-4 w-4" />
                                                    Tambah Langkah
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {formData.steps.map((step, index) => (
                                                <div key={step.id || index} className="space-y-4 rounded-lg border border-border p-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-sans font-semibold text-foreground">Langkah {step.step_order}</h4>
                                                        {formData.steps.length > 1 && (
                                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(index)}>
                                                                <IconTrash className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div className="space-y-2">
                                                            <Label className="font-sans">Nama Langkah *</Label>
                                                            <Input
                                                                value={step.step_name}
                                                                onChange={(e) => updateStep(index, 'step_name', e.target.value)}
                                                                placeholder="Contoh: Review Manager"
                                                                className="font-sans"
                                                            />
                                                            {errors[`steps.${index}.step_name`] && (
                                                                <p className="font-sans text-sm text-red-600">{errors[`steps.${index}.step_name`]}</p>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="font-sans">Jabatan yang Bertanggung Jawab *</Label>
                                                            <Select
                                                                value={step.jabatan_id.toString()}
                                                                onValueChange={(value) => updateStep(index, 'jabatan_id', parseInt(value))}
                                                            >
                                                                <SelectTrigger className="font-sans">
                                                                    <SelectValue placeholder="Pilih Jabatan" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {jabatans.map((jabatan) => (
                                                                        <SelectItem
                                                                            key={jabatan.id}
                                                                            value={jabatan.id.toString()}
                                                                            className="font-sans"
                                                                        >
                                                                            {jabatan.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {errors[`steps.${index}.jabatan_id`] && (
                                                                <p className="font-sans text-sm text-red-600">
                                                                    {errors[`steps.${index}.jabatan_id`]}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="font-sans">Deskripsi Langkah</Label>
                                                        <Textarea
                                                            value={step.description}
                                                            onChange={(e) => updateStep(index, 'description', e.target.value)}
                                                            placeholder="Deskripsi tentang apa yang dilakukan pada langkah ini"
                                                            rows={2}
                                                            className="font-sans"
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            {errors.steps && <p className="font-sans text-sm text-red-600">{errors.steps}</p>}
                                        </CardContent>
                                    </Card>

                                    <div className="flex items-center justify-end space-x-2">
                                        <Link href={route('admin.masterflows.index')}>
                                            <Button type="button" variant="outline" className="font-sans">
                                                Batal
                                            </Button>
                                        </Link>
                                        <Button type="submit" disabled={processing} className="font-sans">
                                            {processing ? 'Menyimpan...' : 'Perbarui Masterflow'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
