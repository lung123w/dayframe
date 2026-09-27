import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// jsdom has no ResizeObserver; no Radix surface here needs its behaviour, only
// the shape some of its internal hooks touch.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import ProjectsView from '../components/ProjectsView';

const PROJECTS = [{ id: 7, name: 'Renovation', color: '#635BFF' }];

function renderView(overrides = {}) {
  const props = {
    projects: PROJECTS,
    onCreateProject: vi.fn(),
    onEditProject: vi.fn(),
    onDeleteProject: vi.fn(),
    ...overrides,
  };
  return { ...render(<ProjectsView {...props} />), props };
}

describe('ProjectsView — delete confirmation (stage 4 of ui-modernization-calm-canvas)', () => {
  it('asks in an in-app dialog and deletes only when it is confirmed', async () => {
    const { props } = renderView();

    fireEvent.click(screen.getByLabelText('Delete project Renovation'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete project "Renovation"?');
    expect(props.onDeleteProject).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete project' }));
    await waitFor(() => expect(props.onDeleteProject).toHaveBeenCalledWith(7));
  });

  it('Escape closes the dialog without deleting and returns focus to the trash button', async () => {
    const { props } = renderView();
    const trigger = screen.getByLabelText('Delete project Renovation');
    trigger.focus();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document.body, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(props.onDeleteProject).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('Cancel closes the dialog without deleting', async () => {
    const { props } = renderView();

    fireEvent.click(screen.getByLabelText('Delete project Renovation'));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(props.onDeleteProject).not.toHaveBeenCalled();
  });

  it('renders an empty state and no dialog when there are no projects', () => {
    renderView({ projects: [] });

    expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
