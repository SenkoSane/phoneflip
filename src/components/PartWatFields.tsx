import { useT } from '../i18n'
import { PART_OTHER, PART_SUGGESTIONS } from '../types'
import { Field, Select, TextInput } from '../ui'

export function partSelectValue(savedName: string): string {
  if (!savedName) return PART_SUGGESTIONS[0]
  return PART_SUGGESTIONS.includes(savedName) ? savedName : PART_OTHER
}

export function resolvePartName(selectValue: string, customName: string): string {
  if (selectValue === PART_OTHER) return customName.trim()
  return selectValue
}

export function PartWatFields({
  selectValue,
  customName,
  onSelect,
  onCustomName,
}: {
  selectValue: string
  customName: string
  onSelect: (value: string) => void
  onCustomName: (value: string) => void
}) {
  const t = useT()
  return (
    <>
      <Field label={t('parts.what')}>
        <Select
          value={selectValue}
          onChange={(e) => {
            const next = e.target.value
            onSelect(next)
            if (next !== PART_OTHER) onCustomName('')
          }}
        >
          {PART_SUGGESTIONS.map((p) => (
            <option key={p} value={p}>
              {p === 'Overig' ? t('common.other') : t(`part.${p}`) === `part.${p}` ? p : t(`part.${p}`)}
            </option>
          ))}
          <option value={PART_OTHER}>{t('common.other')}</option>
        </Select>
      </Field>
      {selectValue === PART_OTHER ? (
        <Field label={t('parts.which')}>
          <TextInput
            required
            autoFocus
            value={customName}
            onChange={(e) => onCustomName(e.target.value)}
            placeholder={t('parts.whichPh')}
          />
        </Field>
      ) : null}
    </>
  )
}
