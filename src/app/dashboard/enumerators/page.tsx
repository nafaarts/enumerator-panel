'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Enumerator, Organization } from '@/types'
import { DataTable } from '@/components/ui/data-table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  RefreshCw,
  Trash,
  Lock,
  Unlock,
  RefreshCcw,
  ArrowUpDown,
  MoreHorizontal,
  Send
} from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ColumnDef } from '@tanstack/react-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function EnumeratorsPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newEnumerator, setNewEnumerator] = useState({ name: '', phone: '', organization_id: '' })

  // Alert Dialog State
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertContent, setAlertContent] = useState({
    title: '',
    description: '',
    action: () => { }
  })

  // Fetch Enumerators
  const { data: enumerators = [] } = useQuery({
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

  // Add Enumerator
  const addMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; organization_id: string }) => {
      const { error } = await supabase.from('enumerators').insert(data)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enumerators'] })
      setIsAddOpen(false)
      setNewEnumerator({ name: '', phone: '', organization_id: '' })
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
      // Direct delete since submissions are decoupled
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEnumerator.organization_id) {
      alert("Please select an organization")
      return
    }
    addMutation.mutate(newEnumerator)
  }

  const handleDelete = useCallback(async (id: string) => {
    setAlertContent({
      title: 'Delete Enumerator',
      description: 'Are you sure you want to delete this enumerator? Their past submissions will be preserved.',
      action: () => deleteMutation.mutate(id)
    })
    setAlertOpen(true)
  }, [deleteMutation])

  const columns: ColumnDef<Enumerator>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      id: "organization",
      header: "Organization",
      cell: ({ row }) => {
        const orgId = row.original.organization_id
        const org = organizations.find(o => o.id === orgId)
        return org ? (
          <div className="flex items-center gap-1">
            <Badge variant="outline">{org.name}</Badge>
          </div>
        ) : (
          <span className="text-muted-foreground italic text-sm">No Org</span>
        )
      }
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "access_token",
      header: "Access Token",
      cell: ({ row }) => {
        const enumerator = row.original
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono bg-muted px-2 py-1 rounded">
              {enumerator.access_token || '-'}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => tokenMutation.mutate(enumerator.id)}
              title="Generate Token"
              disabled={tokenMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${tokenMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )
      }
    },
    {
      accessorKey: "device_id",
      header: "Device ID",
      cell: ({ row }) => {
        const enumerator = row.original
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs truncate max-w-[100px]" title={enumerator.device_id || ''}>
              {enumerator.device_id || 'Not Linked'}
            </span>
            {enumerator.device_id && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => resetDeviceMutation.mutate(enumerator.id)}
                title="Reset Device ID"
                disabled={resetDeviceMutation.isPending}
              >
                <RefreshCcw className={`h-4 w-4 text-red-500 ${resetDeviceMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        )
      }
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const enumerator = row.original
        const isExpired = !enumerator.expired_at || new Date(enumerator.expired_at) < new Date()
        return (
          <Badge variant={isExpired ? "destructive" : "default"}>
            {isExpired ? <Lock className="mr-1 h-3 w-3" /> : <Unlock className="mr-1 h-3 w-3" />}
            {isExpired ? 'Expired' : 'Active'}
          </Badge>
        )
      }
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const enumerator = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (!enumerator.access_token) {
                    alert('Please generate an access token first')
                    return
                  }
                  // Clean phone number: remove non-digits
                  let phone = enumerator.phone.replace(/\D/g, '')
                  // Replace leading 0 with 62 (Indonesia)
                  if (phone.startsWith('0')) {
                    phone = '62' + phone.slice(1)
                  }

                  const message = `Halo ${enumerator.name}, berikut adalah kode akses Anda untuk aplikasi Enumerator:\n\n*${enumerator.access_token}*\n\nSilakan gunakan kode tersebut untuk masuk.`
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
                }}
              >
                <Send className="mr-2 h-4 w-4" /> Send Token (WA)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(enumerator.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [tokenMutation, resetDeviceMutation, handleDelete, organizations])

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
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Select
                  value={newEnumerator.organization_id}
                  onValueChange={(value) => setNewEnumerator({ ...newEnumerator, organization_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Adding...' : 'Add Enumerator'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={enumerators}
        searchKey="name"
      />

      {/* Alert Dialog */}
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
