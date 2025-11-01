// Voice configurations for different storytellers
export const storyVoices = [
   {
    name: "Martha",
    description: "Older, raspy British grandma with gravelly wisdom",
    voicePriority: ['Google UK English Female', 'Microsoft Zira - English (United States)', 'Google US English', 'Microsoft David - English (United States)', 'Microsoft Mark - English (United States)', 'Google UK English Male'],
    baseSettings: { rate: 0.96, pitch: 0.692, volume: 0.35 },
    questionMultiplier: { rate: 1.12, pitch: 1.25, volume: 0.96 }
  },
  {
    name: "Samuel",
    description: "Older, raspy British grandpa with gravelly wisdom",
    voicePriority: ['Google UK English Male', 'Microsoft David - English (United States)', 'Google US English', 'Microsoft Mark - English (United States)', 'Google UK English Female', 'Microsoft Zira - English (United States)'],
    baseSettings: { rate: 1.1263, pitch: 0.42, volume: 0.45 },
    questionMultiplier: { rate: 1.12, pitch: 3.25, volume: 2.96 }
  },
 
  {
    name: "Eleanor",
    description: "Older, rougher storyteller with gravelly wisdom",
    voicePriority: ['Karen', 'Samantha', 'Susan', 'Zoe', 'Serena', 'Microsoft Zira', 'Microsoft Hazel', 'Microsoft Susan', 'Google UK English Female', 'Google US English Female', 'Victoria', 'Tessa', 'Moira', 'Veena', 'Yelda', 'Alexandria', 'Allison', 'Ava', 'Catherine', 'Daniel'],
    baseSettings: { rate: 0.81, pitch: 0.92, volume: 0.78 },
    questionMultiplier: { rate: 1.08, pitch: 1.08, volume: 0.94 }
  },
  {
    name: "Beatrice",
    description: "Cheerful, lively narrator",
    voicePriority: ['Zoe', 'Serena', 'Samantha', 'Susan', 'Victoria', 'Microsoft Zira', 'Google US English Female', 'Google UK English Female', 'Tessa', 'Moira'],
    baseSettings: { rate: 0.95, pitch: 0.85, volume: 0.82 },
    questionMultiplier: { rate: 1.12, pitch: 1.15, volume: 0.96 }
  },

];