import React from 'react'

interface ProgressBarProps {
  progress: number
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const pct = Math.max(0, Math.min(100, progress))
  return (
    <div>
      <div className="w-full bg-slate-200 dark:bg-sepia-700/60 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full bg-ember-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-ink-muted dark:text-sepia-300 mt-1.5 font-medium">
        <span>0%</span>
        <span>{pct < 10 ? '0' : pct < 100 ? Math.floor(pct) : '100'}%</span>
      </div>
    </div>
  )
}

export default ProgressBar
