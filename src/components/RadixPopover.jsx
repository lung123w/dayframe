import React, { useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import './RadixPopover.css';

/**
 * The one popover shell for stage 3 of `ui-modernization-calm-canvas`
 * (design.md §3 D7): `TimePopover`, `RepsPopover`, `DeferPopover` and the
 * heat-map popover all render through this component instead of positioning
 * themselves absolutely. Radix owns the portal, the collision/clamping, the
 * Escape handling and the outside-pointer dismissal; the CSS stays ours.
 *
 * Two anchoring modes:
 * - `trigger` — the caller's own action element becomes the Radix trigger
 *   (`asChild`), so the popover is anchored to it and the trigger toggles it.
 *   `DeferPopover` uses this.
 * - `anchorEl` / `point` — the content is anchored to an element the caller
 *   opened it from (`anchorEl`) or to a viewport point (`point`, the shape the
 *   unit tests use). `TimePopover` / `RepsPopover` use this.
 *
 * Every content element in this app focuses a field itself, so Radix's
 * auto-focus is suppressed — it would otherwise move focus onto the content
 * container and away from the input on mount.
 */
export default function RadixPopover({
  trigger,
  open,
  onOpenChange,
  anchorEl,
  point,
  className = '',
  children,
  onClose,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
}) {
  const virtualRef = useMemo(() => {
    if (trigger || !point) return undefined;
    const { x, y } = point;
    return {
      current: {
        getBoundingClientRect: () => ({
          x, y, width: 0, height: 0, top: y, left: x, right: x, bottom: y,
          toJSON: () => ({}),
        }),
      },
    };
  }, [trigger, point]);

  const content = (
    <Popover.Portal>
      <Popover.Content
        className={`radix-popover ${className}`.trim()}
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </Popover.Content>
    </Popover.Portal>
  );

  if (trigger) {
    return (
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        {content}
      </Popover.Root>
    );
  }

  return (
    <Popover.Root open onOpenChange={(next) => { if (!next) onClose(); }}>
      <Popover.Anchor virtualRef={anchorEl ? { current: anchorEl } : virtualRef} />
      {content}
    </Popover.Root>
  );
}
