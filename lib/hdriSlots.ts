export type TimeSlot = {
  name: string
  hourStart: number
  hourEnd: number
  hdri: string
  envIntensity: number
  bgBlurriness: number
  bgIntensity: number
}

export const TIME_SLOTS: TimeSlot[] = [
  {
    name: 'morning',
    hourStart: 0,
    hourEnd: 10,
    hdri: '/hdri/morning.hdr',
    envIntensity: 0.8,
    bgBlurriness: 0.9,
    bgIntensity: 1,
  },
  {
    name: 'middleday',
    hourStart: 10,
    hourEnd: 16,
    hdri: '/hdri/middleday.hdr',
    envIntensity: 1.1,
    bgBlurriness: 0.9,
    bgIntensity: 1,
  },
  {
    name: 'sunset',
    hourStart: 16,
    hourEnd: 21,
    hdri: '/hdri/sunset.hdr',
    envIntensity: 0.9,
    bgBlurriness: 0.5,
    bgIntensity: 1,
  },
  {
    name: 'night',
    hourStart: 21,
    hourEnd: 24,
    hdri: '/hdri/night.hdr',
    envIntensity: 0.6,
    bgBlurriness: 0.15,
    bgIntensity: 1.7,
  },
]

export function getCurrentTimeSlot(): TimeSlot {
  const hour = new Date().getHours()
  return TIME_SLOTS.find((s) => hour >= s.hourStart && hour < s.hourEnd) ?? TIME_SLOTS[0]
}
