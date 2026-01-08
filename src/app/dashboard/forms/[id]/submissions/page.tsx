'use client'

import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Download, Table as TableIcon, Map as MapIcon, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import Map from '@/components/Map'
import { exportToExcel } from '@/lib/export'
import { useState, useMemo, use } from 'react'
// import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FormTemplate, Submission, FormField } from '@/types'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

/* eslint-disable @typescript-eslint/no-explicit-any */
const parseLocation = (val: any): { lat: number, lng: number } | null => {
    let lat = 0, lng = 0;
    if (typeof val === 'string') {
        const parts = val.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            lat = parts[0]; lng = parts[1];
        }
    } else if (typeof val === 'object' && val !== null) {
        if ('lat' in val && 'lng' in val) { lat = Number((val as any).lat); lng = Number((val as any).lng); }
        else if ('latitude' in val && 'longitude' in val) { lat = Number((val as any).latitude); lng = Number((val as any).longitude); }
        else if ('coordinates' in val && Array.isArray((val as any).coordinates)) { lng = Number((val as any).coordinates[0]); lat = Number((val as any).coordinates[1]); }
    }

    if ((!lat && lat !== 0) || (!lng && lng !== 0)) return null;
    return { lat, lng };
};

export default function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    // const router = useRouter()
    const queryClient = useQueryClient()
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
    const [verificationNote, setVerificationNote] = useState('')
    const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending')

    const { data: form, isLoading: isLoadingForm } = useQuery({
        queryKey: ['form', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('forms')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data as FormTemplate
        },
    })

    const { data: submissions, isLoading: isLoadingSubmissions } = useQuery({
        queryKey: ['submissions', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('submissions')
                .select('*')
                .eq('form_id', id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as Submission[]
        },
    })

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, notes }: { id: string, status: string, notes?: string }) => {
            const { error } = await supabase
                .from('submissions')
                .update({
                    status,
                    admin_notes: notes,
                    verified_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions', id] })
            toast.success('Submission status updated')
            setIsDetailsOpen(false)
        },
        onError: (error) => {
            toast.error('Failed to update status: ' + error.message)
        }
    })

    // Flatten data for export/table
    const flattenedData = useMemo(() => {
        if (!submissions || !form) return []
        return submissions.map(sub => ({
            ...sub,
            ...sub.data, // Flatten JSONB
            enumerator_name: sub.enumerator_name || 'Unknown',
            status: sub.status || 'pending',
            admin_notes: sub.admin_notes || '',
            verified_at: sub.verified_at || null
        }))
    }, [submissions, form])

    // Get all fields from schema (handling both legacy fields and new sections)
    const allFields = useMemo(() => {
        if (!form?.schema) return []
        if (form.schema.sections) {
            return form.schema.sections.flatMap(section => section.fields)
        }
        return form.schema.fields || []
    }, [form])

    const renderCellContent = (col: FormField, value: any) => {
        if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>

        if (col.type === 'image') {
            return <Badge variant="outline">Image</Badge>
        }

        if (col.type === 'location') {
            return <Badge variant="outline">Location</Badge>
        }

        if (Array.isArray(value)) {
            return (
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {value.map((item, i) => (
                        <Badge key={i} variant="secondary" className="rounded-sm text-[10px] px-1 h-5 whitespace-nowrap">
                            {String(item)}
                        </Badge>
                    ))}
                </div>
            )
        }

        if (typeof value === 'object') {
            return <span className="font-mono text-xs truncate max-w-[150px] inline-block" title={JSON.stringify(value)}>{JSON.stringify(value)}</span>
        }

        const strValue = String(value)
        if (strValue.length > 30) {
            return <span title={strValue}>{strValue.substring(0, 30)}...</span>
        }
        return strValue
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
            default:
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
        }
    }

    // Get dynamic columns from schema
    const tableColumns = useMemo<ColumnDef<any>[]>(() => {
        if (allFields.length === 0) return []

        const baseColumns: ColumnDef<any>[] = [
            {
                accessorKey: "enumerator_name",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="pl-0 hover:bg-transparent"
                    >
                        Enumerator
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
            },
            {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }) => getStatusBadge(row.getValue("status"))
            },
            {
                accessorKey: "created_at",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="pl-0 hover:bg-transparent"
                    >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const date = row.getValue("created_at") as string
                    return <span className="whitespace-nowrap">{date ? format(new Date(date), 'dd MMM yyyy, HH:mm') : '-'}</span>
                }
            }
        ]

        const dynamicColumns: ColumnDef<any>[] = allFields.map((field) => ({
            accessorKey: field.id,
            header: field.label,
            cell: ({ row }) => {
                const val = row.getValue(field.id)
                return renderCellContent(field, val)
            }
        }))

        const actionColumn: ColumnDef<any> = {
            id: "actions",
            cell: ({ row }) => {
                return (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            const data = row.original
                            setSelectedSubmission(data)
                            setVerificationStatus(data.status || 'pending')
                            setVerificationNote(data.admin_notes || '')
                            setIsDetailsOpen(true)
                        }}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                )
            }
        }

        return [...baseColumns, ...dynamicColumns, actionColumn]
    }, [form])

    // Prepare Map Markers
    const mapMarkers = useMemo(() => {
        if (allFields.length === 0) return []
        const locationField = allFields.find(c => c.type === 'location')
        if (!flattenedData || !locationField) return []

        return flattenedData.map(sub => {
            const loc = parseLocation(sub.data[locationField.id])
            if (!loc) return null

            return {
                id: sub.id,
                lat: loc.lat,
                lng: loc.lng,
                title: sub.enumerator_name,
                description: (
                    <div className="space-y-2 mt-1 min-w-[200px]">
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                                {sub.created_at ? format(new Date(sub.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                            </div>
                            {getStatusBadge(sub.status)}
                        </div>
                        <div className="flex flex-col gap-2 text-xs border-t pt-2 max-h-[200px] overflow-y-auto">
                            {allFields.map(col => {
                                if (col.type === 'location' || col.type === 'image') return null;
                                const val = sub.data[col.id];
                                if (val === undefined || val === null || val === '') return null;

                                return (
                                    <div key={col.id} className="flex flex-col">
                                        <span className="font-semibold text-muted-foreground text-[10px] uppercase">{col.label}</span>
                                        <span className="break-words">{Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val))}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            }
        }).filter((m): m is any => m !== null)
    }, [flattenedData, allFields])

    const handleExport = async () => {
        if (!flattenedData.length) return

        // Prepare data for Excel
        const exportData = flattenedData.map(row => {
            let formattedDate = ''
            try {
                formattedDate = row.created_at ? format(new Date(row.created_at), 'yyyy-MM-dd HH:mm:ss') : ''
            } catch {
                formattedDate = 'Invalid Date'
            }

            const standardFields: Record<string, unknown> = {
                'ID': row.id,
                'Enumerator': row.enumerator_name,
                'Status': row.status,
                'Admin Notes': row.admin_notes,
                'Verified At': row.verified_at ? format(new Date(row.verified_at), 'yyyy-MM-dd HH:mm:ss') : '',
                'Date': formattedDate,
                'Latitude': '',
                'Longitude': '',
            }

            // Try to find location from data
            const locationField = form?.schema?.fields?.find(c => c.type === 'location')
            if (locationField) {
                const loc = parseLocation(row.data[locationField.id])
                if (loc) {
                    standardFields['Latitude'] = String(loc.lat)
                    standardFields['Longitude'] = String(loc.lng)
                }
            }

            const dynamicFields: Record<string, unknown> = {}
            form?.schema?.fields?.forEach(col => {
                const val = row.data[col.id]
                dynamicFields[col.label] = typeof val === 'object' ? JSON.stringify(val) : val
            })

            return { ...standardFields, ...dynamicFields }
        })

        await exportToExcel(exportData, `${form?.title || 'form'}_submissions`)
    }

    const handleSaveVerification = () => {
        if (!selectedSubmission) return
        updateStatusMutation.mutate({
            id: selectedSubmission.id,
            status: verificationStatus,
            notes: verificationNote
        })
    }

    if (isLoadingForm || isLoadingSubmissions) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-muted-foreground">Loading data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6">
            <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Submissions: {form?.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        Total: {submissions?.length || 0} submissions
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport} disabled={!submissions?.length}>
                        <Download className="h-4 w-4 mr-2" /> Export Excel
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="table" className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="table">
                            <TableIcon className="h-4 w-4 mr-2" /> Table
                        </TabsTrigger>
                        <TabsTrigger value="map">
                            <MapIcon className="h-4 w-4 mr-2" /> Map
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="table" className="flex-1 border rounded-md relative flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto p-4">
                        <DataTable
                            columns={tableColumns}
                            data={flattenedData}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="map" className="flex-1 mt-0 relative min-h-[500px] border rounded-md overflow-hidden shadow-sm">
                    <Map markers={mapMarkers} className="h-full w-full" />
                </TabsContent>
            </Tabs>

            {/* Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Submission Details</span>
                            {selectedSubmission && getStatusBadge(selectedSubmission.status)}
                        </DialogTitle>
                        <DialogDescription>
                            Submitted by {selectedSubmission?.enumerator_name} on {selectedSubmission?.created_at && format(new Date(selectedSubmission.created_at), 'PPP pp')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
                        {/* Verification Section */}
                        <div className="bg-muted/50 p-4 rounded-lg space-y-4 border">
                            <h3 className="font-semibold text-sm">Verification Status</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={verificationStatus}
                                        onValueChange={(val: any) => setVerificationStatus(val)}
                                    >
                                        <SelectTrigger id="status">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="verified">Verified</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="notes">Admin Notes</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Add notes about this submission..."
                                        value={verificationNote}
                                        onChange={(e) => setVerificationNote(e.target.value)}
                                        className="h-20"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Data Section */}
                        <div className="grid gap-4">
                            {form?.schema?.fields?.map(col => (
                                <div key={col.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b last:border-0 pb-3 last:pb-0">
                                    <span className="text-sm font-medium text-muted-foreground md:col-span-1">{col.label}</span>
                                    <div className="text-sm md:col-span-2 break-words">
                                        {col.type === 'image' && selectedSubmission?.data[col.id] ? (
                                            <div className="flex flex-wrap gap-2">
                                                {Array.isArray(selectedSubmission.data[col.id]) ? (
                                                    (selectedSubmission.data[col.id] as string[]).map((url, idx) => (
                                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 relative border rounded overflow-hidden hover:opacity-90 transition-opacity">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                                                        </a>
                                                    ))
                                                ) : (
                                                    <a href={String(selectedSubmission.data[col.id])} target="_blank" rel="noopener noreferrer" className="block w-32 h-32 relative border rounded overflow-hidden hover:opacity-90 transition-opacity">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={String(selectedSubmission.data[col.id])} alt="Submission Image" className="w-full h-full object-cover" />
                                                    </a>
                                                )}
                                            </div>
                                        ) : col.type === 'location' && selectedSubmission?.data[col.id] ? (
                                            <div className="w-full h-[200px] rounded-md overflow-hidden border">
                                                {(() => {
                                                    const loc = parseLocation(selectedSubmission.data[col.id])
                                                    if (!loc) return <span className="text-muted-foreground">Invalid location data</span>
                                                    return (
                                                        <Map
                                                            markers={[{
                                                                id: 'detail-loc',
                                                                lat: loc.lat,
                                                                lng: loc.lng,
                                                                title: 'Location'
                                                            }]}
                                                            center={[loc.lat, loc.lng]}
                                                            className="h-full w-full"
                                                        />
                                                    )
                                                })()}
                                            </div>
                                        ) : Array.isArray(selectedSubmission?.data[col.id]) ? (
                                            <div className="flex flex-wrap gap-1">
                                                {(selectedSubmission.data[col.id] as any[]).map((item, i) => (
                                                    <Badge key={i} variant="secondary" className="rounded-sm text-xs">
                                                        {String(item)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            String(selectedSubmission?.data[col.id] ?? '-')
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveVerification} disabled={updateStatusMutation.isPending}>
                            {updateStatusMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}