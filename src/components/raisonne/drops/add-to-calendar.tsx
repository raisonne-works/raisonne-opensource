'use client';

import { CalendarPlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** An hour, for a release with no closing time. */
const DEFAULT_LENGTH = 60 * 60 * 1000;

/** 20261201T170000Z, the only date format both an .ics file and Google accept. */
function stamp(value: number): string {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Commas, semicolons and line breaks carry meaning in an .ics file. */
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

/**
 * Put a drop in the visitor's calendar: a file for anything that reads .ics
 * (Apple, Outlook, Thunderbird) or a prefilled Google Calendar event.
 *
 * Nothing is sent anywhere: the file is built in the browser from the dates
 * already on the page.
 */
export function AddToCalendar({
  title,
  description,
  startsAt,
  endsAt = null,
  slug,
  className,
}: {
  title: string;
  description?: string | null;
  /** ISO date-time. The button does not render without one. */
  startsAt: string | null;
  endsAt?: string | null;
  /** Drop.slug, used for the event id and the file name. */
  slug: string;
  className?: string;
}) {
  const start = startsAt ? Date.parse(startsAt) : Number.NaN;
  if (!Number.isFinite(start)) return null;

  const parsedEnd = endsAt ? Date.parse(endsAt) : Number.NaN;
  const end = Number.isFinite(parsedEnd) ? parsedEnd : start + DEFAULT_LENGTH;

  function pageUrl(): string {
    return typeof window === 'undefined' ? '' : window.location.href;
  }

  function download() {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Raisonne//Drop//EN',
      'BEGIN:VEVENT',
      `UID:${slug}@raisonne`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeText(title)}`,
      `DESCRIPTION:${escapeText([description, pageUrl()].filter(Boolean).join('\n\n'))}`,
      `URL:${pageUrl()}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    const blob = new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slug}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function google() {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${stamp(start)}/${stamp(end)}`,
      details: [description, pageUrl()].filter(Boolean).join('\n\n'),
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className={className} />}>
        <CalendarPlusIcon aria-hidden data-icon="inline-start" />
        Add to calendar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={download}>Download an .ics file</DropdownMenuItem>
        <DropdownMenuItem onClick={google}>Google Calendar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
