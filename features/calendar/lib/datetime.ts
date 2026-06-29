import {
  addDays,
  addHours,
  addMinutes,
  nextMonday,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns"

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) {
    return ""
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

export function toTimeInputValue(iso: string | null | undefined): string {
  if (!iso) {
    return "09:00"
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return "09:00"
  }

  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

export function combineDateAndTime(date: Date, timeValue: string): Date {
  const [hours, minutes] = timeValue.split(":").map(Number)
  return setMilliseconds(
    setSeconds(setMinutes(setHours(date, hours ?? 0), minutes ?? 0), 0),
    0,
  )
}

export function mergeScheduleValue(
  currentIso: string | null | undefined,
  nextDate: Date,
  timeValue: string,
): string {
  const merged = combineDateAndTime(nextDate, timeValue)
  return merged.toISOString()
}

export type SchedulePreset = {
  id: string
  label: string
  getValue: () => Date
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: "1h",
    label: "In 1 hour",
    getValue: () => addHours(new Date(), 1),
  },
  {
    id: "tomorrow-9",
    label: "Tomorrow 9 AM",
    getValue: () => setMinutes(setHours(addDays(new Date(), 1), 9), 0),
  },
  {
    id: "tomorrow-12",
    label: "Tomorrow 12 PM",
    getValue: () => setMinutes(setHours(addDays(new Date(), 1), 12), 0),
  },
  {
    id: "monday-10",
    label: "Next Mon 10 AM",
    getValue: () => setMinutes(setHours(nextMonday(new Date()), 10), 0),
  },
  {
    id: "30m",
    label: "In 30 min",
    getValue: () => addMinutes(new Date(), 30),
  },
]

export const QUICK_TIMES = ["09:00", "12:00", "15:00", "18:00"] as const
