'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FormTemplate, Organization, FormAssignment } from '@/types'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
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
import { Plus, Trash, Edit, Table as TableIcon, Copy, ArrowUpDown, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { format } from 'date-fns'

export default function FormsPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newForm, setNewForm] = useState({ id: '', title: '' })

  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
  const [formToDuplicate, setFormToDuplicate] = useState<FormTemplate | null>(null)
  const [duplicateFormData, setDuplicateFormData] = useState({ id: '', title: '' })

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [formToAssign, setFormToAssign] = useState<FormTemplate | null>(null)
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])

  // Fetch Forms
  const { data: forms = [] } = useQuery({
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

  // Fetch Organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data as Organization[]
    },
  })

  // Fetch Assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['form_assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_assignments')
        .select('*')

      if (error) throw error
      return data as FormAssignment[]
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
      queryClient.invalidateQueries({ queryKey: ['form_assignments'] })
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

  // Assign Form
  const assignMutation = useMutation({
    mutationFn: async (data: { formId: string; orgIds: string[] }) => {
      // 1. Delete existing assignments for this form
      const { error: deleteError } = await supabase
        .from('form_assignments')
        .delete()
        .eq('form_id', data.formId)

      if (deleteError) throw deleteError

      // 2. Insert new assignments
      if (data.orgIds.length > 0) {
        const assignmentsToInsert = data.orgIds.map(orgId => ({
          form_id: data.formId,
          organization_id: orgId
        }))

        const { error: insertError } = await supabase
          .from('form_assignments')
          .insert(assignmentsToInsert)

        if (insertError) throw insertError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_assignments'] })
      setIsAssignOpen(false)
      setFormToAssign(null)
      setSelectedOrgs([])
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

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formToAssign) {
      assignMutation.mutate({
        formId: formToAssign.id,
        orgIds: selectedOrgs
      })
    }
  }

  const openAssignDialog = (form: FormTemplate) => {
    setFormToAssign(form)
    // Pre-select existing assignments
    const currentAssignments = assignments
      .filter(a => a.form_id === form.id)
      .map(a => a.organization_id)
    setSelectedOrgs(currentAssignments)
    setIsAssignOpen(true)
  }

  const columns: ColumnDef<FormTemplate>[] = useMemo(() => [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div>
          <strong className="font-medium">{row.original.title}</strong>
          <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.original.id}</div>
        </div>
      )
    },
    {
      id: "organizations",
      header: "Assigned Organizations",
      cell: ({ row }) => {
        const formId = row.original.id
        const formAssignments = assignments.filter(a => a.form_id === formId)

        if (formAssignments.length === 0) {
          return <span className="text-muted-foreground italic text-sm">Unassigned</span>
        }

        return (
          <div className="flex flex-wrap gap-1">
            {formAssignments.map(assignment => {
              const org = organizations.find(o => o.id === assignment.organization_id)
              return org ? (
                <Badge key={assignment.id} variant="outline">{org.name}</Badge>
              ) : null
            })}
          </div>
        )
      }
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => (
        <span className="bg-muted px-2 py-1 rounded text-xs font-medium">
          v{row.original.version}
        </span>
      )
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => {
        try {
          return row.original.created_at ? format(new Date(row.original.created_at), 'dd MMM yyyy') : '-'
        } catch {
          return '-'
        }
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const form = row.original
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              title="Assign to Organization"
              onClick={() => openAssignDialog(form)}
            >
              <Users className="h-4 w-4" />
            </Button>
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
                if (confirm('Are you sure? This will delete all data associated with this form.')) {
                  deleteMutation.mutate(form.id)
                }
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    }
  ], [deleteMutation, organizations, assignments])

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

        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent aria-describedby="assign-dialog-description" className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Organizations</DialogTitle>
              <p id="assign-dialog-description" className="text-sm text-muted-foreground">
                Select organizations that can access <strong>{formToAssign?.title}</strong>.
              </p>
            </DialogHeader>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
                {organizations.length === 0 ? (
                  <p className="text-sm text-center py-4 text-muted-foreground">No organizations found.</p>
                ) : (
                  organizations.map(org => (
                    <div key={org.id} className="flex items-center space-x-2 py-2 px-1 hover:bg-muted/50 rounded">
                      <Checkbox
                        id={`org-${org.id}`}
                        checked={selectedOrgs.includes(org.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrgs([...selectedOrgs, org.id])
                          } else {
                            setSelectedOrgs(selectedOrgs.filter(id => id !== org.id))
                          }
                        }}
                      />
                      <Label
                        htmlFor={`org-${org.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {org.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={assignMutation.isPending}>
                  {assignMutation.isPending ? 'Saving...' : 'Save Assignments'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={forms}
        searchKey="title"
      />
    </div>
  )
}
