import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchXIcon } from 'lucide-react';

import { Container } from '@/components/raisonne/shell/page';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export const metadata: Metadata = {
  title: 'Not found',
};

/**
 * Nothing at this address.
 *
 * The page renders its own trail, which is what switches off the one the
 * shell builds from the URL: that one title-cased whatever was typed, so
 * /works/hello-there read as "Home > Hello there", as though the catalogue
 * held such a page. A missing page is called Not found, whatever was asked
 * for.
 */
export default function NotFound() {
  return (
    <Container className="flex flex-col gap-8 py-10 md:py-14">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Not found</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Empty className="mx-auto w-full max-w-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            <h1>Nothing at this address</h1>
          </EmptyTitle>
          <EmptyDescription>
            The page may have moved, or the work or series is not in this catalogue.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-2">
            <Button nativeButton={false} render={<Link href="/works" />}>
              Browse works
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Home
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </Container>
  );
}
