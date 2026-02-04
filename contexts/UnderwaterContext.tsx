'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface UnderwaterContextType {
  isUnderwater: boolean
  setIsUnderwater: (value: boolean) => void
}

const UnderwaterContext = createContext<UnderwaterContextType | undefined>(undefined)

export function UnderwaterProvider({ children }: { children: ReactNode }) {
  const [isUnderwater, setIsUnderwater] = useState(false)

  return (
    <UnderwaterContext.Provider value={{ isUnderwater, setIsUnderwater }}>
      {children}
    </UnderwaterContext.Provider>
  )
}

export function useUnderwater() {
  const context = useContext(UnderwaterContext)
  if (context === undefined) {
    throw new Error('useUnderwater must be used within UnderwaterProvider')
  }
  return context
}
