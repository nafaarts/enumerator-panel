'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, MessageCircle } from 'lucide-react'

function RequestAccessContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'admin_phone')
          .single()

        if (error) throw error
        if (!data || !data.value) throw new Error('Admin phone number not configured')

        const adminPhone = data.value
        const userPhone = searchParams.get('phone')

        let message = "Halo Admin, saya ingin meminta akses token untuk aplikasi Enumerator."
        if (userPhone) {
          message += `\n\nNomor HP saya: ${userPhone}`
        }

        const url = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`

        setWhatsappUrl(url)
        setLoading(false)

        // Auto redirect after a short delay
        setTimeout(() => {
          window.location.href = url
        }, 1500)
      } catch (err) {
        console.error('Error fetching settings:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    fetchAndRedirect()
  }, [searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>Could not redirect to WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button className="w-full" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <CardTitle>Request Access</CardTitle>
          <CardDescription>Redirecting you to WhatsApp Admin...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you are not redirected automatically, click the button below.
              </p>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                onClick={() => whatsappUrl && window.open(whatsappUrl, '_self')}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Chat Admin on WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function RequestAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <RequestAccessContent />
    </Suspense>
  )
}
