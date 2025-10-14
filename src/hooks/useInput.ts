import { useState, useCallback } from 'react'

export interface UseInputProps {
  initialValue?: string
  required?: boolean
  validate?: (value: string) => string | null
  onChange?: (value: string) => void
}

export interface UseInputReturn {
  value: string
  error: string | null
  isValid: boolean
  setValue: (value: string) => void
  setError: (error: string | null) => void
  validate: () => boolean
  reset: () => void
  inputProps: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onBlur: () => void
    className?: string
  }
}

export function useInput({
  initialValue = '',
  required = false,
  validate,
  onChange
}: UseInputProps = {}): UseInputReturn {
  const [value, setValueState] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  const setValue = useCallback((newValue: string) => {
    setValueState(newValue)
    onChange?.(newValue)
    
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }, [error, onChange])

  const validateValue = useCallback(() => {
    if (required && !value.trim()) {
      setError('Este campo é obrigatório')
      return false
    }

    if (validate) {
      const validationError = validate(value)
      if (validationError) {
        setError(validationError)
        return false
      }
    }

    setError(null)
    return true
  }, [value, required, validate])

  const reset = useCallback(() => {
    setValueState(initialValue)
    setError(null)
  }, [initialValue])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValue(e.target.value)
  }, [setValue])

  const handleBlur = useCallback(() => {
    validateValue()
  }, [validateValue])

  const inputProps = {
    value,
    onChange: handleChange,
    onBlur: handleBlur,
    className: error ? 'error' : ''
  }

  return {
    value,
    error,
    isValid: !error && value.trim() !== '',
    setValue,
    setError,
    validate: validateValue,
    reset,
    inputProps
  }
}

// Hook específico para formulários com múltiplos campos
export interface UseFormProps {
  initialValues?: Record<string, string>
  validationRules?: Record<string, (value: string) => string | null>
  onSubmit?: (values: Record<string, string>) => void
}

export interface UseFormReturn {
  values: Record<string, string>
  errors: Record<string, string | null>
  isValid: boolean
  setValue: (field: string, value: string) => void
  setError: (field: string, error: string | null) => void
  validateField: (field: string) => boolean
  validateAll: () => boolean
  reset: () => void
  handleSubmit: (e: React.FormEvent) => void
  getFieldProps: (field: string) => {
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onBlur: () => void
    className?: string
  }
}

export function useForm({
  initialValues = {},
  validationRules = {},
  onSubmit
}: UseFormProps = {}): UseFormReturn {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  const setValue = useCallback((field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }, [errors])

  const setError = useCallback((field: string, error: string | null) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  const validateField = useCallback((field: string) => {
    const value = values[field] || ''
    const rule = validationRules[field]

    if (rule) {
      const error = rule(value)
      setError(field, error)
      return !error
    }

    return true
  }, [values, validationRules, setError])

  const validateAll = useCallback(() => {
    let isValid = true
    const newErrors: Record<string, string | null> = {}

    Object.keys(validationRules).forEach(field => {
      const value = values[field] || ''
      const rule = validationRules[field]
      
      if (rule) {
        const error = rule(value)
        if (error) {
          newErrors[field] = error
          isValid = false
        }
      }
    })

    setErrors(newErrors)
    return isValid
  }, [values, validationRules])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
  }, [initialValues])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateAll() && onSubmit) {
      onSubmit(values)
    }
  }, [validateAll, onSubmit, values])

  const getFieldProps = useCallback((field: string) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValue(field, e.target.value)
    }

    const handleBlur = () => {
      validateField(field)
    }

    return {
      value: values[field] || '',
      onChange: handleChange,
      onBlur: handleBlur,
      className: errors[field] ? 'error' : ''
    }
  }, [values, errors, setValue, validateField])

  const isValid = Object.values(errors).every(error => !error) && 
                  Object.values(values).some(value => value.trim() !== '')

  return {
    values,
    errors,
    isValid,
    setValue,
    setError,
    validateField,
    validateAll,
    reset,
    handleSubmit,
    getFieldProps
  }
}
