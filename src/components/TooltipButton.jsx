import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import './TooltipButton.css';

/**
 * An icon-only button whose accessible name is its `aria-label` and whose
 * visible hint is a Radix tooltip (design.md §3 D7: `title=` moves into the
 * tooltip, `aria-label` stays the accessible name).
 *
 * `ariaLabel` overrides the tooltip text when the accessible name carries more
 * than the hint (e.g. "Complete \"Write tests\"" vs the hint "Toggle status").
 *
 * A disabled button fires no pointer events, so Radix needs a hoverable
 * wrapper — the fallback keeps the tooltip working on the reorder arrows at
 * the ends of a list.
 */
export default function TooltipButton({ label, ariaLabel, className = '', disabled = false, children, ...rest }) {
  const button = (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel || label}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );

  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {disabled ? <span className="tooltip-trigger-wrap" tabIndex={-1}>{button}</span> : button}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip-content" side="top" sideOffset={6} collisionPadding={8}>
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
