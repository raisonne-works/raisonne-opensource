'use client';

import { type ReactNode, useState } from 'react';
import {
  ArrowUpRightIcon,
  CopyIcon,
  DownloadIcon,
  EyeOffIcon,
  LayoutGridIcon,
  ListIcon,
  PlayIcon,
  PlusIcon,
  ShareIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { Specimen } from './specimen';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function ActionSpecimens() {
  const [removing, setRemoving] = useState(false);

  return (
    <>
      <Specimen
        title="Button"
        source="ui/button"
        span={2}
        stageClassName="flex-col items-start gap-5"
        note="One primary action per view. Outline and ghost for everything else; destructive only for actions that remove something. Links that look like buttons use the render prop with next/link and nativeButton={false}."
      >
        <Row label="Variants">
          <Button>Save changes</Button>
          <Button variant="secondary">Preview</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="destructive">Hide series</Button>
          <Button variant="link">View on explorer</Button>
        </Row>
        <Row label="Sizes">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon-xs" variant="outline" aria-label="Copy">
            <CopyIcon aria-hidden="true" />
          </Button>
          <Button size="icon-sm" variant="outline" aria-label="Copy">
            <CopyIcon aria-hidden="true" />
          </Button>
          <Button size="icon" variant="outline" aria-label="Copy">
            <CopyIcon aria-hidden="true" />
          </Button>
          <Button size="icon-lg" variant="outline" aria-label="Copy">
            <CopyIcon aria-hidden="true" />
          </Button>
        </Row>
        <Row label="With icons and states">
          <Button>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Add wallet
          </Button>
          <Button variant="outline">
            Open collection
            <ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
          <Button disabled>
            <Spinner data-icon="inline-start" />
            Importing
          </Button>
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </Row>
      </Specimen>

      <Specimen
        title="Badge"
        source="ui/badge"
        stageClassName="flex-col items-start gap-4"
        note="Short facts about a work or series. Secondary and outline carry most metadata; default is reserved for the single most important fact."
      >
        <Row label="Variants">
          <Badge>Featured</Badge>
          <Badge variant="secondary">ERC-721</Badge>
          <Badge variant="outline">Edition of 25</Badge>
          <Badge variant="destructive">Excluded</Badge>
          <Badge variant="ghost">Draft</Badge>
        </Row>
        <Row label="In context">
          <Badge variant="secondary">1/1</Badge>
          <Badge variant="outline">Ethereum</Badge>
          <Badge variant="outline">Co-authored</Badge>
          <Badge variant="secondary">
            <PlayIcon data-icon="inline-start" aria-hidden="true" />
            Video
          </Badge>
        </Row>
      </Specimen>

      <Specimen
        title="Toggle and toggle group"
        source="ui/toggle, ui/toggle-group"
        stageClassName="flex-col items-start gap-4"
        note="For view state the viewer controls (grid or list, animate or still). Every icon-only item has an aria-label."
      >
        <Row label="Toggle group, outline">
          <ToggleGroup variant="outline" defaultValue={['grid']} aria-label="Layout">
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGridIcon aria-hidden="true" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <ListIcon aria-hidden="true" />
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup variant="outline" spacing={0} defaultValue={['all']} aria-label="Filter by kind">
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="series">Series</ToggleGroupItem>
            <ToggleGroupItem value="one-of-one">1/1</ToggleGroupItem>
          </ToggleGroup>
        </Row>
        <Row label="Toggle">
          <Toggle defaultPressed>
            <PlayIcon aria-hidden="true" />
            Animate
          </Toggle>
          <Toggle variant="outline">
            <EyeOffIcon aria-hidden="true" />
            Hide sold
          </Toggle>
        </Row>
      </Specimen>

      <Specimen
        title="Kbd"
        source="ui/kbd"
        note="Keyboard hints in tooltips, menus and the command palette. Never the only way to reach an action."
      >
        <KbdGroup>
          <Kbd>&#8984;</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        <Kbd>Esc</Kbd>
        <Kbd>/</Kbd>
        <span className="text-sm text-muted-foreground">
          Press <Kbd>&larr;</Kbd> <Kbd>&rarr;</Kbd> to move between works
        </span>
      </Specimen>

      <Specimen
        title="Tooltip"
        source="ui/tooltip"
        note="Names an icon-only control. Content is a few words; anything longer belongs in a hover card or on the page."
      >
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Copy contract address" />}>
            <CopyIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Copy contract address</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" />}>Search</TooltipTrigger>
          <TooltipContent>
            Search works <Kbd>/</Kbd>
          </TooltipContent>
        </Tooltip>
      </Specimen>

      <Specimen
        title="Dropdown menu"
        source="ui/dropdown-menu"
        note="Secondary actions on a work or series. Group related items, put destructive items last, after a separator."
      >
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            <ShareIcon data-icon="inline-start" aria-hidden="true" />
            Share
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Paste Grounds #4</DropdownMenuLabel>
              <DropdownMenuItem>
                <CopyIcon aria-hidden="true" />
                Copy link
                <DropdownMenuShortcut>&#8984;C</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArrowUpRightIcon aria-hidden="true" />
                Open on explorer
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DownloadIcon aria-hidden="true" />
                Download still
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setRemoving(true)}>
              <Trash2Icon aria-hidden="true" />
              Remove from catalogue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* A destructive menu item never acts on its own: it opens a confirmation. */}
        <AlertDialog open={removing} onOpenChange={setRemoving}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <Trash2Icon aria-hidden="true" />
              </AlertDialogMedia>
              <AlertDialogTitle>Remove Paste Grounds #4 from the catalogue?</AlertDialogTitle>
              <AlertDialogDescription>
                The work leaves this site. The token stays on-chain, and a later import finds it again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setRemoving(false);
                  toast.success('Work removed', { description: 'Paste Grounds #4 is no longer in the catalogue.' });
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Specimen>

      <Specimen
        title="Hover card"
        source="ui/hover-card"
        note="A preview on hover or focus, such as a collector or a venue. The link must also work on its own, since touch screens never hover."
      >
        <p className="text-sm">
          Collected by{' '}
          <HoverCard>
            <HoverCardTrigger
              delay={150}
              closeDelay={100}
              href="#foundations-components"
              className="font-medium underline underline-offset-4"
            >
              Demo Collector
            </HoverCardTrigger>
            <HoverCardContent className="w-72">
              <div className="flex gap-3">
                <Avatar>
                  <AvatarFallback>DC</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm font-medium">Demo Collector</p>
                  <p className="font-mono text-xs text-muted-foreground">0x0000...de02</p>
                  <p className="text-sm text-muted-foreground">Holds 4 works across 2 series since 2023.</p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </p>
      </Specimen>

      <Specimen
        title="Dialog"
        source="ui/dialog"
        note="For content: the media viewer, a long record, a form. Anything that removes or hides uses AlertDialog instead, which is modal and does not close on a click outside."
      >
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Provenance</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Paste Grounds #4</DialogTitle>
              <DialogDescription>Where this work comes from, as recorded on-chain.</DialogDescription>
            </DialogHeader>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Minted</dt>
                <dd>12 May 2024</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Deployer</dt>
                <dd className="font-mono text-xs">0x0000...de01</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Editions</dt>
                <dd>Unique</dd>
              </div>
            </dl>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Specimen>

      <Specimen
        title="Alert dialog"
        source="ui/alert-dialog"
        note="Confirms anything that removes or hides. The title states the action, the description states the consequence, and the confirming button carries the destructive variant. It cannot be dismissed by clicking outside."
      >
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" />}>
            <EyeOffIcon data-icon="inline-start" aria-hidden="true" />
            Hide series
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <EyeOffIcon aria-hidden="true" />
              </AlertDialogMedia>
              <AlertDialogTitle>Hide Paste Grounds?</AlertDialogTitle>
              <AlertDialogDescription>
                Its 24 works leave the public catalogue. The tokens stay on-chain and you can show the series again at
                any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => toast.success('Series hidden', { description: 'Paste Grounds is no longer public.' })}
              >
                Hide series
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Specimen>

      <Specimen
        title="Sheet"
        source="ui/sheet"
        note="Side panels for filters and for the mobile navigation. Content stays on the page behind it, so the viewer keeps their place."
      >
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            <SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
            Filters
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter works</SheetTitle>
              <SheetDescription>Narrow the catalogue. Filters apply as you change them.</SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox id="sheet-filter-video" defaultChecked />
                  <FieldLabel htmlFor="sheet-filter-video">Video works</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox id="sheet-filter-html" />
                  <FieldLabel htmlFor="sheet-filter-html">Interactive (HTML) works</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Switch id="sheet-filter-shared" />
                  <FieldLabel htmlFor="sheet-filter-shared">Include marketplace 1/1s</FieldLabel>
                </Field>
                <FieldDescription>Marketplace 1/1s are tokens on a shared platform contract.</FieldDescription>
              </FieldGroup>
            </div>
            <SheetFooter>
              <SheetClose render={<Button />}>Show 18 works</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Specimen>

      <Specimen
        title="Toast"
        source="ui/sonner"
        note="Confirms something that already happened, with an undo when it can be undone. Never the only place an error is reported."
      >
        <Button
          variant="outline"
          onClick={() =>
            toast.success('Series hidden', {
              description: 'Paste Grounds is no longer public.',
              action: { label: 'Undo', onClick: () => toast('Series shown again') },
            })
          }
        >
          Show a toast
        </Button>
        <Button variant="outline" onClick={() => toast.error('Could not reach the RPC. Try again in a minute.')}>
          Show an error toast
        </Button>
      </Specimen>
    </>
  );
}
