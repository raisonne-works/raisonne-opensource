'use client';

import { useEffect, useState } from 'react';
import { AwardIcon, CalendarIcon, LayersIcon, SearchIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';

/**
 * Search, the way the site would really use it: a dialog opened from a
 * button or the / key. It is never mounted inline, because cmdk selects its
 * first item as soon as it mounts and scrolls that item into view, which
 * would scroll the page out from under whoever opened it.
 */
export function CommandDemo() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <SearchIcon data-icon="inline-start" aria-hidden="true" />
        Search the catalogue
        <Kbd>/</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search works, series and pages">
        <CommandInput placeholder="Search works, series, pages" />
        <CommandList>
          <CommandEmpty>No works match that search.</CommandEmpty>
          <CommandGroup heading="Series">
            <CommandItem>
              <LayersIcon aria-hidden="true" />
              Paste Grounds
            </CommandItem>
            <CommandItem>
              <LayersIcon aria-hidden="true" />
              Marbled Sheets
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Pages">
            <CommandItem>
              <CalendarIcon aria-hidden="true" />
              CV
              <CommandShortcut>G C</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <AwardIcon aria-hidden="true" />
              Awards
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
