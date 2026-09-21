import type { RecordRef, RecordType } from '@/lib/types';

/**
 * What a page needs to show a link to another record, whatever type it is:
 * where it goes, what it is called, what it is, and one picture.
 *
 * A work's page lives under its series, so only the data layer can turn a
 * reference into a URL. Pages resolve references with resolveRecordRefs()
 * and hand components the finished preview, which keeps every card in this
 * folder free of data access.
 */
export interface RecordPreview {
  ref: RecordRef;
  type: RecordType;
  /** Null when the reference points at something this install does not have. */
  href: string | null;
  title: string;
  subtitle: string | null;
  /** Plain-words type name, e.g. "Exhibition". */
  typeLabel: string;
  year: number | null;
  image: PreviewImage | null;
}

export interface PreviewImage {
  src: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}
