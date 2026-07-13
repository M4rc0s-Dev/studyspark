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
  // When present, this item opens a nested flyout on hover instead of acting.
  submenu?: ContextMenuItem[]
  disabled?: boolean
  // Tree depth (0 = root level). Drives the horizontal indentation for items
  // that do NOT carry a `treePrefix`.
  indent?: number
  // Precomputed box-drawing prefix (e.g. "├── " / "│   " / "    ") used by the
  // Move folder tree. When present it fully encodes the indentation/connectors,
  // so siblings always align regardless of depth.
  treePrefix?: string
}

export interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

const PAD_BASE = 12 // left padding of the root level
const PAD_STEP = 16 // horizontal step per tree level

// Renders ONE row (button / separator / custom node) at its `indent` level.
const Row: React.FC<{ item: ContextMenuItem; onClose: () => void }> = ({
  item,
  onClose,
}) => {
  if (item.separator) {
    return <div className="my-1 border-t border-gray-100 dark:border-sepia-500" />
  }
  if (item.render) {
    return <div className="px-1 py-0.5">{item.render()}</div>
  }

  const Icon = item.icon
  const disabled = item.disabled

  return (
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
      style={{ paddingLeft: PAD_BASE }}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {item.treePrefix ? (
        <span className="font-mono text-xs text-slate-400 dark:text-sepia-500 select-none whitespace-pre shrink-0">{item.treePrefix}</span>
      ) : null}
      <span className="truncate flex-1">{item.label}</span>
    </button>
  )
}

// Renders a FLAT list of items. When `treePrefix` is present on the items
// (the folder "Move" tree), the box-drawing connectors alone convey grouping,
// so no extra dividers are needed.
const MenuList: React.FC<{ items: ContextMenuItem[]; onClose: () => void }> = ({
  items,
  onClose,
}) => {
  return (
    <div>
      {items.map((item, i) => (
        <Row key={i} item={item} onClose={onClose} />
      ))}
    </div>
  )
}

// A hover-flyout submenu (e.g. "Estilo → color" or "Mover → folder tree").
// Positioned with a smart flip: opens to the LEFT when there is no room on the
// right, and vertically clamped so it never goes off the bottom on mobile.
// Bounded height (scroll) so even a long folder tree stays on screen.
const Flyout: React.FC<{
  anchor: HTMLElement | null
  items: ContextMenuItem[]
  onClose: () => void
}> = ({ anchor, items, onClose }) => {
  const [side, setSide] = useState<'right' | 'left'>('right')
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const subW = 240
    const subH = Math.min(window.innerHeight * 0.7, items.length * 40 + 24)
    // Flip to the left if the right side would overflow.
    const openRight = r.right + subW + 8 <= window.innerWidth
    setSide(openRight ? 'right' : 'left')
    // `fixed` so these VIEWPORT coordinates are used as-is (the flyout is NOT a
    // child of the trigger's `relative` wrapper — it is portaled below). Clamp
    // both axes so the submenu never leaves the screen.
    const desiredX = openRight ? r.right + 4 : r.left - subW - 4
    const desiredY = r.top
    const maxX = window.innerWidth - subW - 8
    const maxY = window.innerHeight - subH - 8
    setPos({
      x: Math.max(8, Math.min(desiredX, Math.max(8, maxX))),
      y: Math.max(8, Math.min(desiredY, Math.max(8, maxY))),
    })
  }, [anchor, items.length])

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'right' ? -4 : 4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: side === 'right' ? -4 : 4 }}
      transition={{ duration: 0.1 }}
      ref={ref}
      className={`fixed z-[110] w-60 max-h-[70vh] overflow-y-auto bg-white dark:bg-sepia-900 rounded-xl shadow-2xl border border-gray-100 dark:border-sepia-500 p-1.5`}
      style={{ left: pos.x, top: pos.y }}
    >
      <MenuList items={items} onClose={onClose} />
    </motion.div>
  )
}

// A single top-level item that owns a hover flyout.
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

// Renders the list of items for a menu. A `submenu` item becomes a hover
// flyout; everything else renders as a flat row (separator / custom render /
// plain action) with its own indentation.
const MenuItems: React.FC<{ items: ContextMenuItem[]; onClose: () => void }> = ({
  items,
  onClose,
}) => {
  return (
    <>
      {items.map((item, i) =>
        item.submenu ? (
          <FlyoutItem key={i} item={item} index={i} onClose={onClose} />
        ) : (
          <Row key={i} item={item} onClose={onClose} />
        )
      )}
    </>
  )
}

const ContextMenu: React.FC<{ menu: ContextMenuState | null; onClose: () => void }> = ({
  menu,
  onClose,
}) => {
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
