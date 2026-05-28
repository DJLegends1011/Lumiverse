import i18n from '@/i18n'
import type { Command, CommandGroup } from '@/lib/commands'

function resolve(ns: string, key: string, fallback: string, options?: Record<string, unknown>): string {
  const resolved = i18n.t(key, { ns, defaultValue: fallback, ...options })
  return resolved === key ? fallback : resolved
}

export function translateDrawerField(
  tabId: string,
  field: 'shortName' | 'tabName' | 'tabDescription' | 'tabHeaderTitle',
  fallback: string,
): string {
  return resolve('panels', `drawer.${tabId}.${field}`, fallback)
}

export function translateSettingsField(
  tabId: string,
  field: 'shortName' | 'tabName' | 'tabDescription',
  fallback: string,
): string {
  return resolve('settings', `tabs.${tabId}.${field}`, fallback)
}

export function translateCommand(cmd: Command): Command {
  return {
    ...cmd,
    label: resolve('commands', `items.${cmd.id}.label`, cmd.label),
    description: resolve('commands', `items.${cmd.id}.description`, cmd.description),
    group: translateCommandGroup(cmd.group),
  }
}

export function translateCommandGroup(group: CommandGroup): CommandGroup {
  return group
}

export function commandGroupLabel(group: CommandGroup): string {
  return resolve('commands', `groups.${group}`, group)
}
