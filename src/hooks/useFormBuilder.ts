import { useState } from 'react'
import { FormField } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function useFormBuilder(initialFields: FormField[] = []) {
  const [fields, setFields] = useState<FormField[]>(initialFields)

  const addField = () => {
    const newField: FormField = {
      id: uuidv4(),
      type: 'text',
      label: 'New Question',
      required: false,
    }
    setFields(prev => [...prev, newField])
    return newField
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(prev => {
      const newFields = [...prev]
      newFields[index] = { ...newFields[index], ...updates }
      return newFields
    })
  }

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index))
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    setFields(prev => {
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === prev.length - 1)
      ) {
        return prev
      }

      const newFields = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      const temp = newFields[index]
      newFields[index] = newFields[targetIndex]
      newFields[targetIndex] = temp
      return newFields
    })
  }

  return {
    fields,
    setFields,
    addField,
    updateField,
    removeField,
    moveField,
  }
}
