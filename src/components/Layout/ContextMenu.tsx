import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, type LucideIcon } from 'lucide-react'

export interface ContextMenuItem {
  // A separator is rendered when `separator` is true (other fields ignored).
  separator?: boolean
  label?: string
  icon?: LucideIcon
  onClick?: () => void
  danger?: boolean
  // Optional custom node rendered instead of a standard button (e.g. a color row).
  render?: () => React.ReactNode
  // When present, this item opens a nested submenu on hover instead of acting.
  submenu?: ContextMenuItem[]
  // Inline children: rendered as an INDENTED TREE under this item (no flyout).
  // Used by the "Move" menu so the whole folder hierarchy reads top-down.
  children?: ContextMenuItem[]
  disabled?: boolean
  // Tree depth (1 = root level). Drives the indentation + guide lines.
  indent?: number
}

export interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

const PAD_BASE = 12 // left padding of the root level
const PAD_STEP = 16 // horizontal step per tree level

// Renders one row (button / separator / custom node) at a given indent level.
// `depth` is the tree depth (1 = top). Children are rendered inline below.
const Row: React.FC<{
  item: ContextMenuItem
  onClose: () => void
  depth: number
}> = ({ item, onClose, depth }) => {
  if (item.separator) {
    return <div className="my-1 border-t border-gray-100 dark:border-sepia-500" />
  }
  if (item.render) {
    return <div className="px-1 py-0.5">{item.render()}</div>
  }

  const Icon = item.icon
  const pad = PAD_BASE + (depth - 1) * PAD_STEP
  const disabled = item.disabled
  const hasChildren = Boolean(item.children && item.children.length > 0)

  return (
    <div className={hasChildren ? 'mb-0.5' : ''}>
      <button
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          item.onClick?.()
          onClose()
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
          item.danger
            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
            : 'text-gray-700 dark:text-sepia-100 hover:bg-gray-100 dark:hover:bg-sepia-800'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        style={{ paddingLeft: pad }}
      >
        {Icon && <Icon className="w-4 h-4 shrink-0" />}
        <span className="truncate flex-1">{item.label}</span>
        {hasChildren && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
      </button>

      {/* Inline children form the indented tree (file-explorer style).
          A subtle divider sits below each folder group. */}
      {hasChildren && (
        <div className="ml-3 border-l border-gray-200 dark:border-sepia-600 pl-1">
          {item.children!.map((child, ci) => (
            <React.Fragment key={ci}>
              {ci > 0 && <div className="my-1 border-t border-gray-100 dark:border-sepia-600/60" />}
              <Row item={child} onClose={onClose} depth={depth + 1} />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

// Renders a list of top-level items. Each item's inline `children` are rendered
// by Row itself (recursively). A subtle divider separates top-level groups so
// sibling folder clusters read clearly.
const MenuList: React.FC<{
  items: ContextMenuItem[]
  onClose: () => void
}> = ({ items, onClose }) => {
  return (
    <div>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && !item.separator && !items[i - 1].separator && (
            <div className="my-1 border-t border-gray-100 dark:border-sepia-600/60" />
          )}
          <Row item={item} onClose={onClose} depth={item.indent ?? 1} />
        </React.Fragment>
      ))}
    </div>
  )
}

// A hover-flyout submenu (e.g. the "Style → color" picker). Positioned with
// a smart flip: opens to the LEFT when there is no room on the right, and is
// vertically clamped so it never goes off the bottom on mobile.
const Flyout: React.FC<{
  anchor: HTMLElement | null
  items: ContextMenuItem[]
  onClose: () => void
}> = ({ anchor, items, onClose }) => {
  const [side, setSide] = useState<'right' | 'left'>('right')
  const [top, setTop] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const subW = 240
    const subH = Math.min(window.innerHeight * 0.8, items.length * 40 + 24)
    // Flip to the left if the right side would overflow.
    const openRight = r.right + subW + 8 <= window.innerWidth
    setSide(openRight ? 'right' : 'left')
    // Clamp the vertical start so the submenu stays on screen.
    const desired = r.top
    const maxTop = window.innerHeight - subH - 8
    setTop(Math.max(8, Math.min(desired, Math.max(8, maxTop))))
  }, [anchor, items.length])

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'right' ? -4 : 4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: side === 'right' ? -4 : 4 }}
      transition={{ duration: 0.1 }}
      ref={ref}
      className={`absolute top-0 ${
        side === 'right' ? 'left-full -ml-1' : 'right-full -mr-1'
      } w-60 max-h-[80vh] overflow-y-auto bg-white dark:bg-sepia-900 rounded-xl shadow-2xl border border-gray-100 dark:border-sepia-500 p-1.5 z-10`}
      style={{ top }}
    >
      <MenuList items={items} onClose={onClose} />
    </motion.div>
  )
}

// A single top-level item that owns a hover flyout (distinct from inline children).
const FlyoutItem: React.FC<{
  item: ContextMenuItem
  index: number
  onClose: () => void
}> = ({ item, index, onClose }) => {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  return (
    <div
      key={index}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={btnRef}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
          open
            ? 'bg-gray-100 dark:bg-sepia-700 text-gray-800 dark:text-sepia-50'
            : 'text-gray-700 dark:text-sepia-100 hover:bg-gray-100 dark:hover:bg-sepia-800'
        }`}
        style={item.indent && item.indent > 1 ? { paddingLeft: PAD_BASE + (item.indent - 1) * PAD_STEP } : undefined}
      >
        {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
        <span className="truncate flex-1">{item.label}</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
      </button>

      <AnimatePresence>
        {open && item.submenu && (
          <Flyout anchor={btnRef.current} items={item.submenu} onClose={onClose} />
        )}
      </AnimatePresence>
    </div>
  )
}

// Renders the list of items for a menu. Distinguishes:
//  - an item with `submenu` → hover flyout (FlyoutItem)
//  - everything else → routed through MenuList/Row (inline tree, separator,
//    custom render, plain action) so indentation + dividers stay consistent.
const MenuItems: React.FC<{
  items: ContextMenuItem[]
  onClose: () => void
}> = ({ items, onClose }) => {
  return (
    <>
      {items.map((item, i) =>
        item.submenu ? (
          <FlyoutItem key={i} item={item} index={i} onClose={onClose} />
        ) : (
          <MenuListWrapper key={i} item={item} onClose={onClose} />
        )
      )}
    </>
  )
}

// Adapter so a single non-submenu item renders through the same Row path used
// by MenuList (keeps indentation/dividers consistent).
const MenuListWrapper: React.FC<{
  item: ContextMenuItem
  onClose: () => void
}> = ({ item, onClose }) => <Row item={item} onClose={onClose} depth={item.indent ?? 1} />

const ContextMenu: React.FC<{
  menu: ContextMenuState | null
  onClose: () => void
}> = ({ menu, onClose }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Close on outside click, scroll or Escape.
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onScroll = () => onClose()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    // Lock the page scroll while the menu is open (feels native, like an OS menu).
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      document.body.style.overflow = ''
    }
  }, [menu, onClose])

  // Keep the menu inside the viewport.
  useEffect(() => {
    if (!menu || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = Math.min(menu.x, window.innerWidth - rect.width - 8)
    const y = Math.min(menu.y, window.innerHeight - rect.height - 8)
    setPos({ x: Math.max(8, x), y: Math.max(8, y) })
  }, [menu])

  if (!menu) return null

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[14rem] bg-white dark:bg-sepia-900 rounded-xl shadow-2xl border border-gray-100 dark:border-sepia-500 p-1.5"
      style={{ left: pos.x, top: pos.y }}
    >
      <MenuItems items={menu.items} onClose={onClose} />
    </div>
  )
}

export default ContextMenu
