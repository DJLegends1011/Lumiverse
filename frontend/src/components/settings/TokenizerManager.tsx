import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

import { Plus, Trash2, FlaskConical } from 'lucide-react'
import { tokenizersApi } from '@/api/tokenizers'
import { Badge } from '@/components/shared/Badge'
import type { TokenizerConfig, TokenizerModelPattern, TokenizerTestResult, PatternTestResult } from '@/api/tokenizers'
import styles from './TokenizerManager.module.css'

export default function TokenizerManager() {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('common')

  const [configs, setConfigs] = useState<TokenizerConfig[]>([])
  const [patterns, setPatterns] = useState<TokenizerModelPattern[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([tokenizersApi.list(), tokenizersApi.listPatterns()])
      .then(([c, p]) => { setConfigs(c); setPatterns(p) })
      .finally(() => setLoading(false))
  }, [])

  const refreshConfigs = () => tokenizersApi.list().then(setConfigs)
  const refreshPatterns = () => tokenizersApi.listPatterns().then(setPatterns)

  if (loading) return <div className={styles.container}>{t('tokenizers.loading')}</div>

  return (
    <div className={styles.container}>
      <ConfigsSection configs={configs} onRefresh={refreshConfigs} />
      <hr className={styles.divider} />
      <PatternsSection patterns={patterns} configs={configs} onRefresh={refreshPatterns} />
      <hr className={styles.divider} />
      <TokenizerTestPanel configs={configs} />
      <hr className={styles.divider} />
      <PatternTestPanel />
    </div>
  )
}

// ---- Configs Section ----

function ConfigsSection({ configs, onRefresh }: { configs: TokenizerConfig[]; onRefresh: () => void }) {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('common')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('approximate')
  const [configJson, setConfigJson] = useState('{}')
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setError('')
    try {
      const parsed = JSON.parse(configJson)
      await tokenizersApi.create({ name, type, config: parsed })
      setName(''); setConfigJson('{}'); setShowForm(false)
      onRefresh()
    } catch (err: any) {
      setError(err.body?.error || err.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await tokenizersApi.remove(id)
      onRefresh()
    } catch (err: any) {
      setError(err.body?.error || err.message)
    }
  }

  return (
    <section>
      <h3 className={styles.sectionTitle}>{t('tokenizers.configsTitle')}</h3>
      <p className={styles.sectionDesc}>{t('tokenizers.configsDesc')}</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('tokenizers.nameCol')}</th>
              <th>{t('tokenizers.typeCol')}</th>
              <th>{t('tokenizers.configCol')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.name}
                  {c.is_built_in && <Badge color="primary" size="sm" className={styles.builtInBadgeSpacing}>{t('tokenizers.builtIn')}</Badge>}
                </td>
                <td><Badge color="neutral" size="sm">{c.type}</Badge></td>
                <td><span className={styles.configJson} title={JSON.stringify(c.config)}>{JSON.stringify(c.config)}</span></td>
                <td>
                  <div className={styles.actions}>
                    {!c.is_built_in && (
                      <button type="button" className={styles.dangerBtn} onClick={() => handleDelete(c.id)} title={i18n.t('actions.delete', { ns: 'common' })}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!showForm ? (
        <button type="button" className={styles.submitBtn} onClick={() => setShowForm(true)} style={{ marginTop: 8 }}>
          <Plus size={13} /> {t('tokenizers.addTokenizer')}
        </button>
      ) : (
        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('tokenizers.nameCol')}</label>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('tokenizers.myTokenizer')} />
            </div>
            <div className={styles.field} style={{ maxWidth: 140 }}>
              <label className={styles.fieldLabel}>{t('tokenizers.typeCol')}</label>
              <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="huggingface">HuggingFace</option>
                <option value="tiktoken">Tiktoken</option>
                <option value="approximate">Approximate</option>
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('tokenizers.configJson')}</label>
            <textarea className={styles.textarea} value={configJson} onChange={(e) => setConfigJson(e.target.value)} rows={2} />
          </div>
          <div className={styles.formRow}>
            <button type="button" className={styles.submitBtn} onClick={handleCreate} disabled={!name}>{t('tokenizers.create')}</button>
            <button type="button" className={styles.iconBtn} onClick={() => setShowForm(false)} style={{ fontSize: 12 }}>{tc('actions.cancel')}</button>
          </div>
        </div>
      )}
    </section>
  )
}

// ---- Patterns Section ----

function PatternsSection({ patterns, configs, onRefresh }: { patterns: TokenizerModelPattern[]; configs: TokenizerConfig[]; onRefresh: () => void }) {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('common')
  const [showForm, setShowForm] = useState(false)
  const [tokenizerId, setTokenizerId] = useState('')
  const [pattern, setPattern] = useState('')
  const [priority, setPriority] = useState('0')
  const [error, setError] = useState('')

  const configMap = Object.fromEntries(configs.map((c) => [c.id, c.name]))

  const handleCreate = async () => {
    setError('')
    try {
      await tokenizersApi.createPattern({ tokenizer_id: tokenizerId, pattern, priority: parseInt(priority, 10) || 0 })
      setPattern(''); setPriority('0'); setShowForm(false)
      onRefresh()
    } catch (err: any) {
      setError(err.body?.error || err.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await tokenizersApi.removePattern(id)
      onRefresh()
    } catch (err: any) {
      setError(err.body?.error || err.message)
    }
  }

  return (
    <section>
      <h3 className={styles.sectionTitle}>{t('tokenizers.patternsTitle')}</h3>
      <p className={styles.sectionDesc}>{t('tokenizers.patternsDesc')}</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('tokenizers.patternCol')}</th>
              <th>{t('tokenizers.tokenizerCol')}</th>
              <th>{t('tokenizers.priorityCol')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((p) => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {p.pattern}
                  {p.is_built_in && <Badge color="primary" size="sm" className={styles.builtInBadgeSpacing}>{t('tokenizers.builtIn')}</Badge>}
                </td>
                <td>{configMap[p.tokenizer_id] || p.tokenizer_id}</td>
                <td>{p.priority}</td>
                <td>
                  <div className={styles.actions}>
                    {!p.is_built_in && (
                      <button type="button" className={styles.dangerBtn} onClick={() => handleDelete(p.id)} title={i18n.t('actions.delete', { ns: 'common' })}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!showForm ? (
        <button type="button" className={styles.submitBtn} onClick={() => setShowForm(true)} style={{ marginTop: 8 }}>
          <Plus size={13} /> {t('tokenizers.addPattern')}
        </button>
      ) : (
        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t('tokenizers.patternCol')}</label>
              <input className={styles.input} value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="^my-model-" />
            </div>
            <div className={styles.field} style={{ maxWidth: 160 }}>
              <label className={styles.fieldLabel}>{t('tokenizers.tokenizerCol')}</label>
              <select className={styles.select} value={tokenizerId} onChange={(e) => setTokenizerId(e.target.value)}>
                <option value="">{tc('actions.select')}</option>
                {configs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className={styles.field} style={{ maxWidth: 80 }}>
              <label className={styles.fieldLabel}>{t('tokenizers.priorityCol')}</label>
              <input className={styles.input} type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <button type="button" className={styles.submitBtn} onClick={handleCreate} disabled={!pattern || !tokenizerId}>{t('tokenizers.create')}</button>
            <button type="button" className={styles.iconBtn} onClick={() => setShowForm(false)} style={{ fontSize: 12 }}>{tc('actions.cancel')}</button>
          </div>
        </div>
      )}
    </section>
  )
}

// ---- Tokenizer Test Panel ----

function TokenizerTestPanel({ configs }: { configs: TokenizerConfig[] }) {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('common')
  const [tokenizerId, setTokenizerId] = useState('')
  const [text, setText] = useState('')
  const [result, setResult] = useState<TokenizerTestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')

  const handleTest = async () => {
    if (!tokenizerId || !text) return
    setTesting(true); setError(''); setResult(null)
    try {
      const r = await tokenizersApi.test(tokenizerId, text)
      setResult(r)
    } catch (err: any) {
      setError(err.body?.error || err.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <section>
      <h3 className={styles.sectionTitle}>{t('tokenizers.testTokenizer')}</h3>
      <p className={styles.sectionDesc}>{t('tokenizers.testTokenizerDesc')}</p>
      <div className={styles.testPanel}>
        <div className={styles.formRow}>
          <div className={styles.field} style={{ maxWidth: 200 }}>
            <label className={styles.fieldLabel}>{t('tokenizers.tokenizerCol')}</label>
            <select className={styles.select} value={tokenizerId} onChange={(e) => setTokenizerId(e.target.value)}>
              <option value="">{tc('actions.select')}</option>
              {configs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="button" className={styles.submitBtn} onClick={handleTest} disabled={testing || !tokenizerId || !text}>
            <FlaskConical size={13} /> {testing ? t('tokenizers.testing') : t('tokenizers.runTest')}
          </button>
        </div>
        <textarea className={styles.textarea} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('tokenizers.enterSampleText')} rows={3} />
        {error && <p className={styles.error}>{error}</p>}
        {result && (
          <div className={styles.testResult}>
            <span className={styles.testResultLabel}>{t('tokenizers.tokensLabel')}: </span>
            <span className={styles.testResultValue}>{result.token_count}</span>
            {' | '}
            <span className={styles.testResultLabel}>{t('tokenizers.charsLabel')}: </span>
            <span className={styles.testResultValue}>{result.char_count}</span>
            {' | '}
            <span className={styles.testResultLabel}>{t('tokenizers.charsPerTokenLabel')}: </span>
            <span className={styles.testResultValue}>{result.chars_per_token}</span>
          </div>
        )}
      </div>
    </section>
  )
}

// ---- Pattern Test Panel ----

function PatternTestPanel() {
  const { t } = useTranslation('settings')
  const [modelId, setModelId] = useState('')
  const [result, setResult] = useState<PatternTestResult | null>(null)
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    if (!modelId) return
    setTesting(true); setResult(null)
    try {
      const r = await tokenizersApi.testPattern(modelId)
      setResult(r)
    } catch {
      setResult(null)
    } finally {
      setTesting(false)
    }
  }

  return (
    <section>
      <h3 className={styles.sectionTitle}>{t('tokenizers.testPatternTitle')}</h3>
      <p className={styles.sectionDesc}>{t('tokenizers.testPatternDesc')}</p>
      <div className={styles.testPanel}>
        <div className={styles.formRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('tokenizers.modelId')}</label>
            <input className={styles.input} value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="gpt-4o-mini" />
          </div>
          <button type="button" className={styles.submitBtn} onClick={handleTest} disabled={testing || !modelId}>
            <FlaskConical size={13} /> {t('tokenizers.runTest')}
          </button>
        </div>
        {result && (
          <div className={styles.testResult}>
            {result.matched ? (
              <>
                <span className={styles.testResultLabel}>{t('tokenizers.matched')}: </span>
                <span className={styles.testResultValue}>{result.tokenizer_name}</span>
                <span className={styles.testResultLabel}> ({result.tokenizer_id})</span>
              </>
            ) : (
              <span className={styles.testResultLabel}>{t('tokenizers.noMatch')}</span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
