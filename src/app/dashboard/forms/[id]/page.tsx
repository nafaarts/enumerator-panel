'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FormTemplate, FormField, FieldType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash, Save, ArrowUp, ArrowDown, ChevronLeft, Settings2 } from 'lucide-react'
import { useFormBuilder } from '@/hooks/useFormBuilder'

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { fields, setFields, addField, updateField, removeField, moveField } = useFormBuilder()

  // Fetch Form Data
  const { data: form, isLoading } = useQuery({
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

  // Initialize fields from schema
  useEffect(() => {
    if (form?.schema?.fields) {
      // Normalize options to ensure they are objects {label, value}
      // This handles legacy data where options might be string[]
      const normalizedFields = form.schema.fields.map((f: any) => ({
        ...f,
        options: f.options?.map((opt: any) =>
          typeof opt === 'string' ? { label: opt, value: opt } : opt
        )
      }))
      setFields(normalizedFields)
    }
  }, [form])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return

      const { error } = await supabase
        .from('forms')
        .update({
          schema: { fields },
          version: form.version + 1,
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', id] })
      alert('Form saved successfully!')
    },
  })

  const handleRemoveField = (index: number) => {
    if (confirm('Are you sure you want to remove this field?')) {
      removeField(index)
    }
  }

  if (isLoading) return <div className="p-8">Loading form builder...</div>

  return (
    <div className="space-y-6 pb-20">
      <div className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 border rounded-md shadow transition-all duration-200">
        <div className="flex items-center justify-between h-16 px-4 ">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-background/60"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-base font-semibold tracking-tight">{form?.title}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded-full bg-muted font-medium">v{form?.version}</span>
                <span>•</span>
                <span className="font-mono opacity-70">ID: {form?.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className={saveMutation.isPending ? 'opacity-80' : ''}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {fields.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No fields yet.</p>
            <Button onClick={addField}>Add your first question</Button>
          </div>
        ) : (
          fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              index={index}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              updateField={updateField}
              removeField={removeField}
              moveField={moveField}
            />
          ))
        )}

        <Button onClick={addField} variant="outline" className="w-full py-8 border-2 border-dashed cursor-pointer">
          <Plus className="h-4 w-4 mr-2" /> Add Question
        </Button>
      </div>
    </div>
  )
}

interface FieldCardProps {
  field: FormField
  index: number
  isFirst: boolean
  isLast: boolean
  updateField: (index: number, updates: Partial<FormField>) => void
  removeField: (index: number) => void
  moveField: (index: number, direction: 'up' | 'down') => void
}

function FieldCard({
  field,
  index,
  isFirst,
  isLast,
  updateField,
  removeField,
  moveField,
}: FieldCardProps) {
  const [showSettings, setShowSettings] = useState(false)

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this field?')) {
      removeField(index)
    }
  }

  return (
    <Card className="relative group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 space-y-4">
            <Input
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
              className="text-lg font-medium hover:border-input focus:border-input px-4 h-auto py-2"
              placeholder="Question Label"
            />
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => moveField(index, 'up')}
              disabled={isFirst}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => moveField(index, 'down')}
              disabled={isLast}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={handleDelete}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={field.type}
            onValueChange={(value) => updateField(index, { type: value as FieldType })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Short Text</SelectItem>
              <SelectItem value="textarea">Long Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="radio">Radio Group</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="location">Location (GPS)</SelectItem>
              <SelectItem value="image">Image Upload</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Switch
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) => updateField(index, { required: checked })}
            />
            <Label htmlFor={`required-${field.id}`}>Required</Label>
          </div>

          {(field.type === 'text' || field.type === 'textarea') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className={showSettings ? 'bg-muted' : ''}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {showSettings ? 'Hide Advanced Options' : 'Advanced Options'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {showSettings && (field.type === 'text' || field.type === 'textarea') && (
          <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-muted/30 rounded-md border animate-in fade-in slide-in-from-top-2">
            <div className="space-y-3">
              <Label htmlFor={`placeholder-${field.id}`}>Placeholder</Label>
              <Input
                id={`placeholder-${field.id}`}
                value={field.placeholder || ''}
                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                placeholder="e.g. Enter your name"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor={`description-${field.id}`}>Helper Text</Label>
              <Input
                id={`description-${field.id}`}
                value={field.description || ''}
                onChange={(e) => updateField(index, { description: e.target.value })}
                placeholder="e.g. Please enter your full name"
              />
            </div>
          </div>
        )}

        {(field.type === 'select' || field.type === 'checkbox' || field.type === 'radio') && (
          <div className="space-y-3 mt-2 p-4 bg-muted/50 rounded-md">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newOptions = [...(field.options || []), { label: '', value: '' }]
                  updateField(index, { options: newOptions })
                }}
              >
                <Plus className="h-3 w-3 mr-2" /> Add Option
              </Button>
            </div>
            <div className="space-y-2">
              {field.options?.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No options added yet.
                </div>
              )}
              {field.options?.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <Input
                      placeholder="Label (e.g. Yes)"
                      value={typeof option === 'object' ? option.label : ''}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])]
                        newOptions[optionIndex] = { ...newOptions[optionIndex], label: e.target.value }
                        updateField(index, { options: newOptions })
                      }}
                    />
                    <Input
                      placeholder="Value (e.g. yes)"
                      value={typeof option === 'object' ? option.value : ''}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])]
                        newOptions[optionIndex] = { ...newOptions[optionIndex], value: e.target.value }
                        updateField(index, { options: newOptions })
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      const newOptions = field.options?.filter((_, i) => i !== optionIndex)
                      updateField(index, { options: newOptions })
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {field.type === 'location' && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-md text-sm">
            ⚠️ This field will capture the enumerator&apos;s GPS coordinates.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
