'use client';

import { MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

/**
 * Zoom and pan for a still, the way a catalogue needs it: half size to five
 * times, with the wheel, a pinch, the buttons or the keyboard, and the point
 * under the cursor staying where it is.
 *
 * The state lives in a hook so the controls can sit outside the frame, in a
 * viewer's toolbar, and still drive it.
 */

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 5;
/** One press of a button. */
const STEP = 1.5;
/** One press of an arrow key, in pixels. */
const KEY_PAN = 60;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface Point {
  x: number;
  y: number;
}

interface View {
  scale: number;
  offset: Point;
}

const RESTING: View = { scale: 1, offset: { x: 0, y: 0 } };

export interface ZoomPan {
  scale: number;
  /** Anything other than the resting size, so a caller can offer "Reset". */
  zoomed: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  /** For a readout, e.g. 250. */
  percent: number;
  /** What the stage needs. A page never touches these. */
  stage: {
    /** A callback ref: the stage hands the hook its element. */
    setFrame: (node: HTMLDivElement | null) => void;
    style: CSSProperties;
    interacting: boolean;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    onDoubleClick: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
}

export function useZoomPan({ min = MIN_SCALE, max = MAX_SCALE }: { min?: number; max?: number } = {}): ZoomPan {
  const [view, setView] = useState<View>(RESTING);
  const [interacting, setInteracting] = useState(false);
  // The frame's size, watched rather than measured during render, so panning
  // can be held inside it without reading the DOM while React is rendering.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reducedMotion = usePrefersReducedMotion();

  // The element is state, not a ref: the effects below depend on it, and
  // nothing has to read a ref while React is rendering.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ distance: number } | null>(null);
  const drag = useRef<{ from: Point; offset: Point } | null>(null);

  useEffect(() => {
    if (!frame) return;
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box) setSize({ width: box.width, height: box.height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame]);

  /** Keeps the content from being dragged out of its frame. */
  const hold = useCallback(
    (offset: Point, scale: number): Point => {
      if (scale <= 1) return RESTING.offset;
      if (size.width === 0 || size.height === 0) return offset;
      const boundX = (size.width * (scale - 1)) / 2;
      const boundY = (size.height * (scale - 1)) / 2;
      return { x: clamp(offset.x, -boundX, boundX), y: clamp(offset.y, -boundY, boundY) };
    },
    [size.height, size.width],
  );

  /** Zoom to a size, keeping `origin` (measured from the frame's centre) still. */
  const zoomTo = useCallback(
    (next: number | ((scale: number) => number), origin: Point = RESTING.offset) => {
      setView(current => {
        const target = clamp(typeof next === 'function' ? next(current.scale) : next, min, max);
        if (target === current.scale) return current;
        const ratio = target / current.scale;
        const moved = {
          x: origin.x - ratio * (origin.x - current.offset.x),
          y: origin.y - ratio * (origin.y - current.offset.y),
        };
        return { scale: target, offset: hold(moved, target) };
      });
    },
    [hold, max, min],
  );

  const panBy = useCallback(
    (x: number, y: number) => {
      setView(current =>
        current.scale <= 1
          ? current
          : { scale: current.scale, offset: hold({ x: current.offset.x + x, y: current.offset.y + y }, current.scale) },
      );
    },
    [hold],
  );

  const reset = useCallback(() => setView(RESTING), []);
  const zoomIn = useCallback(() => zoomTo(scale => scale * STEP), [zoomTo]);
  const zoomOut = useCallback(() => zoomTo(scale => scale / STEP), [zoomTo]);

  /** A pointer position measured from the centre of the frame. */
  const fromCentre = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = frame?.getBoundingClientRect();
      if (!rect) return RESTING.offset;
      return { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) };
    },
    [frame],
  );

  // A wheel listener has to be non-passive to stop the page scrolling under
  // the viewer, and React attaches its own as passive, so this one is by hand.
  useEffect(() => {
    if (!frame) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      zoomTo(scale => scale * factor, fromCentre(event.clientX, event.clientY));
    }
    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => frame.removeEventListener('wheel', onWheel);
  }, [frame, fromCentre, zoomTo]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
      drag.current = null;
      setInteracting(true);
      return;
    }
    if (pointers.current.size === 1) {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { from: { x: event.clientX, y: event.clientY }, offset: RESTING.offset };
      setInteracting(true);
    }
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const pinching = pinch.current;
      if (pointers.current.size >= 2 && pinching) {
        const [a, b] = [...pointers.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const centre = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
        const step = distance / pinching.distance;
        pinch.current = { distance };
        zoomTo(scale => scale * step, centre);
        return;
      }

      const dragging = drag.current;
      if (dragging) {
        panBy(event.clientX - dragging.from.x, event.clientY - dragging.from.y);
        drag.current = { from: { x: event.clientX, y: event.clientY }, offset: RESTING.offset };
      }
    },
    [fromCentre, panBy, zoomTo],
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      drag.current = null;
      setInteracting(false);
    }
  }, []);

  const onDoubleClick = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const origin = fromCentre(event.clientX, event.clientY);
      zoomTo(scale => (scale > 1 ? 1 : 2.5), origin);
    },
    [fromCentre, zoomTo],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
        case 'Home':
          event.preventDefault();
          reset();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          panBy(KEY_PAN, 0);
          break;
        case 'ArrowRight':
          event.preventDefault();
          panBy(-KEY_PAN, 0);
          break;
        case 'ArrowUp':
          event.preventDefault();
          panBy(0, KEY_PAN);
          break;
        case 'ArrowDown':
          event.preventDefault();
          panBy(0, -KEY_PAN);
          break;
        default:
          break;
      }
    },
    [panBy, reset, zoomIn, zoomOut],
  );

  return {
    scale: view.scale,
    zoomed: view.scale !== 1 || view.offset.x !== 0 || view.offset.y !== 0,
    canZoomIn: view.scale < max - 0.001,
    canZoomOut: view.scale > min + 0.001,
    percent: Math.round(view.scale * 100),
    zoomIn,
    zoomOut,
    reset,
    stage: {
      setFrame,
      interacting,
      style: {
        transform: `translate3d(${view.offset.x}px, ${view.offset.y}px, 0) scale(${view.scale})`,
        transition: interacting || reducedMotion ? undefined : 'transform 150ms ease-out',
      },
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onKeyDown,
      onDoubleClick,
    },
  };
}

/**
 * The frame the zoomed content moves inside. It takes focus and the keyboard,
 * so zoom and pan work without a mouse and without a touch screen, and it
 * says so when a screen reader lands on it.
 */
export function ZoomPanStage({
  controller,
  label,
  children,
  className,
  contentClassName,
}: {
  controller: ZoomPan;
  /** What is being zoomed, e.g. the work's title. */
  label: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const { zoomed } = controller;
  // Destructured, because a callback ref read off an object during render
  // looks to the compiler like reading a ref.
  const { setFrame, style, interacting, onPointerDown, onPointerMove, onPointerUp, onDoubleClick, onKeyDown } =
    controller.stage;

  return (
    <div
      ref={setFrame}
      role="group"
      tabIndex={0}
      aria-label={`${label}. Zoom with plus and minus, pan with the arrow keys, reset with zero.`}
      data-slot="zoom-pan-stage"
      className={cn(
        'relative size-full touch-none overflow-hidden outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
        zoomed ? (interacting ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    >
      <div className={cn('relative size-full will-change-transform', contentClassName)} style={style}>
        {children}
      </div>
    </div>
  );
}

/** Zoom out, the current size, zoom in, and a reset that wakes up once it is useful. */
export function ZoomControls({ controller, className }: { controller: ZoomPan; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom out"
        disabled={!controller.canZoomOut}
        onClick={controller.zoomOut}
      >
        <MinusIcon aria-hidden />
      </Button>
      {/* The one place the size is announced: the buttons and the keyboard both change it. */}
      <span role="status" aria-live="polite" className="w-12 text-center text-xs tabular-nums text-muted-foreground">
        <span className="sr-only">Zoom </span>
        {controller.percent}%
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom in"
        disabled={!controller.canZoomIn}
        onClick={controller.zoomIn}
      >
        <PlusIcon aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Reset the zoom"
        disabled={!controller.zoomed}
        onClick={controller.reset}
      >
        <RotateCcwIcon aria-hidden />
      </Button>
    </div>
  );
}
