import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  FolderPlus,
  Folder,
  FolderOpen,
  Pencil,
  Trash2,
  BookOpen,
  MoreVertical,
  ChevronRight,
  Layers,
  X,
  ArrowLeft,
  GripVertical,
  Home,
  Search,
  ListX,
  Download,
  FolderInput,
  Palette,
  Loader2,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useFlashcardStore } from '../context/FlashcardContext'
import { updateSessionMeta, deleteSessionFromSupabase } from '../lib/sessions'
import { loadFoldersFromSupabase, syncFoldersToSupabase } from '../lib/folders'
import ConfirmDialog from '../components/Layout/ConfirmDialog'
import ContextMenu, { type ContextMenuState, type ContextMenuItem } from '../components/Layout/ContextMenu'
import { buildMoveTree as buildFolderTree } from '../lib/folderTree'
import { COLOR_TOKENS, colorClasses } from '../lib/colors'
import { exportSession } from '../lib/export'
import type { StudySession, Flashcard as FlashcardType } from '../types'

const FOLDERS_KEY = 'studyspark.folders.v1'
const FOLDER_COLORS_KEY = 'studyspark.folder.colors.v1'
const DRIVE_ROOT_LABEL = 'SparkDrive'
const SEP = '/'

// ---- Path helpers (folders are stored as "A/B/C" paths; root = '') ----
const folderName = (path: string) => (path.includes(SEP) ? path.slice(path.lastIndexOf(SEP) + 1) : path)
const parentPath = (path: string) => (path.includes(SEP) ? path.slice(0, path.lastIndexOf(SEP)) : '')
const joinPath = (parent: string, name: string) => (parent ? `${parent}${SEP}${name}` : name)
const childrenOf = (path: string) => (path ? `${path}${SEP}` : '')
// True when `folder` is `root` itself OR any descendant of it. Used to select a
// whole folder subtree (the folder AND everything inside) for rename/move/delete.
const inSubtree = (folder: string, root: string) => folder === root || folder.startsWith(childrenOf(root))
// Re-root a path: replace the `oldRoot` prefix of `p` with `newRoot`.
const rerootPath = (p: string, oldRoot: string, newRoot: string) =>
  p === oldRoot ? newRoot : joinPath(newRoot, p.slice(childrenOf(oldRoot).length))

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

const LibraryPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user, sessions: cloudSessions, loading, refreshSessions } = useAuth()
  const { state, setCurrentSession, updateSession, removeSession } = useFlashcardStore()

  const [sessions, setSessions] = useState<StudySession[]>([])
  // Empty folders that exist only locally (no sessions yet) — stored as paths.
  const [emptyFolders, setEmptyFolders] = useState<string[]>([])
  // Folder colors, stored locally as { path: colorToken }. Folders are not their
  // own rows in the DB, so their color lives in localStorage (per browser).
  const [folderColors, setFolderColors] = useState<Record<string, string>>({})
  // Right-click context menu (position + items).
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  // Folder create/rename now goes through a centered modal (see FolderNameModal)
  // instead of a tiny inline input that was easy to miss.
  const [folderModal, setFolderModal] = useState<{ mode: 'create' | 'rename'; path?: string } | null>(null)
  const [folderModalValue, setFolderModalValue] = useState('')
  const [currentPath, setCurrentPath] = useState<string>('') // '' = SparkDrive root
  const [renamingSession, setRenamingSession] = useState<string | null>(null)
  const [sessionRenameValue, setSessionRenameValue] = useState('')
  const [filter, setFilter] = useState('') // search query in the main panel
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  // Second-step confirmation when the user chose to also delete the folder's contents.
  const [folderContentsToDelete, setFolderContentsToDelete] = useState<string | null>(null)
  const [sessionToDelete, setSessionToDelete] = useState<StudySession | null>(null)

  // Drag and drop state. A drag carries EITHER a session id OR a folder path.
  const [dragSessionId, setDragSessionId] = useState<string | null>(null)
  const [dragFolderPath, setDragFolderPath] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null | undefined>(undefined)
  const dragImageRef = useRef<HTMLDivElement | null>(null)
  // Double-click detection: timestamp of last click per folder path
  const clickTimeRef = useRef<Map<string, number>>(new Map())
  const DOUBLE_CLICK_MS = 250 // faster double-click threshold

  // Load empty folders: from Supabase (authoritative when logged in) and from
  // localStorage (fallback / when signed out). We mark `foldersLoaded` only
  // AFTER applying the saved value, so a fast unmount (e.g. the auth gate
  // redirecting) can't persist the empty initial state and wipe the folders.
  const foldersLoaded = useRef(false)
  useEffect(() => {
    let cancelled = false
    const apply = (paths: string[]) => {
      if (cancelled) return
      setEmptyFolders(paths)
      foldersLoaded.current = true
    }
    // Local fallback first (instant), Supabase overrides when it resolves.
    try {
      const raw = localStorage.getItem(FOLDERS_KEY)
      if (raw) apply(JSON.parse(raw) as string[])
      else foldersLoaded.current = true
    } catch {
      foldersLoaded.current = true
    }
    if (user) {
      loadFoldersFromSupabase().then((paths) => {
        if (!cancelled) apply(paths)
      })
    }
    return () => {
      cancelled = true
    }
    // Re-run when the user logs in/out so cloud folders are picked up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Persist empty folders — local (always) + Supabase (when logged in). Only
  // after the initial load has run, to avoid wiping saved folders on mount.
  useEffect(() => {
    if (!foldersLoaded.current) return
    try {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(emptyFolders))
    } catch {
      /* ignore */
    }
    if (user) syncFoldersToSupabase(emptyFolders)
  }, [emptyFolders, user])

  // Load / persist folder colors locally.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FOLDER_COLORS_KEY)
      if (raw) setFolderColors(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(FOLDER_COLORS_KEY, JSON.stringify(folderColors))
    } catch {
      /* ignore */
    }
  }, [folderColors])

  useEffect(() => {
    if (user) refreshSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Library is account-only. We must NOT render the (empty) library while the
  // session is still resolving or while a previously-present session is briefly
  // dropped during a reload — doing so leaves the bare background with the
  // "Entrar" button and no content (the reported "white screen" bug). So we
  // keep a gate open whenever there is no user, and only close it once a real
  // session is confirmed. If the session is lost again while mounted, the gate
  // re-opens instead of leaving the page hanging.
  const [gateOpen, setGateOpen] = useState(true)
  useEffect(() => {
    if (user) {
      setGateOpen(false)
      return
    }
    // No user: keep the gate open. While auth is still loading, just wait.
    setGateOpen(true)
    if (loading) return
    // Auth settled with no user: give it a short grace (session may still be
    // restored from storage) before bouncing to login.
    const t = window.setTimeout(() => {
      if (!user) navigate('/auth?next=library', { replace: true })
    }, 900)
    return () => window.clearTimeout(t)
  }, [loading, user, navigate])

  // Merge cloud sessions with local sessions while avoiding duplicates.
  useEffect(() => {
    // createdAt may arrive as a Date (from the cloud) or as a string/Date from
    // the local flashcard store (e.g. after returning from Study), so coerce
    // defensively to avoid "createdAt.getTime is not a function".
    const toDate = (v: unknown): Date => (v instanceof Date ? v : new Date(v as string | number))
    const cloud: StudySession[] = cloudSessions.map((s) => ({
      id: s.id,
      title: s.title,
      folder: s.folder || '',
      flashcards: (s.flashcards as StudySession['flashcards']) || [],
      createdAt: toDate(s.created_at),
      studyMode: (s.study_mode as StudySession['studyMode']) || 'basic',
      timeSpent: s.time_spent || 0,
      score: s.score || 0,
    }))
    const merged = new Map<string, StudySession>()
    cloud.forEach((s) => merged.set(s.id, s))
    state.sessions.forEach((s) => merged.set(s.id, { ...s, createdAt: toDate(s.createdAt) }))
    setSessions(
      Array.from(merged.values()).sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime())
    )
  }, [cloudSessions, state.sessions])

  const replaceSession = (updated: StudySession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    updateSession(updated)
  }

  // All folder paths that exist (from sessions + locally-created empty ones).
  const allFolderPaths = useMemo(() => {
    const fromSessions = sessions.map((s) => s.folder || '')
    // Include every folder path PLUS all of its ancestors, so the Move tree
    // shows the whole hierarchy — not just folders that happen to hold a
    // session directly. This makes nested empty folders valid move targets.
    const all = new Set<string>(emptyFolders)
    const addWithAncestors = (p: string) => {
      if (!p) return
      let rest = p
      all.add(rest)
      while (rest.includes(SEP)) {
        rest = parentPath(rest)
        all.add(rest)
      }
    }
    fromSessions.forEach(addWithAncestors)
    emptyFolders.forEach(addWithAncestors)
    const set = new Set<string>([...all].filter(Boolean))
    // Sort shallow-first (parents before children) so the Move tree reads top-down.
    return Array.from(set).sort((a, b) => {
      const da = a.split(SEP).length
      const db = b.split(SEP).length
      if (da !== db) return da - db
      return a.localeCompare(b)
    })
  }, [sessions, emptyFolders])

  // Direct subfolders of the current path.
  const subFolders = useMemo(() => {
    const prefix = childrenOf(currentPath)
    const names = new Map<string, string>() // name -> full path
    allFolderPaths.forEach((p) => {
      if (p === currentPath) return
      if (p.startsWith(prefix)) {
        const rest = p.slice(prefix.length)
        if (!rest.includes(SEP)) names.set(rest, p)
      }
    })
    // Also include empty folders stored directly under current path.
    return Array.from(names.values()).sort((a, b) => folderName(a).localeCompare(folderName(b)))
  }, [allFolderPaths, currentPath])

  // Total flashcards inside a folder, counting decks that live in the folder
  // AND any of its subfolders (point 3). A folder with only nested decks
  // must not read "0 tarjetas" — it shows the full recursive total.
  const sessionCountFor = (path: string) =>
    sessions
      .filter((s) => inSubtree(s.folder || '', path))
      .reduce((sum, s) => sum + ((s.flashcards as FlashcardType[] | undefined)?.length ?? 0), 0)

  // Folders matching the search query (point 6): the search box filters
  // BOTH decks and folders by name, so only relevant folders remain.
  const visibleFolders = useMemo(() => {
    if (!filter.trim()) return subFolders
    const q = filter.toLowerCase()
    return subFolders.filter((p) => folderName(p).toLowerCase().includes(q))
  }, [subFolders, filter])

  // Sessions that live directly inside the current folder.
  const visibleSessions = useMemo(() => {
    const list = sessions.filter((s) => (s.folder || '') === currentPath)
    if (!filter.trim()) return list
    const q = filter.toLowerCase()
    return list.filter((s) => s.title.toLowerCase().includes(q))
  }, [sessions, currentPath, filter])

  // Multi-selection (point 1 & 2). Keys are folder paths or session ids;
  // `lastSelectedKey` anchors Shift-range selection (Windows Explorer style).
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const lastSelectedKey = useRef<string | null>(null)
  // The ordered list of selectable keys currently shown (folders first, then
  // decks, matching the visual grid) — used to resolve a Shift range.
  const orderedKeys = useMemo(
    () => [...visibleFolders, ...visibleSessions.map((s) => s.id)],
    [visibleFolders, visibleSessions]
  )
  const clearSelection = () => {
    setSelected(new Set())
    lastSelectedKey.current = null
  }

  // Keyboard shortcuts for multi-selection (point 2): Delete/Backspace opens the
  // batch-delete confirmation, Escape clears the selection (unless a dialog is
  // already open), and the dialog itself confirms on Enter (handled in ConfirmDialog).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dialogOpen = folderToDelete !== null || folderContentsToDelete !== null || sessionToDelete !== null
      if (e.key === 'Escape') {
        if (!dialogOpen && selected.size > 0) clearSelection()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (dialogOpen || selected.size === 0) return
        e.preventDefault()
        setFolderToDelete('__multi__')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, folderToDelete, folderContentsToDelete, sessionToDelete])

  // Breadcrumb: ['', 'A', 'A/B', ...] up to currentPath.
  const crumbs = useMemo(() => {
    if (!currentPath) return [{ path: '', name: DRIVE_ROOT_LABEL }]
    const parts = currentPath.split(SEP)
    const acc: { path: string; name: string }[] = [{ path: '', name: DRIVE_ROOT_LABEL }]
    let built = ''
    parts.forEach((p) => {
      built = joinPath(built, p)
      acc.push({ path: built, name: p })
    })
    return acc
  }, [currentPath])

  // ----- Folder actions -----
  const openCreateFolder = () => {
    setFolderModalValue('')
    setFolderModal({ mode: 'create' })
  }
  const openRenameFolder = (path: string) => {
    setFolderModalValue(folderName(path))
    setFolderModal({ mode: 'rename', path })
  }
  // Apply the name chosen in the modal.
  const applyFolderName = () => {
    const name = folderModalValue.trim()
    if (!folderModal) return
    if (folderModal.mode === 'create') {
      if (!name) { setFolderModal(null); return }
      const full = joinPath(currentPath, name)
      if (allFolderPaths.includes(full)) {
        toast.error(t('library.foldername') + ' ya existe aquí')
        return
      }
      setEmptyFolders((f) => [...f, full])
      toast.success(t('library.created'))
    } else {
      const oldPath = folderModal.path!
      if (!name || name === folderName(oldPath)) { setFolderModal(null); return }
      const newPath = joinPath(parentPath(oldPath), name)
      if (allFolderPaths.includes(newPath)) {
        toast.error(t('library.foldername') + ' ya existe aquí')
        return
      }
      renameFolderTo(oldPath, newPath)
      toast.success(t('library.renamed'))
    }
    setFolderModalValue('')
    setFolderModal(null)
  }

  // Re-root every folder color under oldRoot to newRoot (keep colors on rename/move).
  const rerootFolderColors = (oldRoot: string, newRoot: string) => {
    setFolderColors((prev) => {
      const next: Record<string, string> = {}
      for (const [p, c] of Object.entries(prev)) {
        next[inSubtree(p, oldRoot) ? rerootPath(p, oldRoot, newRoot) : p] = c
      }
      return next
    })
  }

  // Drop every folder color under `root` (used when a folder is deleted).
  const dropFolderColors = (root: string) => {
    setFolderColors((prev) => {
      const next: Record<string, string> = {}
      for (const [p, c] of Object.entries(prev)) {
        if (!inSubtree(p, root)) next[p] = c
      }
      return next
    })
  }

  // Core rename logic (used by the modal). Re-roots every session and empty
  // folder under the folder, keeping colors and the current path in sync.
  const renameFolderTo = (oldPath: string, newPath: string) => {
    // Move every session in this folder AND its subfolders under the new name.
    sessions
      .filter((s) => inSubtree(s.folder || '', oldPath))
      .forEach((s) => {
        const updated = { ...s, folder: rerootPath(s.folder || '', oldPath, newPath) }
        updateSessionMeta(s.id, { folder: updated.folder })
        replaceSession(updated)
      })
    // Rename locally-stored empty folders (self + descendants) too.
    setEmptyFolders((f) => f.map((p) => (inSubtree(p, oldPath) ? rerootPath(p, oldPath, newPath) : p)))
    rerootFolderColors(oldPath, newPath)
    if (inSubtree(currentPath, oldPath)) {
      setCurrentPath((c) => rerootPath(c, oldPath, newPath))
    }
  }

  // Delete a folder. By default its decks move up to the parent folder. When
  // `withContents` is true, the decks inside (and subfolders) are deleted too.
  const deleteFolder = (path: string, withContents = false) => {
    const inside = sessions.filter((s) => inSubtree(s.folder || '', path))
    if (withContents) {
      inside.forEach((s) => {
        deleteSessionFromSupabase(s.id)
        removeSession(s.id)
      })
      setSessions((prev) => prev.filter((s) => !inSubtree(s.folder || '', path)))
      if (user) refreshSessions()
    } else {
      // Move its decks (in the folder AND its subfolders) up to the parent folder.
      inside.forEach((s) => {
        const updated = { ...s, folder: rerootPath(s.folder || '', path, parentPath(path)) }
        updateSessionMeta(s.id, { folder: updated.folder })
        replaceSession(updated)
      })
    }
    setEmptyFolders((f) => f.filter((p) => !inSubtree(p, path)))
    dropFolderColors(path)
    if (inSubtree(currentPath, path)) {
      setCurrentPath(parentPath(path))
    }
  }

  // Move a whole folder (and its subtree) into `destParent`. Used by drag & drop.
  const moveFolder = (path: string, destParent: string) => {
    const newPath = joinPath(destParent, folderName(path))
    // No-op if dropping onto itself, its current parent, or into its own subtree.
    if (newPath === path || destParent === parentPath(path) || inSubtree(destParent, path)) return
    if (allFolderPaths.includes(newPath)) {
      toast.error(t('library.foldername') + ' ya existe aquí')
      return
    }
    sessions
      .filter((s) => inSubtree(s.folder || '', path))
      .forEach((s) => {
        const updated = { ...s, folder: rerootPath(s.folder || '', path, newPath) }
        updateSessionMeta(s.id, { folder: updated.folder })
        replaceSession(updated)
      })
    setEmptyFolders((f) => {
      const next = f.map((p) => (inSubtree(p, path) ? rerootPath(p, path, newPath) : p))
      // Ensure the moved folder exists locally even if it had no empty entry.
      if (!next.includes(newPath) && sessions.filter((s) => (s.folder || '') === newPath).length === 0) {
        next.push(newPath)
      }
      return next
    })
    rerootFolderColors(path, newPath)
    if (inSubtree(currentPath, path)) {
      setCurrentPath((c) => rerootPath(c, path, newPath))
    }
    toast.success(t('library.moved.to', { folder: destParent || DRIVE_ROOT_LABEL }))
  }

  // ----- Session actions -----
  const openSession = (s: StudySession) => {
    setCurrentSession(s)
    navigate(`/study/${s.id}`)
  }

  // Open a deck studying ONLY its unanswered (pending) cards. Passed through
  // navigation state so StudyPage can filter on load (point 8).
  const openPendingSession = (s: StudySession) => {
    setCurrentSession(s)
    navigate(`/study/${s.id}`, { state: { filter: 'pending' } })
  }

  // Open a deck studying ONLY the cards the user got wrong. Same filter
  // mechanism as pending — keeps the "review just the failures" one click away
  // from the deck card (no trip through the final summary screen).
  const openWrongSession = (s: StudySession) => {
    setCurrentSession(s)
    navigate(`/study/${s.id}`, { state: { filter: 'wrong' } })
  }

  // Count of cards in a session the user never answered.
  const pendingCountFor = (s: StudySession) =>
    (s.flashcards as FlashcardType[] | undefined)?.filter((f) => f.studied !== true).length ?? 0

  // Count of cards in a session the user answered incorrectly.
  const wrongCountFor = (s: StudySession) =>
    (s.flashcards as FlashcardType[] | undefined)?.filter((f) => f.correct === false).length ?? 0

  const renameSession = (s: StudySession) => {
    const name = sessionRenameValue.trim()
    if (!name) {
      setRenamingSession(null)
      return
    }
    const updated = { ...s, title: name }
    updateSessionMeta(s.id, { title: name })
    replaceSession(updated)
    setRenamingSession(null)
    toast.success(t('profile.opensession'))
  }

  const moveSession = (s: StudySession, path: string) => {
    const updated = { ...s, folder: path }
    updateSessionMeta(s.id, { folder: path })
    replaceSession(updated)
  }

  const deleteSession = async (s: StudySession) => {
    await deleteSessionFromSupabase(s.id)
    setSessions((prev) => prev.filter((x) => x.id !== s.id))
    removeSession(s.id)
    if (user) await refreshSessions()
    toast.success(t('settings.deleted'))
  }

  // Batch delete of everything currently selected (point 2). Folders are removed
  // WITHOUT their contents (safe default — decks move up to the parent), sessions
  // are deleted individually. Selection is cleared afterwards.
  const deleteSelected = async () => {
    const folders = [...selected].filter((k) => visibleFolders.includes(k as string))
    const sessionsToDelete = sessions.filter((s) => selected.has(s.id))
    folders.forEach((p) => deleteFolder(p, false))
    for (const s of sessionsToDelete) await deleteSession(s)
    clearSelection()
    setFolderToDelete(null)
    setSessionToDelete(null)
    toast.success(t('settings.deleted'))
  }

  // A drop target (subfolder or breadcrumb) receives either a dragged session
  // (move the deck into `path`) or a dragged folder (move that folder so `path`
  // becomes its new parent).
  const handleDropOnFolder = (path: string) => {
    const sessionId = dragSessionId
    const folderPath = dragFolderPath
    setDragOverFolder(undefined)
    setDragSessionId(null)
    setDragFolderPath(null)
    if (folderPath) {
      moveFolder(folderPath, path)
      return
    }
    if (!sessionId) return
    const s = sessions.find((x) => x.id === sessionId)
    if (!s || (s.folder || '') === path) return
    moveSession(s, path)
    toast.success(t('library.moved.to', { folder: path || DRIVE_ROOT_LABEL }))
  }

  const enterFolder = (path: string) => setCurrentPath(path)

  // Selection logic (point 1). A plain click selects ONLY `key`; Ctrl/Cmd+click
  // toggles it; Shift+click extends from the last selected key across the
  // currently-visible ordered list (folders then decks) — Explorer behaviour.
  const toggleSelect = (key: string, e: React.MouseEvent) => {
    const ordered = orderedKeys
    const idx = ordered.indexOf(key)
    const lastIdx = lastSelectedKey.current ? ordered.indexOf(lastSelectedKey.current) : -1

    if (e.shiftKey && lastIdx !== -1 && idx !== -1) {
      const [a, b] = lastIdx < idx ? [lastIdx, idx] : [idx, lastIdx]
      const range = new Set(selected)
      for (let i = a; i <= b; i++) range.add(ordered[i])
      setSelected(range)
      return
    }
    if (e.metaKey || e.ctrlKey) {
      const next = new Set(selected)
      next.has(key) ? next.delete(key) : next.add(key)
      setSelected(next)
      lastSelectedKey.current = key
      return
    }
    // Plain click: select just this one (and remember it for the next Shift).
    setSelected(new Set([key]))
    lastSelectedKey.current = key
  }

  // ----- Colors -----
  const setSessionColor = (s: StudySession, color: string | null) => {
    const updated = { ...s, color: color || undefined }
    updateSessionMeta(s.id, { color })
    replaceSession(updated)
  }

  const setFolderColor = (path: string, color: string | null) => {
    setFolderColors((prev) => {
      const next = { ...prev }
      if (color) next[path] = color
      else delete next[path]
      return next
    })
  }

  // A grid of color swatches (2 rows of 7 = the "no color" reset + 13 colors),
  // used inside the context menu's "Style" submenu.
  const colorPickerRow = (current: string | null | undefined, onPick: (c: string | null) => void) => (
    <div className="grid grid-cols-7 gap-1.5 px-3 py-2">
      <button
        onClick={() => onPick(null)}
        title={t('library.color.none')}
        className={`w-6 h-6 rounded-full border border-slate-300 dark:border-sepia-600 flex items-center justify-center ${
          !current ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-slate-900' : ''
        }`}
      >
        <X className="w-3 h-3 text-gray-400" />
      </button>
      {COLOR_TOKENS.map((c) => {
        const cc = colorClasses(c)
        return (
          <button
            key={c}
            onClick={() => onPick(c)}
            title={c}
            className={`w-6 h-6 rounded-full ${cc?.swatch} ${
              current === c ? 'ring-2 ring-offset-1 ring-gray-500 dark:ring-offset-gray-900' : ''
            }`}
          />
        )
      })}
    </div>
  )

  // ----- Context menus (right click) -----
  // Build the "Move" submenu as a real folder TREE. Delegates to the shared
// `buildMoveTree` in lib/folderTree so this matches the FolderTreePicker
// used on the study completion screen exactly.
  const buildMoveTree = (
    onPick: (dest: string) => void,
    opts: { currentLocation: string; isDisabled?: (path: string) => boolean }
  ): ContextMenuItem[] =>
    buildFolderTree(allFolderPaths, {
      currentLocation: opts.currentLocation,
      isDisabled: opts.isDisabled,
      rootLabel: DRIVE_ROOT_LABEL,
      homeIcon: Home,
      folderIcon: Folder,
    }).map((it) => {
      // Resolve the destination path once (shared by onClick + disabled state).
      const chosen = it.treePrefix === '' && it.label === DRIVE_ROOT_LABEL ? '' : (it.label ?? '')
      return {
        ...it,
        // `onClick` is a no-op placeholder in the shared builder; bind it here.
        onClick: () => onPick(chosen),
        // Apply disabled state from isDisabled so items appear but are unclickable.
        disabled: opts.isDisabled ? opts.isDisabled(chosen) : false,
      }
    })

  // Items shared by the session right-click menu and the "⋮" button menu.
  const sessionMenuItems = (s: StudySession): ContextMenuItem[] => [
    { label: t('library.study'), icon: BookOpen, onClick: () => openSession(s) },
    ...(pendingCountFor(s) > 0
      ? [{ label: t('reward.study.pending'), icon: ListX, onClick: () => openPendingSession(s) } as ContextMenuItem]
      : []),
    ...(wrongCountFor(s) > 0
      ? [{ label: t('reward.retry.wrong'), icon: X, onClick: () => openWrongSession(s) } as ContextMenuItem]
      : []),
    { label: t('library.export.csv'), icon: Download, onClick: () => exportSession(s, 'csv') },
    { separator: true },
    {
      label: t('library.style'),
      icon: Palette,
      submenu: [
        { label: t('library.rename'), icon: Pencil, onClick: () => { setRenamingSession(s.id); setSessionRenameValue(s.title) } },
        { separator: true },
        { render: () => colorPickerRow(s.color, (c) => setSessionColor(s, c)) },
      ],
    },
    {
      label: t('library.move.short'),
      icon: FolderInput,
      submenu: buildMoveTree((dest) => moveSession(s, dest), {
        // Show the WHOLE folder tree as move targets, hiding ONLY the folder
        // currently open in the view (the one being listed). The deck's own
        // folder is intentionally NOT pre-excluded, so sibling folders and the
        // rest of the tree stay visible — moving a deck "into" its own folder is
        // a harmless no-op, not worth hiding the whole level for.
        currentLocation: '',
        isDisabled: (dest) => dest === currentPath,
      }),
    },
    { separator: true },
    { label: t('library.delete'), icon: Trash2, danger: true, onClick: () => setSessionToDelete(s) },
  ]

  const folderMenuItems = (path: string): ContextMenuItem[] => [
    { label: t('library.open'), icon: FolderOpen, onClick: () => enterFolder(path) },
    { separator: true },
    {
      label: t('library.style'),
      icon: Palette,
      submenu: [
        { label: t('library.rename'), icon: Pencil, onClick: () => openRenameFolder(path) },
        { separator: true },
        { render: () => colorPickerRow(folderColors[path], (c) => setFolderColor(path, c)) },
      ],
    },
    {
      label: t('library.move.short'),
      icon: FolderInput,
      // Moving a folder means choosing its NEW PARENT. Disallow its current
      // parent, itself and any folder inside its own subtree, plus the folder
      // currently open in the view (moving it "into" where it already is).
      submenu: buildMoveTree((dest) => moveFolder(path, dest), {
        currentLocation: parentPath(path),
        isDisabled: (dest) => inSubtree(dest, path) || dest === currentPath,
      }),
    },
    { separator: true },
    { label: t('library.delete'), icon: Trash2, danger: true, onClick: () => setFolderToDelete(path) },
  ]

  const openSessionMenu = (e: React.MouseEvent, s: StudySession) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, items: sessionMenuItems(s) })
  }

  const openFolderMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, items: folderMenuItems(path) })
  }

  const openBackgroundMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: t('library.newfolder'), icon: FolderPlus, onClick: () => openCreateFolder() },
      ],
    })
  }

  return (
    <div
      className="min-h-screen max-w-6xl mx-auto px-4 py-12"
      // Right-click anywhere on the Library page opens our menu (never the
      // browser's "search with Google" menu). Specific widgets (folders,
      // sessions) call stopPropagation so their own menu wins.
      onContextMenu={openBackgroundMenu}
    >
      {/* Spinner covers every moment there is no confirmed user (loading, the
          grace window, or a transient session drop). Rendered here — NOT as an
          early return — so all hooks above always run, avoiding the
          "render hooks mismatch" crash on auth settle. */}
      {gateOpen && !user ? (
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-ember-500 animate-spin" />
        </div>
      ) : (
        <>
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-ink-muted dark:text-sepia-300 hover:text-ink dark:hover:text-sepia-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {t('study.back')}
      </button>

      <motion.h1
        initial="hidden" animate="show" variants={fade}
        className="font-display text-3xl font-bold text-ink dark:text-sepia-50"
      >
        {t('library.title')}
      </motion.h1>
      <p className="text-ink-muted dark:text-sepia-300 mb-6">{t('library.subtitle')}</p>

        {/* ---- Main: only the inside of the currently open folder ---- */}
        <main className="flex-1 min-w-0">
          {/* Breadcrumb bar (Windows Explorer style). Each crumb is a drop target
              so a deck can be moved to any parent folder (or SparkDrive root). */}
          <div className="flex flex-wrap items-center gap-1 px-3 py-2.5 mb-4 bg-paper-raised dark:bg-sepia-900 rounded-xl shadow-soft ring-1 ring-slate-200/70 dark:ring-sepia-800 text-sm">
            {crumbs.map((c, i) => (
              <React.Fragment key={c.path || 'root'}>
                {i > 0 && <ChevronRight className="w-4 h-4 text-slate-300 dark:text-sepia-600" />}
                <button
                  onClick={() => setCurrentPath(c.path)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverFolder(c.path) }}
                  onDragLeave={() => setDragOverFolder((f) => (f === c.path ? undefined : f))}
                  onDrop={(e) => { e.preventDefault(); handleDropOnFolder(c.path) }}
                  className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    dragOverFolder === c.path ? 'ring-2 ring-ember-400 bg-ember-50/60 dark:bg-ember-500/10' : ''
                  } ${
                    i === crumbs.length - 1
                      ? 'font-semibold bg-ember-50 dark:bg-ember-500/15 text-ember-700 dark:text-ember-300'
                      : 'text-ink-soft dark:text-sepia-300 hover:bg-slate-100 dark:hover:bg-sepia-800'
                  }`}
                >
                  {i === 0 ? <Home className="w-4 h-4" /> : <Folder className="w-4 h-4 text-ember-500" />}
                  {i === 0 ? DRIVE_ROOT_LABEL : c.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Filters + new folder */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t('library.filter')}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-sepia-700 dark:bg-sepia-800 dark:text-sepia-50 dark:placeholder-sepia-300 focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={openCreateFolder}
              className="btn-pop inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ember-500 text-paper text-sm font-bold shadow-soft hover:shadow-lift transition-all shrink-0"
            >
              <FolderPlus className="w-4 h-4" /> {t('library.newfolder')}
            </button>
          </div>

          {/* Folders + sessions inside the current folder */}
          {visibleFolders.length === 0 && visibleSessions.length === 0 ? (
            <div
              onContextMenu={openBackgroundMenu}
              className="bg-paper-raised dark:bg-sepia-900 rounded-2xl shadow-soft ring-1 ring-slate-200/70 dark:ring-sepia-800 p-12 text-center"
            >
              <FolderOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-sepia-600 mb-4" />
              <p className="text-ink-muted dark:text-sepia-300">{t('library.folder.empty')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" onContextMenu={openBackgroundMenu}>
              {/* Folder widgets (distinct look) */}
              {visibleFolders.map((path, i) => {
                const fc = colorClasses(folderColors[path])
                return (
                <motion.div
                  key={path}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  draggable={folderModal?.mode !== 'rename' || folderModal?.path !== path}
                  onDragStartCapture={(e) => {
                    setDragFolderPath(path)
                    if (dragImageRef.current) {
                      dragImageRef.current.textContent = folderName(path)
                      e.dataTransfer.setDragImage(dragImageRef.current, 10, 10)
                    }
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEndCapture={() => { setDragFolderPath(null); setDragOverFolder(undefined) }}
                  onDragOver={(e) => { e.preventDefault(); if (dragFolderPath !== path) setDragOverFolder(path) }}
                  onDragLeave={() => setDragOverFolder((f) => (f === path ? undefined : f))}
                  onDrop={(e) => { e.preventDefault(); handleDropOnFolder(path) }}
                  onContextMenu={(e) => openFolderMenu(e, path)}
                  onClick={(e) => {
                    // Plain click selects (Explorer-style); Ctrl/Cmd/Shift extend.
                    toggleSelect(path, e)
                    // Fast double-click detection: enter the folder on a quick second click.
                    const now = Date.now()
                    const last = clickTimeRef.current.get(path) || 0
                    if (now - last < DOUBLE_CLICK_MS) {
                      e.preventDefault()
                      clearSelection()
                      enterFolder(path)
                    }
                    clickTimeRef.current.set(path, now)
                  }}
                  className={`group relative select-none flex flex-col items-center justify-center p-5 min-h-[180px] rounded-2xl border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lift user-select-none ${
                    fc ? `${fc.border} ${fc.bg}` : 'border-ember-200 dark:border-ember-500/30 bg-ember-50/40 dark:bg-ember-500/5 hover:bg-ember-50 dark:hover:bg-ember-500/10'
                  } ${
                    dragFolderPath === path ? 'opacity-40' : ''
                  } ${
                    dragOverFolder === path ? 'ring-2 ring-ember-400' : ''
                  } ${
                    selected.has(path) ? 'ring-2 ring-ember-400 bg-ember-50/80 dark:bg-ember-500/15' : ''
                  }`}
                >
                  <FolderOpen className={`w-10 h-10 mb-2 ${fc ? fc.text : 'text-ember-500'}`} />
                  <span className="text-sm font-semibold text-ink dark:text-sepia-100 text-center truncate max-w-full">{folderName(path)}</span>
                  <span className="text-xs text-ink-muted dark:text-sepia-300 mt-0.5">{sessionCountFor(path)} {t('library.cards').toLowerCase()}</span>
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setContextMenu({ x: r.right - 200, y: r.bottom + 4, items: folderMenuItems(path) })
                      }}
                      className="p-1.5 text-ink-muted hover:text-ink dark:hover:text-sepia-100 hover:bg-slate-100 dark:hover:bg-sepia-800 bg-white/70 dark:bg-sepia-800/70 rounded-lg transition-colors"
                      title={t('library.open')}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
                )
              })}

              {/* Session cards (draggable) */}
              {visibleSessions.map((s, i) => {
                const sc = colorClasses(s.color)
                return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min((visibleFolders.length + i) * 0.04, 0.4) }}
                  draggable={renamingSession !== s.id}
                  onDragStartCapture={(e) => {
                    setDragSessionId(s.id)
                    if (dragImageRef.current) {
                      dragImageRef.current.textContent = s.title
                      e.dataTransfer.setDragImage(dragImageRef.current, 10, 10)
                    }
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEndCapture={() => { setDragSessionId(null); setDragOverFolder(undefined) }}
                  onContextMenu={(e) => openSessionMenu(e, s)}
                  onClick={(e) => toggleSelect(s.id, e)}
                  className={`relative group select-none rounded-2xl shadow-soft border p-5 min-h-[180px] flex flex-col cursor-grab active:cursor-grabbing transition-all hover:-translate-y-1 hover:shadow-lift user-select-none ${
                    sc ? `${sc.bg} ${sc.border}` : 'bg-paper-raised dark:bg-sepia-900 border-slate-100 dark:border-sepia-800'
                  } ${
                    dragSessionId === s.id ? 'opacity-40' : ''
                  } ${
                    selected.has(s.id) ? 'ring-2 ring-ember-400' : ''
                  }`}
                >
                  {sc && <span className={`absolute top-0 left-0 h-full w-1.5 rounded-l-2xl ${sc.swatch}`} />}
                  <div className="absolute top-3 left-2 text-slate-300 dark:text-sepia-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {renamingSession === s.id ? (
                    <input
                      autoFocus
                      value={sessionRenameValue}
                      onChange={(e) => setSessionRenameValue(e.target.value)}
                      onBlur={() => renameSession(s)}
                      onKeyDown={(e) => e.key === 'Enter' && renameSession(s)}
                      className="text-lg font-semibold text-ink dark:text-sepia-50 outline-none border-b border-ember-300 dark:border-ember-500/40 mb-2 w-full bg-transparent font-display"
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold text-ink dark:text-sepia-50 leading-snug pl-4">{s.title}</h3>
                      <button
                        onClick={(e) => {
                          // Open the SAME menu as right-click, anchored to the button.
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setContextMenu({ x: r.right - 224, y: r.bottom + 4, items: sessionMenuItems(s) })
                        }}
                        className="p-1.5 text-ink-muted hover:text-ink dark:hover:text-sepia-100 rounded-lg hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors shrink-0"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <DeckFeedback deck={s} t={t} />

                  <div className="mt-3 flex items-stretch justify-center gap-1.5">
                    <button
                      onClick={() => openSession(s)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-ember-500 text-paper text-sm font-bold shadow-soft hover:shadow-lift btn-pop active:scale-95 transition-all"
                    >
                      <BookOpen className="w-4 h-4" /> {t('library.study')}
                    </button>
                    <button
                      onClick={() => pendingCountFor(s) > 0 && openPendingSession(s)}
                      disabled={pendingCountFor(s) === 0}
                      title={t('reward.study.pending')}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-sm font-semibold shadow-soft transition-all ${
                        pendingCountFor(s) === 0
                          ? 'bg-slate-200 dark:bg-sepia-800 text-slate-400 dark:text-sepia-500 cursor-not-allowed'
                          : 'bg-amber-500 text-white hover:bg-amber-600 btn-pop active:scale-95'
                      }`}
                    >
                      <ListX className="w-4 h-4" />
                      <span className={`rounded-full px-1.5 text-xs ${pendingCountFor(s) === 0 ? 'bg-slate-300 dark:bg-sepia-700' : 'bg-white/25'}`}>{pendingCountFor(s)}</span>
                    </button>
                    <button
                      onClick={() => wrongCountFor(s) > 0 && openWrongSession(s)}
                      disabled={wrongCountFor(s) === 0}
                      title={t('reward.retry.wrong')}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-sm font-semibold shadow-soft transition-all ${
                        wrongCountFor(s) === 0
                          ? 'bg-slate-200 dark:bg-sepia-800 text-slate-400 dark:text-sepia-500 cursor-not-allowed'
                          : 'bg-rose-500 text-white hover:bg-rose-600 btn-pop active:scale-95'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span className={`rounded-full px-1.5 text-xs ${wrongCountFor(s) === 0 ? 'bg-slate-300 dark:bg-sepia-700' : 'bg-white/25'}`}>{wrongCountFor(s)}</span>
                    </button>
                  </div>
                </motion.div>
                )
              })}
            </div>
          )}
        </main>

      {/* Folder create / rename modal (points 1 & 4): a proper centered
          popup so the name field is impossible to miss, replacing the old
          tiny inline inputs. */}
      {folderModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-ink/50 dark:bg-sepia-900/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setFolderModal(null) }}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-paper-raised dark:bg-sepia-900 rounded-2xl shadow-lift ring-1 ring-slate-200/70 dark:ring-sepia-800 p-6"
          >
            <h3 className="font-display text-lg font-bold text-ink dark:text-sepia-50">
              {folderModal.mode === 'create' ? t('library.newfolder') : t('library.rename')}
            </h3>
            {folderModal.mode === 'rename' && folderModal.path && (
              <p className="text-sm text-ink-muted dark:text-sepia-300 mt-1">
                {DRIVE_ROOT_LABEL}{folderModal.path.includes('/') ? '/' + folderModal.path.split('/').slice(0, -1).join('/') : ''}
              </p>
            )}
            <input
              autoFocus
              value={folderModalValue}
              onChange={(e) => setFolderModalValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFolderName()
                if (e.key === 'Escape') setFolderModal(null)
              }}
              placeholder={t('library.foldername')}
              className="w-full mt-4 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 text-sm outline-none focus:ring-2 focus:ring-ember-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setFolderModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors"
              >
                {t('config.cancel')}
              </button>
              <button
                onClick={applyFolderName}
                className="btn-pop px-4 py-2.5 rounded-xl bg-ember-500 text-paper text-sm font-bold shadow-soft hover:shadow-lift transition-all"
              >
                {t('library.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden element used as the drag image for sessions. */}
      <div
        ref={dragImageRef}
        className="fixed -top-40 left-0 px-3 py-1.5 rounded-lg bg-ember-500 text-paper text-sm font-medium shadow-lg pointer-events-none"
        style={{ opacity: 0 }}
      />

      {/* Selection toolbar (point 1 & 2): shown when >=1 item is selected.
          Delete (Supr) and Esc (clear) are also keyboard-driven. */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-30 mx-auto max-w-6xl mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-ember-500 text-paper shadow-lift">
          <span className="text-sm font-semibold">
            {selected.size} {t('library.selected')}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFolderToDelete('__multi__')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" /> {t('library.delete')} <span className="opacity-80">(Supr)</span>
            </button>
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" /> {t('config.cancel')} <span className="opacity-80">(Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom confirm dialogs (replace the browser's native popup) */}
      {/* Step 1: delete the folder. Contents stay in place, OR the user can pick
          the secondary action to also delete everything inside (step 2). */}
      <ConfirmDialog
        open={folderToDelete !== null}
        title={t('library.delete')}
        message={folderToDelete === '__multi__'
          ? t('library.confirm.delete.multi', { count: selected.size })
          : t('library.confirm.delete.folder.plain')}
        secondaryLabel={folderToDelete && folderToDelete !== '__multi__' && sessions.some((s) => inSubtree(s.folder || '', folderToDelete)) ? t('library.delete.withcontents') : undefined}
        onSecondary={() => {
          const path = folderToDelete
          setFolderToDelete(null)
          setFolderContentsToDelete(path)
        }}
        onConfirm={() => {
          if (folderToDelete === '__multi__') {
            deleteSelected()
          } else if (folderToDelete) {
            deleteFolder(folderToDelete, false)
          }
          setFolderToDelete(null)
        }}
        onCancel={() => setFolderToDelete(null)}
      />
      {/* Step 2: explicit second confirmation before destroying the contents. */}
      <ConfirmDialog
        open={folderContentsToDelete !== null}
        title={t('library.delete.withcontents')}
        message={t('library.confirm.delete.folder.contents')}
        confirmLabel={t('library.delete.withcontents')}
        onConfirm={() => {
          if (folderContentsToDelete) deleteFolder(folderContentsToDelete, true)
          setFolderContentsToDelete(null)
        }}
        onCancel={() => setFolderContentsToDelete(null)}
      />
      <ConfirmDialog
        open={sessionToDelete !== null}
        title={t('library.delete')}
        message={t('library.confirm.delete.session')}
        onConfirm={() => {
          if (sessionToDelete) deleteSession(sessionToDelete)
          setSessionToDelete(null)
        }}
        onCancel={() => setSessionToDelete(null)}
      />

      {/* Right-click context menu */}
      <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
        </>
      )}
    </div>
  )
}


// Summarizes how the user is doing on a deck from its flashcards + last session.
const deckStats = (deck: StudySession) => {
  const cards = deck.flashcards || []
  const total = cards.length
  const studied = cards.filter((c) => c.studied).length
  const correct = cards.filter((c) => c.correct === true).length
  const pct = total ? Math.round((studied / total) * 100) : 0
  const acc = studied ? Math.round((correct / studied) * 100) : 0
  const last = deck.completedAt
    ? new Date(deck.completedAt)
    : cards.reduce<Date | null>((max, c) => {
        if (!c.lastReviewed) return max
        const d = new Date(c.lastReviewed)
        return !max || d > max ? d : max
      }, null)
  return { total, studied, correct, pct, acc, last }
}

// Small progress summary shown on each deck card (point 3): how much of the
// deck the user has studied, their accuracy, and when they last reviewed.
const DeckFeedback: React.FC<{ deck: StudySession; t: (k: any, v?: any) => string }> = ({ deck, t }) => {
  const st = deckStats(deck)
  const barColor = st.pct >= 100 ? 'bg-emerald-500' : st.pct > 0 ? 'bg-ember-500' : 'bg-slate-300 dark:bg-sepia-600'
  const lastLabel = st.last
    ? st.last.toLocaleDateString()
    : t('library.never')
  return (
    <div className="mt-2 pl-4">
      <div className="flex items-center justify-between text-xs text-ink-muted dark:text-sepia-300 mb-1">
        <span>{st.studied}/{st.total} {t('library.cards').toLowerCase()}</span>
        <span className={st.acc >= 70 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ember-600 dark:text-ember-400 font-semibold'}>{st.acc}% {t('library.accuracy')}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-sepia-800 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${st.pct}%` }} />
      </div>
      <p className="text-xs text-ink-muted/80 dark:text-sepia-300 mt-1.5">{t('library.last')}: {lastLabel}</p>
    </div>
  )
}

export default LibraryPage
