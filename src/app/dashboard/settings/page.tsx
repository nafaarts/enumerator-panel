'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [adminPhone, setAdminPhone] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
      
      if (error) throw error
      return data || []
    }
  })

  useEffect(() => {
    if (settings) {
      const phoneSetting = settings.find((s: any) => s.key === 'admin_phone')
      if (phoneSetting) {
        setAdminPhone(phoneSetting.value)
      }
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: async (phone: string) => {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'admin_phone', value: phone, updated_at: new Date().toISOString() })
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    },
    onError: (error) => {
      alert('Failed to save settings: ' + error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(adminPhone)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your application settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure general application settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin_phone">Admin Phone Number (WhatsApp)</Label>
              <Input
                id="admin_phone"
                placeholder="628123456789"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                This number will be used for token requests via WhatsApp.
                Use international format without '+' (e.g., 628...).
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              {isSaved && <span className="text-green-600 text-sm">Settings saved successfully!</span>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
