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
import { BookOpen, Brain, ClipboardCheck, FilePenLine, FileText, Link2, Plus, Download, Sparkles, Upload, Loader2, Check, CheckCheck, AlertCircle, MoreVertical, X } from 'lucide-react'
import useStore from '../../../app/store/useStore'
import EditorToolbar from './EditorToolbar'
import ResourcesPanel from './ResourcesPanel'
import AIPanel, { extractPdfText, parseMarkdownWithMath } from './AIPanel'
import ConfirmModal from '../../../shared/components/ConfirmModal'
import { FontSize } from '../../../shared/extensions/FontSize'
import { generateNotes } from '../../../shared/lib/gemini'
import mochiLoading from '../../../assets/mascots/mochi-loading.png'
import mochiNotesLoading from '../../../../../ui-revamp/mochi_assets/mochi_notes_loading.png'

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

const textFromHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

const PREPARATION_STEPS = [
  { id: 'reading', label: 'Reading your resources' },
  { id: 'notes', label: 'Organizing notes' },
  { id: 'primer', label: 'Creating primer' },
  { id: 'reviewer', label: 'Preparing your reviewer' },
  { id: 'test', label: 'Building your practice test' },
]

const tabLabel = (id) => ({
  primer: 'Primer',
  reviewer: 'Reviewer',
  test: 'Practice Test',
}[id] ?? id)

export default function EditorPane({ notebookId = null }) {
  const { notes, subjects, activeNoteId, activeSubjectFilter, updateNote, createNote, loadNotes, setSubjectFilter } = useStore()
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null

  const [title, setTitle] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [studyTab, setStudyTab] = useState('notes')
  const [addTabOpen, setAddTabOpen] = useState(false)
  const [newTabName, setNewTabName] = useState('')
  const [tabError, setTabError] = useState('')
  const [tabMenuId, setTabMenuId] = useState(null)
  const [renamingTabId, setRenamingTabId] = useState(null)
  const [renameTabName, setRenameTabName] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [sourceMessage, setSourceMessage] = useState('')
  const [uploadChoices, setUploadChoices] = useState(null)
  const [selectedOutputs, setSelectedOutputs] = useState([])
  const [confirmAction, setConfirmAction] = useState(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [preparationStep, setPreparationStep] = useState('reading')
  const [preparingSteps, setPreparingSteps] = useState([])
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
            : currentNote?.moduleTabs?.some((item) => item.id === tab && item.kind === 'custom')
              ? { customTabContent: { ...(currentNote?.customTabContent ?? {}), [tab]: editor.getHTML() } }
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
      const isCustomTab = activeNote.moduleTabs?.some((item) => item.id === studyTab && item.kind === 'custom')
      const content = studyTab === 'notes'
        ? activeNote.content
        : isCustomTab
          ? activeNote.customTabContent?.[studyTab]
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
    const moduleSubjectId = notebookId ?? activeSubjectFilter ?? null
    createNote({ subjectId: moduleSubjectId, moduleTabs: [] }).then((id) => {
      setStartWritingNoteId(id)
      if (moduleSubjectId) setSubjectFilter(moduleSubjectId)
    })
  }

  const handleMaterialUpload = async (event) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    setPrepareError('')

    const moduleSubjectId = notebookId ?? activeSubjectFilter ?? null
    const id = activeNote?.id ?? await createNote({
      subjectId: moduleSubjectId,
      title: files[0].name.replace(/\.[^.]+$/, ''),
      moduleTabs: [],
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

      const resources = materials.map((material, index) => ({ ...material, text: sourceParts[index] || '' }))
      const existingResources = activeNote?.id === id ? (activeNote.resources ?? []) : []
      const source = sourceParts.filter(Boolean).join('\n\n---\n\n').trim()
      const nextNote = { ...(activeNoteRef.current ?? {}), id, resources: [...existingResources, ...resources] }
      activeNoteRef.current = nextNote
      await updateNote(id, { resources: nextNote.resources })
      setStartWritingNoteId(id)
      setStudyTab('resources')
      setUploadChoices({ noteId: id, source })
      setSelectedOutputs([])
    } catch (error) {
      setPrepareError(error.message || "Couldn't add the selected materials. Please try again.")
    }
    event.target.value = ''
  }

  const moduleSubjectId = notebookId ?? activeSubjectFilter ?? null
  const hasStoredContent = Boolean(textFromHtml(activeNote?.content) || activeNote?.resources?.length || Object.values(activeNote?.studyContent ?? {}).some(Boolean) || Object.values(activeNote?.customTabContent ?? {}).some(Boolean))
  const showEmptyModuleState = Boolean(moduleSubjectId && (!activeNote || (!hasStoredContent && startWritingNoteId !== activeNote.id)))
  const showEditor = Boolean(activeNote && !showEmptyModuleState)
  const activeModule = subjects.find((subject) => subject.id === moduleSubjectId)
  const savedTabs = activeNote?.moduleTabs ?? []
  const customTabs = savedTabs.filter((tab) => tab.kind === 'custom')
  const mochiTabs = ['primer', 'reviewer', 'test']
    .filter((id) => savedTabs.some((tab) => tab.id === id && tab.kind === 'mochi') || activeNote?.studyContent?.[id])
    .map((id) => ({ id, label: tabLabel(id), kind: 'mochi', Icon: id === 'primer' ? BookOpen : id === 'reviewer' ? Brain : ClipboardCheck }))
  const tabs = [
    { id: 'notes', label: 'Notes', kind: 'default', Icon: FileText },
    ...customTabs.map((tab) => ({ ...tab, Icon: FilePenLine })),
    ...mochiTabs,
    ...(activeNote?.resources?.length ? [{ id: 'resources', label: 'Resources', kind: 'resources', Icon: Link2 }] : []),
  ]

  const getSource = (note = activeNote, preferredSource = '') => {
    const liveEditorText = note?.id === activeNote?.id ? editor?.getText().trim() : ''
    const noteText = liveEditorText || textFromHtml(note?.content)
    const resourceText = (note?.resources ?? []).map((resource) => resource.text || '').filter(Boolean).join('\n\n---\n\n')
    return preferredSource || [noteText, resourceText].filter(Boolean).join('\n\n---\n\n').trim()
  }

  const hasEnoughSource = (source) => source.trim().length >= 40

  const handleStudyTab = (tab) => {
    if (!activeNote || isPreparing) return
    setStudyTab(tab)
    setPrepareError('')
    setSourceMessage('')
    setHelpOpen(false)
  }

  const addCustomTab = async () => {
    const label = newTabName.trim()
    const names = tabs.map((tab) => tab.label.toLowerCase())
    if (!label) { setTabError('Give your tab a name.'); return }
    if (names.includes(label.toLowerCase())) { setTabError('A tab with that name already exists.'); return }
    const id = `custom-${crypto.randomUUID()}`
    const moduleTabs = [...savedTabs, { id, label, kind: 'custom' }]
    await updateNote(activeNote.id, { moduleTabs })
    activeNoteRef.current = { ...activeNote, moduleTabs }
    setStudyTab(id)
    setNewTabName('')
    setTabError('')
    setAddTabOpen(false)
  }

  const saveCustomTabName = async () => {
    const label = renameTabName.trim()
    const names = tabs.filter((tab) => tab.id !== renamingTabId).map((tab) => tab.label.toLowerCase())
    if (!label) { setTabError('Give your tab a name.'); return }
    if (names.includes(label.toLowerCase())) { setTabError('A tab with that name already exists.'); return }
    const moduleTabs = savedTabs.map((tab) => tab.id === renamingTabId ? { ...tab, label } : tab)
    await updateNote(activeNote.id, { moduleTabs })
    activeNoteRef.current = { ...activeNote, moduleTabs }
    setRenamingTabId(null)
    setRenameTabName('')
    setTabError('')
  }

  const deleteCustomTab = async (id) => {
    const moduleTabs = savedTabs.filter((tab) => tab.id !== id)
    const customTabContent = { ...(activeNote.customTabContent ?? {}) }
    delete customTabContent[id]
    await updateNote(activeNote.id, { moduleTabs, customTabContent })
    activeNoteRef.current = { ...activeNote, moduleTabs, customTabContent }
    if (studyTab === id) setStudyTab('notes')
    setTabMenuId(null)
  }

  const createMochiTab = async (kind, sourceOverride = '') => {
    if (!activeNote) return
    if (mochiTabs.some((tab) => tab.id === kind)) { setStudyTab(kind); setHelpOpen(false); return }
    const source = getSource(activeNote, sourceOverride)
    if (!hasEnoughSource(source)) { setSourceMessage('Mochi needs notes or uploaded materials first.'); setHelpOpen(false); return }

    setIsPreparing(true)
    setPreparingSteps([kind])
    setPreparationStep(kind)
    setPrepareError('')
    try {
      const markdown = await generateNotes(source, kind)
      const content = parseMarkdownWithMath(markdown)
      const studyContent = { ...(activeNote.studyContent ?? {}), [kind]: content }
      const moduleTabs = savedTabs.some((tab) => tab.id === kind)
        ? savedTabs
        : [...savedTabs, { id: kind, label: tabLabel(kind), kind: 'mochi' }]
      activeNoteRef.current = { ...activeNote, studyContent, moduleTabs }
      await updateNote(activeNote.id, { studyContent, moduleTabs })
      setStudyTab(kind)
      setHelpOpen(false)
    } catch (error) {
      setPrepareError(error.message || `Mochi couldn't prepare this ${tabLabel(kind).toLowerCase()} yet.`)
    } finally {
      setIsPreparing(false)
    }
  }

  const organizeNotes = async (sourceOverride = '') => {
    if (!activeNote) return
    const source = getSource(activeNote, sourceOverride)
    if (!hasEnoughSource(source)) { setSourceMessage('Mochi needs notes or uploaded materials first.'); setHelpOpen(false); return }
    setIsPreparing(true)
    setPreparingSteps(['notes'])
    setPreparationStep('notes')
    setPrepareError('')
    try {
      const markdown = await generateNotes(source, 'general')
      const content = parseMarkdownWithMath(markdown)
      activeNoteRef.current = { ...activeNote, content }
      await updateNote(activeNote.id, { content })
      editor?.commands.setContent(content, false)
      setStudyTab('notes')
      setHelpOpen(false)
    } catch (error) {
      setPrepareError(error.message || "Mochi couldn't organize these notes yet.")
    } finally {
      setIsPreparing(false)
    }
  }

  const requestOrganizeNotes = (sourceOverride = '') => {
    if (textFromHtml(activeNote?.content)) {
      setConfirmAction({
        title: 'Replace the current Notes tab?',
        message: 'Mochi will replace the current Notes tab with an organized version. Your existing notes will not be changed unless you continue.',
        label: 'Organize notes',
        run: () => organizeNotes(sourceOverride),
      })
      return
    }
    organizeNotes(sourceOverride)
  }

  const runUploadOutputs = async (choices, source) => {
    let currentNote = activeNoteRef.current ?? activeNote
    if (!currentNote) return
    setUploadChoices(null)
    setSelectedOutputs([])
    setIsPreparing(true)
    const orderedChoices = PREPARATION_STEPS.map((step) => step.id).filter((id) => choices.includes(id))
    setPreparingSteps(orderedChoices)
    setPreparationStep(orderedChoices[0] ?? 'notes')
    setPrepareError('')
    try {
      if (choices.includes('notes')) {
        setPreparationStep('notes')
        const markdown = await generateNotes(source, 'general')
        const content = parseMarkdownWithMath(markdown)
        currentNote = { ...currentNote, content }
        activeNoteRef.current = currentNote
        await updateNote(currentNote.id, { content })
      }
      for (const kind of orderedChoices.filter((item) => item !== 'notes')) {
        if (currentNote.studyContent?.[kind]) continue
        setPreparationStep(kind)
        const markdown = await generateNotes(source, kind)
        const content = parseMarkdownWithMath(markdown)
        const studyContent = { ...(currentNote.studyContent ?? {}), [kind]: content }
        const moduleTabs = currentNote.moduleTabs?.some((tab) => tab.id === kind)
          ? currentNote.moduleTabs
          : [...(currentNote.moduleTabs ?? []), { id: kind, label: tabLabel(kind), kind: 'mochi' }]
        currentNote = { ...currentNote, studyContent, moduleTabs }
        activeNoteRef.current = currentNote
        await updateNote(currentNote.id, { studyContent, moduleTabs })
      }
      setStudyTab(orderedChoices.includes('notes') ? 'notes' : orderedChoices[0])
    } catch (error) {
      setPrepareError(error.message || "Mochi couldn't create those study materials yet.")
    } finally {
      setIsPreparing(false)
    }
  }

  const generateUploadOutputs = (choice) => {
    const pending = uploadChoices
    if (!pending || !activeNote) return
    const source = getSource(activeNote, pending.source)
    if (!hasEnoughSource(source)) { setSourceMessage('Mochi needs notes or uploaded materials first.'); return }
    const choices = Array.isArray(choice) ? choice : choice === 'all' ? ['notes', 'primer', 'reviewer', 'test'] : [choice]
    if (choices.includes('notes') && (editor?.getText().trim() || textFromHtml(activeNote.content))) {
      setConfirmAction({
        title: 'Replace the current Notes tab?',
        message: 'Mochi will replace the current Notes tab with generated notes from these materials.',
        label: 'Generate notes',
        run: () => runUploadOutputs(choices, source),
      })
      return
    }
    runUploadOutputs(choices, source)
  }

  const toggleOutput = (output) => {
    setSelectedOutputs((selected) => selected.includes(output)
      ? selected.filter((item) => item !== output)
      : [...selected, output])
  }

  const preparationTitle = activeNote?.title || activeModule?.name || 'your module'
  const getPreparationStatus = (step) => {
    const currentIndex = preparingSteps.indexOf(preparationStep)
    const stepIndex = preparingSteps.indexOf(step.id)
    if (stepIndex === currentIndex) return 'current'
    if (stepIndex < currentIndex) return 'complete'
    return 'pending'
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <input ref={materialInputRef} type="file" className="sr-only" onChange={handleMaterialUpload} accept=".txt,.md,.csv,.pdf,image/*" multiple />
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
            {tabs.map(({ id, label, Icon, kind }) => (
              <div className="notes-study-tab" key={id}>
                {renamingTabId === id ? (
                  <form className="notes-study-tab__rename" onSubmit={(event) => { event.preventDefault(); saveCustomTabName() }}>
                    <input autoFocus value={renameTabName} onChange={(event) => setRenameTabName(event.target.value)} onBlur={saveCustomTabName} aria-label="Tab name" />
                  </form>
                ) : (
                  <button type="button" className={studyTab === id ? 'is-active' : ''} onClick={() => handleStudyTab(id)}><Icon size={18} />{label}</button>
                )}
                {kind === 'custom' && renamingTabId !== id && (
                  <>
                    <button type="button" className="notes-study-tab__menu" onClick={(event) => { event.stopPropagation(); setTabMenuId(tabMenuId === id ? null : id) }} aria-label={`Options for ${label}`}><MoreVertical size={15} /></button>
                    {tabMenuId === id && <div className="notes-study-tab__dropdown"><button type="button" onClick={() => { setRenamingTabId(id); setRenameTabName(label); setTabMenuId(null) }}>Rename</button><button type="button" onClick={() => deleteCustomTab(id)}>Delete</button></div>}
                  </>
                )}
              </div>
            ))}
            <div className="notes-study-tabs__add">
              {addTabOpen ? (
                <form onSubmit={(event) => { event.preventDefault(); addCustomTab() }}>
                  <input autoFocus value={newTabName} onChange={(event) => { setNewTabName(event.target.value); setTabError('') }} placeholder="Tab name" aria-label="New tab name" />
                  <button type="submit" aria-label="Create tab"><Check size={15} /></button>
                  <button type="button" onClick={() => { setAddTabOpen(false); setNewTabName(''); setTabError('') }} aria-label="Cancel"><X size={15} /></button>
                </form>
              ) : <button type="button" className="notes-study-tabs__add-button" onClick={() => { setAddTabOpen(true); setTabError('') }}><Plus size={15} /> Add tab</button>}
            </div>
          </nav>
          {tabError && <p className="notes-study-tabs__error" role="alert">{tabError}</p>}
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
              <h2>Let's start studying</h2>
              <p>Start with a clean notes tab or add your lecture materials to let Mochi prepare your notes for you.</p>
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
      {showEditor && helpOpen && (
        <div className="notes-mochi-menu fade-in" role="dialog" aria-label="Let Mochi help">
          <div className="notes-mochi-menu__heading"><Sparkles size={15} /> Let Mochi help</div>
          <button type="button" onClick={() => requestOrganizeNotes()}>Organize my notes</button>
          <button type="button" onClick={() => createMochiTab('primer')}>Create primer from my notes/resources</button>
          <button type="button" onClick={() => createMochiTab('reviewer')}>Create reviewer from my notes/resources</button>
          <button type="button" onClick={() => createMochiTab('test')}>Create practice test from my notes/resources</button>
          <button type="button" onClick={() => { setHelpOpen(false); materialInputRef.current?.click() }}><Upload size={14} /> Add resources</button>
        </div>
      )}
      {showEditor && sourceMessage && (
        <div className="notes-source-message fade-in" role="status"><AlertCircle size={15} />{sourceMessage}<button type="button" onClick={() => setSourceMessage('')} aria-label="Dismiss message"><X size={15} /></button></div>
      )}
      {uploadChoices && (
        <div className="notes-upload-choices" role="dialog" aria-modal="true" aria-label="Choose Mochi outputs">
          <div className="notes-upload-choices__card">
            <button type="button" className="notes-upload-choices__close" onClick={() => setUploadChoices(null)} aria-label="Choose later"><X size={18} /></button>
            <img src={mochiNotesLoading} alt="Mochi organizing study notes" />
            <h2>Your materials are attached</h2>
            <p>What would you like Mochi to create? You can always create more later.</p>
            <div>
              {[
                ['notes', 'Generate notes'],
                ['primer', 'Generate primer'],
                ['reviewer', 'Generate reviewer'],
                ['test', 'Generate practice test'],
              ].map(([id, label]) => <button key={id} type="button" className={selectedOutputs.includes(id) ? 'is-selected' : ''} onClick={() => toggleOutput(id)} aria-pressed={selectedOutputs.includes(id)}>{label}</button>)}
            </div>
            <button type="button" className="notes-upload-choices__selected" disabled={selectedOutputs.length === 0} onClick={() => generateUploadOutputs(selectedOutputs)}>Generate selected</button>
            <button type="button" className="notes-upload-choices__all" onClick={() => generateUploadOutputs('all')}>Generate all</button>
            <button type="button" className="notes-upload-choices__later" onClick={() => setUploadChoices(null)}>I’ll decide later</button>
          </div>
        </div>
      )}
      {confirmAction && <ConfirmModal
        title={confirmAction.title}
        message={confirmAction.message}
        confirmLabel={confirmAction.label}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => { const action = confirmAction.run; setConfirmAction(null); action() }}
      />}
      {isPreparing && (
        <div className="notes-module-preparing" role="status" aria-live="polite">
          <div className="notes-module-preparing__card">
            <img src={mochiLoading} alt="Mochi preparing your study materials" />
            <h2>Mochi is preparing {preparationTitle}...</h2>
            <ul>
              {PREPARATION_STEPS.filter((step) => preparingSteps.includes(step.id)).map((step) => {
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
      {showEditor && <button type="button" className="notes-mochi-help" onClick={() => { setHelpOpen((open) => !open); setSourceMessage('') }} title="Let Mochi help" aria-expanded={helpOpen}><Sparkles size={17} /> Let Mochi help</button>}
    </div>
  )
}
