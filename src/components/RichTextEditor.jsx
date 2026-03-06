import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  FaBold, FaItalic, FaStrikethrough, FaCode,
  FaHeading, FaListUl, FaListOl, FaLink, FaUndo, FaRedo
} from 'react-icons/fa';
import './RichTextEditor.css';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="rich-editor-toolbar">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''} title="Bold">
        <FaBold />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''} title="Italic">
        <FaItalic />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'is-active' : ''} title="Strikethrough">
        <FaStrikethrough />
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="Heading 1">
        <FaHeading /><span className="heading-level">1</span>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading 2">
        <FaHeading /><span className="heading-level">2</span>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''} title="Heading 3">
        <FaHeading /><span className="heading-level">3</span>
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''} title="Bullet List">
        <FaListUl />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''} title="Numbered List">
        <FaListOl />
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()}
        className={editor.isActive('code') ? 'is-active' : ''} title="Inline Code">
        <FaCode />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'is-active' : ''} title="Code Block">
        <FaCode /><span className="heading-level">{'{ }'}</span>
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={addLink}
        className={editor.isActive('link') ? 'is-active' : ''} title="Add Link">
        <FaLink />
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()} title="Undo">
        <FaUndo />
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()} title="Redo">
        <FaRedo />
      </button>
    </div>
  );
};

export default function RichTextEditor({ content, onChange, onImagePaste }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file && onImagePaste) {
                const reader = new FileReader();
                reader.onload = (e) => onImagePaste(e.target.result);
                reader.readAsDataURL(file);
              }
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  return (
    <div className="rich-editor-container">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="rich-editor-content" />
    </div>
  );
}
