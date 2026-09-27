import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RepsPopover from '../components/RepsPopover';

// Radix measures the content with a ResizeObserver, which jsdom does not have.
globalThis.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };

const POINT = { x: 10, y: 20 };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RepsPopover', () => {
  it('renders with initial value of 0 by default', () => {
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={() => {}} />);
    const input = screen.getByRole('spinbutton');
    expect(input.value).toBe('0');
  });

  it('respects an initialValue prop', () => {
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={() => {}} initialValue={15} />);
    const input = screen.getByRole('spinbutton');
    expect(input.value).toBe('15');
  });

  it('increments the value when + is clicked', () => {
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={() => {}} initialValue={5} />);
    fireEvent.click(screen.getByRole('button', { name: /increase reps/i }));
    expect(screen.getByRole('spinbutton').value).toBe('6');
  });

  it('decrements the value when − is clicked', () => {
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={() => {}} initialValue={5} />);
    fireEvent.click(screen.getByRole('button', { name: /decrease reps/i }));
    expect(screen.getByRole('spinbutton').value).toBe('4');
  });

  it('cannot decrement below 0 and disables the button', () => {
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={() => {}} initialValue={0} />);
    const dec = screen.getByRole('button', { name: /decrease reps/i });
    expect(dec).toBeDisabled();
    fireEvent.click(dec);
    expect(screen.getByRole('spinbutton').value).toBe('0');
  });

  it('manual input overrides the value', () => {
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={() => {}} initialValue={5} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '20' } });
    expect(input.value).toBe('20');
  });

  it('clamps negative manual input to 0', () => {
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={() => {}} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '-5' } });
    expect(input.value).toBe('0');
  });

  it('treats an empty manual input as 0', () => {
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={() => {}} initialValue={5} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('0');
  });

  it('Save calls onSave with the current value', () => {
    const onSave = vi.fn();
    render(<RepsPopover point={POINT} onSave={onSave} onClose={() => {}} initialValue={12} />);
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledWith(12);
  });

  it('Enter key calls onSave', () => {
    const onSave = vi.fn();
    render(<RepsPopover point={POINT} onSave={onSave} onClose={() => {}} initialValue={7} />);
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith(7);
  });

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking outside calls onClose (Radix dismisses the layer)', async () => {
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">outside</div>
        <RepsPopover point={POINT} onSave={() => {}} onClose={onClose} />
      </div>
    );
    await userEvent.click(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking inside does not call onClose', () => {
    const onClose = vi.fn();
    render(<RepsPopover point={POINT} onSave={() => {}} onClose={onClose} />);
    fireEvent.pointerDown(screen.getByRole('spinbutton'), { button: 0 });
    expect(onClose).not.toHaveBeenCalled();
  });
});
