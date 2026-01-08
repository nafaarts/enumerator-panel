import { useState } from 'react'
import { FormField, FormSchema, FormSection } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function useFormBuilder(initialSchema: FormSchema = { fields: [] }) {
  // Initialize state: always convert to sections
  const [sections, setSections] = useState<FormSection[]>(() => {
    if (initialSchema.sections && initialSchema.sections.length > 0) {
      return initialSchema.sections
    }
    // Fallback: Wrap fields in a default section
    return [
      {
        id: uuidv4(),
        title: '',
        fields: initialSchema.fields || [],
      },
    ]
  })

  // --- Section Management ---

  const addSection = () => {
    const newSection: FormSection = {
      id: uuidv4(),
      title: 'New Section',
      fields: [],
    }
    setSections((prev) => [...prev, newSection])
  }

  const updateSection = (index: number, updates: Partial<FormSection>) => {
    setSections((prev) => {
      const newSections = [...prev]
      newSections[index] = { ...newSections[index], ...updates }
      return newSections
    })
  }

  const removeSection = (index: number) => {
    if (sections.length <= 1) {
      // Don't allow removing the last section, just clear it or reset it
      // But maybe user wants to remove a specific section. 
      // Let's allow removing if > 1. If 1, maybe just clear fields?
      // For now, allow remove, but ensure there's always at least one section if we want strict "always section" rule?
      // Actually, if we remove the last section, we might want to add a fresh empty one or leave it empty?
      // Let's just allow removing.
    }
    setSections((prev) => prev.filter((_, i) => i !== index))
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    setSections((prev) => {
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === prev.length - 1)
      ) {
        return prev
      }

      const newSections = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      const temp = newSections[index]
      newSections[index] = newSections[targetIndex]
      newSections[targetIndex] = temp
      return newSections
    })
  }

  // --- Field Management ---

  const addField = (sectionIndex: number) => {
    const newField: FormField = {
      id: uuidv4(),
      type: 'text',
      label: 'New Question',
      required: false,
    }
    setSections((prev) => {
      const newSections = [...prev]
      // Ensure section exists (sanity check)
      if (!newSections[sectionIndex]) return prev

      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        fields: [...newSections[sectionIndex].fields, newField],
      }
      return newSections
    })
    return newField
  }

  const updateField = (
    sectionIndex: number,
    fieldIndex: number,
    updates: Partial<FormField>
  ) => {
    setSections((prev) => {
      const newSections = [...prev]
      const section = newSections[sectionIndex]
      const newFields = [...section.fields]
      newFields[fieldIndex] = { ...newFields[fieldIndex], ...updates }
      newSections[sectionIndex] = { ...section, fields: newFields }
      return newSections
    })
  }

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    setSections((prev) => {
      const newSections = [...prev]
      const section = newSections[sectionIndex]
      newSections[sectionIndex] = {
        ...section,
        fields: section.fields.filter((_, i) => i !== fieldIndex),
      }
      return newSections
    })
  }

  const moveField = (
    sectionIndex: number,
    fieldIndex: number,
    direction: 'up' | 'down'
  ) => {
    setSections((prev) => {
      const newSections = [...prev]
      const section = newSections[sectionIndex]
      const newFields = [...section.fields]

      if (
        (direction === 'up' && fieldIndex === 0) ||
        (direction === 'down' && fieldIndex === newFields.length - 1)
      ) {
        return prev
      }

      const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1
      const temp = newFields[fieldIndex]
      newFields[fieldIndex] = newFields[targetIndex]
      newFields[targetIndex] = temp

      newSections[sectionIndex] = { ...section, fields: newFields }
      return newSections
    })
  }

  return {
    sections,
    setSections,
    // Section actions
    addSection,
    updateSection,
    removeSection,
    moveSection,
    // Field actions
    addField,
    updateField,
    removeField,
    moveField,
  }
}
