import { Check, Crosshair, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import type {
  ComfyUIFieldMapping,
  ComfyUIMappedFieldSemantic,
  ComfyUIWorkflowConfig,
} from '@/api/dream-weaver'
import type { ComfyUICapabilities } from '@/api/image-gen'
import { ComfyUIWorkflowGraph, type ComfyUIWorkflowGraphHandle } from './ComfyUIWorkflowGraph'
import { NodeContextMenu } from './NodeContextMenu'
import { isComfyWorkflowRunnable } from './mapped-fields'
import { getApiWorkflowFields, getUiWorkflowFields } from './workflow-fields'
import {
  hasComfyWorkflowFormatMismatch,
  resolveComfyApiWorkflow,
  resolveComfyGraphFormat,
} from './workflow-state'
import styles from './WorkflowEditorModal.module.css'

interface WorkflowEditorModalProps {
  config: ComfyUIWorkflowConfig | null
  capabilities: ComfyUICapabilities | null
  currentExecutingNodeId?: string | null
  error: string | null
  onImportWorkflow: (workflow: unknown) => Promise<ComfyUIWorkflowConfig | null>
  onUpdateMappings: (mappings: ComfyUIFieldMapping[]) => Promise<ComfyUIWorkflowConfig | null>
  onClose: () => void
}

interface ContextMenuState {
  nodeId: string
  classType: string
  anchor: { x: number; y: number }
}

function getAvailableFields(
  uiWorkflow: Record<string, any> | null,
  apiWorkflow: Record<string, any> | null,
  workflowFormat: 'ui_workflow' | 'api_prompt',
  nodeId: string,
): Array<{ fieldName: string; currentValue: unknown }> {
  if (workflowFormat === 'ui_workflow') {
    return getUiWorkflowFields(uiWorkflow, nodeId)
  }
  return getApiWorkflowFields(apiWorkflow, nodeId)
}

export function WorkflowEditorModal({
  config,
  currentExecutingNodeId,
  error,
  onImportWorkflow,
  onUpdateMappings,
  onClose,
}: WorkflowEditorModalProps) {
  const { t } = useTranslation('dreamWeaver')
  const { t: tc } = useTranslation('common')
  const [mode, setMode] = useState<'import' | 'map'>(config ? 'map' : 'import')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [pasted, setPasted] = useState('')
  const [importing, setImporting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const graphRef = useRef<ComfyUIWorkflowGraphHandle | null>(null)
  const importModeLockedRef = useRef(false)

  useEffect(() => {
    if (!config) {
      setMode('import')
      return
    }

    if (!importModeLockedRef.current) {
      setMode('map')
    }
  }, [config])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const graphWorkflowFormat = resolveComfyGraphFormat(config)
  const apiWorkflow = resolveComfyApiWorkflow(config)
  const hasFormatMismatch = hasComfyWorkflowFormatMismatch(config)
  const mappedNodeIds = useMemo(
    () => Array.from(new Set(config?.field_mappings.map((mapping) => mapping.nodeId) ?? [])),
    [config],
  )
  const mappedCount = config?.field_mappings.length ?? 0
  const canRunWorkflow = isComfyWorkflowRunnable(config)
  const nodeMappings = contextMenu
    ? config?.field_mappings.filter((mapping) => mapping.nodeId === contextMenu.nodeId) ?? []
    : []
  const availableFields = contextMenu
    ? getAvailableFields(
        config?.workflow_json ?? null,
        apiWorkflow,
        graphWorkflowFormat,
        contextMenu.nodeId,
      )
    : []
  const replacingWorkflow = mode === 'import' && Boolean(config)

  async function handleImportPayload(workflow: unknown) {
    try {
      setImporting(true)
      setLocalError(null)
      await onImportWorkflow(workflow)
      importModeLockedRef.current = false
      setPasted('')
      setContextMenu(null)
      setMode('map')
    } catch (importError: any) {
      setLocalError(importError?.message ?? t('comfyui.workflowEditor.importFailed'))
    } finally {
      setImporting(false)
    }
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text()
      await handleImportPayload(JSON.parse(text))
    } catch (importError: any) {
      setLocalError(importError?.message ?? t('comfyui.workflowEditor.importFailed'))
    }
  }

  async function handlePasteImport() {
    try {
      await handleImportPayload(JSON.parse(pasted))
    } catch (importError: any) {
      setLocalError(importError?.message ?? t('comfyui.workflowEditor.parseFailed'))
    }
  }

  async function handleToggleField(fieldName: string, mappedAs: ComfyUIMappedFieldSemantic | null) {
    if (!config || !contextMenu) return

    const nextMappingsBase = config.field_mappings.filter(
      (mapping) => !(mapping.nodeId === contextMenu.nodeId && mapping.fieldName === fieldName),
    )

    const nextMappings =
      mappedAs === null
        ? nextMappingsBase
        : [
            ...nextMappingsBase,
            {
              nodeId: contextMenu.nodeId,
              fieldName,
              mappedAs,
              autoDetected: false,
            },
          ]

    await onUpdateMappings(nextMappings)
  }

  function handleReplaceWorkflow() {
    importModeLockedRef.current = true
    setContextMenu(null)
    setLocalError(null)
    setPasted('')
    setMode('import')
  }

  function handleBackToMap() {
    importModeLockedRef.current = false
    setContextMenu(null)
    setLocalError(null)
    setPasted('')
    setMode('map')
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t('comfyui.workflowEditor.eyebrow')}</p>
            <h3 className={styles.title}>{t('comfyui.workflowEditor.title')}</h3>
          </div>
          <div className={styles.headerActions}>
            {replacingWorkflow ? (
              <button type="button" className={styles.secondaryButton} onClick={handleBackToMap}>
                {t('comfyui.workflowEditor.backToMap')}
              </button>
            ) : mode === 'map' && config ? (
              <>
                <button type="button" className={styles.secondaryButton} onClick={handleReplaceWorkflow}>
                  {t('comfyui.workflowEditor.replaceWorkflow')}
                </button>
                <button type="button" className={styles.primaryButton} onClick={onClose}>
                  <Check size={15} />
                  {tc('actions.done')}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label={t('comfyui.workflowEditor.closeAria')}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {mode === 'import' || !config ? (
          <div className={styles.importPanel}>
            <div className={styles.importLead}>
              <div>
                <p className={styles.panelEyebrow}>
                  {replacingWorkflow ? t('comfyui.workflowEditor.replace') : t('comfyui.workflowEditor.import')}
                </p>
                <h4 className={styles.panelTitle}>
                  {replacingWorkflow
                    ? t('comfyui.workflowEditor.replaceTitle')
                    : t('comfyui.workflowEditor.importTitle')}
                </h4>
              </div>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? t('comfyui.workflowEditor.importing') : t('comfyui.workflowEditor.chooseJson')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className={styles.fileInput}
                onClick={(event) => {
                  event.currentTarget.value = ''
                }}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleFile(file)
                  }
                  event.currentTarget.value = ''
                }}
              />
            </div>

            <p className={styles.panelHint}>
              {replacingWorkflow
                ? t('comfyui.workflowEditor.replaceHint')
                : t('comfyui.workflowEditor.importHint')}
            </p>

            <textarea
              className={styles.pasteArea}
              rows={10}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              placeholder={t('comfyui.workflowEditor.pastePlaceholder')}
            />

            <div className={styles.importActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void handlePasteImport()}
                disabled={importing || !pasted.trim()}
              >
                {t('comfyui.workflowEditor.importPasted')}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.graphSection}>
            <div className={styles.graphHeader}>
              <div>
                <p className={styles.panelEyebrow}>{t('comfyui.workflowEditor.mapEyebrow')}</p>
                <h4 className={styles.panelTitle}>{t('comfyui.workflowEditor.mapTitle')}</h4>
              </div>
              <div className={styles.graphMeta}>
                <span className={styles.metaText}>
                  {canRunWorkflow
                    ? t('comfyui.workflowEditor.mappedMetaReady', { count: mappedCount })
                    : t('comfyui.workflowEditor.mappedMetaNeedsPrompts', { count: mappedCount })}
                </span>
              </div>
            </div>

            {hasFormatMismatch && (
              <div className={styles.notice}>
                {t('comfyui.workflowEditor.formatMismatch')}
              </div>
            )}

            <div className={styles.graphWrap}>
              <ComfyUIWorkflowGraph
                ref={graphRef}
                workflow={config.workflow_json}
                workflowFormat={graphWorkflowFormat}
                mappedNodeIds={mappedNodeIds}
                highlightNodeId={currentExecutingNodeId ?? null}
                onNodeClick={(nodeId, classType, anchor) =>
                  setContextMenu({ nodeId, classType, anchor })
                }
              />
              <div className={styles.graphToolDock} role="toolbar" aria-label={t('comfyui.workflowEditor.graphToolbarAria')}>
                <button
                  type="button"
                  className={styles.graphToolButton}
                  onClick={() => graphRef.current?.zoomOut()}
                  aria-label={t('comfyui.workflowEditor.zoomOut')}
                  title={t('comfyui.workflowEditor.zoomOut')}
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  type="button"
                  className={styles.graphToolButton}
                  onClick={() => graphRef.current?.zoomIn()}
                  aria-label={t('comfyui.workflowEditor.zoomIn')}
                  title={t('comfyui.workflowEditor.zoomIn')}
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  className={styles.graphToolButton}
                  onClick={() => graphRef.current?.fitToGraph()}
                  aria-label={t('comfyui.workflowEditor.fitGraph')}
                  title={t('comfyui.workflowEditor.fitGraph')}
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  type="button"
                  className={styles.graphToolButton}
                  onClick={() => graphRef.current?.resetView()}
                  aria-label={t('comfyui.workflowEditor.centerGraph')}
                  title={t('comfyui.workflowEditor.centerGraph')}
                >
                  <Crosshair size={16} />
                </button>
              </div>
              <div className={styles.graphGuide}>
                <span>{t('comfyui.workflowEditor.guideClick')}</span>
                <span>{t('comfyui.workflowEditor.guidePan')}</span>
                <span>{t('comfyui.workflowEditor.guideZoom')}</span>
              </div>
            </div>

            {contextMenu && (
              <NodeContextMenu
                nodeId={contextMenu.nodeId}
                classType={contextMenu.classType}
                availableFields={availableFields}
                nodeMappings={nodeMappings}
                anchor={contextMenu.anchor}
                onToggleField={(fieldName, mappedAs) => {
                  void handleToggleField(fieldName, mappedAs)
                }}
                onClose={() => setContextMenu(null)}
              />
            )}
          </div>
        )}

        {(error || localError) && <div className={styles.error}>{error || localError}</div>}
      </div>
    </div>,
    document.body,
  )
}
