import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useFormBuilder } from '@/hooks/useFormBuilder'

describe('useFormBuilder', () => {
  it('should initialize with default section', () => {
    const { result } = renderHook(() => useFormBuilder())
    expect(result.current.sections).toHaveLength(1)
    expect(result.current.sections[0].fields).toEqual([])
  })

  it('should add a field to section', () => {
    const { result } = renderHook(() => useFormBuilder())
    
    act(() => {
      result.current.addField(0)
    })

    expect(result.current.sections[0].fields).toHaveLength(1)
    expect(result.current.sections[0].fields[0].label).toBe('New Question')
    expect(result.current.sections[0].fields[0].type).toBe('text')
  })

  it('should update a field', () => {
    const { result } = renderHook(() => useFormBuilder())
    
    act(() => {
      result.current.addField(0)
    })

    act(() => {
      result.current.updateField(0, 0, { label: 'Updated Label', required: true })
    })

    expect(result.current.sections[0].fields[0].label).toBe('Updated Label')
    expect(result.current.sections[0].fields[0].required).toBe(true)
  })

  it('should remove a field', () => {
    const { result } = renderHook(() => useFormBuilder())
    
    act(() => {
      result.current.addField(0)
    })

    expect(result.current.sections[0].fields).toHaveLength(1)

    act(() => {
      result.current.removeField(0, 0)
    })

    expect(result.current.sections[0].fields).toHaveLength(0)
  })

  it('should move a field', () => {
    const { result } = renderHook(() => useFormBuilder())
    
    act(() => {
      result.current.addField(0) // Index 0
      result.current.addField(0) // Index 1
    })

    // Modify first field to distinguish
    act(() => {
      result.current.updateField(0, 0, { label: 'Field 1' })
      result.current.updateField(0, 1, { label: 'Field 2' })
    })

    expect(result.current.sections[0].fields[0].label).toBe('Field 1')
    expect(result.current.sections[0].fields[1].label).toBe('Field 2')

    // Move Field 1 down
    act(() => {
      result.current.moveField(0, 0, 'down')
    })

    expect(result.current.sections[0].fields[0].label).toBe('Field 2')
    expect(result.current.sections[0].fields[1].label).toBe('Field 1')
  })

  it('should add a new section', () => {
    const { result } = renderHook(() => useFormBuilder())
    
    act(() => {
      result.current.addSection()
    })

    expect(result.current.sections).toHaveLength(2)
    expect(result.current.sections[1].title).toBe('New Section')
  })

  it('should remove a section', () => {
    const { result } = renderHook(() => useFormBuilder())
    
    act(() => {
      result.current.addSection()
    })
    expect(result.current.sections).toHaveLength(2)

    act(() => {
      result.current.removeSection(1)
    })
    expect(result.current.sections).toHaveLength(1)
  })
})
