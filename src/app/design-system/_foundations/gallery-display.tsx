import {
  ArrowUpRightIcon,
  CircleCheckIcon,
  ImageIcon,
  ImageOffIcon,
  InfoIcon,
  LayersIcon,
  NewspaperIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  WalletIcon,
} from 'lucide-react';

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CommandDemo } from './command-demo';
import { Specimen } from './specimen';

/** Placeholder rows: fictional, like the demo artist. */
const EXHIBITIONS = [
  { year: 2025, title: 'Surface and Signal', venue: 'Example Kunsthalle', city: 'Basel', kind: 'Solo' },
  { year: 2024, title: 'Paper Futures', venue: 'Demo Museum of Print', city: 'Lisbon', kind: 'Group' },
  { year: 2024, title: 'Pattern Biennial', venue: 'Harbour Pavilion', city: 'Venice', kind: 'Biennale' },
  { year: 2023, title: 'After the Marble', venue: 'Sample Gallery', city: 'London', kind: 'Group' },
];

const TOKEN_IDS = Array.from({ length: 24 }, (_, index) => index + 1);

export function DisplaySpecimens() {
  return (
    <>
      <Specimen
        title="Card"
        source="ui/card"
        note="For a self-contained summary, such as an import result or a settings group. Artwork tiles are not cards: media sits on the page with its caption below. Never put a card inside a card."
        stageClassName="border-0 p-0 sm:p-0"
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Import finished</CardTitle>
            <CardDescription>2 wallets on Ethereum and Base</CardDescription>
            <CardAction>
              <Badge variant="secondary">
                <CircleCheckIcon data-icon="inline-start" aria-hidden="true" />
                Ready
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Series</dt>
                <dd className="text-2xl font-semibold tabular-nums">3</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Works</dt>
                <dd className="text-2xl font-semibold tabular-nums">18</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">To review</dt>
                <dd className="text-2xl font-semibold tabular-nums">1</dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Publish catalogue</Button>
            <Button size="sm" variant="ghost">
              Review
            </Button>
          </CardFooter>
        </Card>
      </Specimen>

      <Specimen
        title="Tabs"
        source="ui/tabs"
        stageClassName="items-start"
        note="Switches between views of the same object. The default variant for compact panels, the line variant for page-level views."
      >
        <Tabs defaultValue="about" className="w-full">
          <TabsList>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="provenance">Provenance</TabsTrigger>
            <TabsTrigger value="exhibitions">Exhibitions</TabsTrigger>
          </TabsList>
          <TabsContent value="about" className="max-w-prose text-muted-foreground">
            A marbled sheet from the paste grounds series, printed in two passes.
          </TabsContent>
          <TabsContent value="provenance" className="max-w-prose text-muted-foreground">
            Minted by the artist, 12 May 2024. Deployer and minter match the artist&apos;s wallet.
          </TabsContent>
          <TabsContent value="exhibitions" className="max-w-prose text-muted-foreground">
            Shown in Paper Futures, Demo Museum of Print, 2024.
          </TabsContent>
        </Tabs>
        <Tabs defaultValue="works" className="w-full">
          <TabsList variant="line">
            <TabsTrigger value="works">Works</TabsTrigger>
            <TabsTrigger value="series">Series</TabsTrigger>
            <TabsTrigger value="cv">CV</TabsTrigger>
          </TabsList>
        </Tabs>
      </Specimen>

      <Specimen
        title="Table"
        source="ui/table"
        span={2}
        stageClassName="block p-0 sm:p-0"
        note="For records people scan by column: exhibitions, press, import results. Years and ids are tabular figures. On phones the table scrolls sideways inside its frame, never the page."
      >
        <Table>
          <TableCaption className="mb-4">Selected exhibitions (placeholder data)</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 pl-4">Year</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="pr-4 text-right">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {EXHIBITIONS.map(row => (
              <TableRow key={`${row.year}-${row.title}`}>
                <TableCell className="pl-4 font-mono text-xs tabular-nums">{row.year}</TableCell>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell className="text-muted-foreground">{row.venue}</TableCell>
                <TableCell className="text-muted-foreground">{row.city}</TableCell>
                <TableCell className="pr-4 text-right">
                  <Badge variant="outline">{row.kind}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Specimen>

      <Specimen
        title="Item"
        source="ui/item"
        stageClassName="items-stretch"
        note="Rows in a list: a series in the import review, a press item, a wallet. Media on the left, one line of title, at most two of description, actions on the right."
      >
        <ItemGroup>
          <Item variant="outline">
            <ItemMedia variant="icon">
              <LayersIcon aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Paste Grounds</ItemTitle>
              <ItemDescription>24 works on Ethereum. Deployed by your wallet.</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button size="sm" variant="outline">
                Review
              </Button>
            </ItemActions>
          </Item>
          <Item variant="muted">
            <ItemMedia variant="icon">
              <WalletIcon aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                <span className="font-mono text-xs">0x0000...de01</span>
              </ItemTitle>
              <ItemDescription>Ethereum, 3 contracts found</ItemDescription>
            </ItemContent>
          </Item>
          <Item render={<a href="#foundations-components" />}>
            <ItemMedia variant="icon">
              <NewspaperIcon aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>On printing with water</ItemTitle>
              <ItemDescription>Example Review, 2024</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ArrowUpRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            </ItemActions>
          </Item>
        </ItemGroup>
      </Specimen>

      <Specimen
        title="Command"
        source="ui/command"
        note="Search across the catalogue by title, series or token id. It lives in a CommandDialog, opened by a search button or the / key: mounted inline it would select its first item and scroll the page to it."
      >
        <CommandDemo />
      </Specimen>

      <Specimen
        title="Breadcrumb"
        source="ui/breadcrumb"
        note="On series and work pages, above the page header. The last item is the current page and is not a link."
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#foundations-components">Works</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#foundations-components">Paste Grounds</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Paste Grounds #4</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Specimen>

      <Specimen
        title="Pagination"
        source="ui/pagination"
        note="For long series (hundreds of works). Links, not buttons, so every page has its own URL."
      >
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#foundations-components" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#foundations-components">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#foundations-components" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#foundations-components">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#foundations-components" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Specimen>

      <Specimen
        title="Navigation menu"
        source="ui/navigation-menu"
        note="Available for sites that outgrow a flat header, for example to list series under Works. The default header uses plain links."
      >
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Works</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-64 gap-1 p-1">
                  <li>
                    <NavigationMenuLink href="#foundations-components">
                      <LayersIcon aria-hidden="true" />
                      Paste Grounds
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#foundations-components">
                      <LayersIcon aria-hidden="true" />
                      Marbled Sheets
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#foundations-components">
                      <ImageIcon aria-hidden="true" />
                      All works
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#foundations-components" className="h-9 px-2.5 font-medium">
                CV
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </Specimen>

      <Specimen
        title="Avatar"
        source="ui/avatar"
        note="People only (the artist, collectors), never artworks. Falls back to initials when there is no portrait."
      >
        <Avatar size="sm">
          <AvatarFallback>DA</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>DA</AvatarFallback>
        </Avatar>
        <Avatar size="lg">
          <AvatarFallback>DA</AvatarFallback>
        </Avatar>
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>CD</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>EF</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+12</AvatarGroupCount>
        </AvatarGroup>
      </Specimen>

      <Specimen
        title="Aspect ratio"
        source="ui/aspect-ratio"
        stageClassName="items-start"
        note="Reserves the media box before the image loads, so grids never jump. Use the work's own ratio when known; square when it is not."
      >
        <div className="grid w-full grid-cols-3 gap-3">
          {[
            { ratio: 1, label: '1:1' },
            { ratio: 4 / 5, label: '4:5' },
            { ratio: 16 / 9, label: '16:9' },
          ].map(({ ratio, label }) => (
            <AspectRatio key={label} ratio={ratio} className="rounded-lg bg-muted">
              <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground">
                {label}
              </span>
            </AspectRatio>
          ))}
        </div>
      </Specimen>

      <Specimen
        title="Scroll area"
        source="ui/scroll-area"
        stageClassName="items-stretch"
        note="For a bounded list inside a panel, such as token ids in the import review. The page itself never scrolls sideways."
      >
        <ScrollArea className="h-40 w-full rounded-lg border">
          <ul className="flex flex-col p-2">
            {TOKEN_IDS.map(id => (
              <li key={id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                <span>Paste Grounds #{id}</span>
                <span className="font-mono text-xs text-muted-foreground">#{id}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </Specimen>

      <Specimen
        title="Separator"
        source="ui/separator"
        stageClassName="flex-col items-stretch"
        note="Divides groups inside a panel or a row of metadata. Sections of a page are divided by space, not lines."
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Paste Grounds #4</p>
          <p className="text-sm text-muted-foreground">Demo Artist, 2024</p>
        </div>
        <Separator />
        <div className="flex h-5 items-center gap-3 text-sm text-muted-foreground">
          <span>ERC-721</span>
          <Separator orientation="vertical" />
          <span>Ethereum</span>
          <Separator orientation="vertical" />
          <span className="font-mono text-xs">#4</span>
        </div>
      </Specimen>

      <Specimen
        title="Alert"
        source="ui/alert"
        span={2}
        stageClassName="flex-col items-stretch"
        note="Inline messages about the page's own content. The destructive variant is the error state for any section that fails to load, with a way to try again."
      >
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertTitle>This series is partly shown</AlertTitle>
          <AlertDescription>6 of 24 works have media yet. The rest appear once the importer fetches them.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>Could not load works</AlertTitle>
          <AlertDescription>The media host did not answer. Your catalogue is safe; try again in a moment.</AlertDescription>
          <AlertAction>
            <Button size="xs" variant="outline">
              <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </Specimen>

      <Specimen
        title="Progress and spinner"
        source="ui/progress, ui/spinner"
        stageClassName="flex-col items-stretch"
        note="Progress when the total is known (contracts scanned). A spinner for short waits with no total, always next to a word that says what is happening."
      >
        <Progress value={48} className="w-full">
          <ProgressLabel>Scanning contracts</ProgressLabel>
          <ProgressValue />
        </Progress>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Spinner className="size-3" />
            Small
          </span>
          <span className="flex items-center gap-2">
            <Spinner />
            Fetching media
          </span>
          <span className="flex items-center gap-2">
            <Spinner className="size-6" />
            Large
          </span>
        </div>
      </Specimen>

      <Specimen
        title="Skeleton"
        source="ui/skeleton"
        stageClassName="items-stretch"
        note="The loading state for anything with a known shape. Match the final layout: same ratio, same number of lines."
      >
        <div className="grid w-full grid-cols-3 gap-3" aria-hidden="true">
          {[0, 1, 2].map(index => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading works</span>
      </Specimen>

      <Specimen
        title="Empty"
        source="ui/empty"
        stageClassName="p-0 sm:p-0"
        note="The empty state says why there is nothing and offers the next step."
      >
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageOffIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No works in this series yet</EmptyTitle>
            <EmptyDescription>Run an import to find the tokens on this contract.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">Run import</Button>
          </EmptyContent>
        </Empty>
      </Specimen>
    </>
  );
}
