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

  const rootDisabled = opts.currentLocation === '' || (opts.isDisabled?.('') ?? false)
  if (!rootDisabled) {
    items.push({ label: rootLabel, icon: Home, treePrefix: '', onClick: () => {} })
  }

  const valid = allFolderPaths.filter((p) => {
    const disabled = opts.currentLocation === p || (opts.isDisabled?.(p) ?? false)
    return !disabled
  })

  const childrenMap = new Map<string, string[]>()
  const roots: string[] = []
  const sorted = [...valid].sort((a, b) => a.localeCompare(b))
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
      items.push({
        label: folderName(child),
        icon: Folder,
        treePrefix: inherited + connector,
        onClick: () => {},
      })
      walk(child, prefix + connector, [...isLastAt, isLast])
    })
  }

  const sortedRoots = roots.slice().sort((a, b) => folderName(a).localeCompare(folderName(b)))
  sortedRoots.forEach((root, i) => {
    const isLast = i === sortedRoots.length - 1
    const connector = isLast ? '└── ' : '├── '
    items.push({ label: folderName(root), icon: Folder, treePrefix: connector, onClick: () => {} })
    walk(root, connector, [isLast])
  })

  return items.length > 0 ? items : [{ label: '—', onClick: () => {} }]
}
