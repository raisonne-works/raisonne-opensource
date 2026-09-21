'use client';

import type { ComponentProps } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * next-themes, light by default, with the dark class on <html>.
 *
 * React 19 warns about a <script> rendered by a client component. The theme
 * script only needs to run from the server HTML (before paint), so on the
 * client it is rendered as inert JSON and React stays quiet.
 */
const scriptProps = typeof window === 'undefined' ? undefined : ({ type: 'application/json' } as const);

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      scriptProps={scriptProps}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
