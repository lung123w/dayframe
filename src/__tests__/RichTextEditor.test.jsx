import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RichTextEditor from '../components/RichTextEditor';

describe('RichTextEditor', () => {
  it('renders the editor with toolbar buttons', () => {
    render(<RichTextEditor content="" onChange={vi.fn()} />);
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Strikethrough')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 3')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
    expect(screen.getByTitle('Inline Code')).toBeInTheDocument();
    expect(screen.getByTitle('Code Block')).toBeInTheDocument();
    expect(screen.getByTitle('Add Link')).toBeInTheDocument();
    expect(screen.getByTitle('Undo')).toBeInTheDocument();
    expect(screen.getByTitle('Redo')).toBeInTheDocument();
  });

  it('renders initial HTML content', () => {
    render(<RichTextEditor content="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders plain text content', () => {
    render(<RichTextEditor content="Plain text" onChange={vi.fn()} />);
    expect(screen.getByText('Plain text')).toBeInTheDocument();
  });

  it('renders empty editor when no content provided', () => {
    const { container } = render(<RichTextEditor content="" onChange={vi.fn()} />);
    const editorContainer = container.querySelector('.rich-editor-container');
    expect(editorContainer).toBeInTheDocument();
  });

  it('renders the editor content area', () => {
    const { container } = render(<RichTextEditor content="" onChange={vi.fn()} />);
    const editorContent = container.querySelector('.rich-editor-content');
    expect(editorContent).toBeInTheDocument();
  });

  it('asks for the link URL in an in-app dialog instead of the native prompt', async () => {
    // `globalThis.prompt` is the page's native prompt; spying on it proves the
    // component no longer reaches for it.
    const promptSpy = vi.spyOn(globalThis, 'prompt').mockImplementation(() => null);
    render(<RichTextEditor content="<p>Hello</p>" onChange={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Add Link'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Add a link');
    expect(promptSpy).not.toHaveBeenCalled();

    // Escape closes the prompt dialog and applies nothing.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    promptSpy.mockRestore();
  });
});
