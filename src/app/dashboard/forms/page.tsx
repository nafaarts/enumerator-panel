'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FormTemplate } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash, FileText, Edit, Table as TableIcon, Copy } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function FormsPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newForm, setNewForm] = useState({ id: '', title: '' })

  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
  const [formToDuplicate, setFormToDuplicate] = useState<FormTemplate | null>(null)
  const [duplicateFormData, setDuplicateFormData] = useState({ id: '', title: '' })

  // Fetch Forms
  const { data: forms, isLoading, error } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as FormTemplate[]
    },
  })

  // Add Form
  const addMutation = useMutation({
    mutationFn: async (data: { id: string; title: string }) => {
      const { error } = await supabase.from('forms').insert({
        id: data.id,
        title: data.title,
        version: 1,
        schema: { fields: [] }, // Default empty schema
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      setIsAddOpen(false)
      setNewForm({ id: '', title: '' })
    },
  })

  // Delete Form
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('forms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
    },
  })

  // Duplicate Form
  const duplicateMutation = useMutation({
    mutationFn: async (data: { sourceForm: FormTemplate; newId: string; newTitle: string }) => {
      const { error } = await supabase.from('forms').insert({
        id: data.newId,
        title: data.newTitle,
        version: 1,
        schema: data.sourceForm.schema,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      setIsDuplicateOpen(false)
      setDuplicateFormData({ id: '', title: '' })
      setFormToDuplicate(null)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addMutation.mutate(newForm)
  }

  const handleDuplicateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formToDuplicate) {
      duplicateMutation.mutate({
        sourceForm: formToDuplicate,
        newId: duplicateFormData.id,
        newTitle: duplicateFormData.title,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Forms</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Form
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>Create New Form</DialogTitle>
              <p id="dialog-description" className="text-sm text-muted-foreground">
                Create a new form template. You can edit the schema later.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">Form ID (Unique)</Label>
                <Input
                  id="id"
                  placeholder="e.g. form-bencana-2024"
                  value={newForm.id}
                  onChange={(e) =>
                    setNewForm({ ...newForm, id: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Survei Kerusakan Bangunan"
                  value={newForm.title}
                  onChange={(e) =>
                    setNewForm({ ...newForm, title: e.target.value })
                  }
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
          <DialogContent aria-describedby="duplicate-dialog-description">
            <DialogHeader>
              <DialogTitle>Duplicate Form</DialogTitle>
              <p id="duplicate-dialog-description" className="text-sm text-muted-foreground">
                Create a copy of <strong>{formToDuplicate?.title}</strong>.
              </p>
            </DialogHeader>
            <form onSubmit={handleDuplicateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dup-id">New Form ID (Unique)</Label>
                <Input
                  id="dup-id"
                  placeholder="e.g. form-bencana-2024-copy"
                  value={duplicateFormData.id}
                  onChange={(e) =>
                    setDuplicateFormData({ ...duplicateFormData, id: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dup-title">New Title</Label>
                <Input
                  id="dup-title"
                  placeholder="e.g. Survei Kerusakan Bangunan (Copy)"
                  value={duplicateFormData.title}
                  onChange={(e) =>
                    setDuplicateFormData({ ...duplicateFormData, title: e.target.value })
                  }
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={duplicateMutation.isPending}>
                  {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  Loading...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-red-500">
                  Error loading forms
                </TableCell>
              </TableRow>
            ) : forms?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No forms found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              forms?.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>
                    <strong className="font-medium">{form.title}</strong>
                    <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{form.id}</div>
                  </TableCell>
                  <TableCell>
                    <span className="bg-muted px-2 py-1 rounded text-xs font-medium">
                      v{form.version}
                    </span>
                  </TableCell>
                  <TableCell>
                    {form.created_at ? (
                      (() => {
                        try {
                          return format(new Date(form.created_at), 'dd MMM yyyy')
                        } catch (e) {
                          return '-'
                        }
                      })()
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="icon" title="View Submissions">
                        <Link href={`/dashboard/forms/${form.id}/submissions`}>
                          <TableIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="icon" title="Edit Form">
                        <Link href={`/dashboard/forms/${form.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Duplicate Form"
                        onClick={() => {
                          setFormToDuplicate(form)
                          setDuplicateFormData({
                            id: `${form.id}-copy`,
                            title: `${form.title} (Copy)`,
                          })
                          setIsDuplicateOpen(true)
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        title="Delete Form"
                        onClick={() => {
                          if (confirm('Are you sure? This will delete all assignments associated with this form.')) {
                            deleteMutation.mutate(form.id)
                          }
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
