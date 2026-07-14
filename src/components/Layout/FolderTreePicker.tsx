import React, { useEffect, useRef, useState } from 'react'
import { Folder, Home, ChevronDown, Check } from 'lucide-react'
import ContextMenu, { type ContextMenuItem, type ContextMenuState } from './ContextMenu'
import { buildMoveTree, folderName, SEP } from '../../lib/folderTree'

interface FolderTreePickerProps {
  // All existing folder paths (used to build the tree).
  allFolderPaths: string[]
  // Currently selected folder ('' = root / SparkDrive).
  value: string
  // Called with the chosen folder path ('' = root) or undefined to keep current.
  onPick: (path: string) => void
  // Label shown when nothing meaningful (used for the trigger button text).
  rootLabel?: string
  className?: string
}

// A folder selector that reuses the exact same tree renderer as the Library
// "Move" menu (buildMoveTree + ContextMenu with box-drawing connectors), so
// the indentation and alignment behave identically everywhere.
const FolderTreePicker: React.FC<FolderTreePickerProps> = ({
  allFolderPaths,
  value,
  onPick,
  rootLabel = 'SparkDrive',
  className = '',
}) => {
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return
      setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const open = () => {
    const items: ContextMenuItem[] = buildMoveTree(allFolderPaths, {
      currentLocation: value,
      rootLabel,
      homeIcon: Home,
      folderIcon: Folder,
    }).map((it) => ({
      ...it,
      // Wire each tree entry to actually pick that folder. The root entry has an
      // empty label prefix, so map it to '' (SparkDrive root).
      onClick: () => {
        const chosen = it.treePrefix === '' && it.label === rootLabel ? '' : it.label
        onPick(chosen)
        setMenu(null)
      },
    }))
    const r = btnRef.current!.getBoundingClientRect()
    setMenu({ x: r.left, y: r.bottom + 4, items })
  }

  const display = value ? folderName(value) : rootLabel

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (menu ? setMenu(null) : open())}
        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 text-sm outline-none focus:ring-2 focus:ring-ember-500 ${className}`}
      >
        <span className="flex items-center gap-2 truncate">
          {value ? <Folder className="w-4 h-4 text-ember-500 shrink-0" /> : <Home className="w-4 h-4 text-ember-500 shrink-0" />}
          <span className="truncate">{display}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-ink-muted dark:text-sepia-300 shrink-0" />
      </button>
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
    </>
  )
}

export default FolderTreePicker
