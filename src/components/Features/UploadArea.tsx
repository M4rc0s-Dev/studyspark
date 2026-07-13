import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, Upload, X, AlertCircle, Loader2, Layers, ChevronDown } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useSettings } from '../../context/SettingsContext'
import { CARD_COUNT_OPTIONS, CARD_COUNT_AUTO, CARD_COUNT_AUTO_LABEL, MAX_CARDS } from '../../context/SettingsContext'

interface UploadAreaProps {
  onUpload: (file?: File, text?: string, fileName?: string, cardCount?: number) => void
  isUploading: boolean
  innerRef?: React.RefObject<HTMLDivElement>
}

const UploadArea: React.FC<UploadAreaProps> = ({ onUpload, isUploading, innerRef }) => {
  const { t } = useLanguage()
  const { prefs } = useSettings()
  const [cardCount, setCardCount] = useState<number>(prefs.cardCount)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<string>('')
  const [error, setError] = useState<string>('')

  const acceptedFiles = {
    'text/plain': ['.txt'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setSelectedFile(file)
      setError('')

      if (file.type === 'text/plain') {
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target?.result as string)
        reader.readAsText(file)
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
  })

  const handleTextSubmit = () => {
    if (textInput.trim()) onUpload(undefined, textInput.trim(), fileName.trim() || undefined, cardCount)
  }

  const handleFileSubmit = () => {
    if (selectedFile) onUpload(selectedFile, undefined, fileName.trim() || selectedFile.name, cardCount)
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreview('')
    setTextInput('')
    setFileName('')
    setError('')
  }

  const getFileIcon = (fileName: string): { icon: React.ReactNode; tone: string } => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const tone = 'bg-ember-100 text-ember-700 dark:bg-ember-500/20 dark:text-ember-300'
    switch (ext) {
      case 'pdf': return { icon: <FileText className="w-5 h-5" />, tone }
      case 'txt': return { icon: <FileText className="w-5 h-5" />, tone }
      case 'docx': return { icon: <FileText className="w-5 h-5" />, tone }
      default: return { icon: <FileText className="w-5 h-5" />, tone }
    }
  }

  return (
    <div ref={innerRef} className="relative bg-paper-raised dark:bg-sepia-900/95 backdrop-blur-md rounded-3xl shadow-lift ring-1 ring-slate-200/70 dark:ring-sepia-700/60 p-8 overflow-hidden">
      {/* editorial corner accent */}
      <div className="absolute top-0 left-0 w-24 h-1.5 rule-ember" aria-hidden />
      <h2 className="font-display text-2xl font-bold mb-6 text-ink dark:text-sepia-50">{t('upload.title')}</h2>

      {/* File name (sent to n8n) */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-ink-soft dark:text-sepia-300 mb-2">
          {t('filename.label')}
        </label>
        <input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder={t('filename.placeholder')}
          className="w-full px-4 py-3 border border-slate-300 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 dark:placeholder-sepia-300 rounded-xl focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none transition"
        />
      </div>

      {/* Card count for this deck (overrides the default in Settings) */}
      <div className="mb-5">
        <p className="text-sm font-medium text-ink-soft dark:text-sepia-300 mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-ember-500" /> {t('settings.cardcount')}
        </p>
        <div className="relative">
          <select
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            className="w-full appearance-none px-4 py-3 rounded-xl border border-slate-300 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 text-sm font-medium text-ink dark:text-sepia-100 focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none cursor-pointer transition"
          >
            <option value={CARD_COUNT_AUTO}>{t('upload.cardcount.auto')}</option>
            {CARD_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} {n === MAX_CARDS ? `(${t('settings.cardcount.max')})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-ink-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
          ${isDragActive
            ? 'border-ember-500 bg-ember-50 dark:bg-ember-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-sepia-600 hover:border-ember-400 hover:bg-ember-50/40 dark:hover:bg-ember-500/5'}
          ${error ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : ''}`}
      >
        <input {...getInputProps()} />
        <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-ember-500 text-paper' : 'bg-ember-100 dark:bg-ember-500/20 text-ember-600 dark:text-ember-300'}`}>
          <Upload className="w-8 h-8" />
        </div>
        <p className="text-lg font-semibold text-ink dark:text-sepia-100">
          {isDragActive ? t('upload.drop') : t('upload.drag')}
        </p>
        <p className="text-ink-muted dark:text-sepia-300 mb-1">{t('upload.click')}</p>
        <p className="text-xs text-ink-muted/70 dark:text-sepia-300">{t('upload.formats')}</p>
      </div>

      {error && (
        <div className="mt-4 flex items-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {selectedFile && (
        <SelectedFileCard file={selectedFile} preview={preview} clear={clearSelection} meta={getFileIcon(selectedFile.name)} />
      )}

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-sepia-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-paper-raised dark:bg-sepia-900 px-4 text-ink-muted font-medium">{t('upload.or')}</span>
        </div>
      </div>

      {/* Textarea */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-ink-soft dark:text-sepia-300 mb-2">
          {t('upload.text.label')}
        </label>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={t('upload.text.placeholder')}
          className="w-full h-36 p-4 border border-slate-300 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 dark:placeholder-sepia-300 rounded-xl resize-none focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none transition"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button
          onClick={clearSelection}
          className="px-6 py-3 rounded-xl border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 font-medium hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors disabled:opacity-50"
          disabled={isUploading}
        >
          {t('upload.clear')}
        </button>
        <button
          onClick={handleTextSubmit}
          disabled={!textInput.trim() || isUploading}
          className="px-6 py-3 rounded-xl bg-ember-500 text-paper font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('upload.fromtext')}
        </button>
        <button
          onClick={handleFileSubmit}
          disabled={!selectedFile || isUploading}
          className="px-6 py-3 rounded-xl bg-ink dark:bg-sepia-100 dark:text-ink text-paper dark:font-semibold font-semibold hover:bg-ink/90 dark:hover:bg-sepia-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {t('upload.fromfile')}
        </button>
      </div>

      {isUploading && (
        <div className="mt-6 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-ember-500 animate-spin" />
          <p className="mt-3 font-medium text-ink-soft dark:text-sepia-200">{t('upload.processing')}</p>
          <p className="text-sm text-ink-muted dark:text-sepia-300">{t('upload.processing.sub')}</p>
        </div>
      )}
    </div>
  )
}

const SelectedFileCard: React.FC<{
  file: File
  preview: string
  clear: () => void
  meta: { icon: React.ReactNode; tone: string }
}> = ({ file, preview, clear, meta }) => {
  const { t } = useLanguage()
  return (
  <div className="mt-4 bg-paper-sunken dark:bg-sepia-800 p-4 rounded-2xl ring-1 ring-slate-200 dark:ring-sepia-700">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${meta.tone}`}>
          {meta.icon}
        </span>
        <div>
          <p className="font-semibold text-ink dark:text-sepia-100">{file.name}</p>
          <p className="text-sm text-ink-muted dark:text-sepia-300">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      </div>
      <button onClick={clear} className="text-ink-muted hover:text-red-600 transition-colors" aria-label="Quitar archivo">
        <X className="w-5 h-5" />
      </button>
    </div>
    {preview && (
      <div>
        <p className="text-sm font-medium mb-2 text-ink-soft dark:text-sepia-300">{t('upload.preview')}</p>
        <div className="bg-paper-raised dark:bg-sepia-900 p-3 rounded-xl border dark:border-sepia-700 text-sm text-ink-soft dark:text-sepia-200 max-h-32 overflow-y-auto">
          {preview.substring(0, 200)}...
        </div>
      </div>
    )}
  </div>
  )
}

export default UploadArea
