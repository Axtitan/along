"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/** Along is designed as a light, high-contrast app for outdoor use; dark mode is not supported yet. */
function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" forcedTheme="light" disableTransitionOnChange {...props}>
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
