'use client'

import { useState, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FormTemplate, Submission, FormField } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Download, Search, Table as TableIcon, Map as MapIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from 'lucide-react'
import { format } from 'date-fns'
import Map from '@/components/Map'
import { exportToExcel } from '@/lib/export'

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
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null)

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
                .select('*, enumerators(name)')
                .eq('form_id', id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as unknown as (Submission & { enumerators: { name: string } })[]
        },
    })

    // Get dynamic columns from schema
    const columns = useMemo(() => {
        if (!form?.schema?.fields) return []
        return form.schema.fields
    }, [form])

    // Flatten data for export/table
    const flattenedData = useMemo(() => {
        if (!submissions || !form) return []
        return submissions.map(sub => ({
            ...sub,
            ...sub.data, // Flatten JSONB
            enumerator_name: sub.enumerators?.name || 'Unknown',
        }))
    }, [submissions, form])

    // Prepare Map Markers
    const mapMarkers = useMemo(() => {
        const locationField = columns.find(c => c.type === 'location')
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
                        <div className="text-xs text-muted-foreground">
                            {sub.created_at ? format(new Date(sub.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                        </div>
                        <div className="flex flex-col gap-2 text-xs border-t pt-2 max-h-[200px] overflow-y-auto">
                            {columns.map(col => {
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
    }, [flattenedData, columns])

    // Filter and Pagination
    const filteredData = useMemo(() => {
        if (!searchTerm) return flattenedData
        const lowerTerm = searchTerm.toLowerCase()
        return flattenedData.filter(item =>
            item.enumerator_name.toLowerCase().includes(lowerTerm) ||
            Object.values(item.data).some(val =>
                String(val).toLowerCase().includes(lowerTerm)
            )
        )
    }, [flattenedData, searchTerm])

    const totalPages = Math.ceil(filteredData.length / itemsPerPage)
    const currentData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleExport = async () => {
        if (!flattenedData.length) return

        // Prepare data for Excel
        const exportData = flattenedData.map(row => {
            let formattedDate = ''
            try {
                formattedDate = row.created_at ? format(new Date(row.created_at), 'yyyy-MM-dd HH:mm:ss') : ''
            } catch (e) {
                formattedDate = 'Invalid Date'
            }

            const standardFields: Record<string, unknown> = {
                'ID': row.id,
                'Enumerator': row.enumerator_name,
                'Date': formattedDate,
                'Latitude': '',
                'Longitude': '',
            }

            // Try to find location from data
            const locationField = columns.find(c => c.type === 'location')
            if (locationField) {
                const loc = parseLocation(row.data[locationField.id])
                if (loc) {
                    standardFields['Latitude'] = String(loc.lat)
                    standardFields['Longitude'] = String(loc.lng)
                }
            }

            const dynamicFields: Record<string, unknown> = {}
            columns.forEach(col => {
                const val = row.data[col.id]
                dynamicFields[col.label] = typeof val === 'object' ? JSON.stringify(val) : val
            })

            return { ...standardFields, ...dynamicFields }
        })

        await exportToExcel(exportData, `${form?.title || 'form'}_submissions`)
    }

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

                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="pl-8"
                        />
                    </div>
                </div>

                <TabsContent value="table" className="flex-1 border rounded-md relative flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead>Enumerator</TableHead>
                                    <TableHead>Date</TableHead>
                                    {columns.map(col => (
                                        <TableHead key={col.id} className="min-w-[150px]">{col.label}</TableHead>
                                    ))}
                                    <TableHead className="w-[80px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length + 3} className="text-center py-10 text-muted-foreground">
                                            No submissions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentData.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">{row.enumerator_name}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {row.created_at ? format(new Date(row.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                                            </TableCell>
                                            {columns.map(col => (
                                                <TableCell key={col.id}>
                                                    {renderCellContent(col, row.data[col.id])}
                                                </TableCell>
                                            ))}
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedSubmission(row)
                                                        setIsDetailsOpen(true)
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between px-4 py-4 border-t bg-background">
                        <div className="text-sm text-muted-foreground">
                            Showing {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-2">
                                Page {currentPage} of {Math.max(1, totalPages)}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages || totalPages === 0}
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
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
                        <DialogTitle>Submission Details</DialogTitle>
                        <DialogDescription>
                            Submitted by {selectedSubmission?.enumerator_name} on {selectedSubmission?.created_at && format(new Date(selectedSubmission.created_at), 'PPP pp')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
                        <div className="grid gap-4">
                            {columns.map(col => (
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
                </DialogContent>
            </Dialog>
        </div>
    )
}