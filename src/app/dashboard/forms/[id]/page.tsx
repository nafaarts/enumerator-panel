'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FormTemplate, FormField, FieldType, FormSection } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash, Save, ArrowUp, ArrowDown, ChevronLeft, Settings2, GripVertical, Layers } from 'lucide-react'
import { useFormBuilder } from '@/hooks/useFormBuilder'
import { v4 as uuidv4 } from 'uuid'

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    sections,
    setSections,
    addSection,
    updateSection,
    removeSection,
    moveSection,
    addField,
    updateField,
    removeField,
    moveField
  } = useFormBuilder()

  const [enableSections, setEnableSections] = useState(false)

  // Fetch Form Data
  const { data: form, isPending: isLoading } = useQuery({
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
    if (form?.schema) {
      if (form.schema.sections && form.schema.sections.length > 0) {
        setSections(form.schema.sections)
        // Enable sections if there are multiple or the first one has a title
        if (form.schema.sections.length > 1 || form.schema.sections[0].title) {
          setEnableSections(true)
        }
      } else if (form.schema.fields) {
        // Normalize options to ensure they are objects {label, value}
        const normalizedFields = form.schema.fields.map((f: any) => ({
          ...f,
          options: f.options?.map((opt: any) =>
            typeof opt === 'string' ? { label: opt, value: opt } : opt
          )
        }))

        setSections([{
          id: uuidv4(),
          title: '',
          fields: normalizedFields
        }])
        setEnableSections(false)
      }
    }
  }, [form, setSections])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return

      // If sections are disabled, ensure we have a clean single section state for saving
      // or just save what we have. 
      // Strategy: Always save as 'sections'. 
      // If enableSections is false, we might want to ensure the first section title is empty?
      // Or just trust the state.

      const finalSections = enableSections
        ? sections
        : [{ ...sections[0], title: '' }]

      const { error } = await supabase
        .from('forms')
        .update({
          schema: { sections: finalSections },
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

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 border-r pr-4">
              <Switch
                id="enable-sections"
                checked={enableSections}
                onCheckedChange={setEnableSections}
              />
              <Label htmlFor="enable-sections" className="flex items-center gap-2 cursor-pointer">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span>Sections</span>
              </Label>
            </div>

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

      <div className="max-w-4xl mx-auto space-y-8">
        {enableSections ? (
          // Section Mode
          <div className="space-y-8">
            {sections.map((section, sectionIndex) => (
              <SectionCard
                key={section.id}
                section={section}
                sectionIndex={sectionIndex}
                isFirst={sectionIndex === 0}
                isLast={sectionIndex === sections.length - 1}
                updateSection={updateSection}
                removeSection={removeSection}
                moveSection={moveSection}
                addField={addField}
                updateField={updateField}
                removeField={removeField}
                moveField={moveField}
              />
            ))}

            <Button
              onClick={addSection}
              variant="outline"
              className="w-full py-6 border-2 border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" /> Add New Section
            </Button>
          </div>
        ) : (
          // Flat Mode (Implicitly First Section)
          <div className="space-y-6">
            {sections[0]?.fields.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">No fields yet.</p>
                <Button onClick={() => addField(0)}>Add your first question</Button>
              </div>
            ) : (
              sections[0]?.fields.map((field, index) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  sectionIndex={0}
                  isFirst={index === 0}
                  isLast={index === sections[0].fields.length - 1}
                  updateField={updateField}
                  removeField={removeField}
                  moveField={moveField}
                />
              ))
            )}

            {sections.length > 0 && (
              <Button
                onClick={() => addField(0)}
                variant="outline"
                className="w-full py-8 border-2 border-dashed cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Question
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Components ---

interface SectionCardProps {
  section: FormSection
  sectionIndex: number
  isFirst: boolean
  isLast: boolean
  updateSection: (index: number, updates: Partial<FormSection>) => void
  removeSection: (index: number) => void
  moveSection: (index: number, direction: 'up' | 'down') => void
  addField: (sectionIndex: number) => void
  updateField: (sectionIndex: number, fieldIndex: number, updates: Partial<FormField>) => void
  removeField: (sectionIndex: number, fieldIndex: number) => void
  moveField: (sectionIndex: number, fieldIndex: number, direction: 'up' | 'down') => void
}

function SectionCard({
  section,
  sectionIndex,
  isFirst,
  isLast,
  updateSection,
  removeSection,
  moveSection,
  addField,
  updateField,
  removeField,
  moveField
}: SectionCardProps) {
  return (
    <Card className="border-l-4 border-l-primary/50 overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                Section {sectionIndex + 1}
              </div>
            </div>
            <Input
              value={section.title}
              onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
              className="text-xl font-bold bg-transparent border-transparent hover:border-input focus:border-input px-0 h-auto py-1 shadow-none rounded-none border-b transition-colors"
              placeholder="Section Title"
            />
            <Input
              value={section.description || ''}
              onChange={(e) => updateSection(sectionIndex, { description: e.target.value })}
              className="text-sm text-muted-foreground bg-transparent border-transparent hover:border-input focus:border-input px-0 h-auto py-1 shadow-none rounded-none border-b transition-colors"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => moveSection(sectionIndex, 'up')}
              disabled={isFirst}
              title="Move Section Up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => moveSection(sectionIndex, 'down')}
              disabled={isLast}
              title="Move Section Down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm('Delete this section and all its fields?')) {
                  removeSection(sectionIndex)
                }
              }}
              className="text-muted-foreground hover:text-destructive"
              title="Delete Section"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {section.fields.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/10">
            <p className="text-sm text-muted-foreground mb-3">No fields in this section.</p>
            <Button size="sm" onClick={() => addField(sectionIndex)}>Add Question</Button>
          </div>
        ) : (
          section.fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              index={index}
              sectionIndex={sectionIndex}
              isFirst={index === 0}
              isLast={index === section.fields.length - 1}
              updateField={updateField}
              removeField={removeField}
              moveField={moveField}
            />
          ))
        )}

        {section.fields.length > 0 && (
          <Button
            onClick={() => addField(sectionIndex)}
            variant="ghost"
            size="sm"
            className="w-full border border-dashed text-muted-foreground hover:text-primary"
          >
            <Plus className="h-3 w-3 mr-2" /> Add Question to Section
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface FieldCardProps {
  field: FormField
  index: number
  sectionIndex: number
  isFirst: boolean
  isLast: boolean
  updateField: (sectionIndex: number, fieldIndex: number, updates: Partial<FormField>) => void
  removeField: (sectionIndex: number, fieldIndex: number) => void
  moveField: (sectionIndex: number, fieldIndex: number, direction: 'up' | 'down') => void
}

function FieldCard({
  field,
  index,
  sectionIndex,
  isFirst,
  isLast,
  updateField,
  removeField,
  moveField,
}: FieldCardProps) {
  const [showSettings, setShowSettings] = useState(false)

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this field?')) {
      removeField(sectionIndex, index)
    }
  }

  return (
    <Card className="relative group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center text-muted-foreground cursor-move opacity-50 hover:opacity-100">
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <Input
              value={field.label}
              onChange={(e) => updateField(sectionIndex, index, { label: e.target.value })}
              className="text-base font-medium border-transparent hover:border-input focus:border-input px-2 h-auto py-1"
              placeholder="Question Label"
            />
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => moveField(sectionIndex, index, 'up')}
              disabled={isFirst}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => moveField(sectionIndex, index, 'down')}
              disabled={isLast}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={handleDelete}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pl-7">
          <Select
            value={field.type}
            onValueChange={(value) => updateField(sectionIndex, index, { type: value as FieldType })}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
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
              <SelectItem value="data-warga">Data Warga</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Switch
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) => updateField(sectionIndex, index, { required: checked })}
              className="scale-75"
            />
            <Label htmlFor={`required-${field.id}`} className="text-xs">Required</Label>
          </div>

          {(field.type === 'text' || field.type === 'textarea') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className={`h-8 text-xs ${showSettings ? 'bg-muted' : ''}`}
            >
              <Settings2 className="h-3 w-3 mr-2" />
              {showSettings ? 'Hide Options' : 'Options'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pl-11">
        {showSettings && (field.type === 'text' || field.type === 'textarea') && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-md border animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label htmlFor={`placeholder-${field.id}`} className="text-xs">Placeholder</Label>
              <Input
                id={`placeholder-${field.id}`}
                value={field.placeholder || ''}
                onChange={(e) => updateField(sectionIndex, index, { placeholder: e.target.value })}
                placeholder="e.g. Enter your name"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`description-${field.id}`} className="text-xs">Helper Text</Label>
              <Input
                id={`description-${field.id}`}
                value={field.description || ''}
                onChange={(e) => updateField(sectionIndex, index, { description: e.target.value })}
                placeholder="e.g. Please enter your full name"
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}

        {(field.type === 'select' || field.type === 'checkbox' || field.type === 'radio') && (
          <div className="space-y-2 mt-2 p-3 bg-muted/30 rounded-md border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Options</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  const newOptions = [...(field.options || []), { label: '', value: '' }]
                  updateField(sectionIndex, index, { options: newOptions })
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {field.options?.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  No options added yet.
                </div>
              )}
              {field.options?.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <Input
                      placeholder="Label"
                      value={typeof option === 'object' ? option.label : ''}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])]
                        newOptions[optionIndex] = { ...newOptions[optionIndex], label: e.target.value }
                        updateField(sectionIndex, index, { options: newOptions })
                      }}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Value"
                      value={typeof option === 'object' ? option.value : ''}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])]
                        newOptions[optionIndex] = { ...newOptions[optionIndex], value: e.target.value }
                        updateField(sectionIndex, index, { options: newOptions })
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      const newOptions = field.options?.filter((_, i) => i !== optionIndex)
                      updateField(sectionIndex, index, { options: newOptions })
                    }}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {field.type === 'location' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-md text-xs flex items-center gap-2">
            <span>📍</span>
            <span>This field will capture the enumerator&apos;s GPS coordinates.</span>
          </div>
        )}

        {field.type === 'data-warga' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-md text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1">👥 Tipe Input Data Warga</p>
            <p>
              Menampilkan 7 input: wilayah, nik, nama lengkap, tgl lahir, dusun.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
