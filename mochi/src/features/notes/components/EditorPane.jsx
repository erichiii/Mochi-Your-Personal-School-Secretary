import { useEffect, useRef, useState } from 'react'
import { Extension } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlock from '@tiptap/extension-code-block'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { BookOpen, Brain, ClipboardCheck, FilePenLine, FileText, Link2, Plus, Download, Sparkles, Upload, Loader2, Check, CheckCheck, AlertCircle } from 'lucide-react'
import useStore from '../../../app/store/useStore'
import EditorToolbar from './EditorToolbar'
import ResourcesPanel from './ResourcesPanel'
import AIPanel, { extractPdfText, parseMarkdownWithMath } from './AIPanel'
import { FontSize } from '../../../shared/extensions/FontSize'
import { generateNotes } from '../../../shared/lib/gemini'
import mochiLoading from '../../../assets/mascots/mochi-loading.png'

const TabIndent = Extension.create({
  name: 'tabIndent',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.can().sinkListItem('listItem')) return this.editor.commands.sinkListItem('listItem')
        if (this.editor.can().sinkListItem('taskItem')) return this.editor.commands.sinkListItem('taskItem')
        return this.editor.commands.insertContent('\t')
      },
      'Shift-Tab': () => {
        if (this.editor.can().liftListItem('listItem')) return this.editor.commands.liftListItem('listItem')
        if (this.editor.can().liftListItem('taskItem')) return this.editor.commands.liftListItem('taskItem')
        return false
      },
    }
  },
})

const PREPARATION_STEPS = [
  { id: 'reading', label: 'Reading your resources' },
  { id: 'notes', label: 'Organizing notes' },
  { id: 'primer', label: 'Creating primer' },
  { id: 'reviewer', label: 'Preparing your reviewer' },
  { id: 'test', label: 'Building your practice test' },
]

export default function EditorPane({ notebookId = null }) {
  const { notes, subjects, activeNoteId, activeSubjectFilter, updateNote, createNote, loadNotes, setSubjectFilter } = useStore()
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null

  const [title, setTitle] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [studyTab, setStudyTab] = useState('notes')
  const [isPreparing, setIsPreparing] = useState(false)
  const [isPreparingMaterials, setIsPreparingMaterials] = useState(false)
  const [preparationStep, setPreparationStep] = useState('reading')
  const [prepareError, setPrepareError] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const saveTimer = useRef(null)
  const titleTimer = useRef(null)
  const savedTimer = useRef(null)
  const lastLoadedId = useRef(null)
  const materialInputRef = useRef(null)
  const titleInputRef = useRef(null)
  const [startWritingNoteId, setStartWritingNoteId] = useState(null)
  const activeNoteRef = useRef(activeNote)
  const activeNoteIdRef = useRef(activeNoteId)
  const activeStudyTabRef = useRef(studyTab)

  useEffect(() => { activeNoteRef.current = activeNote }, [activeNote])
  useEffect(() => { activeNoteIdRef.current = activeNoteId }, [activeNoteId])
  useEffect(() => { activeStudyTabRef.current = studyTab }, [studyTab])

  // Ensure data is fresh on remount (tab switch back to Notes)
  useEffect(() => { loadNotes() }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      UnderlineExt,
      Placeholder.configure({ placeholder: 'Start writing your note... ✍️' }),
      CodeBlock,
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight,
      TextStyle,
      FontSize,
      TabIndent,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const noteId = activeNoteIdRef.current
      if (!noteId) return
      setSaveStatus('saving')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        try {
          const currentNote = activeNoteRef.current
          const tab = activeStudyTabRef.current
          const data = tab === 'notes'
            ? { content: editor.getHTML() }
            : { studyContent: { ...(currentNote?.studyContent ?? {}), [tab]: editor.getHTML() } }
          await updateNote(noteId, data)
          setSaveStatus('saved')
          clearTimeout(savedTimer.current)
          savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('error')
        }
      }, 600)
    },
  })

  // Load content when the active note changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    if (!activeNote) {
      if (lastLoadedId.current !== null) {
        editor.commands.setContent('')
        setTitle('')
        lastLoadedId.current = null
      }
      return
    }

    // Each study view has its own persisted document within the module.
    const loadedKey = `${activeNote.id}:${studyTab}`
    if (lastLoadedId.current !== loadedKey) {
      const content = studyTab === 'notes'
        ? activeNote.content
        : activeNote.studyContent?.[studyTab]
      editor.commands.setContent(content || '', false)
      setTitle(activeNote.title || '')
      lastLoadedId.current = loadedKey
    }
  }, [activeNote, studyTab, editor])

  // Cleanup timers
  useEffect(() => () => {
    clearTimeout(saveTimer.current)
    clearTimeout(titleTimer.current)
    clearTimeout(savedTimer.current)
  }, [])

  const handleTitleChange = (e) => {
    const val = e.target.value
    e.currentTarget.style.height = 'auto'
    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
    setTitle(val)
    if (!activeNoteId) return
    setSaveStatus('saving')
    clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(async () => {
      try {
        await updateNote(activeNoteId, { title: val })
        setSaveStatus('saved')
        clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }

  useEffect(() => {
    const input = titleInputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight}px`
  }, [title])

  const handleExportPDF = () => {
    if (!editor || !activeNote) return
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const subject = subjects.find((s) => s.id === activeNote.subjectId)
    const dateStr = activeNote.updatedAt
      ? new Date(activeNote.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : ''
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title || 'Untitled')}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.75;color:#2d2030;max-width:720px;margin:0 auto;padding:56px 48px}
  .meta{margin-bottom:28px}
  .subject{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#999;margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;background:${subject?.color || '#ccc'}}
  h1.title{font-size:30px;font-weight:800;line-height:1.2;margin:0 0 6px;color:#1a1020}
  .date{font-size:12px;color:#bbb;margin-top:4px}
  hr{border:none;border-top:1px solid #eee;margin:24px 0}
  .content p{margin:0 0 1em}
  .content p:last-child{margin-bottom:0}
  .content h1{font-size:24px;font-weight:700;margin:1.6em 0 .5em}
  .content h2{font-size:20px;font-weight:700;margin:1.4em 0 .4em}
  .content h3{font-size:17px;font-weight:700;margin:1.2em 0 .4em}
  .content ul,.content ol{padding-left:1.6em;margin:.5em 0}
  .content li{margin-bottom:.25em}
  .content strong{font-weight:700}
  .content em{font-style:italic}
  .content u{text-decoration:underline}
  .content s{text-decoration:line-through}
  .content code{font-family:'Courier New',monospace;font-size:.88em;background:#f5f0fa;padding:2px 6px;border-radius:4px;color:#6b5fa8}
  .content pre{background:#f5f0fa;border-radius:8px;padding:16px 20px;overflow-x:auto;margin:1em 0}
  .content pre code{background:none;padding:0;color:#3d2c35}
  .content blockquote{border-left:4px solid #c9b8f5;margin:1em 0;padding:4px 16px;color:#666;font-style:italic}
  .content mark{background:#fff3a3;padding:0 2px;border-radius:2px}
  .content a{color:#6b5fa8}
  .content img{max-width:100%;border-radius:8px;margin:1em 0;display:block}
  .content table{border-collapse:collapse;width:100%;margin:1em 0}
  .content th,.content td{border:1px solid #e0d8f0;padding:8px 12px;text-align:left}
  .content th{background:#f5f0fa;font-weight:700}
  .content ul[data-type="taskList"]{list-style:none;padding-left:0}
  .content ul[data-type="taskList"]>li{display:flex;align-items:flex-start;gap:8px;margin-bottom:.3em}
  @media print{body{padding:0}@page{margin:.75in;size:A4}}
</style></head><body>
<div class="meta">
  ${subject ? `<div class="subject"><span class="dot"></span>${esc(subject.name)}</div>` : ''}
  <h1 class="title">${esc(title || 'Untitled')}</h1>
  ${dateStr ? `<div class="date">Last updated ${dateStr}</div>` : ''}
</div>
<hr>
<div class="content">${editor.getHTML()}</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`)
    win.document.close()
  }

  const handleImageUpload = () => {
    if (!editor) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        editor.chain().focus().setImage({ src: ev.target.result }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleStartFromScratch = () => {
    setStudyTab('notes')
    if (activeNote) {
      setStartWritingNoteId(activeNote.id)
      return
    }
    createNote(activeSubjectFilter ? { subjectId: activeSubjectFilter } : {}).then((id) => setStartWritingNoteId(id))
  }

  const handleMaterialUpload = async (event) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    setIsPreparing(true)
    setIsPreparingMaterials(true)
    setPreparationStep('reading')
    setPrepareError('')

    const moduleSubjectId = notebookId ?? activeSubjectFilter ?? null
    const id = activeNote?.id ?? await createNote({
      subjectId: moduleSubjectId,
      title: files[0].name.replace(/\.[^.]+$/, ''),
    })
    if (moduleSubjectId) setSubjectFilter(moduleSubjectId)

    try {
      const materials = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (loadEvent) => resolve({
          id: crypto.randomUUID(),
          type: 'file',
          name: file.name,
          mimeType: file.type,
          dataUrl: loadEvent.target.result,
        })
        reader.onerror = () => reject(new Error(`Couldn't add ${file.name}. Please try again.`))
        reader.readAsDataURL(file)
      })))

      const sourceParts = await Promise.all(files.map(async (file) => {
        try {
          if (file.type === 'application/pdf') return await extractPdfText(file)
          if (file.type.startsWith('image/')) return ''
          return await file.text()
        } catch {
          return ''
        }
      }))

      await updateNote(id, { resources: [...(activeNote?.resources ?? []), ...materials] })
      setPreparationStep('notes')
      const source = sourceParts.filter(Boolean).join('\n\n---\n\n').trim() || `Module: ${activeNote?.title || files[0].name.replace(/\.[^.]+$/, '')}\nMaterials: ${files.map((file) => file.name).join(', ')}`
      const notesMarkdown = await generateNotes(source, 'general')
      const content = parseMarkdownWithMath(notesMarkdown)
      activeNoteRef.current = { ...(activeNoteRef.current ?? {}), id, content, resources: [...(activeNote?.resources ?? []), ...materials] }
      await updateNote(id, { content })

      const studyContent = {}
      for (const step of ['primer', 'reviewer', 'test']) {
        setPreparationStep(step)
        const markdown = await generateNotes(source, step)
        studyContent[step] = parseMarkdownWithMath(markdown)
        activeNoteRef.current = { ...activeNoteRef.current, studyContent: { ...studyContent } }
        await updateNote(id, { studyContent: { ...studyContent } })
      }

      editor?.commands.setContent(content, false)
      setStudyTab('notes')
      setStartWritingNoteId(id)
    } catch (error) {
      setPrepareError(error.message || "Couldn't add the selected materials. Please try again.")
    } finally {
      setIsPreparing(false)
      setIsPreparingMaterials(false)
    }
    event.target.value = ''
  }

  const hasStoredContent = Boolean(activeNote?.content?.replace(/<[^>]+>/g, '').trim() || activeNote?.resources?.length || Object.values(activeNote?.studyContent ?? {}).some(Boolean))
  const showEmptyModuleState = Boolean(activeSubjectFilter && (!activeNote || (!hasStoredContent && startWritingNoteId !== activeNote.id)))
  const showEditor = Boolean(activeNote && !showEmptyModuleState)
  const activeModule = subjects.find((subject) => subject.id === activeSubjectFilter)
  const tabs = [
    { id: 'notes', label: 'Notes', Icon: FileText },
    { id: 'primer', label: 'Primer', Icon: BookOpen },
    { id: 'reviewer', label: 'Reviewer', Icon: Brain },
    { id: 'test', label: 'Test', Icon: ClipboardCheck },
    { id: 'resources', label: 'Resources', Icon: Link2 },
  ]
  const handleStudyTab = async (tab) => {
    if (!activeNote || isPreparing) return
    setStudyTab(tab)
    setPrepareError('')

    if (tab === 'notes' || tab === 'resources' || activeNote.studyContent?.[tab]) return

    setIsPreparing(true)
    try {
      const notesSource = editor?.getText().trim() || activeNote.content?.replace(/<[^>]+>/g, ' ').trim()
      const resourceSource = activeNote.resources?.map((resource) => resource.name || resource.label).filter(Boolean).join(', ')
      const source = notesSource || `Module: ${activeNote.title || activeModule?.name || 'Untitled'}${resourceSource ? `\nResources: ${resourceSource}` : ''}`
      const markdown = await generateNotes(source, tab)
      const content = parseMarkdownWithMath(markdown)
      const studyContent = { ...(activeNote.studyContent ?? {}), [tab]: content }
      activeNoteRef.current = { ...activeNote, studyContent }
      await updateNote(activeNote.id, { studyContent })
      editor?.commands.setContent(content, false)
    } catch (error) {
      setPrepareError(error.message || `Mochi couldn't prepare this ${tab} yet.`)
    } finally {
      setIsPreparing(false)
    }
  }

  const preparationTitle = activeNote?.title || activeModule?.name || 'your module'
  const getPreparationStatus = (step) => {
    const currentIndex = PREPARATION_STEPS.findIndex((item) => item.id === preparationStep)
    const stepIndex = PREPARATION_STEPS.findIndex((item) => item.id === step.id)
    if (stepIndex === currentIndex) return 'current'
    if (stepIndex < currentIndex) return 'complete'
    return 'pending'
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* ── Active note header ─────────────────────────────── */}
      {showEditor && (
        <div className="notes-study-header">
          <textarea
            ref={titleInputRef}
            value={title}
            onChange={handleTitleChange}
            placeholder={activeModule?.name || 'Untitled'}
            className="notes-study-header__title outline-none"
            rows={1}
          />
          <div className="notes-study-header__meta">
            <button
              onClick={handleExportPDF}
              title="Export as PDF"
              className="notes-study-header__export"
            >
              <Download size={16} />
              Export to PDF
            </button>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--mochi-text-muted)' }}>
              {saveStatus === 'saving' && <><Loader2 size={10} className="animate-spin" />Saving…</>}
              {saveStatus === 'saved' && <><CheckCheck size={10} style={{ color: 'var(--mochi-mint-dark)' }} /><span style={{ color: 'var(--mochi-mint-dark)' }}>Saved</span></>}
              {saveStatus === 'error' && <><AlertCircle size={10} style={{ color: '#E05050' }} /><span style={{ color: '#E05050' }}>Save failed</span></>}
            </span>
          </div>
          <nav className="notes-study-tabs" aria-label="Study views">
            {tabs.map(({ id, label, Icon }) => <button key={id} type="button" className={studyTab === id ? 'is-active' : ''} onClick={() => handleStudyTab(id)}><Icon size={20} />{label}</button>)}
          </nav>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────── */}
      {showEditor && studyTab !== 'resources' && (
        <EditorToolbar
          editor={editor}
          onImageUpload={handleImageUpload}
          aiOpen={aiOpen}
          onToggleAI={() => setAiOpen((v) => !v)}
        />
      )}

      {/* ── Editor + AI panel row ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor content — ALWAYS mounted so Tiptap keeps its DOM node */}
        <div className="notes-editor-canvas flex-1 overflow-y-auto" style={{ display: showEditor && studyTab !== 'resources' ? 'block' : 'none' }}>
          <EditorContent editor={editor} />
        </div>

        {showEditor && studyTab === 'resources' && (
          <div className="notes-resources-view flex-1 overflow-y-auto">
            <ResourcesPanel noteId={activeNoteId} resources={activeNote.resources ?? []} inline showTrigger={false} />
          </div>
        )}

        {/* Empty state — shown when no note selected */}
        {showEmptyModuleState && (
          <div className="flex-1 flex items-center justify-center">
            <div className="notes-empty-module-state">
              <img src={mochiLoading} alt="Mochi ready to study on a stack of books" />
              <h2>Let's start studying!</h2>
              <p>Add your lecture materials and Mochi will prepare this module for you.</p>
              <input ref={materialInputRef} type="file" className="sr-only" onChange={handleMaterialUpload} accept=".txt,.md,.csv,.pdf,image/*" multiple />
              <button type="button" className="notes-empty-module-state__upload" onClick={() => materialInputRef.current?.click()}><Upload size={21} /> Upload Materials</button>
              <div className="notes-empty-module-state__divider"><span>or</span></div>
              <button type="button" className="notes-empty-module-state__scratch" onClick={handleStartFromScratch}><FilePenLine size={20} /> Start from scratch</button>
            </div>
          </div>
        )}

        {!activeNote && !activeSubjectFilter && (
          <div className="flex-1 flex items-center justify-center"><div className="text-center"><FileText size={48} className="mx-auto mb-4" style={{ color: 'var(--mochi-border)' }} /><p className="text-base font-semibold" style={{ color: 'var(--mochi-text-soft)' }}>Select a note to open it</p></div></div>
        )}

        {/* AI panel */}
        {showEditor && aiOpen && (
          <AIPanel editor={editor} noteId={activeNoteId} onClose={() => setAiOpen(false)} initialMode={studyTab === 'reviewer' ? 'reviewer' : studyTab === 'primer' ? 'primer' : 'general'} />
        )}
        {showEditor && prepareError && !isPreparing && (
          <div className="notes-module-preparing notes-module-preparing--error" role="alert">
            <div><strong>Couldn't prepare this {studyTab}.</strong><span>{prepareError}</span></div>
          </div>
        )}
      </div>
      {isPreparingMaterials && (
        <div className="notes-module-preparing" role="status" aria-live="polite">
          <div className="notes-module-preparing__card">
            <img src={mochiLoading} alt="Mochi preparing your study materials" />
            <h2>Mochi is preparing {preparationTitle}...</h2>
            <ul>
              {PREPARATION_STEPS.map((step) => {
                const status = getPreparationStatus(step)
                return <li key={step.id} className={`is-${status}`}>
                  <span>{status === 'complete' ? <Check size={15} strokeWidth={3} /> : status === 'current' ? <Loader2 size={15} className="animate-spin" /> : null}</span>
                  {step.label}
                </li>
              })}
            </ul>
          </div>
        </div>
      )}
      {isPreparing && !isPreparingMaterials && (
        <div className="notes-module-preparing notes-module-preparing--single" role="status" aria-live="polite">
          <div className="notes-module-preparing__card">
            <Loader2 size={28} className="animate-spin" />
            <h2>Mochi is creating your {studyTab}...</h2>
          </div>
        </div>
      )}
      {showEditor && <button type="button" className="notes-mochi-help" onClick={() => setAiOpen((open) => !open)} title="Let Mochi help"><Sparkles size={17} /> Let Mochi help</button>}
    </div>
  )
}
