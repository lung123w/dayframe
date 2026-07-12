import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import HabitModal from '../components/HabitModal';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HabitModal', () => {
  const noop = () => {};

  it('renders New Habit heading when no habit is provided', () => {
    render(<HabitModal onSave={noop} onClose={noop} />);
    expect(screen.getByRole('heading', { name: /new habit/i })).toBeInTheDocument();
  });

  it('renders Edit Habit heading when a habit is provided', () => {
    const habit = { name: 'Read', color: '#10B981', frequency: { type: 'daily' } };
    render(<HabitModal habit={habit} onSave={noop} onClose={noop} />);
    expect(screen.getByRole('heading', { name: /edit habit/i })).toBeInTheDocument();
  });

  it('defaults Track by to "duration" for a new habit', () => {
    render(<HabitModal onSave={noop} onClose={noop} />);
    const durationRadio = screen.getByLabelText(/^duration$/i);
    expect(durationRadio).toBeChecked();
  });

  it('saves trackType: "duration" for a new habit by default', () => {
    const onSave = vi.fn();
    render(<HabitModal onSave={onSave} onClose={noop} />);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Meditate' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ trackType: 'duration' }));
  });

  it('saves trackType: "count" when user picks Repetitions for a new habit', () => {
    const onSave = vi.fn();
    render(<HabitModal onSave={onSave} onClose={noop} />);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Push-ups' } });
    fireEvent.click(screen.getByLabelText(/repetitions/i));
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ trackType: 'count' }));
  });

  it('preserves trackType: "duration" when editing an existing duration habit', () => {
    const habit = { name: 'Meditate', color: '#10B981', frequency: { type: 'daily' }, trackType: 'duration' };
    const onSave = vi.fn();
    render(<HabitModal habit={habit} onSave={onSave} onClose={noop} />);
    expect(screen.getByLabelText(/^duration$/i)).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ trackType: 'duration' }));
  });

  it('preserves trackType: "count" when editing an existing count habit', () => {
    const habit = { name: 'Push-ups', color: '#10B981', frequency: { type: 'daily' }, trackType: 'count' };
    const onSave = vi.fn();
    render(<HabitModal habit={habit} onSave={onSave} onClose={noop} />);
    expect(screen.getByLabelText(/repetitions/i)).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ trackType: 'count' }));
  });

  it('shows a warning when changing trackType on a habit with existing entries', () => {
    const habit = { name: 'Meditate', color: '#10B981', frequency: { type: 'daily' }, trackType: 'duration' };
    render(<HabitModal habit={habit} onSave={noop} onClose={noop} entriesCount={5} />);
    expect(screen.queryByText(/historical entries/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/repetitions/i));
    expect(screen.getByText(/historical entries/i)).toBeInTheDocument();
  });

  it('does not show a warning when there are no existing entries', () => {
    const habit = { name: 'Meditate', color: '#10B981', frequency: { type: 'daily' }, trackType: 'duration' };
    render(<HabitModal habit={habit} onSave={noop} onClose={noop} entriesCount={0} />);
    fireEvent.click(screen.getByLabelText(/repetitions/i));
    expect(screen.queryByText(/historical entries/i)).not.toBeInTheDocument();
  });

  it('treats a habit without trackType as duration by default', () => {
    const habit = { name: 'Legacy', color: '#10B981', frequency: { type: 'daily' } };
    const onSave = vi.fn();
    render(<HabitModal habit={habit} onSave={onSave} onClose={noop} />);
    expect(screen.getByLabelText(/^duration$/i)).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ trackType: 'duration' }));
  });
});
