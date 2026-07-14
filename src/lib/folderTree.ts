import type { ContextMenuItem } from '../components/Layout/ContextMenu'

// ---- Path helpers (folders are stored as "A/B/C" paths; root = '') ----
export const SEP = '/'
export const folderName = (path: string) =>
  path.includes(SEP) ? path.slice(path.lastIndexOf(SEP) + 1) : path
export const parentPath = (path: string) =>
  path.includes(SEP) ? path.slice(0, path.lastIndexOf(SEP)) : ''
export const joinPath = (parent: string, name: string) =>
  parent ? `${parent}${SEP}${name}` : name
export const childrenOf = (path: string) => (path ? `${path}${SEP}` : '')
// True when `folder` is `root` itself OR any descendant of it.
export const inSubtree = (folder: string, root: string) =>
  folder === root || folder.startsWith(childrenOf(root))

export interface BuildMoveTreeOpts {
  // Path the item is currently located at (excluded as a destination).
  currentLocation: string
  // Extra destinations to disable (e.g. a folder's own subtree).
  isDisabled?: (path: string) => boolean
  // Label for the root destination (defaults to "SparkDrive").
  rootLabel?: string
  // id of the Home icon for the root entry (optional).
  homeIcon?: ContextMenuItem['icon']
  // id of the folder icon used for entries (optional).
  folderIcon?: ContextMenuItem['icon']
  // When true, the root (SparkDrive) is ALWAYS offered as a destination, even
  // when currentLocation is '' (used by the "save to folder" picker, where the
  // root is the valid default destination for a brand-new deck).
  allowRoot?: boolean
}

// Build a folder tree as a list of ContextMenuItems with box-drawing
// connectors (├── │ └──) so siblings always align and the indentation is
// encoded by the connector string (no depth-based padding that would cause a
// staircase effect).
export function buildMoveTree(
  allFolderPaths: string[],
  opts: BuildMoveTreeOpts
): ContextMenuItem[] {
  const rootLabel = opts.rootLabel ?? 'SparkDrive'
  const Home = opts.homeIcon
  const Folder = opts.folderIcon
  const items: ContextMenuItem[] = []

  // In "save" mode (allowRoot) the root is always a valid destination, even
  // when there is no current location yet; otherwise we skip it only when the
  // item is already at the root (nothing to move there).
  const rootDisabled =
    (!opts.allowRoot && opts.currentLocation === '') || (opts.isDisabled?.('') ?? false)
  if (!rootDisabled) {
    items.push({ label: rootLabel, icon: Home, treePrefix: '', onClick: () => {}, disabled: false })
  } else {
    items.push({ label: rootLabel, icon: Home, treePrefix: '', onClick: () => {}, disabled: true })
  }

  // Keep EVERY folder in the tree. We must NOT drop currentLocation: removing
  // it orphans its children, so sibling subfolders at the same level vanish from
  // the menu. Instead, currentLocation (and anything from isDisabled) stays in
  // the tree but is marked `disabled` by the walk/root renderers below — visible
  // but unclickable. The only hard exclusion is an empty string when it is the
  // current location AND root is not explicitly allowed (handled via rootDisabled).
  const valid = [...allFolderPaths].sort((a, b) => a.localeCompare(b))

  const childrenMap = new Map<string, string[]>()
  const roots: string[] = []
  const sorted = valid
  sorted.forEach((path) => {
    const parent = parentPath(path)
    if (!parent) {
      roots.push(path)
    } else {
      if (!childrenMap.has(parent)) childrenMap.set(parent, [])
      childrenMap.get(parent)!.push(path)
    }
  })

  const walk = (path: string, prefix: string, isLastAt: boolean[]) => {
    const kids = (childrenMap.get(path) || []).slice().sort((a, b) =>
      folderName(a).localeCompare(folderName(b))
    )
    kids.forEach((child, i) => {
      const isLast = i === kids.length - 1
      const connector = isLast ? '└── ' : '├── '
      const inherited = isLastAt.map((last) => (last ? '    ' : '│   ')).join('')
      const disabled = opts.isDisabled?.(child) ?? false
      items.push({
        label: folderName(child),
        icon: Folder,
        treePrefix: inherited + connector,
        onClick: () => {},
        disabled,
      })
      walk(child, prefix + connector, [...isLastAt, isLast])
    })
  }

  const sortedRoots = roots.slice().sort((a, b) => folderName(a).localeCompare(folderName(b)))
  sortedRoots.forEach((root, i) => {
    const isLast = i === sortedRoots.length - 1
    const connector = isLast ? '└── ' : '├── '
    const disabled = opts.isDisabled?.(root) ?? false
    items.push({ label: folderName(root), icon: Folder, treePrefix: connector, onClick: () => {}, disabled })
    walk(root, connector, [isLast])
  })

  return items.length > 0 ? items : [{ label: '—', onClick: () => {} }]
}
