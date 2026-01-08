'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Enumerator, FormTemplate } from '@/types'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, RefreshCw, Trash, Lock, Unlock, FileText, RefreshCcw } from 'lucide-react'
import { format } from 'date-fns'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export default function EnumeratorsPage() {
  // Force re-render
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newEnumerator, setNewEnumerator] = useState({ name: '', phone: '' })

  // Assignment Modal State
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false)
  const [selectedEnumerator, setSelectedEnumerator] = useState<Enumerator | null>(null)
  const [selectedForms, setSelectedForms] = useState<string[]>([])

  // Alert Dialog State
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertContent, setAlertContent] = useState({
    title: '',
    description: '',
    action: () => { }
  })

  // Fetch Enumerators
  const { data: enumerators, isLoading, error } = useQuery({
    queryKey: ['enumerators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enumerators')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Enumerator[]
    },
  })

  // Fetch Forms (for assignment)
  const { data: forms } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('id, title')

      if (error) throw error
      return data as Partial<FormTemplate>[]
    },
  })

  // Fetch Current Assignments when opening modal
  const fetchAssignments = async (enumeratorId: string) => {
    const { data, error } = await supabase
      .from('enumerator_assignments')
      .select('form_id')
      .eq('enumerator_id', enumeratorId)

    if (error) throw error
    return data.map(d => d.form_id)
  }

  // Add Enumerator
  const addMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const { error } = await supabase.from('enumerators').insert(data)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enumerators'] })
      setIsAddOpen(false)
      setNewEnumerator({ name: '', phone: '' })
    },
  })

  // Generate Token
  const tokenMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = Math.floor(100000 + Math.random() * 900000).toString()
      const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase
        .from('enumerators')
        .update({ access_token: token, expired_at: expiredAt })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enumerators'] })
    },
  })

  // Reset Device ID
  const resetDeviceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('enumerators')
        .update({ device_id: null })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enumerators'] })
    },
  })

  // Delete Enumerator
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. Delete related submissions first
      const { error: subError } = await supabase
        .from('submissions')
        .delete()
        .eq('enumerator_id', id)

      if (subError) throw subError

      // 2. Delete enumerator
      const { error } = await supabase.from('enumerators').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enumerators'] })
    },
    onError: (error) => {
      setAlertContent({
        title: 'Error',
        description: 'Failed to delete enumerator: ' + error.message,
        action: () => { }
      })
      setAlertOpen(true)
    }
  })

  // Save Assignments
  const assignmentMutation = useMutation({
    mutationFn: async (data: { enumeratorId: string; formIds: string[] }) => {
      // 1. Delete existing assignments
      const { error: deleteError } = await supabase
        .from('enumerator_assignments')
        .delete()
        .eq('enumerator_id', data.enumeratorId)

      if (deleteError) throw deleteError

      // 2. Insert new assignments
      if (data.formIds.length > 0) {
        const insertData = data.formIds.map(formId => ({
          enumerator_id: data.enumeratorId,
          form_id: formId
        }))

        const { error: insertError } = await supabase
          .from('enumerator_assignments')
          .insert(insertData)

        if (insertError) throw insertError
      }
    },
    onSuccess: () => {
      setIsAssignmentOpen(false)
      alert('Assignments updated successfully!')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addMutation.mutate(newEnumerator)
  }

  const handleOpenAssignment = async (enumerator: Enumerator) => {
    setSelectedEnumerator(enumerator)
    try {
      const assignments = await fetchAssignments(enumerator.id)
      setSelectedForms(assignments)
      setIsAssignmentOpen(true)
    } catch (error) {
      console.error('Failed to fetch assignments', error)
      alert('Failed to load assignments')
    }
  }

  const toggleFormSelection = (formId: string) => {
    setSelectedForms(prev =>
      prev.includes(formId)
        ? prev.filter(id => id !== formId)
        : [...prev, formId]
    )
  }

  const handleDelete = async (id: string) => {
    try {
      // Check for submissions
      const { count, error } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('enumerator_id', id)

      if (error) {
        console.error('Error checking submissions:', error)
        setAlertContent({
          title: 'Error',
          description: 'Error checking submissions. Are you sure you want to delete this enumerator?',
          action: () => deleteMutation.mutate(id)
        })
        setAlertOpen(true)
      } else if (count && count > 0) {
        setAlertContent({
          title: 'Delete Enumerator',
          description: `This enumerator has ${count} submissions. Deleting them will also delete all their submissions. Are you sure?`,
          action: () => deleteMutation.mutate(id)
        })
        setAlertOpen(true)
      } else {
        setAlertContent({
          title: 'Delete Enumerator',
          description: 'Are you sure you want to delete this enumerator?',
          action: () => deleteMutation.mutate(id)
        })
        setAlertOpen(true)
      }
    } catch (error: any) {
      console.error('Error in delete handler:', error)
      setAlertContent({
        title: 'Error',
        description: 'An error occurred while preparing to delete: ' + (error.message || 'Unknown error'),
        action: () => { }
      })
      setAlertOpen(true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Enumerators</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Enumerator
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>Add New Enumerator</DialogTitle>
              <p id="dialog-description" className="text-sm text-muted-foreground">
                Enter the details for the new enumerator here. Click save when you&apos;re done.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newEnumerator.name}
                  onChange={(e) =>
                    setNewEnumerator({ ...newEnumerator, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newEnumerator.phone}
                  onChange={(e) =>
                    setNewEnumerator({ ...newEnumerator, phone: e.target.value })
                  }
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assignment Dialog */}
        <Dialog open={isAssignmentOpen} onOpenChange={setIsAssignmentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Forms to {selectedEnumerator?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Select the forms this enumerator is allowed to access.
              </p>
              <div className="space-y-3 border rounded-md p-4 max-h-[300px] overflow-y-auto">
                {forms?.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground">No forms available. Create one first.</p>
                ) : (
                  forms?.map(form => (
                    <div key={form.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`form-${form.id}`}
                        checked={selectedForms.includes(form.id!)}
                        onCheckedChange={() => toggleFormSelection(form.id!)}
                      />
                      <label
                        htmlFor={`form-${form.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {form.title} <span className="text-xs text-muted-foreground">({form.id})</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (selectedEnumerator) {
                    assignmentMutation.mutate({
                      enumeratorId: selectedEnumerator.id,
                      formIds: selectedForms
                    })
                  }
                }}
                disabled={assignmentMutation.isPending || !selectedEnumerator}
              >
                {assignmentMutation.isPending ? 'Saving...' : 'Save Assignments'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Access Token</TableHead>
              <TableHead>Token Expired </TableHead>
              <TableHead>Device Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  Loading...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-red-500">
                  Error loading enumerators
                </TableCell>
              </TableRow>
            ) : enumerators?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  No enumerators found.
                </TableCell>
              </TableRow>
            ) : (
              enumerators?.map((enumData) => (
                <TableRow key={enumData.id}>
                  <TableCell className="font-medium">{enumData.name}</TableCell>
                  <TableCell>{enumData.phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-muted px-2 py-1 rounded text-foreground">
                        {enumData.access_token || 'No Token'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => tokenMutation.mutate(enumData.id)}
                        title="Generate New Token"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {enumData.expired_at ? (
                      <div className="text-xs text-muted-foreground">
                        Expires: {(() => {
                          try {
                            return format(new Date(enumData.expired_at), 'dd MMM HH:mm')
                          } catch (e) {
                            return '-'
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Never expires
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {enumData.device_id ? (
                      <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
                        <Lock className="h-3 w-3" /> Locked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-500">
                        <Unlock className="h-3 w-3" /> Unlocked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenAssignment(enumData)}
                        title="Assign Forms"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      {enumData.device_id && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => resetDeviceMutation.mutate(enumData.id)}
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(enumData.id)}
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
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              alertContent.action()
              setAlertOpen(false)
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
