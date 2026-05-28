import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { getVisualStudioLabel } from '../../lib/visual-studio-model'
import type { VisualStudioModel } from '../../hooks/useVisualStudio'
import { ProviderParamRenderer } from '../../components/ProviderParamRenderer'
import {
  buildMappedFieldControls,
  isComfyWorkflowRunnable,
  readComfyControlValue,
  writeComfyControlPatch,
} from '../../visual-studio/comfyui/mapped-fields'
import styles from './SourceSettingsRibbon.module.css'

interface SourceSettingsRibbonProps {
  visuals: VisualStudioModel
  worldStale: boolean
}

function getWorkspaceMessage(t: TFunction<'dreamWeaver'>, visuals: VisualStudioModel): string {
  if (visuals.connections.length === 0) {
    return t('visuals.ribbon.noSourcesAvailable')
  }

  if (!visuals.selectedConnection) {
    return t('visuals.ribbon.chooseSourceUnlock')
  }

  switch (visuals.workspaceState) {
    case 'needs_workflow':
      return t('visuals.ribbon.importWorkflow')
    case 'needs_mapping':
      return t('visuals.ribbon.mapPrompts')
    case 'failed':
      return t('visuals.ribbon.lastFailed')
    default:
      return visuals.selectedConnection
        ? t('visuals.ribbon.providerReady', {
            provider: getVisualStudioLabel(visuals.selectedConnection.provider as any),
          })
        : ''
  }
}

export function SourceSettingsRibbon({ visuals, worldStale }: SourceSettingsRibbonProps) {
  const { t } = useTranslation('dreamWeaver')

  if (!visuals.selectedAsset) return null
  const asset = visuals.selectedAsset
  const workspaceMessage = getWorkspaceMessage(t, visuals)

  const isComfyUI = visuals.selectedConnection?.provider === 'comfyui'
  const mappedControls = isComfyUI && visuals.comfyui.config
    ? buildMappedFieldControls(visuals.comfyui.config, visuals.comfyui.capabilities).filter(
        (control) => control.key !== 'positive_prompt' && control.key !== 'negative_prompt',
      )
    : []
  const mappedCount = visuals.comfyui.config?.field_mappings.length ?? 0
  const canRunWorkflow = isComfyUI ? isComfyWorkflowRunnable(visuals.comfyui.config) : visuals.canGenerate
  const showSourceSelect =
    visuals.connections.length > 1 || !visuals.selectedConnection

  return (
    <aside className={styles.ribbon}>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t('visuals.ribbon.source')}</div>
        {visuals.connections.length === 0 ? (
          <div className={styles.sourceValue}>{t('visuals.ribbon.noSourcesConfigured')}</div>
        ) : showSourceSelect ? (
          <select
            className={styles.select}
            value={visuals.selectedConnectionId ?? ''}
            onChange={(event) => visuals.onSelectConnection(event.target.value || null)}
          >
            <option value="">{t('visuals.ribbon.chooseSource')}</option>
            {visuals.connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.name}
              </option>
            ))}
          </select>
        ) : (
          <div className={styles.sourceValue}>{visuals.selectedConnection?.name}</div>
        )}
        {workspaceMessage ? <p className={styles.meta}>{workspaceMessage}</p> : null}
        {worldStale && <p className={styles.warning}>{t('visuals.ribbon.worldStale')}</p>}
      </div>

      {isComfyUI ? (
        <>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>{t('visuals.ribbon.workflow')}</span>
              <span className={styles.metaInline}>{t('visuals.ribbon.mappedCount', { count: mappedCount })}</span>
            </div>
            <button
              type="button"
              className={styles.workflowButton}
              onClick={visuals.openWorkflowEditor}
            >
              {visuals.comfyui.config ? t('visuals.ribbon.editWorkflow') : t('visuals.ribbon.importWorkflowButton')}
            </button>
            <p className={styles.meta}>
              {canRunWorkflow
                ? t('visuals.ribbon.mappingsReady')
                : t('visuals.ribbon.mapPromptsFirst')}
            </p>
          </div>

          {mappedControls.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>{t('visuals.ribbon.settings')}</div>
              <div className={styles.controlGrid}>
                {mappedControls.map((control) => (
                  <label
                    key={control.key}
                    className={control.kind === 'textarea' ? styles.controlWide : styles.control}
                  >
                    <span className={styles.controlLabel}>{control.label}</span>
                    {control.kind === 'select' ? (
                      <select
                        className={styles.select}
                        value={String(readComfyControlValue(asset, control))}
                        onChange={(event) =>
                          visuals.onUpdateAsset(
                            asset.id,
                            writeComfyControlPatch(asset, control, event.target.value),
                          )
                        }
                      >
                        <option value="">{t('visuals.ribbon.auto')}</option>
                        {(control.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={control.kind === 'number' ? 'number' : 'text'}
                        className={styles.input}
                        value={String(readComfyControlValue(asset, control))}
                        onChange={(event) =>
                          visuals.onUpdateAsset(
                            asset.id,
                            writeComfyControlPatch(asset, control, event.target.value),
                          )
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      ) : visuals.selectedConnection ? (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>{t('visuals.ribbon.providerSettings')}</div>
          {visuals.providerSchema ? (
            <ProviderParamRenderer
              schema={visuals.providerSchema}
              values={visuals.providerValues}
              onChange={visuals.updateProviderParam}
              connectionId={visuals.selectedConnectionId}
            />
          ) : (
            <p className={styles.meta}>{t('visuals.ribbon.noExtraControls')}</p>
          )}
        </div>
      ) : null}
    </aside>
  )
}
