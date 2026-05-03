import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { CheckOutlined, LoadingOutlined } from '@ant-design/icons';
import { updateApplication } from '../../api';
import './RichNotesEditor.css';

const MAX_CHARS = 3000;

type ToolbarButtonProps = {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
};

const ToolbarButton = ({ active, onClick, title, children }: ToolbarButtonProps) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors ${
      active
        ? 'bg-sky-100 text-sky-600'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
    }`}
  >
    {children}
  </button>
);

const Divider = () => <div className="mx-1 h-4 w-px bg-slate-200" />;

type Props = {
  applicationId: number;
  initialNotes: string;
  onSaved?: (notes: string) => void;
};

const RichNotesEditor = ({ applicationId, initialNotes, onSaved }: Props) => {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistNotes = useCallback(
    async (html: string) => {
      setSaveState('saving');
      try {
        await updateApplication(applicationId, { notes: html });
        setSaveState('saved');
        onSaved?.(html);
        setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('idle');
      }
    },
    [applicationId, onSaved]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: {},
        codeBlock: {},
        blockquote: {},
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Add notes, key points, interview prep, or anything useful…',
      }),
      CharacterCount.configure({ limit: MAX_CHARS }),
    ],
    content: initialNotes || '',
    onUpdate: ({ editor: ed }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void persistNotes(ed.getHTML());
      }, 1200);
    },
    editorProps: {
      attributes: {
        class: 'rich-notes-editor-body outline-none',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = initialNotes || '';
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
      setSaveState('idle');
    }
  }, [applicationId, initialNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  const charCount = editor.storage.characterCount?.characters?.() ?? 0;
  const nearLimit = charCount > MAX_CHARS * 0.85;

  return (
    <div className="flex flex-col gap-0">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Notes
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Jot down anything useful about this application.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {saveState === 'saving' && (
            <span className="flex items-center gap-1 text-slate-400">
              <LoadingOutlined className="text-[11px]" /> Saving…
            </span>
          )}
          {saveState === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckOutlined className="text-[11px]" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Editor card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow focus-within:border-sky-300 focus-within:shadow-md focus-within:shadow-sky-50">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 px-3 py-2">
          {/* Text style */}
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (⌘B)"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (⌘I)"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (⌘U)"
          >
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <span className="line-through">S</span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
              <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z" />
            </svg>
          </ToolbarButton>

          <Divider />

          {/* Headings */}
          <ToolbarButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <span className="text-[11px] font-bold">H2</span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <span className="text-[11px] font-bold">H3</span>
          </ToolbarButton>

          <Divider />

          {/* Lists */}
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path fillRule="evenodd" d="M2 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3.5-1.5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9zm0 4a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9zm0 4a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9zM2 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588 0 .954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.306.236 0 .4-.127.4-.314 0-.193-.172-.312-.422-.312H1.714v-.461zM2.167 8h-.458V7.08h-.299v-.4c.168 0 .313-.04.374-.176h.383V8zM1.4 3.685h.596v.035c0 .409.316.675.79.675.434 0 .765-.264.765-.676 0-.41-.33-.683-.784-.683-.262 0-.5.09-.63.228h-.428V2H3.42v.476H1.82v.514h.073c.119-.16.324-.258.59-.258.615 0 1.013.38 1.013.97 0 .592-.401.977-1.04.977-.621 0-1.063-.352-1.056-.994z" />
            </svg>
          </ToolbarButton>

          <Divider />

          {/* Block */}
          <ToolbarButton
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M2.5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm5 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6zm-5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm.79-5.373c.112-.078.26-.17.444-.275L3.524 6c-.122.074-.272.17-.452.287-.18.117-.35.26-.51.428a2.425 2.425 0 0 0-.398.562c-.11.207-.164.438-.164.692 0 .36.072.65.217.873.144.219.385.328.72.328.215 0 .383-.07.504-.211a.697.697 0 0 0 .188-.463c0-.23-.07-.404-.211-.521-.137-.121-.326-.182-.568-.182h-.282c.024-.203.065-.37.123-.498a1.38 1.38 0 0 1 .252-.37 1.94 1.94 0 0 1 .346-.298zm2.167 0c.113-.078.262-.17.445-.275L5.692 6c-.122.074-.272.17-.452.287-.18.117-.35.26-.51.428a2.425 2.425 0 0 0-.398.562c-.11.207-.164.438-.164.692 0 .36.072.65.217.873.144.219.385.328.72.328.215 0 .383-.07.504-.211a.697.697 0 0 0 .188-.463c0-.23-.07-.404-.211-.521-.137-.121-.326-.182-.568-.182h-.282a1.75 1.75 0 0 1 .118-.492c.058-.13.144-.254.257-.375a1.94 1.94 0 0 1 .346-.3z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
              <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z" />
            </svg>
          </ToolbarButton>
        </div>

        {/* Editor body */}
        <div className="min-h-[200px] px-4 py-3">
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-50 px-4 py-2">
          <span className={`text-[11px] ${nearLimit ? 'text-amber-400' : 'text-slate-300'}`}>
            {charCount} / {MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RichNotesEditor;
