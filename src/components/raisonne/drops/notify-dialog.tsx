'use client';

import { BellIcon } from 'lucide-react';

import { NewsletterForm } from '@/components/raisonne/landing/newsletter-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Get notified about a drop.
 *
 * It is the site's own sign-up form, tagged with the drop's slug, so the
 * artist can see who asked about what, and so a failure is a failure: the
 * form reports what the endpoint says rather than always thanking you.
 */
export function NotifyDialog({
  slug,
  title,
  description,
  buttonLabel = 'Get notified',
  variant = 'default',
  className,
}: {
  /** Drop.slug: the source tag on the sign-up. */
  slug: string;
  /** The drop's title, for the dialog heading. */
  title: string;
  description?: string | null;
  buttonLabel?: string;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant={variant} className={className} />}>
        <BellIcon aria-hidden data-icon="inline-start" />
        {buttonLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get notified: {title}</DialogTitle>
          <DialogDescription>
            {description ?? 'One email when this opens, and nothing else. Unsubscribe whenever you like.'}
          </DialogDescription>
        </DialogHeader>
        <NewsletterForm title={`Get notified: ${title}`} description={null} source={`drop:${slug}`} />
      </DialogContent>
    </Dialog>
  );
}
