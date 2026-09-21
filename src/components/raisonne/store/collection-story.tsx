'use client';

import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/**
 * The artist's words about a collection: the statement, the thinking behind
 * it, and how it was made. Tabs, because the three are separate answers
 * rather than one essay, and only the ones that were written are shown. With
 * one passage there are no tabs at all, just the passage.
 */
export function CollectionStory({
  statement,
  vision,
  process,
  className,
}: {
  statement?: string | null;
  vision?: string | null;
  process?: string | null;
  className?: string;
}) {
  const passages = [
    { id: 'statement', label: 'Statement', text: statement?.trim() },
    { id: 'vision', label: 'Vision', text: vision?.trim() },
    { id: 'process', label: 'Process', text: process?.trim() },
  ].filter((passage): passage is { id: string; label: string; text: string } => Boolean(passage.text));

  if (passages.length === 0) return null;

  if (passages.length === 1) {
    return <p className={cn('text-base text-pretty', READING_CLASS, className)}>{passages[0].text}</p>;
  }

  return (
    <Tabs defaultValue={passages[0].id} className={cn('gap-4', className)}>
      <TabsList>
        {passages.map(passage => (
          <TabsTrigger key={passage.id} value={passage.id}>
            {passage.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {passages.map(passage => (
        <TabsContent key={passage.id} value={passage.id}>
          <p className={cn('text-base text-pretty', READING_CLASS)}>{passage.text}</p>
        </TabsContent>
      ))}
    </Tabs>
  );
}
