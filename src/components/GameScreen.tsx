import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { runCommand } from '../game/commands'
import { isAdjacent, mouseMaxHealth, playerMaxHealth } from '../game/level'
import {
  getLevelMetaForGameplayLevel,
  getSectionLevels,
  type LevelChoice,
  type LevelMeta,
} from '../game/levels'
import {
  type SecretRat,
  dungeonMap,
  drawMap,
  isSamePosition,
  isThirdRoomTeleporterPosition,
  isSecretWallCornerPassable,
  isSecretWallPushable,
  isThirdRoomWallPushable,
  isRightRoomWallPushable,
  secretRoomDoorPosition,
  secretRoomTeleporterPosition,
  dungeonDoorPosition,
  isThirdRoomBossTeleporterPosition,
  isVendingMachinePosition,
  vendingMachinePosition,
  isRightRoomTeleporterPosition,
  thirdRoomChestKeyPosition,
  thirdRoomChestPosition,
  thirdRoomLifeChestPosition,
  thirdRoomBombChestPosition,
  thirdRoomSwordChestPosition,
  bossRoomBossPosition,
  bossRoomPlayerStartPosition,
  rightRoomChestKeyPosition,
  rightRoomChestPosition,
  secretRoomHeight,
  roomWidth,
  isWall,
  mousePosition as initialMousePosition,
  startPosition,
  thirdRoomStartPosition,
  thirdRoomSupplyRoomStartPosition,
  isThirdRoomDoorPosition,
  type MapTileId,
} from '../game/map'
import type { GameMode, Position } from '../game/types'
import HelpPanel from './HelpPanel'
import ObjectivePanel from './ObjectivePanel'
import StatusBar from './StatusBar'
import { gameIntroMessage } from '../game/narrative'

type RatVariant = NonNullable<SecretRat['kind']>
type GameDifficulty = 'normal' | 'hard'
type PlayerSkin =
  | 'original'
  | 'mario'
  | 'luigi'
  | 'dinosaur'
  | 'dragon'
  | 'shadow'
  | 'ghost'
  | 'knight'
  | 'wizard'
  | 'ninja'
  | 'robot'
  | 'slime'
  | 'lightbulb'

type EnemyGuideEntry = {
  key: string
  label: string
  firstLevel: LevelChoice
  description: string
  attacks: string
  health: string
}

type TutorialPopup = {
  title: string
  body: string
} | null

const cellSpriteLabel: Record<MapTileId, string> = {
  wall: 'wall',
  floor: 'floor',
  player: 'you',
  'plumber-player': 'plumber hero',
  'green-plumber-player': 'green plumber hero',
  'dinosaur-player': 'dinosaur attack',
  dragon: 'dragon skin',
  'shadow-player': 'shadow skin',
  'ghost-player': 'ghost skin',
  'knight-player': 'knight skin',
  'wizard-player': 'wizard skin',
  'ninja-player': 'ninja skin',
  'robot-player': 'robot skin',
  'slime-player': 'slime skin',
  'lightbulb-player': 'lightbulb skin',
  rat: 'mouse',
  'rat-dead': 'defeated mouse',
  'rat-burst': 'dinosaur kill',
  'door-locked': 'locked door',
  'door-open': 'open door',
  key: 'key',
  'chest-key': 'chest key',
  void: 'void',
  chest: 'chest',
  'vending-machine': 'vending machine',
  teleporter: 'secret teleporter',
  mushroom: 'mushroom',
  trophy: 'trophy',
  'friendly-sign': 'friendly sign',
  'challenge-door': 'challenge door',
  boss: 'boss',
  'rat-stunner': 'stunner rat',
  'rat-warden': 'warden rat',
  'rat-rusher': 'rusher rat',
  'rat-sniper': 'sniper rat',
  'rat-mine': 'mine rat',
  'rat-grenadier': 'grenadier rat',
  'rat-aura': 'aura rat',
}

const EMPTY_POSITION_KEY_SET = new Set<string>()

type RatSpawn = Position & {
  kind?: RatVariant
  healthOverride?: number
  levelTwoRoomKeyReward?: 1 | 2 | 3 | 4
}

type LevelTwoRoomKeyDrop = Position & {
  reward: 1 | 2 | 3 | 4
  dropId?: number
  availableAt?: number
  expiresAt?: number
}

type BombAnimation = {
  phase: 'flying' | 'exploding'
  start: Position
  end: Position
  isTargetedKill?: boolean
  targetTile?: Position | null
  blastRadius?: number
}

type PositionPulseSetter = Dispatch<SetStateAction<Position[]>>
type TimeoutRef = { current: number | null }
type TeleportPulse = 'depart' | 'arrive' | null
type PlayerTrailPosition = Position & {
  trailId: number
  colorIndex: number
}
type EnemyHitMarker = Position & {
  markerId: number
}
type AbilityPulseType = 'bomb' | 'focused' | 'rail' | 'cleave' | 'dinosaur'
const ABILITY_PULSE_DURATIONS: Record<AbilityPulseType, number> = {
  bomb: 620,
  focused: 520,
  rail: 620,
  cleave: 540,
  dinosaur: 700,
}
const PLAYER_TRAIL_COLOR_COUNT = 7

const RAT_VARIANT_DEFAULT: RatVariant = 'normal'
const RAT_VARIANT_SNIPER: RatVariant = 'sniper'
const RAT_VARIANT_GRENADIER: RatVariant = 'grenadier'
const RAT_VARIANT_MINE: RatVariant = 'mine'
const RAT_VARIANT_WARDEN: RatVariant = 'warden'
const RAT_VARIANT_STUNNER: RatVariant = 'stunner'
const RAT_VARIANT_RUSHER: RatVariant = 'rusher'
const RAT_VARIANT_AURA: RatVariant = 'aura'

const LEVEL2_MAX_ROOM_KEYS = 4
const LEVEL2_ROOM_ENTRY_POSITIONS: [Position, Position, Position, Position] = [
  { x: 1, y: 1 },
  { x: 1, y: 6 },
  { x: 1, y: 7 },
  { x: 11, y: 1 },
]
const LEVEL2_ROOM_MAX_WIDTH = 13
const LEVEL2_ROOM_MAX_HEIGHT = 9
const LEVEL2_BONUS_ROOM_START_POSITION: Position = { x: 1, y: 1 }
const LEVEL2_BONUS_ROOM_MUSHROOM_POSITION: Position = { x: 5, y: 2 }
const LEVEL2_BONUS_ROOM_LAYOUT = [
  '#########',
  '#.......#',
  '#.......#',
  '#########',
]
const LEVEL3_TROPHY_ROOM_START_POSITION: Position = { x: 1, y: 1 }
const LEVEL3_TROPHY_POSITION: Position = { x: 5, y: 1 }
const LEVEL3_TROPHY_ROOM_LAYOUT = [
  '#########',
  '#.......#',
  '#.......#',
  '#########',
]

type LevelTwoRoomConfig = {
  room: 1 | 2 | 3 | 4
  startPosition: Position
  layout: string[]
  transitionTile: Position
  requiredKeys: number
  next: 2 | 3 | 4 | 'boss' | 'bonus'
}

const LEVEL2_ROOMS: LevelTwoRoomConfig[] = [
  {
    room: 1,
    startPosition: LEVEL2_ROOM_ENTRY_POSITIONS[0],
    layout: [
      '###################',
      '#....#....#..#....#',
      '#.##...##.##...##.#',
      '#....#....#...#...#',
      '#..##..##....##...#',
      '#....#....#.#.....#',
      '#.##...##....##...#',
      '#....#...##....#..#',
      '#....#...##....#..#',
      '#.#..#...##...##..#',
      '###################',
    ],
    transitionTile: { x: 9, y: 2 },
    requiredKeys: 1,
    next: 2,
  },
  {
    room: 2,
    startPosition: LEVEL2_ROOM_ENTRY_POSITIONS[1],
    layout: [
      '#############',
      '#...#...#...#',
      '#...#...#...#',
      '#...#...#...#',
      '#...#...#...#',
      '#...#...#...#',
      '#...#...#...#',
      '#...........#',
      '#############',
    ],
    transitionTile: { x: 10, y: 2 },
    requiredKeys: 2,
    next: 3,
  },
  {
    room: 3,
    startPosition: LEVEL2_ROOM_ENTRY_POSITIONS[2],
    layout: [
      '#############',
      '#...#...#...#',
      '#...#####...#',
      '#...#...#...#',
      '#...#...#...#',
      '#...........#',
      '#...#...#...#',
      '#...#...#...#',
      '#...#...#...#',
    ],
    transitionTile: { x: 11, y: 3 },
    requiredKeys: 3,
    next: 4,
  },
  {
    room: 4,
    startPosition: LEVEL2_ROOM_ENTRY_POSITIONS[3],
    layout: [
      '#############',
      '#...#...#...#',
      '#...#...#..##',
      '#...#...#...#',
      '#...#...#...#',
      '#...#####...#',
      '#...#...#...#',
      '#...........#',
      '#...#...#...#',
    ],
    transitionTile: { x: 11, y: 8 },
    requiredKeys: 4,
    next: 'boss',
  },
]

const LEVEL3_BOSS_ROOM_WALLS = new Set([
  '5,2',
  '6,2',
  '11,2',
  '12,2',
  '18,2',
  '19,2',
  '4,4',
  '9,4',
  '14,4',
  '20,4',
  '6,6',
  '7,6',
  '15,6',
  '16,6',
  '22,6',
  '3,8',
  '10,8',
  '11,8',
  '18,8',
  '23,8',
])

const LEVEL3_ROOMS: LevelTwoRoomConfig[] = [
  {
    room: 1,
    startPosition: { x: 1, y: 1 },
    layout: [
      '#############',
      '#...#.......#',
      '#.#.#.#####.#',
      '#.#...#.....#',
      '#.#####.###.#',
      '#.....#...#.#',
      '###.#.###.#.#',
      '#...#.....#.#',
      '#############',
    ],
    transitionTile: { x: 11, y: 7 },
    requiredKeys: 1,
    next: 2,
  },
  {
    room: 2,
    startPosition: { x: 1, y: 7 },
    layout: [
      '#############',
      '#.....#.....#',
      '#.###.#.###.#',
      '#...#...#...#',
      '###.#####.###',
      '#...#...#...#',
      '#.###.#.###.#',
      '#.....#.....#',
      '#############',
    ],
    transitionTile: { x: 11, y: 1 },
    requiredKeys: 2,
    next: 3,
  },
  {
    room: 3,
    startPosition: { x: 1, y: 1 },
    layout: [
      '#############',
      '#.....#.....#',
      '###.#.#.#.###',
      '#...#...#...#',
      '#.#######.#.#',
      '#.....#...#.#',
      '#.###.#.###.#',
      '#...#.....#.#',
      '#############',
    ],
    transitionTile: { x: 11, y: 7 },
    requiredKeys: 3,
    next: 4,
  },
  {
    room: 4,
    startPosition: { x: 11, y: 1 },
    layout: [
      '#############',
      '#...#.......#',
      '#.#.#.#####.#',
      '#.#...#...#.#',
      '#.#####.#.#.#',
      '#.....#.#...#',
      '###.#.#.###.#',
      '#...#.......#',
      '#############',
    ],
    transitionTile: { x: 1, y: 7 },
    requiredKeys: 4,
    next: 'boss',
  },
]

const LEVEL4_LIGHT_RADIUS = 2

const LEVEL4_ROOMS: LevelTwoRoomConfig[] = [
  {
    room: 1,
    startPosition: { x: 1, y: 1 },
    layout: [
      '#############',
      '#.....#.....#',
      '#.###.#.###.#',
      '#...#...#...#',
      '###.#.###.#.#',
      '#...#.....#.#',
      '#.#####.###.#',
      '#.......#...#',
      '#############',
    ],
    transitionTile: { x: 11, y: 7 },
    requiredKeys: 1,
    next: 2,
  },
  {
    room: 2,
    startPosition: { x: 1, y: 7 },
    layout: [
      '#############',
      '#...#.......#',
      '#.#.#.#####.#',
      '#.#...#...#.#',
      '#.###.#.#.#.#',
      '#.....#.#...#',
      '#.#####.###.#',
      '#...........#',
      '#############',
    ],
    transitionTile: { x: 11, y: 1 },
    requiredKeys: 2,
    next: 3,
  },
  {
    room: 3,
    startPosition: { x: 1, y: 1 },
    layout: [
      '#############',
      '#.......#...#',
      '#.#####.#.#.#',
      '#.#...#...#.#',
      '#.#.#.#####.#',
      '#...#.......#',
      '###.#######.#',
      '#...........#',
      '#############',
    ],
    transitionTile: { x: 11, y: 7 },
    requiredKeys: 3,
    next: 4,
  },
  {
    room: 4,
    startPosition: { x: 11, y: 1 },
    layout: [
      '#############',
      '#...#.......#',
      '#.#.#.###.#.#',
      '#.#...#...#.#',
      '#.#####.###.#',
      '#.....#.....#',
      '###.#.#####.#',
      '#...#.......#',
      '#############',
    ],
    transitionTile: { x: 1, y: 7 },
    requiredKeys: 4,
    next: 'boss',
  },
]

const LEVEL2_ROOM_SPAWNS: RatSpawn[] = [
  { x: 9, y: 1, levelTwoRoomKeyReward: 1, kind: RAT_VARIANT_SNIPER },
  { x: 11, y: 1, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
  { x: 12, y: 2, kind: RAT_VARIANT_MINE, healthOverride: 1 },
  { x: 11, y: 3, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 3, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 11, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 6, y: 5, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
]

const LEVEL2_BOSS_ROOM_SPAWNS: RatSpawn[] = [
  { x: 11, y: 1, kind: RAT_VARIANT_GRENADIER, healthOverride: 2, levelTwoRoomKeyReward: 2 },
  { x: 9, y: 1, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 10, y: 2, kind: RAT_VARIANT_SNIPER },
  { x: 11, y: 3, kind: RAT_VARIANT_MINE },
  { x: 11, y: 4, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 8, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 10, y: 5, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
  { x: 10, y: 6, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
]

const LEVEL2_FINAL_ROOM_SPAWNS: RatSpawn[] = [
  { x: 11, y: 2, levelTwoRoomKeyReward: 3, kind: RAT_VARIANT_SNIPER },
  { x: 11, y: 1, kind: RAT_VARIANT_GRENADIER },
  { x: 10, y: 4, kind: RAT_VARIANT_MINE, healthOverride: 1 },
  { x: 11, y: 5, kind: RAT_VARIANT_SNIPER },
  { x: 11, y: 6, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 10, y: 3, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
  { x: 5, y: 7, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
]

const LEVEL2_PRE_BOSS_ROOM_SPAWNS: RatSpawn[] = [
  { x: 7, y: 1, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
  { x: 9, y: 3, kind: RAT_VARIANT_SNIPER },
  { x: 3, y: 4, kind: RAT_VARIANT_MINE, healthOverride: 1 },
  { x: 10, y: 6, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
  { x: 2, y: 8, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 11, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 1, y: 5, kind: RAT_VARIANT_GRENADIER, healthOverride: 2, levelTwoRoomKeyReward: 4 },
  { x: 10, y: 7, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
]

const LEVEL3_ROOM_SPAWNS: RatSpawn[] = [
  { x: 9, y: 1, levelTwoRoomKeyReward: 1, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
  { x: 11, y: 1, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
  { x: 3, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 11, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 6, y: 5, kind: RAT_VARIANT_AURA, healthOverride: 2 },
]

const LEVEL3_BOSS_ROOM_SPAWNS: RatSpawn[] = [
  { x: 11, y: 1, kind: RAT_VARIANT_SNIPER, healthOverride: 2, levelTwoRoomKeyReward: 2 },
  { x: 9, y: 1, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
  { x: 11, y: 3, kind: RAT_VARIANT_MINE, healthOverride: 1 },
  { x: 8, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 10, y: 5, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
  { x: 10, y: 6, kind: RAT_VARIANT_AURA, healthOverride: 2 },
]

const LEVEL3_FINAL_ROOM_SPAWNS: RatSpawn[] = [
  { x: 11, y: 2, levelTwoRoomKeyReward: 3, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
  { x: 11, y: 1, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
  { x: 10, y: 4, kind: RAT_VARIANT_MINE, healthOverride: 1 },
  { x: 11, y: 5, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
  { x: 11, y: 6, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 10, y: 3, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
  { x: 5, y: 7, kind: RAT_VARIANT_AURA, healthOverride: 2 },
]

const LEVEL3_PRE_BOSS_ROOM_SPAWNS: RatSpawn[] = [
  { x: 7, y: 1, kind: RAT_VARIANT_AURA, healthOverride: 2 },
  { x: 9, y: 3, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
  { x: 1, y: 5, kind: RAT_VARIANT_WARDEN, healthOverride: 2, levelTwoRoomKeyReward: 4 },
  { x: 10, y: 6, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
  { x: 2, y: 8, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 11, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 1, y: 5, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
  { x: 10, y: 7, kind: RAT_VARIANT_MINE, healthOverride: 1 },
]

const LEVEL4_ROOM_SPAWNS: RatSpawn[] = [
  { x: 9, y: 1, levelTwoRoomKeyReward: 1, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
  { x: 11, y: 3, kind: RAT_VARIANT_MINE, healthOverride: 1 },
  { x: 5, y: 5, kind: RAT_VARIANT_AURA, healthOverride: 2 },
  { x: 7, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
  { x: 3, y: 3, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
]

const LEVEL4_BOSS_ROOM_SPAWNS: RatSpawn[] = [
  { x: 10, y: 1, levelTwoRoomKeyReward: 2, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
  { x: 3, y: 3, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
  { x: 6, y: 5, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
  { x: 11, y: 5, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
  { x: 9, y: 7, kind: RAT_VARIANT_AURA, healthOverride: 2 },
  { x: 1, y: 5, kind: RAT_VARIANT_MINE, healthOverride: 1 },
]

const LEVEL4_FINAL_ROOM_SPAWNS: RatSpawn[] = [
  { x: 11, y: 1, levelTwoRoomKeyReward: 3, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
  { x: 8, y: 1, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
  { x: 3, y: 3, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
  { x: 7, y: 5, kind: RAT_VARIANT_AURA, healthOverride: 2 },
  { x: 11, y: 5, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
  { x: 5, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
]

const LEVEL4_PRE_BOSS_ROOM_SPAWNS: RatSpawn[] = [
  { x: 3, y: 1, levelTwoRoomKeyReward: 4, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
  { x: 9, y: 1, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
  { x: 5, y: 3, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
  { x: 11, y: 5, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
  { x: 7, y: 7, kind: RAT_VARIANT_AURA, healthOverride: 2 },
  { x: 1, y: 5, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
  { x: 10, y: 7, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
]

const LEVEL2_ROOM_REWARDS_BY_ROOM: Record<1 | 2 | 3 | 4, RatSpawn[]> = {
  1: LEVEL2_ROOM_SPAWNS,
  2: LEVEL2_BOSS_ROOM_SPAWNS,
  3: LEVEL2_FINAL_ROOM_SPAWNS,
  4: LEVEL2_PRE_BOSS_ROOM_SPAWNS,
}

const LEVEL3_ROOM_REWARDS_BY_ROOM: Record<1 | 2 | 3 | 4, RatSpawn[]> = {
  1: LEVEL3_ROOM_SPAWNS,
  2: LEVEL3_BOSS_ROOM_SPAWNS,
  3: LEVEL3_FINAL_ROOM_SPAWNS,
  4: LEVEL3_PRE_BOSS_ROOM_SPAWNS,
}

const LEVEL4_ROOM_REWARDS_BY_ROOM: Record<1 | 2 | 3 | 4, RatSpawn[]> = {
  1: LEVEL4_ROOM_SPAWNS,
  2: LEVEL4_BOSS_ROOM_SPAWNS,
  3: LEVEL4_FINAL_ROOM_SPAWNS,
  4: LEVEL4_PRE_BOSS_ROOM_SPAWNS,
}

const HARD_MODE_EXTRA_RANGED_SPAWNS: Partial<Record<LevelChoice, Partial<Record<1 | 2 | 3 | 4, RatSpawn[]>>>> = {
  2: {
    2: [{ x: 10, y: 1, kind: RAT_VARIANT_SNIPER, healthOverride: 2 }],
    3: [{ x: 9, y: 7, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 }],
    4: [{ x: 3, y: 1, kind: RAT_VARIANT_SNIPER, healthOverride: 2 }],
  },
  3: {
    1: [{ x: 5, y: 1, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 }],
    2: [{ x: 10, y: 7, kind: RAT_VARIANT_WARDEN, healthOverride: 2 }],
    3: [{ x: 1, y: 7, kind: RAT_VARIANT_SNIPER, healthOverride: 2 }],
    4: [{ x: 3, y: 1, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 }],
  },
  4: {
    1: [{ x: 11, y: 1, kind: RAT_VARIANT_SNIPER, healthOverride: 2 }],
    2: [{ x: 10, y: 7, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 }],
    3: [{ x: 1, y: 1, kind: RAT_VARIANT_WARDEN, healthOverride: 2 }],
    4: [{ x: 3, y: 7, kind: RAT_VARIANT_SNIPER, healthOverride: 2 }],
  },
}

const HARD_MODE_TRAP_TILES: Partial<Record<LevelChoice, Partial<Record<1 | 2 | 3 | 4, Position[]>>>> = {
  2: {
    1: [{ x: 5, y: 1 }],
    2: [{ x: 7, y: 7 }],
    3: [{ x: 3, y: 5 }],
    4: [{ x: 7, y: 5 }],
  },
  3: {
    1: [{ x: 5, y: 1 }, { x: 3, y: 7 }],
    2: [{ x: 7, y: 7 }, { x: 9, y: 1 }],
    3: [{ x: 3, y: 5 }, { x: 9, y: 7 }],
    4: [{ x: 7, y: 5 }, { x: 3, y: 1 }],
  },
  4: {
    1: [{ x: 5, y: 1 }, { x: 7, y: 7 }],
    2: [{ x: 7, y: 7 }, { x: 11, y: 1 }],
    3: [{ x: 3, y: 5 }, { x: 11, y: 7 }],
    4: [{ x: 7, y: 5 }, { x: 3, y: 7 }],
  },
}

const NORMAL_MODE_FRIENDLY_SIGNS: Partial<Record<LevelChoice, Partial<Record<1 | 2 | 3 | 4, Array<Position & { message: string }>>>>> = {
  2: {
    2: [{ x: 1, y: 1, message: 'SIGN: Ranged rats need line of sight. Break the line with walls.' }],
    3: [{ x: 1, y: 7, message: 'SIGN: Room keys can be picked up from an adjacent square with P.' }],
    4: [{ x: 11, y: 5, message: 'SIGN: Boss doors need the key guard defeated first.' }],
  },
  3: {
    1: [{ x: 1, y: 3, message: 'SIGN: Focused shot works best down clear straight lanes.' }],
    2: [{ x: 1, y: 1, message: 'SIGN: Aura rats keep other enemies alive. Remove support first.' }],
    3: [{ x: 1, y: 7, message: 'SIGN: Use walls to split ranged enemies before fighting.' }],
    4: [{ x: 11, y: 5, message: 'SIGN: Challenge doors are optional, but rewards help.' }],
  },
  4: {
    1: [{ x: 1, y: 5, message: 'SIGN: Rail shot pierces enemies in one straight line.' }],
    2: [{ x: 1, y: 1, message: 'SIGN: In dark rooms, lightbulb skin can reveal the whole room.' }],
    3: [{ x: 1, y: 7, message: 'SIGN: Watch enemy types before spending cooldowns.' }],
    4: [{ x: 11, y: 5, message: 'SIGN: The last room rewards patience more than speed.' }],
  },
}

const NORMAL_MODE_CHALLENGE_DOORS: Partial<Record<LevelChoice, Partial<Record<1 | 2 | 3 | 4, Position>>>> = {
  1: {
    1: { x: 2, y: 1 },
  },
  2: {
    1: { x: 2, y: 1 },
    2: { x: 2, y: 1 },
    3: { x: 7, y: 7 },
    4: { x: 3, y: 7 },
  },
  3: {
    1: { x: 2, y: 1 },
    2: { x: 3, y: 7 },
    3: { x: 7, y: 1 },
    4: { x: 5, y: 7 },
  },
  4: {
    1: { x: 2, y: 1 },
    2: { x: 7, y: 7 },
    3: { x: 5, y: 1 },
    4: { x: 5, y: 7 },
  },
}

const NORMAL_MODE_TUTORIALS: Record<LevelChoice, TutorialPopup> = {
  1: {
    title: 'Bomb Ability Unlocked',
    body: 'Press W to throw a bomb. Bombs can clear rats quickly.',
  },
  2: {
    title: 'Cleave Ability Unlocked',
    body: 'Press D to cleave adjacent enemies. Bombs are infinite from Level 2 onward.',
  },
  3: {
    title: 'Focused Shot Unlocked',
    body: 'Press A to shoot one enemy in a clear straight line.',
  },
  4: {
    title: 'Rail Shot Unlocked',
    body: 'Press S to pierce up to 2 enemies in one straight line.',
  },
}

const PLAYER_SKIN_OPTIONS: Array<{ key: PlayerSkin; label: string; tile: MapTileId }> = [
  { key: 'original', label: 'Original', tile: 'player' },
  { key: 'mario', label: 'Mario', tile: 'plumber-player' },
  { key: 'luigi', label: 'Luigi', tile: 'green-plumber-player' },
  { key: 'dinosaur', label: 'Dinosaur', tile: 'dinosaur-player' },
  { key: 'dragon', label: 'Dragon', tile: 'dragon' },
  { key: 'shadow', label: 'Shadow', tile: 'shadow-player' },
  { key: 'ghost', label: 'Ghost', tile: 'ghost-player' },
  { key: 'knight', label: 'Knight', tile: 'knight-player' },
  { key: 'wizard', label: 'Wizard', tile: 'wizard-player' },
  { key: 'ninja', label: 'Ninja', tile: 'ninja-player' },
  { key: 'robot', label: 'Robot', tile: 'robot-player' },
  { key: 'slime', label: 'Slime', tile: 'slime-player' },
  { key: 'lightbulb', label: 'Lightbulb', tile: 'lightbulb-player' },
]

const ENEMY_GUIDE_ENTRIES: EnemyGuideEntry[] = [
  {
    key: 'mouse',
    label: 'Mouse',
    firstLevel: 1,
    description: 'The basic enemy. It blocks paths and punishes careless movement.',
    attacks: 'Attacks when adjacent to the player.',
    health: `${mouseMaxHealth} health.`,
  },
  {
    key: 'dragon',
    label: 'Dragon',
    firstLevel: 1,
    description: 'A boss enemy that appears in boss arenas.',
    attacks: 'Moves and retaliates when fought up close.',
    health: '5 health in early boss fights, higher in advanced fights.',
  },
  {
    key: 'sniper',
    label: 'Sniper Rat',
    firstLevel: 2,
    description: 'A ranged rat that locks onto straight lines.',
    attacks: 'Charges briefly, then fires if you are aligned with clear line of sight.',
    health: 'Usually 1-2 health depending on room.',
  },
  {
    key: 'grenadier',
    label: 'Grenadier Rat',
    firstLevel: 2,
    description: 'A ranged rat that launches explosive attacks.',
    attacks: 'Charges briefly, then attacks along a clear line.',
    health: 'Usually 2 health.',
  },
  {
    key: 'mine',
    label: 'Mine Rat',
    firstLevel: 2,
    description: 'A close-range explosive rat.',
    attacks: 'Detonates when close enough after its charge window.',
    health: 'Usually 1 health.',
  },
  {
    key: 'warden',
    label: 'Warden Rat',
    firstLevel: 2,
    description: 'A turret-like rat that hits harder than normal ranged enemies.',
    attacks: 'Charges briefly, then fires a stronger ranged shot.',
    health: 'Usually 2 health.',
  },
  {
    key: 'stunner',
    label: 'Stunner Rat',
    firstLevel: 2,
    description: 'A control enemy that can interrupt your movement.',
    attacks: 'Charges briefly, then damages and stuns the player.',
    health: 'Usually 2 health.',
  },
  {
    key: 'rusher',
    label: 'Rusher Rat',
    firstLevel: 2,
    description: 'A fast short-range enemy.',
    attacks: 'Moves quickly and hits harder when adjacent.',
    health: 'Usually 2 health.',
  },
  {
    key: 'aura',
    label: 'Aura Rat',
    firstLevel: 3,
    description: 'A support rat that keeps nearby enemies alive.',
    attacks: 'Heals nearby damaged rats with periodic pulses.',
    health: 'Usually 2 health.',
  },
]

function getPlayerSkinTile(skin: PlayerSkin) {
  return PLAYER_SKIN_OPTIONS.find((option) => option.key === skin)?.tile ?? 'player'
}

function getEnemyGuideEntriesForLevel(level: LevelChoice) {
  return ENEMY_GUIDE_ENTRIES.filter((entry) => entry.firstLevel <= level)
}

const randomMovementDirections: Position[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

const NORMAL_ENEMY_MOVE_INTERVAL_MS = 667
const BOSS_ENEMY_MOVE_INTERVAL_MS = NORMAL_ENEMY_MOVE_INTERVAL_MS * 2
const RAT_REPRISAL_COOLDOWN_MS = 310
const BOSS_REPRISAL_COOLDOWN_MS = 275
const LEVEL2_ENEMY_MOVE_INTERVAL_MS = 800
const LEVEL2_BOSS_MOVE_INTERVAL_MS = 1450
const LEVEL2_SNIPER_RANGE = 7
const LEVEL2_SNIPER_COOLDOWN_MS = 10400
const LEVEL2_GRENADIER_RANGE = 7
const LEVEL2_GRENADIER_COOLDOWN_MS = 12800
const LEVEL2_RANGED_RAT_ATTACK_DELAY_MS = 310
const LEVEL2_WARDEN_RANGE = 8
const LEVEL2_WARDEN_COOLDOWN_MS = 4200
const LEVEL2_WARDEN_DAMAGE = 2
const LEVEL2_RUSHER_REPRISAL_DAMAGE = 2
const LEVEL2_RUSHER_MOVE_STEPS = 2
const LEVEL2_STUNNER_RANGE = 7
const LEVEL2_STUNNER_COOLDOWN_MS = 3000
const LEVEL2_STUNNER_STUN_MS = 2000
const LEVEL2_RAIL_SHOT_RANGE = 6
const LEVEL2_RAIL_SHOT_TARGET_LIMIT = 2
const LEVEL2_RAIL_SHOT_COOLDOWN_MS = 1500
const LEVEL2_BOMB_THROW_COOLDOWN_MS = 2000
const HARD_MODE_BOMB_THROW_COOLDOWN_MS = LEVEL2_BOMB_THROW_COOLDOWN_MS * 1.5
const HARD_MODE_SHARED_ABILITY_COOLDOWN_MS = 3000
const HARD_MODE_KEY_DROP_LIFETIME_MS = 5000
const HARD_MODE_TRAP_SLOW_DURATION_MS = 1000
const HARD_MODE_TRAP_MOVE_DELAY_MS = 500
const LEVEL2_FOCUSED_SHOT_RANGE = 7
const LEVEL2_FOCUSED_SHOT_COOLDOWN_MS = 1300
const LEVEL2_MINE_RANGE = 2
const LEVEL2_MINE_COOLDOWN_MS = 2800
const LEVEL2_TASER_RANGE = 6
const LEVEL2_TASER_COOLDOWN_MS = 3200
const LEVEL2_TASER_STUN_DURATION_MS = 2400
const LEVEL2_SHOCKWAVE_COOLDOWN_MS = 2400
const LEVEL2_BLAST_WAVE_COOLDOWN_MS = 1800
const LEVEL2_BLAST_WAVE_RADIUS = 2
const LEVEL2_BLAST_WAVE_DAMAGE = 2
const LEVEL2_BLAST_WAVE_STUN_MS = 1700
const LEVEL2_MIND_WAVE_COOLDOWN_MS = 2400
const LEVEL2_MIND_WAVE_STUN_MS = 1800
const LEVEL2_MIND_WAVE_RADIUS = 3
const LEVEL2_SNIPER_HEALTH_BOOST = 0
const LEVEL2_GRENADE_RANGE = 7
const LEVEL2_GRENADE_COOLDOWN_MS = 2200
const LEVEL2_GRENADE_BOMB_RADIUS = 2
const LEVEL2_AURA_HEAL_COOLDOWN_MS = 9000
const LEVEL2_AURA_HEAL_RADIUS = 2
const LEVEL2_AURA_HEAL_AMOUNT = 1
const LEVEL2_CLEAVE_COOLDOWN_MS = 900
const ENEMY_TICK_GAP_GRACE_MS = 48
const SKIN_ABILITY_DURATION_MS = 5000
const HARD_MODE_SKIN_ABILITY_DURATION_MS = 3000
const SKIN_ABILITY_SKINS: PlayerSkin[] = ['ghost', 'ninja', 'shadow', 'mario', 'luigi']
const HARD_MODE_CHARGE_MOVE_DELAY_MS = 500

function shuffleDirections<T>(values: T[]) {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentValue = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = currentValue
  }

  return shuffled
}

type LevelTwoCollisionContext = {
  roomConfig: LevelTwoRoomConfig
  roomWidth: number
  roomHeight: number
  hasEnoughKeys: boolean
}

type GameScreenProps = {
  level: LevelChoice
  levelMeta: LevelMeta
  difficulty?: GameDifficulty
  onModeChange?: (difficulty: GameDifficulty) => void
}

const MODE_OPTIONS: Array<{ key: GameDifficulty; label: string; description: string }> = [
  {
    key: 'normal',
    label: 'Normal Mode',
    description: 'Two lives and regular level select.',
  },
  {
    key: 'hard',
    label: 'Hard Mode',
    description: 'Restarts from the hard-mode checkpoint after death.',
  },
]

export default function GameScreen({
  level,
  levelMeta,
  difficulty = 'normal',
  onModeChange,
}: GameScreenProps) {
  const isHardMode = difficulty === 'hard'
  const [activeLevel, setActiveLevel] = useState<LevelChoice>(level)
  const isLevelTwo = activeLevel >= 2
  const currentPlayerMaxHealth = isHardMode ? playerMaxHealth : 2
  const [player, setPlayer] = useState<Position>(startPosition)
  const [playerHealth, setPlayerHealth] = useState(currentPlayerMaxHealth)
  const [mouseHealth, setMouseHealth] = useState(mouseMaxHealth)
  const [mainMousePosition, setMainMousePosition] = useState(initialMousePosition)
  const [showHelp, setShowHelp] = useState(true)
  const [mode, setMode] = useState<GameMode>('normal')
  const [commandInput, setCommandInput] = useState('')
  const [messages, setMessages] = useState([gameIntroMessage])
  const [message, setMessage] = useState(gameIntroMessage)
  const [isDead, setIsDead] = useState(false)
  const [showBossLevelSelect, setShowBossLevelSelect] = useState(false)
  const [showNextLevelPrompt, setShowNextLevelPrompt] = useState(false)
  const [hasEscaped, setHasEscaped] = useState(false)
  const [secretRoomKnown, setSecretRoomKnown] = useState(false)
  const [secretWallShifted, setSecretWallShifted] = useState(false)
  const [secretWallShaking, setSecretWallShaking] = useState(false)
  const [secretPocketOpen, setSecretPocketOpen] = useState(false)
  const [secretPocketRats, setSecretPocketRats] = useState<SecretRat[]>([])
  const [secretPocketRatsSpawned, setSecretPocketRatsSpawned] = useState(false)
  const [mainMouseSkullVisible, setMainMouseSkullVisible] = useState(false)
  const [mainMouseKeyVisible, setMainMouseKeyVisible] = useState(false)
  const [doorKeyCount, setDoorKeyCount] = useState(0)
  const [chestKeyCount, setChestKeyCount] = useState(0)
  const [bombCount, setBombCount] = useState(0)
  const [hasSword, setHasSword] = useState(false)
  const [ratsUntilDinosaurUnlocked, setRatsUntilDinosaurUnlocked] = useState(3)
  const [vendingMachineAvailable, setVendingMachineAvailable] = useState(false)
  const [showVendingMenu, setShowVendingMenu] = useState(false)
  const [isDinosaurAttackActive, setIsDinosaurAttackActive] = useState(false)
  const [rightRoomKnown, setRightRoomKnown] = useState(false)
  const [rightRoomBlockShifted, setRightRoomBlockShifted] = useState(false)
  const [rightRoomChestKeyVisible, setRightRoomChestKeyVisible] = useState(false)
  const [rightRoomChestOpen, setRightRoomChestOpen] = useState(false)
  const [isDoorOpen, setIsDoorOpen] = useState(false)
  const [isSecretRoomDoorOpen, setIsSecretRoomDoorOpen] = useState(false)
  const [thirdRoomKnown, setThirdRoomKnown] = useState(false)
  const [thirdRoomChestKeyVisible, setThirdRoomChestKeyVisible] = useState(false)
  const [thirdRoomChestOpen, setThirdRoomChestOpen] = useState(false)
  const [thirdRoomBlockShifted, setThirdRoomBlockShifted] = useState(false)
  const [thirdRoomLifeChestOpen, setThirdRoomLifeChestOpen] = useState(false)
  const [thirdRoomBombChestOpen, setThirdRoomBombChestOpen] = useState(false)
  const [thirdRoomSwordChestOpen, setThirdRoomSwordChestOpen] = useState(false)
  const [thirdRoomDoorOpen, setThirdRoomDoorOpen] = useState(false)
  const [isBossFight, setIsBossFight] = useState(false)
  const [bombAnimation, setBombAnimation] = useState<BombAnimation | null>(null)
  const [bombCooldownProgress, setBombCooldownProgress] = useState(1)
  const [hardModeSharedAbilityProgress, setHardModeSharedAbilityProgress] = useState(1)
  const [playerAttackPulsePositions, setPlayerAttackPulsePositions] = useState<Position[]>([])
  const [dinosaurAttackPulsePositions, setDinosaurAttackPulsePositions] = useState<Position[]>([])
  const [ratHitPulsePositions, setRatHitPulsePositions] = useState<Position[]>([])
  const [enemyHitMarkers, setEnemyHitMarkers] = useState<EnemyHitMarker[]>([])
  const [ratDeathPulsePositions, setRatDeathPulsePositions] = useState<Position[]>([])
  const [ratAttackPulsePositions, setRatAttackPulsePositions] = useState<Position[]>([])
  const [ratAttackSourcePulsePositions, setRatAttackSourcePulsePositions] = useState<Position[]>([])
  const [bossDeathPulsePositions, setBossDeathPulsePositions] = useState<Position[]>([])
  const [interactionPulsePositions, setInteractionPulsePositions] = useState<Position[]>([])
  const [movePulsePositions, setMovePulsePositions] = useState<Position[]>([])
  const [playerTrailPositions, setPlayerTrailPositions] = useState<PlayerTrailPosition[]>([])
  const [doorPulsePositions, setDoorPulsePositions] = useState<Position[]>([])
  const [pickupPulsePositions, setPickupPulsePositions] = useState<Position[]>([])
  const [chestPulsePositions, setChestPulsePositions] = useState<Position[]>([])
  const [wallShiftPulsePositions, setWallShiftPulsePositions] = useState<Position[]>([])
  const [teleportPulsePositions, setTeleportPulsePositions] = useState<Position[]>([])
  const [abilityPulsePositions, setAbilityPulsePositions] = useState<Position[]>([])
  const [abilityPulseType, setAbilityPulseType] = useState<AbilityPulseType | null>(null)
  const [isAttackCharging, setIsAttackCharging] = useState(false)
  const [attackChargeLevel, setAttackChargeLevel] = useState(0)
  const [levelTwoCurrentRoom, setLevelTwoCurrentRoom] = useState<1 | 2 | 3 | 4>(1)
  const [levelTwoRoomKeys, setLevelTwoRoomKeys] = useState(0)
  const [levelTwoRoomKeyDrops, setLevelTwoRoomKeyDrops] = useState<LevelTwoRoomKeyDrop[]>([])
  const [isLevelTwoBonusRoom, setIsLevelTwoBonusRoom] = useState(false)
  const [isLevelThreeTrophyRoom, setIsLevelThreeTrophyRoom] = useState(false)
  const [isMushroomAvailable, setIsMushroomAvailable] = useState(false)
  const [hasSkinChangeAbility, setHasSkinChangeAbility] = useState(level >= 3)
  const [equippedSkin, setEquippedSkin] = useState<PlayerSkin>('original')
  const [showSkinUnlockPopup, setShowSkinUnlockPopup] = useState(false)
  const [showSkinMenu, setShowSkinMenu] = useState(false)
  const [skinMenuIndex, setSkinMenuIndex] = useState(0)
  const [skinMenuSearch, setSkinMenuSearch] = useState('')
  const [showEnemyGuide, setShowEnemyGuide] = useState(false)
  const [enemyGuideMode, setEnemyGuideMode] = useState<'list' | 'detail'>('list')
  const [enemyGuideIndex, setEnemyGuideIndex] = useState(0)
  const [enemyGuideSearch, setEnemyGuideSearch] = useState('')
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [modeMenuIndex, setModeMenuIndex] = useState(difficulty === 'hard' ? 1 : 0)
  const [modeMenuSearch, setModeMenuSearch] = useState('')
  const [tutorialPopup, setTutorialPopup] = useState<TutorialPopup>(null)
  const [normalModeChallengeDoorsUsed, setNormalModeChallengeDoorsUsed] = useState<string[]>([])
  const [showChallengePrompt, setShowChallengePrompt] = useState(false)
  const [showKeyVanishedPopup, setShowKeyVanishedPopup] = useState(false)
  const [activeSkinAbility, setActiveSkinAbility] = useState<PlayerSkin | null>(null)
  const [skinAbilityCoolingDown, setSkinAbilityCoolingDown] = useState(false)
  const [skinAbilityProgress, setSkinAbilityProgress] = useState(1)
  const [isPlayerHurtPulse, setIsPlayerHurtPulse] = useState(false)
  const [isPlayerDeathPulse, setIsPlayerDeathPulse] = useState(false)
  const [isPlayerStunned, setIsPlayerStunned] = useState(false)
  const [teleportMapPulse, setTeleportMapPulse] = useState<TeleportPulse>(null)
  const playerRef = useRef(player)
  const playerHealthRef = useRef(playerHealth)
  const mouseHealthRef = useRef(mouseHealth)
  const mainMousePositionRef = useRef(mainMousePosition)
  const isDeadRef = useRef(isDead)
  const hasEscapedRef = useRef(hasEscaped)
  const secretPocketRatsRef = useRef<SecretRat[]>(secretPocketRats)
  const enemyMoveIntervalRef = useRef<number | null>(null)
  const ratReprisalTimeoutRef = useRef<number | null>(null)
  const bombFlightTimeoutRef = useRef<number | null>(null)
  const bombImpactTimeoutRef = useRef<number | null>(null)
  const bombCooldownIntervalRef = useRef<number | null>(null)
  const playerAttackPulseTimeoutRef = useRef<number | null>(null)
  const dinosaurAttackPulseTimeoutRef = useRef<number | null>(null)
  const ratHitPulseTimeoutRef = useRef<number | null>(null)
  const ratDeathPulseTimeoutRef = useRef<number | null>(null)
  const ratAttackPulseTimeoutRef = useRef<number | null>(null)
  const ratAttackSourcePulseTimeoutRef = useRef<number | null>(null)
  const bossDeathPulseTimeoutRef = useRef<number | null>(null)
  const interactionPulseTimeoutRef = useRef<number | null>(null)
  const playerHurtPulseTimeoutRef = useRef<number | null>(null)
  const playerDeathPulseTimeoutRef = useRef<number | null>(null)
  const movePulseTimeoutRef = useRef<number | null>(null)
  const doorPulseTimeoutRef = useRef<number | null>(null)
  const pickupPulseTimeoutRef = useRef<number | null>(null)
  const chestPulseTimeoutRef = useRef<number | null>(null)
  const wallShiftPulseTimeoutRef = useRef<number | null>(null)
  const teleportPulseTimeoutRef = useRef<number | null>(null)
  const teleportTransitionDepartRef = useRef<number | null>(null)
  const teleportTransitionArriveRef = useRef<number | null>(null)
  const abilityPulseTimeoutRef = useRef<number | null>(null)
  const attackChargeIntervalRef = useRef<number | null>(null)
  const attackChargeStartedAtRef = useRef<number | null>(null)
  const isAttackChargingRef = useRef(false)
  const lastHardModeChargeMoveAtRef = useRef(0)
  const playerSlowedUntilRef = useRef(0)
  const lastHardModeSlowMoveAtRef = useRef(0)
  const hardModeSharedAbilityIntervalRef = useRef<number | null>(null)
  const focusedShotReadyAtRef = useRef(0)
  const levelTwoGrenadeReadyAtRef = useRef(0)
  const levelTwoBombReadyAtRef = useRef(0)
  const levelTwoCleaveReadyAtRef = useRef(0)
  const hardModeSharedAbilityReadyAtRef = useRef(0)
  const levelTwoRailShotReadyAtRef = useRef(0)
  const levelTwoTaserReadyAtRef = useRef(0)
  const levelTwoShockwaveReadyAtRef = useRef(0)
  const levelTwoBlastWaveReadyAtRef = useRef(0)
  const levelTwoMindWaveReadyAtRef = useRef(0)
  const isLevelTwoRef = useRef(isLevelTwo)
  const modeRef = useRef<GameMode>(mode)
  const showVendingMenuRef = useRef(showVendingMenu)
  const showBossLevelSelectRef = useRef(showBossLevelSelect)
  const showNextLevelPromptRef = useRef(showNextLevelPrompt)
  const showSkinUnlockPopupRef = useRef(showSkinUnlockPopup)
  const showSkinMenuRef = useRef(showSkinMenu)
  const showEnemyGuideRef = useRef(showEnemyGuide)
  const enemyGuideModeRef = useRef<'list' | 'detail'>(enemyGuideMode)
  const enemyGuideIndexRef = useRef(enemyGuideIndex)
  const enemyGuideSearchRef = useRef('')
  const showModeMenuRef = useRef(showModeMenu)
  const modeMenuIndexRef = useRef(modeMenuIndex)
  const modeMenuSearchRef = useRef('')
  const tutorialPopupRef = useRef<TutorialPopup>(tutorialPopup)
  const tutorialPopupDismissReadyAtRef = useRef(0)
  const tutorialPopupDelayTimeoutRef = useRef<number | null>(null)
  const ratKillsTowardNextBombRef = useRef(0)
  const normalModeChallengeDoorsUsedRef = useRef<string[]>([])
  const normalModeTutorialsSeenRef = useRef<LevelChoice[]>([])
  const showChallengePromptRef = useRef(false)
  const challengeModeLevelRef = useRef<LevelChoice | null>(null)
  const showKeyVanishedPopupRef = useRef(false)
  const keyVanishedPopupReadyAtRef = useRef(0)
  const hasSkinChangeAbilityRef = useRef(hasSkinChangeAbility)
  const equippedSkinRef = useRef(equippedSkin)
  const skinMenuIndexRef = useRef(skinMenuIndex)
  const skinMenuSearchRef = useRef('')
  const activeSkinAbilityRef = useRef<PlayerSkin | null>(activeSkinAbility)
  const skinAbilityCoolingDownRef = useRef(false)
  const skinAbilityTimeoutRef = useRef<number | null>(null)
  const skinAbilityIntervalRef = useRef<number | null>(null)
  const isLevelSelectionInProgressRef = useRef(false)
  const teleportMapPulseRef = useRef<TeleportPulse>(teleportMapPulse)
  const hasActiveBossRef = useRef(false)
  const isActiveBossFightRef = useRef(false)
  const isDinosaurAttackActiveRef = useRef(isDinosaurAttackActive)
  const isWindowVisibleRef = useRef(true)
  const isBombAnimatingRef = useRef(false)
  const levelTwoCurrentRoomRef = useRef<1 | 2 | 3 | 4>(1)
  const levelTwoRoomKeysRef = useRef(0)
  const isLevelTwoBonusRoomRef = useRef(false)
  const isLevelThreeTrophyRoomRef = useRef(false)
  const activeLevelRef = useRef<LevelChoice>(activeLevel)
  const playerStunnedUntilRef = useRef(0)
  const playerStunTimeoutRef = useRef<number | null>(null)
  const lastEnemyTickRef = useRef(0)
  const lastBossTickRef = useRef(0)
  const commandInputRef = useRef('')
  const doorUnlockedRef = useRef(false)
  const playerTrailColorIndexRef = useRef(0)
  const hardModeRespawnLevelRef = useRef<LevelChoice>(1)

  const isBombAnimating = bombAnimation !== null

  const isMouseAlive = mouseHealth > 0
  const isBossArenaLoaded = secretPocketRats.length > 0
  const isActiveBossFight =
    isBossFight &&
    mainMousePosition.x === 999 &&
    mainMousePosition.y === 999 &&
    isBossArenaLoaded &&
    !hasEscaped
  const hasActiveBoss =
    isActiveBossFight && secretPocketRats.some((rat) => rat.health > 0 && rat.isBoss)
  const doorUnlocked = !isMouseAlive
  const dinosaurAttackUnlocked = ratsUntilDinosaurUnlocked <= 0
  const enemyMoveIntervalMs = isLevelTwo
    ? LEVEL2_ENEMY_MOVE_INTERVAL_MS
    : NORMAL_ENEMY_MOVE_INTERVAL_MS
  const bossMoveIntervalMs = isLevelTwo
    ? LEVEL2_BOSS_MOVE_INTERVAL_MS
    : BOSS_ENEMY_MOVE_INTERVAL_MS
  const isSupplyRoomFullyLooted = thirdRoomLifeChestOpen &&
    thirdRoomBombChestOpen &&
    thirdRoomSwordChestOpen
  const hasSecretRoomTeleporter =
    secretPocketRatsSpawned &&
    !secretPocketRats.some(
      (rat) => rat.health > 0 && rat.y < 0 && rat.x < roomWidth,
    )
  useEffect(() => {
    playerRef.current = player
    playerHealthRef.current = playerHealth
    mouseHealthRef.current = mouseHealth
    commandInputRef.current = commandInput
    doorUnlockedRef.current = doorUnlocked
    isBombAnimatingRef.current = isBombAnimating
    mainMousePositionRef.current = mainMousePosition
    secretPocketRatsRef.current = secretPocketRats
    isDeadRef.current = isDead
    hasEscapedRef.current = hasEscaped
    isLevelTwoRef.current = isLevelTwo
    modeRef.current = mode
    showVendingMenuRef.current = showVendingMenu
    showBossLevelSelectRef.current = showBossLevelSelect
    showNextLevelPromptRef.current = showNextLevelPrompt
    showSkinUnlockPopupRef.current = showSkinUnlockPopup
    showSkinMenuRef.current = showSkinMenu
    showEnemyGuideRef.current = showEnemyGuide
    enemyGuideModeRef.current = enemyGuideMode
    enemyGuideIndexRef.current = enemyGuideIndex
    showModeMenuRef.current = showModeMenu
    modeMenuIndexRef.current = modeMenuIndex
    tutorialPopupRef.current = tutorialPopup
    showChallengePromptRef.current = showChallengePrompt
    showKeyVanishedPopupRef.current = showKeyVanishedPopup
    hasSkinChangeAbilityRef.current = hasSkinChangeAbility
    equippedSkinRef.current = equippedSkin
    skinMenuIndexRef.current = skinMenuIndex
    activeSkinAbilityRef.current = activeSkinAbility
    skinAbilityCoolingDownRef.current = skinAbilityCoolingDown
    teleportMapPulseRef.current = teleportMapPulse
    hasActiveBossRef.current = hasActiveBoss
    isActiveBossFightRef.current = isActiveBossFight
    isDinosaurAttackActiveRef.current = isDinosaurAttackActive
    levelTwoCurrentRoomRef.current = levelTwoCurrentRoom
    levelTwoRoomKeysRef.current = levelTwoRoomKeys
    isLevelTwoBonusRoomRef.current = isLevelTwoBonusRoom
    isLevelThreeTrophyRoomRef.current = isLevelThreeTrophyRoom
    activeLevelRef.current = activeLevel
  }, [
    isLevelTwo,
    mode,
    hasActiveBoss,
    isActiveBossFight,
    showVendingMenu,
    showBossLevelSelect,
    showNextLevelPrompt,
    showSkinUnlockPopup,
    showSkinMenu,
    showEnemyGuide,
    enemyGuideMode,
    enemyGuideIndex,
    showModeMenu,
    modeMenuIndex,
    tutorialPopup,
    showChallengePrompt,
    showKeyVanishedPopup,
    hasSkinChangeAbility,
    equippedSkin,
    skinMenuIndex,
    activeSkinAbility,
    skinAbilityCoolingDown,
    teleportMapPulse,
    levelTwoCurrentRoom,
    levelTwoRoomKeys,
    isLevelTwoBonusRoom,
    isLevelThreeTrophyRoom,
    isDead,
    hasEscaped,
    mouseHealth,
    player,
    playerHealth,
    secretPocketRats,
    mainMousePosition,
    commandInput,
    doorUnlocked,
    isBombAnimating,
    activeLevel,
    isDinosaurAttackActive,
    ])

  useEffect(() => {
    if (!showBossLevelSelect) {
      isLevelSelectionInProgressRef.current = false
    }
  }, [showBossLevelSelect])

  useEffect(() => {
    restartGame(gameIntroMessage, level)
  }, [level])

  useEffect(() => {
    if (isDead || hasEscaped) {
      clearRatReprisalTimer()
    }
  }, [isDead, hasEscaped])

  useEffect(() => {
    const handleVisibilityChange = () => {
      isWindowVisibleRef.current = !document.hidden
    }

    handleVisibilityChange()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => () => {
    if (ratReprisalTimeoutRef.current !== null) {
      window.clearTimeout(ratReprisalTimeoutRef.current)
      ratReprisalTimeoutRef.current = null
    }
    if (enemyMoveIntervalRef.current !== null) {
      window.clearInterval(enemyMoveIntervalRef.current)
      enemyMoveIntervalRef.current = null
    }
    if (bombFlightTimeoutRef.current !== null) {
      window.clearTimeout(bombFlightTimeoutRef.current)
      bombFlightTimeoutRef.current = null
    }
    if (bombImpactTimeoutRef.current !== null) {
      window.clearTimeout(bombImpactTimeoutRef.current)
      bombImpactTimeoutRef.current = null
    }
    if (bombCooldownIntervalRef.current !== null) {
      window.clearInterval(bombCooldownIntervalRef.current)
      bombCooldownIntervalRef.current = null
    }
    if (hardModeSharedAbilityIntervalRef.current !== null) {
      window.clearInterval(hardModeSharedAbilityIntervalRef.current)
      hardModeSharedAbilityIntervalRef.current = null
    }
    if (playerStunTimeoutRef.current !== null) {
      window.clearTimeout(playerStunTimeoutRef.current)
      playerStunTimeoutRef.current = null
    }
    if (skinAbilityTimeoutRef.current !== null) {
      window.clearTimeout(skinAbilityTimeoutRef.current)
      skinAbilityTimeoutRef.current = null
    }
    if (skinAbilityIntervalRef.current !== null) {
      window.clearInterval(skinAbilityIntervalRef.current)
      skinAbilityIntervalRef.current = null
    }
    if (attackChargeIntervalRef.current !== null) {
      window.clearInterval(attackChargeIntervalRef.current)
      attackChargeIntervalRef.current = null
    }
    if (tutorialPopupDelayTimeoutRef.current !== null) {
      window.clearTimeout(tutorialPopupDelayTimeoutRef.current)
      tutorialPopupDelayTimeoutRef.current = null
    }
    if (playerAttackPulseTimeoutRef.current !== null) {
      window.clearTimeout(playerAttackPulseTimeoutRef.current)
      playerAttackPulseTimeoutRef.current = null
    }
    if (dinosaurAttackPulseTimeoutRef.current !== null) {
      window.clearTimeout(dinosaurAttackPulseTimeoutRef.current)
      dinosaurAttackPulseTimeoutRef.current = null
    }
    if (ratHitPulseTimeoutRef.current !== null) {
      window.clearTimeout(ratHitPulseTimeoutRef.current)
      ratHitPulseTimeoutRef.current = null
    }
    if (ratDeathPulseTimeoutRef.current !== null) {
      window.clearTimeout(ratDeathPulseTimeoutRef.current)
      ratDeathPulseTimeoutRef.current = null
    }
    if (ratAttackPulseTimeoutRef.current !== null) {
      window.clearTimeout(ratAttackPulseTimeoutRef.current)
      ratAttackPulseTimeoutRef.current = null
    }
    if (ratAttackSourcePulseTimeoutRef.current !== null) {
      window.clearTimeout(ratAttackSourcePulseTimeoutRef.current)
      ratAttackSourcePulseTimeoutRef.current = null
    }
    if (bossDeathPulseTimeoutRef.current !== null) {
      window.clearTimeout(bossDeathPulseTimeoutRef.current)
      bossDeathPulseTimeoutRef.current = null
    }
    if (interactionPulseTimeoutRef.current !== null) {
      window.clearTimeout(interactionPulseTimeoutRef.current)
      interactionPulseTimeoutRef.current = null
    }
    if (playerHurtPulseTimeoutRef.current !== null) {
      window.clearTimeout(playerHurtPulseTimeoutRef.current)
      playerHurtPulseTimeoutRef.current = null
    }
    if (playerDeathPulseTimeoutRef.current !== null) {
      window.clearTimeout(playerDeathPulseTimeoutRef.current)
      playerDeathPulseTimeoutRef.current = null
    }
    if (movePulseTimeoutRef.current !== null) {
      window.clearTimeout(movePulseTimeoutRef.current)
      movePulseTimeoutRef.current = null
    }
    if (doorPulseTimeoutRef.current !== null) {
      window.clearTimeout(doorPulseTimeoutRef.current)
      doorPulseTimeoutRef.current = null
    }
    if (pickupPulseTimeoutRef.current !== null) {
      window.clearTimeout(pickupPulseTimeoutRef.current)
      pickupPulseTimeoutRef.current = null
    }
    if (chestPulseTimeoutRef.current !== null) {
      window.clearTimeout(chestPulseTimeoutRef.current)
      chestPulseTimeoutRef.current = null
    }
    if (wallShiftPulseTimeoutRef.current !== null) {
      window.clearTimeout(wallShiftPulseTimeoutRef.current)
      wallShiftPulseTimeoutRef.current = null
    }
    if (teleportPulseTimeoutRef.current !== null) {
      window.clearTimeout(teleportPulseTimeoutRef.current)
      teleportPulseTimeoutRef.current = null
    }
    if (abilityPulseTimeoutRef.current !== null) {
      window.clearTimeout(abilityPulseTimeoutRef.current)
      abilityPulseTimeoutRef.current = null
    }
    if (teleportTransitionDepartRef.current !== null) {
      window.clearTimeout(teleportTransitionDepartRef.current)
      teleportTransitionDepartRef.current = null
    }
    if (teleportTransitionArriveRef.current !== null) {
      window.clearTimeout(teleportTransitionArriveRef.current)
      teleportTransitionArriveRef.current = null
    }
    if (enemyMoveIntervalRef.current !== null) {
      window.clearInterval(enemyMoveIntervalRef.current)
      enemyMoveIntervalRef.current = null
    }
  }, [])

  function clearBombAnimation() {
    if (bombFlightTimeoutRef.current !== null) {
      window.clearTimeout(bombFlightTimeoutRef.current)
      bombFlightTimeoutRef.current = null
    }
    if (bombImpactTimeoutRef.current !== null) {
      window.clearTimeout(bombImpactTimeoutRef.current)
      bombImpactTimeoutRef.current = null
    }
    isBombAnimatingRef.current = false
    setBombAnimation(null)
  }

  function startBombCooldown() {
    const bombCooldownMs = isHardMode
      ? HARD_MODE_BOMB_THROW_COOLDOWN_MS
      : LEVEL2_BOMB_THROW_COOLDOWN_MS
    levelTwoBombReadyAtRef.current = Date.now() + bombCooldownMs
    setBombCooldownProgress(0)

    if (bombCooldownIntervalRef.current !== null) {
      window.clearInterval(bombCooldownIntervalRef.current)
    }

    bombCooldownIntervalRef.current = window.setInterval(() => {
      const remainingMs = Math.max(0, levelTwoBombReadyAtRef.current - Date.now())
      const nextProgress = 1 - remainingMs / bombCooldownMs
      setBombCooldownProgress(Math.max(0, Math.min(1, nextProgress)))

      if (remainingMs <= 0 && bombCooldownIntervalRef.current !== null) {
        window.clearInterval(bombCooldownIntervalRef.current)
        bombCooldownIntervalRef.current = null
        setBombCooldownProgress(1)
      }
    }, 50)
  }

  function clearRatReprisalTimer() {
    if (ratReprisalTimeoutRef.current === null) return

    window.clearTimeout(ratReprisalTimeoutRef.current)
    ratReprisalTimeoutRef.current = null
  }

  function setMainMouseHealth(nextHealth: number) {
    const nextMouseHealth = Math.max(0, nextHealth)
    mouseHealthRef.current = nextMouseHealth
    setMouseHealth(nextMouseHealth)
    if (nextMouseHealth <= 0) {
      clearRatReprisalTimer()
    }
  }

  function clearTimeoutRef(timeoutRef: TimeoutRef) {
    if (timeoutRef.current === null) return

    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }

  function dedupePositions(positions: Position[]) {
    if (positions.length <= 1) return positions

    const seen = new Set<string>()
    const uniquePositions: Position[] = []
    for (const position of positions) {
      const key = `${position.x},${position.y}`
      if (seen.has(key)) continue
      seen.add(key)
      uniquePositions.push(position)
    }
    return uniquePositions
  }

  function triggerPositionPulse(
    nextPositions: Position[],
    setPulse: PositionPulseSetter,
    timeoutRef: TimeoutRef,
    duration: number,
  ) {
    const visiblePositions = dedupePositions(nextPositions)

    if (visiblePositions.length === 0) return

    setPulse(visiblePositions)
    clearTimeoutRef(timeoutRef)
    timeoutRef.current = window.setTimeout(() => {
      setPulse([])
      timeoutRef.current = null
    }, duration)
  }

  function triggerRatAttackBurst(attackers: Array<{ x: number; y: number }>, target: Position) {
    const linePositions: Position[] = []
    const attackerPositions = attackers.map((attacker) => ({ x: attacker.x, y: attacker.y }))
    for (const attacker of attackers) {
      const line = getOrthogonalLinePositions(attacker, target, Number.MAX_SAFE_INTEGER)
      if (line.length > 0) {
        linePositions.push(attacker)
        linePositions.push(...line)
      } else {
        linePositions.push(attacker, target)
      }
    }

    setRatAttackSourcePulsePositions((current) => {
      return dedupePositions([...current, ...attackerPositions])
    })

    clearTimeoutRef(ratAttackSourcePulseTimeoutRef)
    ratAttackSourcePulseTimeoutRef.current = window.setTimeout(() => {
      setRatAttackSourcePulsePositions([])
      ratAttackSourcePulseTimeoutRef.current = null
    }, 240)

    triggerRatAttackPulse(linePositions)
  }

  function triggerRatAttackPulse(positions: Position[]) {
    const visiblePositions = dedupePositions(positions)

    if (visiblePositions.length === 0) return

    setRatAttackPulsePositions((current) => {
      return dedupePositions([...current, ...visiblePositions])
    })

    clearTimeoutRef(ratAttackPulseTimeoutRef)
    ratAttackPulseTimeoutRef.current = window.setTimeout(() => {
      setRatAttackPulsePositions([])
      ratAttackPulseTimeoutRef.current = null
    }, 380)
  }

  function getOrthogonalLinePositions(start: Position, end: Position, maxDistance: number) {
    if (!isOrthogonallyAligned(start, end)) return []

    const xStep = Math.sign(end.x - start.x)
    const yStep = Math.sign(end.y - start.y)
    const maxSteps = Math.min(
      maxDistance,
      Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)),
    )

    const line: Position[] = []
    for (let step = 1; step <= maxSteps; step += 1) {
      line.push({
        x: start.x + xStep * step,
        y: start.y + yStep * step,
      })
    }

    return line
  }

  function getLineFromDirection(start: Position, direction: Position, maxDistance: number) {
    const line: Position[] = []
    let current = { ...start }
    for (let distance = 1; distance <= maxDistance; distance += 1) {
      const next = {
        x: current.x + direction.x,
        y: current.y + direction.y,
      }

      if (isTileWallForCurrentLevel(next)) {
        break
      }

      line.push(next)
      current = next
    }

    return line
  }

  function triggerAbilityPulse(
    type: AbilityPulseType,
    nextPositions: Position[],
    duration = ABILITY_PULSE_DURATIONS[type],
  ) {
    const visiblePositions = nextPositions.filter(
      (position, index, list) =>
        index === list.findIndex((candidate) => candidate.x === position.x && candidate.y === position.y),
    )

    setAbilityPulseType(type)
    setAbilityPulsePositions(visiblePositions)
    clearTimeoutRef(abilityPulseTimeoutRef)
    abilityPulseTimeoutRef.current = window.setTimeout(() => {
      setAbilityPulsePositions([])
      setAbilityPulseType(null)
      abilityPulseTimeoutRef.current = null
    }, duration)
  }

  function clearAttackCharge() {
    if (attackChargeIntervalRef.current !== null) {
      window.clearInterval(attackChargeIntervalRef.current)
      attackChargeIntervalRef.current = null
    }
    attackChargeStartedAtRef.current = null
    isAttackChargingRef.current = false
    lastHardModeChargeMoveAtRef.current = 0
    setIsAttackCharging(false)
    setAttackChargeLevel(0)
  }

  function startAttackCharge() {
    if (isAttackChargingRef.current) return

    attackChargeStartedAtRef.current = Date.now()
    isAttackChargingRef.current = true
    setIsAttackCharging(true)
    setAttackChargeLevel(1)
    if (attackChargeIntervalRef.current !== null) {
      window.clearInterval(attackChargeIntervalRef.current)
    }

    attackChargeIntervalRef.current = window.setInterval(() => {
      if (attackChargeStartedAtRef.current === null) return
      const elapsedSeconds = Math.floor((Date.now() - attackChargeStartedAtRef.current) / 1000)
      setAttackChargeLevel(Math.min(3, elapsedSeconds + 1))
    }, 80)
  }

  function releaseAttackCharge() {
    const startedAt = attackChargeStartedAtRef.current
    if (startedAt === null) return

    const chargedDamage = Math.max(1, Math.min(3, Math.floor((Date.now() - startedAt) / 1000) + 1))
    clearAttackCharge()
    attack(chargedDamage)
  }

  function triggerBooleanPulse(
    setPulse: Dispatch<SetStateAction<boolean>>,
    timeoutRef: TimeoutRef,
    duration: number,
    clearFirst = true,
  ) {
    setPulse(true)
    if (clearFirst) {
      clearTimeoutRef(timeoutRef)
    }
    timeoutRef.current = window.setTimeout(() => {
      setPulse(false)
      timeoutRef.current = null
    }, duration)
  }

  function triggerMovePulse(positions: Position[]) {
    triggerPositionPulse(positions, setMovePulsePositions, movePulseTimeoutRef, 150)
  }

  function triggerPlayerTrail(position: Position) {
    const trailId = Date.now() + Math.random()
    const colorIndex = playerTrailColorIndexRef.current
    playerTrailColorIndexRef.current = (playerTrailColorIndexRef.current + 1) % PLAYER_TRAIL_COLOR_COUNT
    setPlayerTrailPositions((currentPositions) =>
      currentPositions.filter((currentPosition) => !isSamePosition(currentPosition, position)),
    )
    window.requestAnimationFrame(() => {
      setPlayerTrailPositions((currentPositions) =>
        [...currentPositions, { ...position, trailId, colorIndex }],
      )
      window.setTimeout(() => {
        setPlayerTrailPositions((currentPositions) =>
          currentPositions.filter((currentPosition) => currentPosition.trailId !== trailId),
        )
      }, 1000)
    })
  }

  function triggerDoorPulse(positions: Position[]) {
    triggerPositionPulse(positions, setDoorPulsePositions, doorPulseTimeoutRef, 340)
  }

  function triggerPickupPulse(positions: Position[]) {
    triggerPositionPulse(positions, setPickupPulsePositions, pickupPulseTimeoutRef, 420)
  }

  function triggerChestPulse(positions: Position[]) {
    triggerPositionPulse(positions, setChestPulsePositions, chestPulseTimeoutRef, 520)
  }

  function triggerWallShiftPulse(positions: Position[]) {
    triggerPositionPulse(positions, setWallShiftPulsePositions, wallShiftPulseTimeoutRef, 420)
  }

  function triggerTeleportPulse(positions: Position[]) {
    triggerPositionPulse(positions, setTeleportPulsePositions, teleportPulseTimeoutRef, 560)
  }

  function triggerInteractionPulse(positions: Position[]) {
    triggerPositionPulse(
      positions,
      setInteractionPulsePositions,
      interactionPulseTimeoutRef,
      380,
    )
  }

  function triggerPlayerAttackPulse(positions: Position[]) {
    triggerPositionPulse(
      positions,
      setPlayerAttackPulsePositions,
      playerAttackPulseTimeoutRef,
      220,
    )
  }

  function triggerDinosaurAttackPulse(positions: Position[]) {
    triggerPositionPulse(
      positions,
      setDinosaurAttackPulsePositions,
      dinosaurAttackPulseTimeoutRef,
      360,
    )
  }

  function triggerRatHitPulse(positions: Position[]) {
    triggerPositionPulse(
      positions,
      setRatHitPulsePositions,
      ratHitPulseTimeoutRef,
      260,
    )

    const markers = positions.map((position) => ({
      ...position,
      markerId: Date.now() + Math.random(),
    }))
    setEnemyHitMarkers((currentMarkers) => [...currentMarkers, ...markers])
    window.setTimeout(() => {
      const expiredMarkerIds = new Set(markers.map((marker) => marker.markerId))
      setEnemyHitMarkers((currentMarkers) =>
        currentMarkers.filter((marker) => !expiredMarkerIds.has(marker.markerId)),
      )
    }, 1000)
  }

  function triggerRatDeathPulse(positions: Position[]) {
    triggerPositionPulse(
      positions,
      setRatDeathPulsePositions,
      ratDeathPulseTimeoutRef,
      520,
    )
  }

  function triggerBossDeathPulse(positions: Position[]) {
    triggerPositionPulse(
      positions,
      setBossDeathPulsePositions,
      bossDeathPulseTimeoutRef,
      820,
    )
  }

  function triggerTeleportTransition(applyDestination: () => void) {
    clearTimeoutRef(teleportTransitionDepartRef)
    clearTimeoutRef(teleportTransitionArriveRef)
    setTeleportMapPulse('depart')
    teleportTransitionDepartRef.current = window.setTimeout(() => {
      teleportTransitionDepartRef.current = null
      applyDestination()
      setTeleportMapPulse('arrive')
      teleportTransitionArriveRef.current = window.setTimeout(() => {
        teleportTransitionArriveRef.current = null
        setTeleportMapPulse(null)
      }, 560)
    }, 320)
  }

  function clearPlayerStunTimer() {
    if (playerStunTimeoutRef.current !== null) {
      window.clearTimeout(playerStunTimeoutRef.current)
      playerStunTimeoutRef.current = null
    }
  }

  function clearSkinAbility() {
    if (skinAbilityTimeoutRef.current !== null) {
      window.clearTimeout(skinAbilityTimeoutRef.current)
      skinAbilityTimeoutRef.current = null
    }
    if (skinAbilityIntervalRef.current !== null) {
      window.clearInterval(skinAbilityIntervalRef.current)
      skinAbilityIntervalRef.current = null
    }
    activeSkinAbilityRef.current = null
    setActiveSkinAbility(null)
    skinAbilityCoolingDownRef.current = false
    setSkinAbilityCoolingDown(false)
    setSkinAbilityProgress(1)
  }

  function isGhostPhasing() {
    return activeSkinAbilityRef.current === 'ghost'
  }

  function isNinjaPhasing() {
    return activeSkinAbilityRef.current === 'ninja'
  }

  function isPlayerInvulnerable() {
    return (
      isDinosaurAttackActiveRef.current ||
      activeSkinAbilityRef.current === 'mario' ||
      activeSkinAbilityRef.current === 'luigi'
    )
  }

  function isShadowHidden() {
    return activeSkinAbilityRef.current === 'shadow'
  }

  function useSkinAbility() {
    if (!hasSkinChangeAbilityRef.current) {
      addMessage('Skin abilities are locked. Find the mushroom first.')
      return
    }

    if (!SKIN_ABILITY_SKINS.includes(equippedSkin)) {
      addMessage('This skin has no G ability.')
      return
    }

    if (activeSkinAbilityRef.current !== null) {
      addMessage('Skin ability is already active.')
      return
    }

    if (skinAbilityCoolingDownRef.current) {
      addMessage('Skin ability is cooling down.')
      return
    }

    activeSkinAbilityRef.current = equippedSkin
    setActiveSkinAbility(equippedSkin)
    skinAbilityCoolingDownRef.current = false
    setSkinAbilityCoolingDown(false)
    setSkinAbilityProgress(1)
    if (skinAbilityTimeoutRef.current !== null) {
      window.clearTimeout(skinAbilityTimeoutRef.current)
    }
    if (skinAbilityIntervalRef.current !== null) {
      window.clearInterval(skinAbilityIntervalRef.current)
    }
    const activeDurationMs = isHardMode
      ? HARD_MODE_SKIN_ABILITY_DURATION_MS
      : SKIN_ABILITY_DURATION_MS
    const abilityEndsAt = Date.now() + activeDurationMs
    skinAbilityIntervalRef.current = window.setInterval(() => {
      const remainingMs = Math.max(0, abilityEndsAt - Date.now())
      const nextProgress = remainingMs / activeDurationMs
      setSkinAbilityProgress(Math.max(0, Math.min(1, nextProgress)))
      if (remainingMs <= 0 && skinAbilityIntervalRef.current !== null) {
        window.clearInterval(skinAbilityIntervalRef.current)
        skinAbilityIntervalRef.current = null
        setSkinAbilityProgress(0)
      }
    }, 50)
    skinAbilityTimeoutRef.current = window.setTimeout(() => {
      skinAbilityTimeoutRef.current = null
      activeSkinAbilityRef.current = null
      setActiveSkinAbility(null)
      skinAbilityCoolingDownRef.current = true
      setSkinAbilityCoolingDown(true)
      setSkinAbilityProgress(0)
      const cooldownEndsAt = Date.now() + SKIN_ABILITY_DURATION_MS
      skinAbilityIntervalRef.current = window.setInterval(() => {
        const remainingMs = Math.max(0, cooldownEndsAt - Date.now())
        const nextProgress = 1 - remainingMs / SKIN_ABILITY_DURATION_MS
        setSkinAbilityProgress(Math.max(0, Math.min(1, nextProgress)))
        if (remainingMs <= 0 && skinAbilityIntervalRef.current !== null) {
          window.clearInterval(skinAbilityIntervalRef.current)
          skinAbilityIntervalRef.current = null
          skinAbilityCoolingDownRef.current = false
          setSkinAbilityCoolingDown(false)
          setSkinAbilityProgress(1)
        }
      }, 50)
    }, activeDurationMs)

    if (equippedSkin === 'ghost') {
      addMessage('Ghost phase active: you can walk through walls.')
      return
    }
    if (equippedSkin === 'ninja') {
      addMessage('Ninja phase active: you can walk through enemies.')
      return
    }
    if (equippedSkin === 'shadow') {
      addMessage('Shadow cloak active: enemies cannot see you.')
      return
    }
    addMessage(`${equippedSkin === 'mario' ? 'Mario' : 'Luigi'} star power active: you are invincible.`)
  }

  function isPlayerStunnedNow() {
    return Date.now() < playerStunnedUntilRef.current
  }

  function applyPlayerStun(durationMs: number) {
    if (durationMs <= 0) return
    const targetTime = Date.now() + durationMs
    playerStunnedUntilRef.current = Math.max(playerStunnedUntilRef.current, targetTime)
    setIsPlayerStunned(true)
    clearPlayerStunTimer()

    playerStunTimeoutRef.current = window.setTimeout(() => {
      playerStunnedUntilRef.current = 0
      setIsPlayerStunned(false)
      playerStunTimeoutRef.current = null
    }, Math.max(1, playerStunnedUntilRef.current - Date.now()))
  }

  function isSniperRat(rat: SecretRat): boolean {
    return rat.kind === RAT_VARIANT_SNIPER
  }

  function isGrenadierRat(rat: SecretRat): boolean {
    return rat.kind === RAT_VARIANT_GRENADIER
  }

  function isMineRat(rat: SecretRat): boolean {
    return rat.kind === RAT_VARIANT_MINE
  }

  function isRangedRat(rat: SecretRat): boolean {
    return (
      isSniperRat(rat) ||
      isGrenadierRat(rat) ||
      isMineRat(rat) ||
      isWardenRat(rat) ||
      isStunnerRat(rat)
    )
  }

  function isStunnerRat(rat: SecretRat): boolean {
    return rat.kind === RAT_VARIANT_STUNNER
  }

  function isRusherRat(rat: SecretRat): boolean {
    return rat.kind === RAT_VARIANT_RUSHER
  }

  function isAuraRat(rat: SecretRat): boolean {
    return rat.kind === RAT_VARIANT_AURA
  }

  function getRatMaxHealth(rat: SecretRat): number {
    const baseLevelTwoRatHealth = mouseMaxHealth + (isLevelTwo ? LEVEL2_SNIPER_HEALTH_BOOST : 0)
    return rat.maxHealth ?? (isLevelTwoRef.current ? baseLevelTwoRatHealth : rat.health)
  }

  function clampRatHealth(health: number, rat: SecretRat): number {
    return Math.min(health, getRatMaxHealth(rat))
  }

  function getRatRetaliationDamage(adjacentRats: SecretRat[]) {
    if (adjacentRats.some(isRusherRat)) {
      return LEVEL2_RUSHER_REPRISAL_DAMAGE
    }

    return 1
  }

  function isRatStunned(rat: SecretRat) {
    return !!rat.stunnedUntil && rat.stunnedUntil > Date.now()
  }

  function isWardenRat(rat: SecretRat): boolean {
    return rat.kind === RAT_VARIANT_WARDEN
  }

  function isNormalBossRoomRat(rat: SecretRat) {
    return (
      isActiveBossFightRef.current &&
      !rat.isBoss &&
      (rat.kind === undefined || rat.kind === RAT_VARIANT_DEFAULT)
    )
  }

  function getRatHealthAfterDamage(rat: SecretRat, damage: number) {
    const effectiveDamage = isNormalBossRoomRat(rat)
      ? 1
      : Math.max(1, Math.round(damage))
    return Math.max(0, rat.health - effectiveDamage)
  }

  function isWithinRadius(first: Position, second: Position, radius: number) {
    return (
      Math.abs(first.x - second.x) <= radius &&
      Math.abs(first.y - second.y) <= radius
    )
  }

  function canUseCleaveAbility() {
    return activeLevelRef.current >= 2
  }

  function canUseFocusedShotAbility() {
    return activeLevelRef.current >= 3
  }

  function canUseRailShotAbility() {
    return activeLevelRef.current >= 4
  }

  function isHardModeSharedAbilityReady(abilityName: string) {
    if (!isHardMode) return true

    const now = Date.now()
    if (hardModeSharedAbilityReadyAtRef.current <= now) {
      return true
    }

    const remainingSeconds = ((hardModeSharedAbilityReadyAtRef.current - now) / 1000).toFixed(1)
    addMessage(`${abilityName} is cooling down with your other hard-mode abilities: ${remainingSeconds}s remaining.`)
    return false
  }

  function startHardModeSharedAbilityCooldown() {
    if (!isHardMode) return
    hardModeSharedAbilityReadyAtRef.current = Date.now() + HARD_MODE_SHARED_ABILITY_COOLDOWN_MS
    setHardModeSharedAbilityProgress(0)
    if (hardModeSharedAbilityIntervalRef.current !== null) {
      window.clearInterval(hardModeSharedAbilityIntervalRef.current)
    }

    hardModeSharedAbilityIntervalRef.current = window.setInterval(() => {
      const remainingMs = Math.max(0, hardModeSharedAbilityReadyAtRef.current - Date.now())
      const nextProgress = 1 - remainingMs / HARD_MODE_SHARED_ABILITY_COOLDOWN_MS
      setHardModeSharedAbilityProgress(Math.max(0, Math.min(1, nextProgress)))

      if (remainingMs <= 0 && hardModeSharedAbilityIntervalRef.current !== null) {
        window.clearInterval(hardModeSharedAbilityIntervalRef.current)
        hardModeSharedAbilityIntervalRef.current = null
        setHardModeSharedAbilityProgress(1)
      }
    }, 50)
  }

  function createRatFromSpawn(ratSpawn: RatSpawn): SecretRat {
    const ratHealth =
      ratSpawn.kind === RAT_VARIANT_RUSHER
        ? 2
        : ratSpawn.healthOverride ??
          (mouseMaxHealth + (isLevelTwo ? LEVEL2_SNIPER_HEALTH_BOOST : 0))
    return {
      x: ratSpawn.x,
      y: ratSpawn.y,
      health: ratHealth,
      maxHealth: ratHealth,
      kind: ratSpawn.kind ?? RAT_VARIANT_DEFAULT,
      nextAuraPulseAt:
        ratSpawn.kind === RAT_VARIANT_AURA
          ? 0
          : undefined,
      nextShotAt:
        ratSpawn.kind === RAT_VARIANT_SNIPER ||
        ratSpawn.kind === RAT_VARIANT_MINE ||
        ratSpawn.kind === RAT_VARIANT_WARDEN ||
        ratSpawn.kind === RAT_VARIANT_RUSHER
          ? 0
          : undefined,
      roomTwoRoomKeyReward: ratSpawn.levelTwoRoomKeyReward,
    }
  }

  function isChallengeModeActiveForCurrentLevel() {
    return challengeModeLevelRef.current === activeLevelRef.current
  }

  function doubleChallengeSpawns(
    spawns: RatSpawn[],
    isOpenPosition: (position: Position) => boolean,
  ) {
    if (!isChallengeModeActiveForCurrentLevel()) return spawns

    const occupied = new Set(spawns.map((spawn) => `${spawn.x},${spawn.y}`))
    const duplicates: RatSpawn[] = []
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 2, y: 0 },
      { x: -2, y: 0 },
      { x: 0, y: 2 },
      { x: 0, y: -2 },
    ]

    for (const spawn of spawns) {
      const duplicatePosition = directions
        .map((direction) => ({ x: spawn.x + direction.x, y: spawn.y + direction.y }))
        .find((position) => {
          const positionKey = `${position.x},${position.y}`
          return !occupied.has(positionKey) && isOpenPosition(position)
        })

      if (!duplicatePosition) continue

      occupied.add(`${duplicatePosition.x},${duplicatePosition.y}`)
      duplicates.push({
        ...spawn,
        x: duplicatePosition.x,
        y: duplicatePosition.y,
        levelTwoRoomKeyReward: undefined,
      })
    }

    return [...spawns, ...duplicates]
  }

  function getActiveAdvancedRooms(level: LevelChoice = activeLevelRef.current) {
    if (level === 4) return LEVEL4_ROOMS
    return level === 3 ? LEVEL3_ROOMS : LEVEL2_ROOMS
  }

  function getCurrentLevelTwoRoomConfig(): LevelTwoRoomConfig {
    return getActiveAdvancedRooms()[levelTwoCurrentRoom - 1]
  }

  function getLevelTwoRoomWidth(config: LevelTwoRoomConfig) {
    return Math.min(
      config.layout[0]?.length ?? roomWidth,
      LEVEL2_ROOM_MAX_WIDTH,
    )
  }

  function getLevelTwoRoomHeight(config: LevelTwoRoomConfig) {
    return Math.min(config.layout.length, LEVEL2_ROOM_MAX_HEIGHT)
  }

  function isAvailableRoomKeyDropAt(position: Position) {
    const now = Date.now()
    return levelTwoRoomKeyDrops.some((drop) =>
      (!drop.availableAt || drop.availableAt <= now) &&
      isSamePosition(position, drop),
    )
  }

  function getLevelTwoCollisionContext(
    room: 1 | 2 | 3 | 4 = levelTwoCurrentRoomRef.current,
  ): LevelTwoCollisionContext {
    const roomConfig = getActiveAdvancedRooms()[room - 1]
    return {
      roomConfig,
      roomWidth: getLevelTwoRoomWidth(roomConfig),
      roomHeight: getLevelTwoRoomHeight(roomConfig),
      hasEnoughKeys: levelTwoRoomKeysRef.current >= roomConfig.requiredKeys,
    }
  }

  function isBlockedInLevelTwoContext(
    position: Position,
    context: LevelTwoCollisionContext,
    ratOccupancy?: ReadonlySet<string>,
  ) {
    const inBounds =
      position.x >= 0 &&
      position.x < context.roomWidth &&
      position.y >= 0 &&
      position.y < context.roomHeight

    if (!inBounds) {
      return true
    }

    const row = context.roomConfig.layout[position.y]
    const cell = row[position.x] ?? '#'
    if (cell !== '.') {
      return true
    }

    const isLockedTransition =
      position.x === context.roomConfig.transitionTile.x &&
      position.y === context.roomConfig.transitionTile.y &&
      !context.hasEnoughKeys

    if (isLockedTransition) {
      return true
    }

    return ratOccupancy?.has(`${position.x},${position.y}`) ?? false
  }

  function isCurrentLevelTwoRoomTransitionTile(position: Position, room?: 1 | 2 | 3 | 4) {
    const activeRoom = room ?? levelTwoCurrentRoomRef.current
    const config = getActiveAdvancedRooms()[activeRoom - 1]
    return isSamePosition(position, config.transitionTile)
  }

  function getRatLevelTwoRoomReward(rat: SecretRat) {
    return rat.roomTwoRoomKeyReward
  }

  function markRoomTransitionRewards(
    previousRats: SecretRat[],
    nextRats: SecretRat[],
    options: { countForDinosaurUnlock: boolean } = { countForDinosaurUnlock: true },
  ) {
    if (previousRats.length === 0 || nextRats.length === 0) return

    let defeatedRatCount = 0
    const droppedRoomKeyPositions: LevelTwoRoomKeyDrop[] = []

    for (let index = 0; index < nextRats.length; index += 1) {
      const previousRat = previousRats[index]
      const nextRat = nextRats[index]
      if (!previousRat) continue

      if (
        previousRat.health <= 0 ||
        nextRat.health > 0 ||
        nextRat.isBoss
      ) {
        continue
      }

      defeatedRatCount += 1
      const reward = getRatLevelTwoRoomReward(previousRat)
      if (reward) {
        const now = Date.now()
        const availableAt = isHardMode ? now + 2000 : now
        droppedRoomKeyPositions.push({
          x: nextRat.x,
          y: nextRat.y,
          reward,
          dropId: isHardMode ? now + Math.random() : undefined,
          availableAt,
          expiresAt: isHardMode ? availableAt + HARD_MODE_KEY_DROP_LIFETIME_MS : undefined,
        })
      }
    }

    if (defeatedRatCount > 0 && options.countForDinosaurUnlock) {
      for (let i = 0; i < defeatedRatCount; i += 1) {
        applyRatDefeatProgress()
      }
    }

    if (droppedRoomKeyPositions.length > 0) {
      setLevelTwoRoomKeyDrops((current) => {
        const nextDrops = [...current, ...droppedRoomKeyPositions]
        const unique = new Map<string, LevelTwoRoomKeyDrop>()
        for (const drop of nextDrops) {
          unique.set(`${drop.x},${drop.y}`, drop)
        }
        return [...unique.values()]
      })
      if (isHardMode) {
        for (const drop of droppedRoomKeyPositions) {
          window.setTimeout(() => {
            setLevelTwoRoomKeyDrops((current) => {
              const keyStillExists = current.some((candidate) => candidate.dropId === drop.dropId)
              if (!keyStillExists) return current

              showKeyVanishedPopupRef.current = true
              keyVanishedPopupReadyAtRef.current = Date.now() + 1500
              setShowKeyVanishedPopup(true)
              clearRatReprisalTimer()
              addMessage('You did not collect the key fast enough. Press any key to restart hard mode.')
              return current.filter((candidate) => candidate.dropId !== drop.dropId)
            })
          }, HARD_MODE_KEY_DROP_LIFETIME_MS + 2000)
        }
      }
      addMessage('A defeated rat drops a room key.')
    }
  }

  function getLevelTwoRoomSpawns(room: 1 | 2 | 3 | 4) {
    const roomRewards = activeLevelRef.current === 4
      ? LEVEL4_ROOM_REWARDS_BY_ROOM
      : activeLevelRef.current === 3
        ? LEVEL3_ROOM_REWARDS_BY_ROOM
        : LEVEL2_ROOM_REWARDS_BY_ROOM
    const hardModeExtraSpawns = isHardMode
      ? HARD_MODE_EXTRA_RANGED_SPAWNS[activeLevelRef.current]?.[room] ?? []
      : []
    const roomConfig = getActiveAdvancedRooms()[room - 1]
    const roomSpawns = [...roomRewards[room], ...hardModeExtraSpawns]
    return doubleChallengeSpawns(roomSpawns, (position) => {
      const row = roomConfig.layout[position.y]
      return row?.[position.x] === '.' && !isSamePosition(position, roomConfig.startPosition)
    }).map(createRatFromSpawn)
  }

  function isHardModeTrapTile(position: Position) {
    if (!isHardMode || !isLevelTwoRef.current) return false
    if (isLevelTwoBonusRoomRef.current || isLevelThreeTrophyRoomRef.current) return false

    return Boolean(
      HARD_MODE_TRAP_TILES[activeLevelRef.current]?.[levelTwoCurrentRoomRef.current]?.some(
        (trapPosition) => isSamePosition(trapPosition, position),
      ),
    )
  }

  function applyHardModeTrapIfNeeded(position: Position) {
    if (!isHardModeTrapTile(position)) return

    const now = Date.now()
    playerSlowedUntilRef.current = now + HARD_MODE_TRAP_SLOW_DURATION_MS
    lastHardModeSlowMoveAtRef.current = now
    triggerInteractionPulse([position])
    addMessage('Hard mode trap: movement slowed for 1 second.')
  }

  function getNormalModeFriendlySign(position: Position) {
    if (isHardMode || !isLevelTwoRef.current) return null
    if (isLevelTwoBonusRoomRef.current || isLevelThreeTrophyRoomRef.current) return null

    return NORMAL_MODE_FRIENDLY_SIGNS[activeLevelRef.current]?.[levelTwoCurrentRoomRef.current]?.find(
      (sign) => isSamePosition(sign, position),
    ) ?? null
  }

  function getNormalModeChallengeDoor(position: Position) {
    if (isLevelTwoBonusRoomRef.current || isLevelThreeTrophyRoomRef.current) return null
    if (isChallengeModeActiveForCurrentLevel()) return null
    if (!isLevelTwoRef.current && activeLevelRef.current !== 1) return null

    const challengeRoom = isLevelTwoRef.current ? levelTwoCurrentRoomRef.current : 1
    const challengeDoor = NORMAL_MODE_CHALLENGE_DOORS[activeLevelRef.current]?.[challengeRoom]
    return challengeDoor && isSamePosition(challengeDoor, position) ? challengeDoor : null
  }

  function getNormalModeChallengeDoorKey(position: Position | null) {
    if (!position) return null

    const challengeRoom = isLevelTwoRef.current ? levelTwoCurrentRoomRef.current : 1
    return `${activeLevelRef.current}-${challengeRoom}-${position.x}-${position.y}`
  }

  function applyNormalModeFriendlyTile(position: Position) {
    const sign = getNormalModeFriendlySign(position)
    if (sign) {
      triggerInteractionPulse([position])
      addMessage(sign.message)
      return
    }

    const challengeDoor = getNormalModeChallengeDoor(position)
    const challengeDoorKey = getNormalModeChallengeDoorKey(challengeDoor)
    if (!challengeDoor || !challengeDoorKey || normalModeChallengeDoorsUsedRef.current.includes(challengeDoorKey)) {
      return
    }

    const nextUsedDoors = [...normalModeChallengeDoorsUsedRef.current, challengeDoorKey]
    normalModeChallengeDoorsUsedRef.current = nextUsedDoors
    setNormalModeChallengeDoorsUsed(nextUsedDoors)
    triggerDoorPulse([position])
    clearRatReprisalTimer()
    showChallengePromptRef.current = true
    setShowChallengePrompt(true)
    addMessage('Challenge Mode: accept to restart this level with twice the enemies.')
  }

  function getLevelTwoRatSprite(rat: SecretRat): MapTileId {
    if (rat.health <= 0) return 'rat-dead'
    if (rat.isBoss) return 'boss'
    if (rat.kind === RAT_VARIANT_SNIPER) return 'rat-sniper'
    if (rat.kind === RAT_VARIANT_MINE) return 'rat-mine'
    if (rat.kind === RAT_VARIANT_WARDEN) return 'rat-warden'
    if (rat.kind === RAT_VARIANT_STUNNER) return 'rat-stunner'
    if (rat.kind === RAT_VARIANT_RUSHER) return 'rat-rusher'
    if (rat.kind === RAT_VARIANT_AURA) return 'rat-aura'
    if (rat.kind === RAT_VARIANT_GRENADIER) return 'rat-grenadier'
    return 'rat'
  }

  function getLayoutTile(cell: string): MapTileId {
    if (cell === '#') return 'wall'
    if (cell === ' ') return 'void'
    return 'floor'
  }

  function isVisibleInLevelFour(position: Position) {
    if (
      activeLevel !== 4 ||
      isLevelThreeTrophyRoom ||
      isLevelTwoBonusRoom ||
      equippedSkin === 'lightbulb'
    ) {
      return true
    }

    return (
      Math.abs(position.x - player.x) + Math.abs(position.y - player.y) <=
      LEVEL4_LIGHT_RADIUS
    )
  }

  function buildLevelTwoMapRows(): MapTileId[][] {
    if (isLevelThreeTrophyRoom) {
      return LEVEL3_TROPHY_ROOM_LAYOUT.map((layoutRow, rowIndex) =>
        Array.from(layoutRow).map((cell, x) => {
          const roomPosition = { x, y: rowIndex }

          if (isSamePosition(roomPosition, player)) {
            return getPlayerSkinTile(equippedSkin)
          }

          if (isSamePosition(roomPosition, LEVEL3_TROPHY_POSITION)) {
            return 'trophy'
          }

          return getLayoutTile(cell)
        }),
      )
    }

    if (isLevelTwoBonusRoom) {
      return LEVEL2_BONUS_ROOM_LAYOUT.map((layoutRow, rowIndex) =>
        Array.from(layoutRow).map((cell, x) => {
          const roomPosition = { x, y: rowIndex }

          if (isSamePosition(roomPosition, player)) {
            return getPlayerSkinTile(equippedSkin)
          }

          if (
            isMushroomAvailable &&
            isSamePosition(roomPosition, LEVEL2_BONUS_ROOM_MUSHROOM_POSITION)
          ) {
            return 'mushroom'
          }

          return getLayoutTile(cell)
        }),
      )
    }

    const roomConfig = getCurrentLevelTwoRoomConfig()
    const roomWidth = getLevelTwoRoomWidth(roomConfig)
    const roomHeight = getLevelTwoRoomHeight(roomConfig)
    const hasExitAccess = levelTwoRoomKeys >= roomConfig.requiredKeys
    const now = Date.now()
    const droppedRoomKeyLookup = new Set(
      levelTwoRoomKeyDrops
        .filter((position) => !position.availableAt || position.availableAt <= now)
        .map((position) => `${position.x},${position.y}`),
    )
    const liveRats = new Map<string, SecretRat>()
    const deadRats = new Map<string, SecretRat>()

    for (const rat of secretPocketRats) {
      const key = `${rat.x},${rat.y}`
      if (rat.health > 0) {
        liveRats.set(key, rat)
        continue
      }
      if (!deadRats.has(key)) {
        deadRats.set(key, rat)
      }
    }

    return roomConfig.layout.slice(0, roomHeight).map((layoutRow, rowIndex) =>
      Array.from({ length: roomWidth }).map((_, x) => {
        const cell = layoutRow[x] ?? '#'
        const roomPosition = { x, y: rowIndex }
        const roomPositionKey = `${x},${rowIndex}`
        const isVisible = isVisibleInLevelFour(roomPosition)

        if (!isVisible) {
          return 'void'
        }

        if (isSamePosition(roomPosition, player)) {
          return getPlayerSkinTile(equippedSkin)
        }

        const liveRat = liveRats.get(roomPositionKey)
        if (liveRat) {
          return getLevelTwoRatSprite(liveRat)
        }

        if (droppedRoomKeyLookup.has(roomPositionKey)) {
          return 'key'
        }

        const defeatedRat = deadRats.get(roomPositionKey)
        if (defeatedRat) {
          return defeatedRat.defeatedByDinosaur ? 'rat-burst' : 'rat-dead'
        }

        const friendlySign = getNormalModeFriendlySign(roomPosition)
        if (friendlySign) {
          return 'friendly-sign'
        }

        const challengeDoor = getNormalModeChallengeDoor(roomPosition)
        const challengeDoorKey = getNormalModeChallengeDoorKey(challengeDoor)
        if (challengeDoor && challengeDoorKey && !normalModeChallengeDoorsUsed.includes(challengeDoorKey)) {
          return 'challenge-door'
        }

        if (isCurrentLevelTwoRoomTransitionTile(roomPosition)) {
          return hasExitAccess ? 'door-open' : 'door-locked'
        }

        return getLayoutTile(cell)
      }),
    )
  }

  function applyLevelThreeBossWallPattern(rows: MapTileId[][]): MapTileId[][] {
    if (activeLevel !== 3 || !isActiveBossFight) {
      return rows
    }

    return rows.map((row, y) =>
      row.map((cell, x) =>
        LEVEL3_BOSS_ROOM_WALLS.has(`${x},${y}`) ? 'wall' : cell,
      ),
    )
  }

  function startLevelTwoRoom(room: 1 | 2 | 3 | 4, message = '') {
    const nextRoomRats = getLevelTwoRoomSpawns(room)
    const rooms = getActiveAdvancedRooms()
    resetRoomRuntimeState()
    setIsLevelTwoBonusRoom(false)
    isLevelTwoBonusRoomRef.current = false
    setIsLevelThreeTrophyRoom(false)
    isLevelThreeTrophyRoomRef.current = false
    setIsMushroomAvailable(false)
    setLevelTwoCurrentRoom(room)
    if (room === 4) {
      setLevelTwoRoomKeys(3)
      levelTwoRoomKeysRef.current = 3
    } else {
      setLevelTwoRoomKeys(0)
      levelTwoRoomKeysRef.current = 0
    }
    setPlayerPosition(rooms[room - 1].startPosition)
    setSecretPocketRats(nextRoomRats)
    secretPocketRatsRef.current = nextRoomRats
    setLevelTwoRoomKeyDrops([])
    if (activeLevelRef.current === 2) {
      setMainMousePosition({ x: 999, y: 999 })
      setMainMouseHealth(0)
      setIsBossFight(false)
    }
    if (message) {
      addMessage(message)
    }
  }

  function buildRatOccupancySet(rats: SecretRat[]) {
    const occupied = new Set<string>()
    for (const rat of rats) {
      if (rat.health > 0) {
        occupied.add(`${rat.x},${rat.y}`)
      }
    }
    return occupied
  }

  function isTileWallInLevelTwo(
    position: Position,
    ratState: SecretRat[] = secretPocketRats,
    ratOccupancy?: ReadonlySet<string>,
  ) {
    if (isLevelTwoBonusRoomRef.current) {
      const row = LEVEL2_BONUS_ROOM_LAYOUT[position.y]
      return row?.[position.x] !== '.'
    }

    if (isLevelThreeTrophyRoomRef.current) {
      const row = LEVEL3_TROPHY_ROOM_LAYOUT[position.y]
      return row?.[position.x] !== '.'
    }

    if (isBlockedInLevelTwoContext(
      position,
      getLevelTwoCollisionContext(),
      ratOccupancy,
    )) {
      return true
    }

    if (ratOccupancy) {
      return false
    }

    return ratState.some(
      (rat) => rat.health > 0 && rat.x === position.x && rat.y === position.y,
    )
  }

  function isOutOfLevelTwoBounds(position: Position) {
    if (isLevelTwoBonusRoomRef.current) {
      const row = LEVEL2_BONUS_ROOM_LAYOUT[position.y]
      return row === undefined || position.x < 0 || position.x >= row.length
    }

    if (isLevelThreeTrophyRoomRef.current) {
      const row = LEVEL3_TROPHY_ROOM_LAYOUT[position.y]
      return row === undefined || position.x < 0 || position.x >= row.length
    }

    const context = getLevelTwoCollisionContext()
    return (
      position.x < 0 ||
      position.x >= context.roomWidth ||
      position.y < 0 ||
      position.y >= context.roomHeight
    )
  }

  function isTileWallForCurrentLevel(
    position: Position,
    ratState: SecretRat[] = secretPocketRats,
    ratOccupancy?: ReadonlySet<string>,
  ) {
    if (
      activeLevelRef.current === 3 &&
      isActiveBossFightRef.current &&
      LEVEL3_BOSS_ROOM_WALLS.has(`${position.x},${position.y}`)
    ) {
      return true
    }

    if (isActiveBossFightRef.current) {
      return isWall(
        position,
        secretRoomKnown,
        secretWallShifted,
        secretPocketOpen,
        ratState,
        isDoorOpen,
        rightRoomKnown,
        thirdRoomKnown,
        rightRoomBlockShifted,
        rightRoomChestOpen,
        isSecretRoomDoorOpen,
        thirdRoomBlockShifted,
        thirdRoomChestOpen,
        thirdRoomLifeChestOpen,
        thirdRoomBombChestOpen,
        thirdRoomSwordChestOpen,
        thirdRoomDoorOpen,
        isActiveBossFightRef.current,
        ratOccupancy,
      )
    }

    if (isLevelTwoRef.current) {
      return isTileWallInLevelTwo(position, ratState, ratOccupancy)
    }

    return isWall(
      position,
      secretRoomKnown,
      secretWallShifted,
      secretPocketOpen,
      ratState,
      isDoorOpen,
      rightRoomKnown,
      thirdRoomKnown,
      rightRoomBlockShifted,
      rightRoomChestOpen,
      isSecretRoomDoorOpen,
      thirdRoomBlockShifted,
      thirdRoomChestOpen,
      thirdRoomLifeChestOpen,
      thirdRoomBombChestOpen,
      thirdRoomSwordChestOpen,
      thirdRoomDoorOpen,
      isActiveBossFight,
      ratOccupancy,
    )
  }

  function isTileWallForEnemy(
    position: Position,
    ratState: SecretRat[],
    ratOccupancy?: ReadonlySet<string>,
  ) {
    return isTileWallForCurrentLevel(position, ratState, ratOccupancy)
  }

  function isLevelOneSpawnBlocked(
    position: Position,
    destinationRoom: 'secret' | 'right' | 'third',
  ) {
    return isWall(
      position,
      destinationRoom === 'secret' ? true : secretRoomKnown,
      secretWallShifted,
      destinationRoom === 'secret' ? true : secretPocketOpen,
      [],
      isDoorOpen,
      destinationRoom === 'right' ? true : rightRoomKnown,
      destinationRoom === 'third' ? true : thirdRoomKnown,
      rightRoomBlockShifted,
      rightRoomChestOpen,
      isSecretRoomDoorOpen,
      thirdRoomBlockShifted,
      thirdRoomChestOpen,
      thirdRoomLifeChestOpen,
      thirdRoomBombChestOpen,
      thirdRoomSwordChestOpen,
      thirdRoomDoorOpen,
      false,
      EMPTY_POSITION_KEY_SET,
    )
  }

  function createLevelOneRoomRats(
    spawns: RatSpawn[],
    destinationRoom: 'secret' | 'right' | 'third',
  ) {
    const validSpawns = spawns
      .filter((rat) => !isLevelOneSpawnBlocked(rat, destinationRoom))
    return doubleChallengeSpawns(
      validSpawns,
      (position) => !isLevelOneSpawnBlocked(position, destinationRoom) && !isSamePosition(position, playerRef.current),
    ).map((rat) => createRatFromSpawn(rat))
  }

  function hasClearLineOfSight(
    start: Position,
    target: Position,
    ratState: SecretRat[],
    ratOccupancy?: ReadonlySet<string>,
  ) {
    const sameX = start.x === target.x
    const sameY = start.y === target.y

    if (!sameX && !sameY) {
      return false
    }

    const levelTwoCollisionContext = isLevelTwoRef.current
      ? getLevelTwoCollisionContext()
      : null
    const isBlocked = (position: Position) =>
      levelTwoCollisionContext
        ? isBlockedInLevelTwoContext(position, levelTwoCollisionContext, ratOccupancy)
        : isTileWallForEnemy(position, ratState, ratOccupancy)

    if (sameX) {
      const yStep = Math.sign(target.y - start.y)
      let y = start.y + yStep
      while (y !== target.y) {
        if (isBlocked({ x: start.x, y })) {
          return false
        }
        y += yStep
      }
      return true
    }

    const xStep = Math.sign(target.x - start.x)
    let x = start.x + xStep
    while (x !== target.x) {
      if (isBlocked({ x, y: start.y })) {
        return false
      }
      x += xStep
    }
    return true
  }

  function isOrthogonallyAligned(first: Position, second: Position) {
    return first.x === second.x || first.y === second.y
  }

  function findVisibleRatTargetInRange(origin: Position, maxRange: number): {
    index: number
    target: SecretRat
  } | null {
    const liveRatOccupancy = buildRatOccupancySet(secretPocketRatsRef.current)
    let bestRat: { index: number; target: SecretRat; distance: number } | null = null

    for (let index = 0; index < secretPocketRatsRef.current.length; index += 1) {
      const candidate = secretPocketRatsRef.current[index]
      if (candidate.health <= 0) continue

      const horizontalDistance = Math.abs(candidate.x - origin.x)
      const verticalDistance = Math.abs(candidate.y - origin.y)
      if (!isOrthogonallyAligned(origin, candidate)) continue

      const sortDistance = Math.abs(candidate.x - origin.x) + Math.abs(candidate.y - origin.y)
      const rangeDistance = Math.max(horizontalDistance, verticalDistance)
      if (rangeDistance < 1 || rangeDistance > maxRange) continue

      if (
        !hasClearLineOfSight(
          origin,
          candidate,
          secretPocketRatsRef.current,
          liveRatOccupancy,
        )
      ) {
        continue
      }

      if (bestRat === null || sortDistance < bestRat.distance) {
        bestRat = {
          index,
          target: candidate,
          distance: sortDistance,
        }
      }
    }

    if (!bestRat) return null

    return {
      index: bestRat.index,
      target: bestRat.target,
    }
  }

  function canRatRetaliateFrom(
    position: Position,
    options: {
      rats?: readonly SecretRat[]
      mousePosition?: Position
    } = {},
  ) {
    if (isDeadRef.current || hasEscapedRef.current) return false
    if (isShadowHidden()) return false

    const { rats = secretPocketRatsRef.current, mousePosition = mainMousePositionRef.current } = options

    const isMainMouseAdjacent =
      !isActiveBossFightRef.current &&
      mouseHealthRef.current > 0 &&
      isAdjacent(position, mousePosition)
    const isSecretRatAdjacent = rats.some(
      (rat) => rat.health > 0 && !isRatStunned(rat) && isAdjacent(position, rat),
    )

    return isMainMouseAdjacent || isSecretRatAdjacent
  }

  function setPlayerPosition(nextPlayer: Position) {
    playerRef.current = nextPlayer
    setPlayer(nextPlayer)
  }

  function applyRatReprisal(
    damagePosition: Position,
    options: {
      rats?: readonly SecretRat[]
      mousePosition?: Position
      playerPos?: Position
    } = {},
  ) {
    if (isPlayerInvulnerable()) {
      clearRatReprisalTimer()
      return
    }

    if (!canRatRetaliateFrom(damagePosition, options)) {
      clearRatReprisalTimer()
      return
    }

    if (ratReprisalTimeoutRef.current !== null) return

    const {
      rats = secretPocketRatsRef.current,
      mousePosition = mainMousePositionRef.current,
      playerPos = playerRef.current,
    } = options

    const reprisalDelayMs = rats.some(
      (rat) => rat.health > 0 && rat.isBoss && isAdjacent(damagePosition, rat),
    )
      ? BOSS_REPRISAL_COOLDOWN_MS
      : RAT_REPRISAL_COOLDOWN_MS

    ratReprisalTimeoutRef.current = window.setTimeout(() => {
      ratReprisalTimeoutRef.current = null

      const currentPlayerPosition = playerPos
      if (
        mouseHealthRef.current <= 0 &&
        !rats.some((rat) => rat.health > 0 && isAdjacent(currentPlayerPosition, rat))
      ) {
        return
      }

      const nearbyRats = rats.filter(
        (rat) => rat.health > 0 && !isRatStunned(rat) && isAdjacent(currentPlayerPosition, rat),
      )
      const isMainMouseAdjacent =
        mouseHealthRef.current > 0 &&
        !isActiveBossFightRef.current &&
        isAdjacent(currentPlayerPosition, mousePosition)
      const nearbyRatPositions = nearbyRats.map((rat) => ({ x: rat.x, y: rat.y }))
      if (isMainMouseAdjacent) {
        nearbyRatPositions.push(mousePosition)
      }

      if (
        isPlayerInvulnerable() ||
        playerHealthRef.current <= 0 ||
        !canRatRetaliateFrom(currentPlayerPosition, { rats, mousePosition }) ||
        nearbyRatPositions.length === 0 ||
        isDeadRef.current ||
        hasEscapedRef.current
      ) {
        return
      }
      triggerRatAttackBurst(nearbyRatPositions, currentPlayerPosition)

      const retaliationDamage = getRatRetaliationDamage(nearbyRats)
      const nextPlayerHealth = Math.max(0, playerHealthRef.current - retaliationDamage)
      playerHealthRef.current = nextPlayerHealth
      setPlayerHealth(nextPlayerHealth)
      triggerBooleanPulse(setIsPlayerHurtPulse, playerHurtPulseTimeoutRef, 260)

      if (nextPlayerHealth <= 0) {
        setIsDead(true)
        triggerBooleanPulse(setIsPlayerDeathPulse, playerDeathPulseTimeoutRef, 900)
        addMessage('A rat strikes you. You lose all health.')
        return
      }

      addMessage(
        retaliationDamage > 1
          ? 'A rushing rat slams into you for 2 damage!'
          : 'A nearby rat strikes you. You lose 1 health.',
      )
      applyRatReprisal(currentPlayerPosition, {
        rats,
        mousePosition,
        playerPos: currentPlayerPosition,
      })
    }, reprisalDelayMs)
  }

  function triggerWallShake() {
    setSecretWallShaking(true)
    window.setTimeout(() => {
      setSecretWallShaking(false)
    }, 270)
  }

  function resetRoomRuntimeState() {
    clearRatReprisalTimer()
    clearBombAnimation()
    clearPlayerStunTimer()
    clearSkinAbility()
    clearAttackCharge()
    clearTimeoutRef(playerAttackPulseTimeoutRef)
    clearTimeoutRef(dinosaurAttackPulseTimeoutRef)
    clearTimeoutRef(ratHitPulseTimeoutRef)
    clearTimeoutRef(ratDeathPulseTimeoutRef)
    clearTimeoutRef(ratAttackPulseTimeoutRef)
    clearTimeoutRef(ratAttackSourcePulseTimeoutRef)
    clearTimeoutRef(bossDeathPulseTimeoutRef)
    clearTimeoutRef(interactionPulseTimeoutRef)
    clearTimeoutRef(playerHurtPulseTimeoutRef)
    clearTimeoutRef(movePulseTimeoutRef)
    clearTimeoutRef(doorPulseTimeoutRef)
    clearTimeoutRef(pickupPulseTimeoutRef)
    clearTimeoutRef(chestPulseTimeoutRef)
    clearTimeoutRef(wallShiftPulseTimeoutRef)
    clearTimeoutRef(teleportPulseTimeoutRef)
    clearTimeoutRef(abilityPulseTimeoutRef)
    clearTimeoutRef(teleportTransitionDepartRef)
    clearTimeoutRef(teleportTransitionArriveRef)
    if (bombCooldownIntervalRef.current !== null) {
      window.clearInterval(bombCooldownIntervalRef.current)
      bombCooldownIntervalRef.current = null
    }
    if (tutorialPopupDelayTimeoutRef.current !== null) {
      window.clearTimeout(tutorialPopupDelayTimeoutRef.current)
      tutorialPopupDelayTimeoutRef.current = null
    }

    playerStunnedUntilRef.current = 0
    playerSlowedUntilRef.current = 0
    lastHardModeSlowMoveAtRef.current = 0
    isBombAnimatingRef.current = false
    teleportMapPulseRef.current = null
    lastEnemyTickRef.current = 0
    lastBossTickRef.current = 0
    focusedShotReadyAtRef.current = 0
    levelTwoGrenadeReadyAtRef.current = 0
    levelTwoBombReadyAtRef.current = 0
    levelTwoCleaveReadyAtRef.current = 0
    hardModeSharedAbilityReadyAtRef.current = 0
    setHardModeSharedAbilityProgress(1)
    if (hardModeSharedAbilityIntervalRef.current !== null) {
      window.clearInterval(hardModeSharedAbilityIntervalRef.current)
      hardModeSharedAbilityIntervalRef.current = null
    }
    levelTwoRailShotReadyAtRef.current = 0
    levelTwoTaserReadyAtRef.current = 0
    levelTwoShockwaveReadyAtRef.current = 0
    levelTwoBlastWaveReadyAtRef.current = 0
    levelTwoMindWaveReadyAtRef.current = 0
    levelTwoRoomKeysRef.current = 0

    setPlayerAttackPulsePositions([])
    setDinosaurAttackPulsePositions([])
    setRatHitPulsePositions([])
    setEnemyHitMarkers([])
    setRatDeathPulsePositions([])
    setRatAttackPulsePositions([])
    setRatAttackSourcePulsePositions([])
    setBossDeathPulsePositions([])
    setInteractionPulsePositions([])
    setMovePulsePositions([])
    setPlayerTrailPositions([])
    setDoorPulsePositions([])
    setPickupPulsePositions([])
    setChestPulsePositions([])
    setWallShiftPulsePositions([])
    setTeleportPulsePositions([])
    setAbilityPulsePositions([])
    setAbilityPulseType(null)
    setIsAttackCharging(false)
    setAttackChargeLevel(0)
    setIsPlayerHurtPulse(false)
    setIsPlayerStunned(false)
    setIsDinosaurAttackActive(false)
    setSecretWallShaking(false)
    setTeleportMapPulse(null)
    setBombCooldownProgress(1)
    setLevelTwoRoomKeyDrops([])
    setTutorialPopup(null)
    tutorialPopupRef.current = null
    tutorialPopupDismissReadyAtRef.current = 0
    setShowKeyVanishedPopup(false)
    showKeyVanishedPopupRef.current = false
    setShowChallengePrompt(false)
    showChallengePromptRef.current = false
  }

  function revealMainMouseKey() {
    setMainMouseSkullVisible(true)
    window.setTimeout(() => {
      setMainMouseSkullVisible(false)
      setMainMouseKeyVisible(true)
    }, 2000)
  }

  function getPlayerInteractions() {
    const x = player.x
    const y = player.y

    return [
      { x, y },
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ]
  }

  function pickUpKeys() {
    const playerInteractionPositions = getPlayerInteractions()

    if (
      !isMouseAlive &&
      mainMouseKeyVisible &&
      playerInteractionPositions.some((position) =>
        isSamePosition(position, mainMousePosition),
      )
    ) {
      setMainMouseKeyVisible(false)
      setDoorKeyCount((currentCount) => currentCount + 1)
      triggerInteractionPulse([mainMousePosition])
      triggerPickupPulse([mainMousePosition])
      addMessage('You pick up a key.')
      return
    }

    if (
      rightRoomChestKeyVisible &&
      playerInteractionPositions.some((position) =>
        isSamePosition(position, rightRoomChestKeyPosition),
      )
    ) {
      setRightRoomChestKeyVisible(false)
      setChestKeyCount((currentCount) => currentCount + 1)
      triggerInteractionPulse([rightRoomChestKeyPosition])
      triggerPickupPulse([rightRoomChestKeyPosition])
      addMessage('You pick up a chest key.')
      return
    }

    if (
      thirdRoomChestKeyVisible &&
      playerInteractionPositions.some((position) =>
        isSamePosition(position, thirdRoomChestKeyPosition),
      )
    ) {
      setThirdRoomChestKeyVisible(false)
      setChestKeyCount((currentCount) => currentCount + 1)
      triggerInteractionPulse([thirdRoomChestKeyPosition])
      triggerPickupPulse([thirdRoomChestKeyPosition])
      addMessage('You pick up a chest key.')
      return
    }

    const now = Date.now()
    const adjacentDroppedRoomKeyIndex = levelTwoRoomKeyDrops.findIndex((drop) =>
      (!drop.availableAt || drop.availableAt <= now) &&
      playerInteractionPositions.some((position) => isSamePosition(position, drop)),
    )
    if (isLevelTwoRef.current && adjacentDroppedRoomKeyIndex >= 0) {
      const drop = levelTwoRoomKeyDrops[adjacentDroppedRoomKeyIndex]
      const pickupPosition = { x: drop.x, y: drop.y }
      setLevelTwoRoomKeyDrops((current) =>
        current.filter(
          (candidate) => !isSamePosition(candidate, pickupPosition),
        ),
      )
      setLevelTwoRoomKeys((currentCount) => {
        const nextCount = Math.min(LEVEL2_MAX_ROOM_KEYS, Math.max(currentCount, drop.reward))
        levelTwoRoomKeysRef.current = nextCount
        return nextCount
      })
      triggerInteractionPulse([pickupPosition])
      triggerPickupPulse([pickupPosition])
      addMessage('You pick up a room key.')
      return
    }

    addMessage('No key nearby. Move next to a key and press P to pick it up.')
  }

  function useKeys() {
    const adjacentPositions = getPlayerInteractions()
    const canUseVendingMachine =
      !isLevelTwoRef.current &&
      !isHardMode &&
      vendingMachineAvailable &&
      adjacentPositions.some((position) =>
        isVendingMachinePosition(position),
      )

    if (canUseVendingMachine) {
      setShowVendingMenu(true)
      addMessage('Choose: [1] 3 Bombs.')
      return
    }

    const canUseChest =
      !rightRoomChestOpen &&
      adjacentPositions.some((position) =>
        isSamePosition(position, rightRoomChestPosition),
      )
    const canUseThirdRoomChest =
      !thirdRoomChestOpen &&
      adjacentPositions.some((position) =>
        isSamePosition(position, thirdRoomChestPosition),
      )
    const canUseThirdRoomLifeChest =
      !thirdRoomLifeChestOpen &&
      adjacentPositions.some((position) =>
        isSamePosition(position, thirdRoomLifeChestPosition),
      )
    const canUseThirdRoomBombChest =
      !thirdRoomBombChestOpen &&
      adjacentPositions.some((position) =>
        isSamePosition(position, thirdRoomBombChestPosition),
      )
    const canUseThirdRoomSwordChest =
      !thirdRoomSwordChestOpen &&
      adjacentPositions.some((position) =>
        isSamePosition(position, thirdRoomSwordChestPosition),
      )
    const canOpenChest = canUseChest && chestKeyCount > 0
    const canOpenThirdRoomChest = canUseThirdRoomChest && chestKeyCount > 0
    if (canUseChest && canOpenChest) {
      setChestKeyCount((currentCount) => currentCount - 1)
      setRightRoomChestOpen(true)
      setRightRoomChestKeyVisible(false)
      setBombCount((currentCount) => currentCount + 1)
      triggerInteractionPulse([rightRoomChestPosition])
      triggerChestPulse([rightRoomChestPosition])
      addMessage(
        'You unlock the chest with a chest key. A bomb appears in your hands.',
      )
      return
    }

    if (canUseThirdRoomLifeChest) {
      setThirdRoomLifeChestOpen(true)
      setPlayerHealth((currentCount) => currentCount + 1)
      triggerInteractionPulse([thirdRoomLifeChestPosition])
      triggerChestPulse([thirdRoomLifeChestPosition])
      addMessage('You open the chest and gain an extra life.')
      return
    }

    if (canUseThirdRoomBombChest) {
      setThirdRoomBombChestOpen(true)
      setBombCount((currentCount) => currentCount + 5)
      triggerInteractionPulse([thirdRoomBombChestPosition])
      triggerChestPulse([thirdRoomBombChestPosition])
      addMessage('You open the chest and find 5 bombs.')
      return
    }

    if (canUseThirdRoomSwordChest) {
      setThirdRoomSwordChestOpen(true)
      setHasSword(true)
      triggerInteractionPulse([thirdRoomSwordChestPosition])
      triggerChestPulse([thirdRoomSwordChestPosition])
      addMessage(
        'You open the chest and find a new sword.',
      )
      return
    }

    if (canUseThirdRoomChest && canOpenThirdRoomChest) {
      setChestKeyCount((currentCount) => currentCount - 1)
      setThirdRoomChestOpen(true)
      setThirdRoomChestKeyVisible(false)
      setDoorKeyCount((currentCount) => currentCount + 1)
      triggerInteractionPulse([thirdRoomChestPosition])
      triggerChestPulse([thirdRoomChestPosition])
      addMessage(
        'You unlock the third-room chest with a chest key. A door key appears.',
      )
      return
    }

    if (canUseChest && !canOpenChest) {
      addMessage('The chest is locked. Need a chest key.')
      return
    }

    if (canUseThirdRoomChest && !canOpenThirdRoomChest) {
      addMessage('The third-room chest is locked. Need a chest key.')
      return
    }

    addMessage(
      'No usable target nearby. Move next to a chest or vending machine and press U.',
    )
  }

  function selectVendingReward() {
    triggerInteractionPulse([vendingMachinePosition])
    triggerPickupPulse([vendingMachinePosition])
    setBombCount((currentCount) => currentCount + 3)
    addMessage('You claim 3 bombs from the machine.')

    setVendingMachineAvailable(false)
    setShowVendingMenu(false)
  }

  function applySecretRatSwordKill(rat: Position) {
    triggerPlayerAttackPulse([rat])
    triggerRatHitPulse([rat])
    const nextRats = secretPocketRats.map((candidate) =>
      candidate.x === rat.x && candidate.y === rat.y && candidate.health > 0
        ? {
            ...candidate,
            health: candidate.isBoss ? getRatHealthAfterDamage(candidate, candidate.health) : 0,
            defeatedByDinosaur: false,
          }
        : candidate,
    )
    const defeatedRat = nextRats.find(
      (candidate) => candidate.x === rat.x && candidate.y === rat.y && candidate.health <= 0,
    )

    setSecretPocketRats(nextRats)
    if (defeatedRat) {
      triggerRatDeathPulse([defeatedRat])
    }
    if (defeatedRat && defeatedRat.isBoss) {
      triggerBossDeathPulse([defeatedRat])
      triggerWallShake()
      addMessage('The dragon falls. The final barrier breaks.')
      if (bossDeathPulseTimeoutRef.current !== null) {
        window.clearTimeout(bossDeathPulseTimeoutRef.current)
      }
      bossDeathPulseTimeoutRef.current = window.setTimeout(() => {
        bossDeathPulseTimeoutRef.current = null
        returnToFirstRoomAfterDragon()
      }, 820)
      return
    }

    addMessage('Your sword cuts the mouse in a single stroke.')
    markRoomTransitionRewards(secretPocketRats, nextRats)
    spawnBossDragonIfNeeded(nextRats)
    triggerWallShake()

    window.setTimeout(() => {
      setSecretPocketRats((current) =>
        current.filter(
          (candidate) =>
            !(candidate.x === rat.x && candidate.y === rat.y && candidate.health <= 0),
        ),
      )
    }, 2000)
  }

  function enterBossFight() {
    if (isActiveBossFight) return

    resetRoomRuntimeState()
    setIsBossFight(true)
    setIsPlayerStunned(false)
    clearPlayerStunTimer()
    clearSkinAbility()
    playerStunnedUntilRef.current = 0
    setThirdRoomKnown(false)
    setSecretPocketOpen(false)
    setSecretPocketRatsSpawned(false)
    setRightRoomKnown(false)
    setSecretRoomKnown(false)
    setMainMousePosition({ x: 999, y: 999 })
    setMainMouseHealth(0)
    const nextRoomRats = doubleChallengeSpawns(
      bossRoomRatSpawns,
      (position) =>
        position.x > 0 &&
        position.x < 24 &&
        position.y > 0 &&
        position.y < 9 &&
        !isSamePosition(position, bossRoomPlayerStartPosition),
    ).map((ratSpawn) => createRatFromSpawn(ratSpawn))
    setSecretPocketRats(nextRoomRats)
    secretPocketRatsRef.current = nextRoomRats
    setPlayerPosition(bossRoomPlayerStartPosition)
    addMessage(
      activeLevelRef.current === 3
        ? 'The gate opens into a larger boss arena full of ranged enemies.'
        : 'A hidden mechanism drags you into a hidden arena.',
    )
  }

  function showBossCompletionPrompt(completedLevel: LevelChoice) {
    resetRoomRuntimeState()
    setIsBossFight(false)
    isActiveBossFightRef.current = false
    setIsPlayerStunned(false)
    clearPlayerStunTimer()
    playerStunnedUntilRef.current = 0
    setSecretPocketRats([])
    secretPocketRatsRef.current = []
    setMainMousePosition({ x: 999, y: 999 })
    mainMousePositionRef.current = { x: 999, y: 999 }
    setMainMouseHealth(0)
    setShowNextLevelPrompt(true)
    showNextLevelPromptRef.current = true
    addMessage(
      isHardMode
        ? `Level ${completedLevel} clear. Press any key to continue to Level ${completedLevel + 1}.`
        : `Level ${completedLevel} clear. Go to Level ${completedLevel + 1}? Press Y or N.`,
    )
  }

  function returnToFirstRoomAfterDragon() {
    clearRatReprisalTimer()
    triggerWallShake()
    setIsBossFight(false)
    setIsPlayerStunned(false)
    clearPlayerStunTimer()
    playerStunnedUntilRef.current = 0
    if (activeLevelRef.current < 4) {
      showBossCompletionPrompt(activeLevelRef.current)
      return
    }
    if (isLevelTwoRef.current) {
      setPlayerPosition(getActiveAdvancedRooms()[3].startPosition)
      setLevelTwoCurrentRoom(4)
      setSecretPocketRats([])
      setMainMousePosition({ x: 999, y: 999 })
      setMainMouseHealth(0)
      setShowBossLevelSelect(true)
      return
    } else {
      setPlayerPosition(startPosition)
      setMainMousePosition(initialMousePosition)
    }
    if (!isLevelTwoRef.current) {
      setSecretPocketRats([])
    }
    setHasEscaped(false)
    if (isLevelTwoRef.current) {
      addMessage('The dragon falls. Level 2 is clear. Select a level to continue.')
    } else {
      addMessage('The dragon falls. The final barrier breaks. Select a level to continue.')
    }
    setShowBossLevelSelect(true)
  }

  function getNearestMouseAndDistance(): Array<{ x: number; y: number; distance: number }> {
    const livingTargets: Array<{ x: number; y: number; distance: number }> = []

    if (isMouseAlive && !isActiveBossFight) {
      livingTargets.push({
        x: mainMousePosition.x,
        y: mainMousePosition.y,
        distance: Math.abs(mainMousePosition.x - player.x) + Math.abs(mainMousePosition.y - player.y),
      })
    }

    for (const rat of secretPocketRats) {
      if (rat.health <= 0) continue
      livingTargets.push({
        x: rat.x,
        y: rat.y,
        distance: Math.abs(rat.x - player.x) + Math.abs(rat.y - player.y),
      })
    }

    return livingTargets.sort((a, b) => a.distance - b.distance)
  }

  function moveSecretPocketRats(
    currentRats: SecretRat[],
    shouldMove: (rat: SecretRat) => boolean = () => true,
    ratOccupancy?: Set<string>,
  ) {
    const playerPosition = playerRef.current

    const occupiedSquares = ratOccupancy ?? buildRatOccupancySet(currentRats)
    const levelTwoMovementContext = isLevelTwoRef.current
      ? getLevelTwoCollisionContext()
      : null
    const isRatBlockedByLevel = (position: Position) =>
      levelTwoMovementContext
        ? isBlockedInLevelTwoContext(position, levelTwoMovementContext, occupiedSquares)
        : isTileWallForCurrentLevel(position, currentRats, occupiedSquares)
    const isRatLockedForRangedAttack = (
      rat: SecretRat,
      occupancy: ReadonlySet<string>,
) => {
      if (isShadowHidden()) {
        return false
      }

      if (isAdjacent(rat, playerPosition)) {
        return true
      }

      if (!isRangedRat(rat)) {
        return false
      }

      if (isSniperRat(rat)) {
        const horizontalDistance = Math.abs(rat.x - playerPosition.x)
        const verticalDistance = Math.abs(rat.y - playerPosition.y)
        const isAligned = horizontalDistance === 0 || verticalDistance === 0
        const rangeToPlayer = Math.max(horizontalDistance, verticalDistance)

        return (
          isAligned &&
          rangeToPlayer <= LEVEL2_SNIPER_RANGE &&
          rangeToPlayer > 0 &&
          hasClearLineOfSight(rat, playerPosition, currentRats, occupancy)
        )
      }

      if (isGrenadierRat(rat)) {
        const rangeToPlayer = Math.max(
        Math.abs(rat.x - playerPosition.x),
        Math.abs(rat.y - playerPosition.y),
      )
      return (
        isOrthogonallyAligned(rat, playerPosition) &&
        rangeToPlayer <= LEVEL2_GRENADIER_RANGE &&
        rangeToPlayer > 0 &&
        hasClearLineOfSight(rat, playerPosition, currentRats, occupancy)
      )
      }

    if (isWardenRat(rat)) {
      const horizontalDistance = Math.abs(rat.x - playerPosition.x)
      const verticalDistance = Math.abs(rat.y - playerPosition.y)
      const isAligned = horizontalDistance === 0 || verticalDistance === 0
      const rangeToPlayer = Math.max(horizontalDistance, verticalDistance)

      return (
        isAligned &&
        rangeToPlayer <= LEVEL2_WARDEN_RANGE &&
        rangeToPlayer > 0 &&
        hasClearLineOfSight(rat, playerPosition, currentRats, occupancy)
      )
    }

    if (isMineRat(rat)) {
      const rangeToPlayer = Math.abs(rat.x - playerPosition.x) + Math.abs(rat.y - playerPosition.y)

      return (
        rangeToPlayer > 0 &&
        rangeToPlayer <= LEVEL2_MINE_RANGE &&
        hasClearLineOfSight(rat, playerPosition, currentRats, occupancy)
      )
    }

    if (isStunnerRat(rat)) {
      const horizontalDistance = Math.abs(rat.x - playerPosition.x)
      const verticalDistance = Math.abs(rat.y - playerPosition.y)
      const isAligned = isOrthogonallyAligned(rat, playerPosition)
      const rangeToPlayer = Math.max(horizontalDistance, verticalDistance)

      return (
        isAligned &&
        rangeToPlayer <= LEVEL2_STUNNER_RANGE &&
        rangeToPlayer > 0 &&
        hasClearLineOfSight(rat, playerPosition, currentRats, occupancy)
      )
    }

    return false
  }

    const findRatStep = (ratPosition: Position, shouldMoveTowardPlayer: boolean) => {
      const isLevelTwoMovement = isLevelTwoRef.current
      let chosenNextPosition: Position | null = null
      let chosenDistance = Number.POSITIVE_INFINITY
      const ratDistanceToPlayer =
        Math.abs(ratPosition.x - playerPosition.x) +
        Math.abs(ratPosition.y - playerPosition.y)

      const shuffledDirections = shuffleDirections(randomMovementDirections)

      for (const direction of shuffledDirections) {
        const nextRatPosition = {
          x: ratPosition.x + direction.x,
          y: ratPosition.y + direction.y,
        }
        if (isLevelTwoMovement && shouldMoveTowardPlayer) {
          if (isShadowHidden()) {
            continue
          }
          const nextRatDistance =
            Math.abs(nextRatPosition.x - playerPosition.x) +
            Math.abs(nextRatPosition.y - playerPosition.y)

          if (nextRatDistance > ratDistanceToPlayer) {
            continue
          }
        }

        const isRatBlockedByWall = isRatBlockedByLevel(nextRatPosition)

        if (isRatBlockedByWall) {
          continue
        }

        if (isSamePosition(nextRatPosition, playerPosition)) {
          continue
        }

        if (isSamePosition(nextRatPosition, mainMousePosition)) {
          continue
        }

        const nextRatPositionKey = `${nextRatPosition.x},${nextRatPosition.y}`
        if (occupiedSquares.has(nextRatPositionKey)) {
          continue
        }

        if (isLevelTwoMovement && shouldMoveTowardPlayer) {
          const nextRatDistance =
            Math.abs(nextRatPosition.x - playerPosition.x) +
            Math.abs(nextRatPosition.y - playerPosition.y)
          if (
            chosenNextPosition === null ||
            nextRatDistance < chosenDistance ||
            (nextRatDistance === chosenDistance && Math.random() < 0.5)
          ) {
            chosenNextPosition = nextRatPosition
            chosenDistance = nextRatDistance
          }
          continue
        }

        chosenNextPosition = nextRatPosition
        break
      }

      return chosenNextPosition
    }

    const nextRats = currentRats.slice()
    let hasMovedRat = false
    let hasUpdatedRatState = false

    for (let index = 0; index < currentRats.length; index += 1) {
      const rat = currentRats[index]

      if (rat.health <= 0) {
        continue
      }
      if (isRatStunned(rat)) {
        continue
      }
      if (!shouldMove(rat)) {
        continue
      }
      const isRatLocked = isRatLockedForRangedAttack(rat, occupiedSquares)

      if (isRatLocked) {
        continue
      }

      if (isRusherRat(rat) && isLevelTwoRef.current) {
        const startPositionKey = `${rat.x},${rat.y}`
        const ratShouldMoveTowardPlayer = !isActiveBossFightRef.current
        let nextRatPosition: Position = { x: rat.x, y: rat.y }
        let steps = 0

        while (steps < LEVEL2_RUSHER_MOVE_STEPS) {
          const nextStep = findRatStep(nextRatPosition, ratShouldMoveTowardPlayer)
          if (nextStep === null) {
            break
          }

          occupiedSquares.delete(`${nextRatPosition.x},${nextRatPosition.y}`)
          occupiedSquares.add(`${nextStep.x},${nextStep.y}`)
          nextRatPosition = nextStep
          steps += 1

          if (isAdjacent(nextRatPosition, playerPosition)) {
            break
          }
        }

        if (nextRatPosition.x === rat.x && nextRatPosition.y === rat.y) {
          occupiedSquares.delete(startPositionKey)
          occupiedSquares.add(startPositionKey)
          continue
        }

        hasMovedRat = true
        nextRats[index] = {
          ...rat,
          x: nextRatPosition.x,
          y: nextRatPosition.y,
        }
        continue
      }

      const chosenNextPosition = findRatStep(
        rat,
        !isShadowHidden() && !isRangedRat(rat) && !isActiveBossFightRef.current,
      )

      if (chosenNextPosition === null) {
        continue
      }

      const currentRatPositionKey = `${rat.x},${rat.y}`
      occupiedSquares.delete(currentRatPositionKey)
      occupiedSquares.add(`${chosenNextPosition.x},${chosenNextPosition.y}`)

      hasMovedRat = true
      nextRats[index] = {
        ...rat,
        x: chosenNextPosition.x,
        y: chosenNextPosition.y,
        nextAttackAt: isRangedRat(rat) ? undefined : rat.nextAttackAt,
      }
    }

    if (!hasMovedRat && !hasUpdatedRatState) {
      return currentRats
    }

    return nextRats
  }

  function processMineRatAttacks(
    currentRats: SecretRat[],
    ratOccupancy?: ReadonlySet<string>,
  ) {
    if (!isLevelTwoRef.current || isShadowHidden()) {
      return currentRats
    }

    const playerPosition = playerRef.current
    if (isPlayerInvulnerable()) {
      return currentRats
    }
    const now = Date.now()
    let nextPlayerHealth = playerHealthRef.current
    let mineAttackOccurred = false
    const mineAttackers: Position[] = []
    let nextRats: SecretRat[] | null = null
    const getNextRats = () => {
      if (nextRats === null) {
        nextRats = currentRats.slice()
      }
      return nextRats
    }

    void ratOccupancy
    for (let index = 0; index < currentRats.length; index += 1) {
      const rat = currentRats[index]
      if (!isMineRat(rat) || rat.health <= 0 || rat.isBoss || isRatStunned(rat)) {
        continue
      }

      const distanceToPlayer = Math.abs(rat.x - playerPosition.x)
        + Math.abs(rat.y - playerPosition.y)

      if (distanceToPlayer === 0 || distanceToPlayer > LEVEL2_MINE_RANGE) {
        continue
      }

      const nextShotAt = rat.nextShotAt ?? 0
      if (now < nextShotAt) {
        continue
      }

      const nextAttackAt = rat.nextAttackAt ?? 0
      if (now < nextAttackAt) {
        continue
      }

      if (nextAttackAt === 0) {
        const mutableRats = getNextRats()
        mutableRats[index] = {
          ...rat,
          nextAttackAt: now + LEVEL2_RANGED_RAT_ATTACK_DELAY_MS,
        }
        continue
      }

      mineAttackOccurred = true
      mineAttackers.push({ x: rat.x, y: rat.y })
      nextPlayerHealth = Math.max(0, nextPlayerHealth - 1)
      const mutableRats = getNextRats()

      mutableRats[index] = {
        ...rat,
        nextAttackAt: undefined,
        nextShotAt: now + LEVEL2_MINE_COOLDOWN_MS,
      }
    }

    if (!mineAttackOccurred) {
      return currentRats
    }

    triggerRatAttackBurst(mineAttackers, playerPosition)
    triggerRatHitPulse([playerPosition])

    if (nextPlayerHealth !== playerHealthRef.current) {
      triggerBooleanPulse(setIsPlayerHurtPulse, playerHurtPulseTimeoutRef, 260)
      playerHealthRef.current = nextPlayerHealth
      setPlayerHealth(nextPlayerHealth)

      if (nextPlayerHealth <= 0) {
        setIsDead(true)
        triggerBooleanPulse(setIsPlayerDeathPulse, playerDeathPulseTimeoutRef, 900)
        addMessage('A mine rat detonates beneath your feet and you die.')
      } else {
        addMessage('A mine rat detonates and hits you.')
      }
    }

    return nextRats ?? currentRats
  }

  function processAuraRatHealing(currentRats: SecretRat[]) {
    if (!isLevelTwoRef.current || isShadowHidden()) {
      return currentRats
    }

    const now = Date.now()
    let didPulse = false
    let nextRats: SecretRat[] | null = null
    const getNextRats = () => {
      if (nextRats === null) {
        nextRats = currentRats.slice()
      }
      return nextRats
    }

    let didPulseAuras = false

    for (let auraIndex = 0; auraIndex < currentRats.length; auraIndex += 1) {
      const auraRat = currentRats[auraIndex]
      if (!isAuraRat(auraRat) || auraRat.health <= 0 || auraRat.isBoss) {
        continue
      }

      const nextAuraPulseAt = auraRat.nextAuraPulseAt ?? 0
      if (now < nextAuraPulseAt) {
        continue
      }

      const nearbyRatIndexes: number[] = []

      for (let index = 0; index < currentRats.length; index += 1) {
        const nearbyRat = getNextRats()[index]
        if (
          nearbyRat.health <= 0 ||
          nearbyRat.isBoss ||
          nearbyRat.health >= getRatMaxHealth(nearbyRat) ||
          !isWithinRadius(auraRat, nearbyRat, LEVEL2_AURA_HEAL_RADIUS)
        ) {
          continue
        }

        nearbyRatIndexes.push(index)
      }

      if (nearbyRatIndexes.length === 0) {
        didPulseAuras = true
        const mutableRats = getNextRats()
        mutableRats[auraIndex] = {
          ...mutableRats[auraIndex],
          nextAuraPulseAt: now + LEVEL2_AURA_HEAL_COOLDOWN_MS,
        }
        continue
      }

      const healedPositions: Position[] = []

      const isAuraInRange = nearbyRatIndexes.includes(auraIndex)
      let auraHealHealth = auraRat.health
      if (isAuraInRange) {
        auraHealHealth = clampRatHealth(auraRat.health + LEVEL2_AURA_HEAL_AMOUNT, auraRat)
      }

      const mutableRats = getNextRats()
      if (auraHealHealth !== mutableRats[auraIndex].health) {
        didPulse = true
      }

      for (const nearbyIndex of nearbyRatIndexes) {
        const nearbyRat = mutableRats[nearbyIndex]
        const healedHealth = clampRatHealth(
          nearbyRat.health + LEVEL2_AURA_HEAL_AMOUNT,
          nearbyRat,
        )
        if (healedHealth <= nearbyRat.health) {
          continue
        }

        didPulse = true
        didPulseAuras = true
        healedPositions.push({ x: nearbyRat.x, y: nearbyRat.y })
        mutableRats[nearbyIndex] = {
          ...nearbyRat,
          health: healedHealth,
        }
      }

      const mutableAuraRats = getNextRats()
      mutableAuraRats[auraIndex] = {
        ...mutableAuraRats[auraIndex],
        health: auraHealHealth,
        nextAuraPulseAt: now + LEVEL2_AURA_HEAL_COOLDOWN_MS,
      }
      didPulseAuras = true

      if (healedPositions.length > 0) {
        triggerRatHitPulse(healedPositions)
      }
    }

    if (!didPulseAuras) {
      return currentRats
    }

    if (didPulse) {
      addMessage('An aura rat emits a green pulse and restores nearby rats.')
    }

    return nextRats ?? currentRats
  }

  function processStunnerRatAttacks(
    currentRats: SecretRat[],
    ratOccupancy?: ReadonlySet<string>,
  ) {
    if (!isLevelTwoRef.current || isShadowHidden()) {
      return currentRats
    }

    const playerPosition = playerRef.current
    if (isPlayerInvulnerable()) {
      return currentRats
    }
    const now = Date.now()
    let nextPlayerHealth = playerHealthRef.current
    let hasStunnerAttack = false
    const stunnerAttackers: Position[] = []
    let nextRats: SecretRat[] | null = null
    const getNextRats = () => {
      if (nextRats === null) {
        nextRats = currentRats.slice()
      }
      return nextRats
    }

    for (let index = 0; index < currentRats.length; index += 1) {
      const rat = currentRats[index]
      if (!isStunnerRat(rat) || rat.health <= 0 || rat.isBoss || isRatStunned(rat)) {
        continue
      }

      const horizontalDistance = Math.abs(rat.x - playerPosition.x)
      const verticalDistance = Math.abs(rat.y - playerPosition.y)
      const isAligned = isOrthogonallyAligned(rat, playerPosition)
      const rangeToPlayer = Math.max(horizontalDistance, verticalDistance)

      if (!isAligned || rangeToPlayer > LEVEL2_STUNNER_RANGE || rangeToPlayer === 0) {
        continue
      }

      if (!hasClearLineOfSight(rat, playerPosition, currentRats, ratOccupancy)) {
        continue
      }

      const nextShotAt = rat.nextShotAt ?? 0
      if (now < nextShotAt) {
        continue
      }

      const nextAttackAt = rat.nextAttackAt ?? 0
      if (now < nextAttackAt) {
        continue
      }

      if (nextAttackAt === 0) {
        const mutableRats = getNextRats()
        mutableRats[index] = {
          ...rat,
          nextAttackAt: now + LEVEL2_RANGED_RAT_ATTACK_DELAY_MS,
        }
        continue
      }

      hasStunnerAttack = true
      stunnerAttackers.push({ x: rat.x, y: rat.y })
      nextPlayerHealth = Math.max(0, nextPlayerHealth - 1)
      applyPlayerStun(LEVEL2_STUNNER_STUN_MS)
      const mutableRats = getNextRats()

      mutableRats[index] = {
        ...rat,
        nextAttackAt: undefined,
        nextShotAt: now + LEVEL2_STUNNER_COOLDOWN_MS,
      }
    }

    if (!hasStunnerAttack) {
      return currentRats
    }

    triggerRatAttackBurst(stunnerAttackers, playerPosition)
    triggerRatHitPulse([playerPosition])

    if (nextPlayerHealth !== playerHealthRef.current) {
      triggerBooleanPulse(setIsPlayerHurtPulse, playerHurtPulseTimeoutRef, 260)
      playerHealthRef.current = nextPlayerHealth
      setPlayerHealth(nextPlayerHealth)

      if (nextPlayerHealth <= 0) {
        setIsDead(true)
        triggerBooleanPulse(setIsPlayerDeathPulse, playerDeathPulseTimeoutRef, 900)
        addMessage('A stunner rat electrifies you and you drop your guard.')
      } else {
        addMessage('A stunner rat pulses and stuns you.')
      }
    }

    return nextRats ?? currentRats
  }

  function processWardenRatAttacks(
    currentRats: SecretRat[],
    ratOccupancy?: ReadonlySet<string>,
  ) {
    if (!isLevelTwoRef.current || isShadowHidden()) {
      return currentRats
    }

    const playerPosition = playerRef.current
    if (isPlayerInvulnerable()) {
      return currentRats
    }
    const now = Date.now()
    let nextPlayerHealth = playerHealthRef.current
    let hasWardenAttack = false
    const wardenAttackers: Position[] = []
    let nextRats: SecretRat[] | null = null
    const getNextRats = () => {
      if (nextRats === null) {
        nextRats = currentRats.slice()
      }
      return nextRats
    }

    for (let index = 0; index < currentRats.length; index += 1) {
      const rat = currentRats[index]
      if (!isWardenRat(rat) || rat.health <= 0 || rat.isBoss || isRatStunned(rat)) {
        continue
      }

      const horizontalDistance = Math.abs(rat.x - playerPosition.x)
      const verticalDistance = Math.abs(rat.y - playerPosition.y)
      const isAligned = horizontalDistance === 0 || verticalDistance === 0
      const rangeToPlayer = Math.max(horizontalDistance, verticalDistance)

      if (!isAligned || rangeToPlayer > LEVEL2_WARDEN_RANGE || rangeToPlayer === 0) {
        continue
      }

      if (!hasClearLineOfSight(rat, playerPosition, currentRats, ratOccupancy)) {
        continue
      }

      const nextShotAt = rat.nextShotAt ?? 0
      if (now < nextShotAt) {
        continue
      }

      const nextAttackAt = rat.nextAttackAt ?? 0
      if (now < nextAttackAt) {
        continue
      }

      if (nextAttackAt === 0) {
        const mutableRats = getNextRats()
        mutableRats[index] = {
          ...rat,
          nextAttackAt: now + LEVEL2_RANGED_RAT_ATTACK_DELAY_MS,
        }
        continue
      }

      hasWardenAttack = true
      wardenAttackers.push({ x: rat.x, y: rat.y })
      nextPlayerHealth = Math.max(0, nextPlayerHealth - LEVEL2_WARDEN_DAMAGE)
      const mutableRats = getNextRats()

      mutableRats[index] = {
        ...rat,
        nextAttackAt: undefined,
        nextShotAt: now + LEVEL2_WARDEN_COOLDOWN_MS,
      }
    }

    if (!hasWardenAttack) {
      return currentRats
    }

    triggerRatAttackBurst(wardenAttackers, playerPosition)
    triggerRatHitPulse([playerPosition])

    if (nextPlayerHealth !== playerHealthRef.current) {
      triggerBooleanPulse(setIsPlayerHurtPulse, playerHurtPulseTimeoutRef, 260)
      playerHealthRef.current = nextPlayerHealth
      setPlayerHealth(nextPlayerHealth)

      if (nextPlayerHealth <= 0) {
        setIsDead(true)
        triggerBooleanPulse(setIsPlayerDeathPulse, playerDeathPulseTimeoutRef, 900)
        addMessage('A turret-warden fires through the vents. You die.')
      } else {
        addMessage('A turret-warden fires a blast at you.')
      }
    }

    return nextRats ?? currentRats
  }

  function processSniperRatAttacks(
    currentRats: SecretRat[],
    ratOccupancy?: ReadonlySet<string>,
  ) {
    if (!isLevelTwoRef.current || isShadowHidden()) {
      return currentRats
    }

    const playerPosition = playerRef.current
    if (isPlayerInvulnerable()) {
      return currentRats
    }
    const now = Date.now()
    let nextPlayerHealth = playerHealthRef.current
    let hasSniperAttack = false
    let hasSniperAttackStateChange = false
    const sniperAttackers: Position[] = []
    let nextRats: SecretRat[] | null = null
    const getNextRats = () => {
      if (nextRats === null) {
        nextRats = currentRats.slice()
      }
      return nextRats
    }

    for (let index = 0; index < currentRats.length; index += 1) {
      const rat = currentRats[index]
      if (!isSniperRat(rat) || rat.health <= 0 || rat.isBoss || isRatStunned(rat)) {
        continue
      }

      const horizontalDistance = Math.abs(rat.x - playerPosition.x)
      const verticalDistance = Math.abs(rat.y - playerPosition.y)
      const isAligned = horizontalDistance === 0 || verticalDistance === 0
      const rangeToPlayer = Math.max(horizontalDistance, verticalDistance)

      if (!isAligned || rangeToPlayer > LEVEL2_SNIPER_RANGE || rangeToPlayer === 0) {
        continue
      }

      if (!hasClearLineOfSight(rat, playerPosition, currentRats, ratOccupancy)) {
        continue
      }

      const nextShotAt = rat.nextShotAt ?? 0
      if (now < nextShotAt) {
        continue
      }

      const nextAttackAt = rat.nextAttackAt ?? 0
      if (now < nextAttackAt) {
        continue
      }

      if (nextAttackAt === 0) {
        const mutableRats = getNextRats()
        mutableRats[index] = {
          ...rat,
          nextAttackAt: now + LEVEL2_RANGED_RAT_ATTACK_DELAY_MS,
        }
        hasSniperAttackStateChange = true
        continue
      }

      hasSniperAttack = true
      sniperAttackers.push({ x: rat.x, y: rat.y })
      nextPlayerHealth = Math.max(0, nextPlayerHealth - 1)
      const mutableRats = getNextRats()

      mutableRats[index] = {
        ...rat,
        nextAttackAt: undefined,
        nextShotAt: now + LEVEL2_SNIPER_COOLDOWN_MS,
      }
    }

    if (!hasSniperAttack && !hasSniperAttackStateChange) {
      return currentRats
    }

    triggerRatAttackBurst(sniperAttackers, playerPosition)

    if (nextPlayerHealth !== playerHealthRef.current) {
      triggerBooleanPulse(setIsPlayerHurtPulse, playerHurtPulseTimeoutRef, 260)
      playerHealthRef.current = nextPlayerHealth
      setPlayerHealth(nextPlayerHealth)

      if (nextPlayerHealth <= 0) {
        setIsDead(true)
        triggerBooleanPulse(setIsPlayerDeathPulse, playerDeathPulseTimeoutRef, 900)
        addMessage('A poisoned dart finds your heart. You die.')
      } else {
        addMessage('A sniper rat fires from afar.')
      }
    }

    return nextRats ?? currentRats
  }

  function processGrenadierRatAttacks(
    currentRats: SecretRat[],
    ratOccupancy?: ReadonlySet<string>,
  ) {
    if (!isLevelTwoRef.current || isShadowHidden()) {
      return currentRats
    }

    const playerPosition = playerRef.current
    if (isPlayerInvulnerable()) {
      return currentRats
    }
    const now = Date.now()
    let nextPlayerHealth = playerHealthRef.current
    let grenadeShooter: Position | null = null

    let closestShooter: { index: number; distance: number } | null = null
    let nextRats: SecretRat[] | null = null
    const getNextRats = () => {
      if (nextRats === null) {
        nextRats = currentRats.slice()
      }
      return nextRats
    }

    for (let index = 0; index < currentRats.length; index += 1) {
      const rat = currentRats[index]
      if (!isGrenadierRat(rat) || rat.health <= 0 || rat.isBoss || isRatStunned(rat)) {
        continue
      }

      const rangeToPlayer = Math.max(
        Math.abs(rat.x - playerPosition.x),
        Math.abs(rat.y - playerPosition.y),
      )
      const isAligned = isOrthogonallyAligned(rat, playerPosition)
      if (!isAligned || rangeToPlayer <= 0 || rangeToPlayer > LEVEL2_GRENADIER_RANGE) {
        continue
      }

      if (!hasClearLineOfSight(rat, playerPosition, currentRats, ratOccupancy)) {
        continue
      }

      const nextShotAt = rat.nextShotAt ?? 0
      if (now < nextShotAt) {
        continue
      }

      if (closestShooter === null || rangeToPlayer < closestShooter.distance) {
        closestShooter = { index, distance: rangeToPlayer }
      }
    }

    if (!closestShooter) {
      return currentRats
    }

    const shooter = currentRats[closestShooter.index]
    const nextAttackAt = shooter.nextAttackAt ?? 0
    if (now < nextAttackAt) {
      return currentRats
    }

    const mutableRats = getNextRats()

    if (nextAttackAt === 0) {
      mutableRats[closestShooter.index] = {
        ...shooter,
        nextAttackAt: now + LEVEL2_RANGED_RAT_ATTACK_DELAY_MS,
      }
      return nextRats ?? currentRats
    }

    mutableRats[closestShooter.index] = {
      ...shooter,
      nextAttackAt: undefined,
      nextShotAt: now + LEVEL2_GRENADIER_COOLDOWN_MS,
    }

    nextPlayerHealth = Math.max(0, nextPlayerHealth - 1)
    grenadeShooter = { x: shooter.x, y: shooter.y }
    triggerRatAttackBurst([grenadeShooter], playerPosition)

    if (nextPlayerHealth !== playerHealthRef.current) {
      triggerBooleanPulse(setIsPlayerHurtPulse, playerHurtPulseTimeoutRef, 260)
      playerHealthRef.current = nextPlayerHealth
      setPlayerHealth(nextPlayerHealth)

      if (nextPlayerHealth <= 0) {
        setIsDead(true)
        triggerBooleanPulse(setIsPlayerDeathPulse, playerDeathPulseTimeoutRef, 900)
        addMessage('A grenadier rat tosses a grenade. You die.')
      } else {
        addMessage('A grenadier rat launches a grenade.')
      }
    }

    return nextRats ?? currentRats
  }

  function moveMainMouse(currentMouse: Position) {
    if (isLevelTwoRef.current) {
      return currentMouse
    }

    if (mouseHealthRef.current <= 0) {
      return currentMouse
    }

    if (isAdjacent(currentMouse, playerRef.current)) {
      return currentMouse
    }

    const currentRats = secretPocketRatsRef.current
    const ratOccupancy = buildRatOccupancySet(currentRats)

    const shuffledDirections = shuffleDirections(randomMovementDirections)

    for (const direction of shuffledDirections) {
      const nextMousePosition = {
        x: currentMouse.x + direction.x,
        y: currentMouse.y + direction.y,
      }

      if (
        !secretRoomKnown &&
        isSamePosition(nextMousePosition, secretRoomDoorPosition)
      ) {
        continue
      }

      if (isSamePosition(nextMousePosition, player)) {
        continue
      }

      if (isTileWallForCurrentLevel(
        nextMousePosition,
        currentRats,
        ratOccupancy,
      )) {
        continue
      }

      if (currentRats.some((rat) => rat.health > 0 && isSamePosition(rat, nextMousePosition))) {
        continue
      }

      return nextMousePosition
    }

    return currentMouse
  }

  function isWallForBomb(position: Position) {
    return isTileWallForCurrentLevel(
      position,
      secretPocketRats,
    )
  }

  useEffect(() => {
    const shouldRunBossTick = isActiveBossFight && hasActiveBoss
    const shouldRunBossArenaRatTick = isActiveBossFight && isBossArenaLoaded
    if (
      isDead ||
      hasEscaped ||
      (!shouldRunBossTick && isActiveBossFight && !shouldRunBossArenaRatTick)
    ) {
      return
    }

    const tickIntervalMs = shouldRunBossTick
      ? bossMoveIntervalMs
      : enemyMoveIntervalMs

    enemyMoveIntervalRef.current = window.setInterval(() => {
      if (
        isDeadRef.current ||
        hasEscapedRef.current ||
        !isWindowVisibleRef.current
      ) {
        return
      }
      if (modeRef.current !== 'normal') return
      if (
        showVendingMenuRef.current ||
        showBossLevelSelectRef.current ||
        showNextLevelPromptRef.current ||
        showSkinMenuRef.current ||
        showEnemyGuideRef.current ||
        showModeMenuRef.current ||
        tutorialPopupRef.current !== null ||
        showChallengePromptRef.current ||
        showKeyVanishedPopupRef.current ||
        showSkinUnlockPopupRef.current ||
        isBombAnimatingRef.current ||
        teleportMapPulseRef.current !== null
      ) {
        return
      }

      const isBossTickNow = hasActiveBossRef.current && isActiveBossFightRef.current
      if (isBossTickNow) {
        if (!isWindowVisibleRef.current) return
      } else if (
        isActiveBossFightRef.current &&
        !isLevelTwoRef.current &&
        secretPocketRatsRef.current.length === 0
      ) {
        return
      }

      const currentRats = secretPocketRatsRef.current
      const now = Date.now()
      const activeIntervalMs = isBossTickNow ? bossMoveIntervalMs : enemyMoveIntervalMs
      const minimumGap = Math.max(1, activeIntervalMs - ENEMY_TICK_GAP_GRACE_MS)
      const tickRef = isBossTickNow ? lastBossTickRef : lastEnemyTickRef
      if (now - tickRef.current < minimumGap) {
        return
      }
      tickRef.current = now

      let nextMousePosition = mainMousePositionRef.current
      if (!isBossTickNow && mouseHealthRef.current > 0 && !isActiveBossFightRef.current) {
        nextMousePosition = moveMainMouse(mainMousePositionRef.current)
        if (!isSamePosition(nextMousePosition, mainMousePositionRef.current)) {
          setMainMousePosition(nextMousePosition)
        }
      }

      const playerPosition = playerRef.current
      if (currentRats.length === 0) {
        if (canRatRetaliateFrom(playerPosition, { mousePosition: nextMousePosition })) {
          applyRatReprisal(playerPosition, {
            rats: [],
            mousePosition: nextMousePosition,
            playerPos: playerPosition,
          })
        }
        return
      }

      const nextRats = moveSecretPocketRats(
        currentRats,
        () => true,
      )
      if (isActiveBossFightRef.current && !isLevelTwoRef.current) {
        if (nextRats !== secretPocketRatsRef.current) {
          setSecretPocketRats(nextRats)
        }
        if (canRatRetaliateFrom(playerPosition, { rats: nextRats, mousePosition: nextMousePosition })) {
          applyRatReprisal(playerPosition, {
            rats: nextRats,
            mousePosition: nextMousePosition,
            playerPos: playerPosition,
          })
        }
        return
      }
      const ratOccupancyForTick = buildRatOccupancySet(nextRats)
      const ratsAfterSniperAttacks = processSniperRatAttacks(
        nextRats,
        ratOccupancyForTick,
      )
      const ratsAfterGrenadierAttacks = processGrenadierRatAttacks(
        ratsAfterSniperAttacks,
        ratOccupancyForTick,
      )
      const ratsAfterStunnerAttacks = processStunnerRatAttacks(
        ratsAfterGrenadierAttacks,
        ratOccupancyForTick,
      )
      const ratsAfterWardenAttacks = processWardenRatAttacks(
        ratsAfterStunnerAttacks,
        ratOccupancyForTick,
      )
      const ratsAfterMineAttacks = processMineRatAttacks(
        ratsAfterWardenAttacks,
        ratOccupancyForTick,
      )
      const ratsAfterAuraHealing = processAuraRatHealing(ratsAfterMineAttacks)
      if (ratsAfterAuraHealing !== secretPocketRatsRef.current) {
        setSecretPocketRats(ratsAfterAuraHealing)
      }
      if (canRatRetaliateFrom(playerPosition, { rats: ratsAfterAuraHealing, mousePosition: nextMousePosition })) {
        applyRatReprisal(playerPosition, {
          rats: ratsAfterAuraHealing,
          mousePosition: nextMousePosition,
          playerPos: playerPosition,
        })
      }
    }, tickIntervalMs)

  return () => {
      if (enemyMoveIntervalRef.current !== null) {
        window.clearInterval(enemyMoveIntervalRef.current)
        enemyMoveIntervalRef.current = null
      }
    }
  }, [
    isActiveBossFight,
    isLevelTwo,
    hasActiveBoss,
    isDead,
    hasEscaped,
    isBossFight,
    secretPocketRats.length,
    mouseHealth,
  ])

  function throwBomb(isGrenadeMode = false) {
    if (isBombAnimating) {
      return
    }

    if (!isLevelTwoRef.current && isGrenadeMode) {
      addMessage('The wider grenade throw is a level 2 skill.')
      applyRatReprisal(player)
      return
    }

    if (isGrenadeMode) {
      const now = Date.now()
      if (levelTwoGrenadeReadyAtRef.current > now) {
        const remainingSeconds = ((levelTwoGrenadeReadyAtRef.current - now) / 1000).toFixed(1)
        addMessage(`Grenade launcher recharging: ${remainingSeconds}s remaining.`)
        return
      }
    }

    if (isLevelTwoRef.current && !isGrenadeMode) {
      const now = Date.now()
      if (levelTwoBombReadyAtRef.current > now) {
        const remainingSeconds = ((levelTwoBombReadyAtRef.current - now) / 1000).toFixed(1)
        addMessage(`Bomb recharging: ${remainingSeconds}s remaining.`)
        return
      }
    }

    if (!isLevelTwoRef.current && bombCount <= 0) {
      addMessage('You have no bombs to throw.')
      applyRatReprisal(player)
      return
    }

    const closestTargets = getNearestMouseAndDistance()

    const directions: Array<Position> = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
    ]

    const throwPlans = directions
      .map((direction) => {
        const throwTile = {
          x: player.x + direction.x,
          y: player.y + direction.y,
        }
        const explosionTile = {
          x: player.x + direction.x * (isGrenadeMode ? LEVEL2_GRENADE_RANGE : 2),
          y: player.y + direction.y * (isGrenadeMode ? LEVEL2_GRENADE_RANGE : 2),
        }
        const blocked = isWallForBomb(throwTile)
        const effectiveExplosionTile = isWallForBomb(explosionTile)
          ? throwTile
          : explosionTile

        const distanceTargets = closestTargets.length > 0
          ? closestTargets
          : [
              {
                x: effectiveExplosionTile.x,
                y: effectiveExplosionTile.y,
                distance: Number.POSITIVE_INFINITY,
              },
            ]

        const distanceToClosestMouse = distanceTargets.reduce(
          (bestDistance, target) =>
            Math.min(
              bestDistance,
              Math.abs(target.x - effectiveExplosionTile.x) +
                Math.abs(target.y - effectiveExplosionTile.y),
            ),
          Infinity,
        )
        const killTargets = distanceTargets.filter((target) =>
          isWithinRadius(target, effectiveExplosionTile, isGrenadeMode ? LEVEL2_GRENADE_BOMB_RADIUS : 1),
        )
        const willHitMouse = killTargets.length > 0
        const willHaveTarget = closestTargets.length > 0
        const targetedKill = willHitMouse
          ? killTargets.reduce((closest, current) => {
              const closestDistance =
                Math.abs(closest.x - effectiveExplosionTile.x) +
                Math.abs(closest.y - effectiveExplosionTile.y)
              const currentDistance =
                Math.abs(current.x - effectiveExplosionTile.x) +
                Math.abs(current.y - effectiveExplosionTile.y)
              return currentDistance < closestDistance ? current : closest
            }, killTargets[0] as (typeof killTargets)[number])
          : null

        return {
          direction,
          effectiveExplosionTile,
          blocked,
          distanceToClosestMouse,
          willHitMouse,
          willHaveTarget,
          targetedKill,
        }
      })
      .filter((plan) => !plan.blocked)

    if (throwPlans.length === 0) {
      addMessage('The bomb cannot reach that far through a wall.')
      applyRatReprisal(player)
      return
    }

    const bestPlan = throwPlans.reduce((best, current) => {
      if (current.willHitMouse && !best.willHitMouse) return current
      if (!current.willHitMouse && best.willHitMouse) return best
      if (current.distanceToClosestMouse < best.distanceToClosestMouse) return current
      if (current.distanceToClosestMouse === best.distanceToClosestMouse) return best
      return best
    }, throwPlans[0] as (typeof throwPlans)[number])

    if (!bestPlan.willHaveTarget) {
      addMessage('No mice in range. The bomb flies and explodes at the nearest open tile.')
    }

    const { effectiveExplosionTile, targetedKill } = bestPlan
    const blastRange = isGrenadeMode ? LEVEL2_GRENADE_RANGE : 2
    const bombPath = getOrthogonalLinePositions(player, effectiveExplosionTile, blastRange)
    const bombImpactTile = targetedKill ?? effectiveExplosionTile
    const isTargetedKill = targetedKill !== null
    const targetTile = targetedKill ? { ...targetedKill } : null
    const blastRadius = isGrenadeMode
      ? LEVEL2_GRENADE_BOMB_RADIUS
      : 1

    triggerAbilityPulse('bomb', [player, ...bombPath, bombImpactTile])
    if (isLevelTwoRef.current && !isGrenadeMode) {
      startBombCooldown()
    } else {
      setBombCount((currentCount) => currentCount - 1)
    }
    if (isGrenadeMode) {
      levelTwoGrenadeReadyAtRef.current = Date.now() + LEVEL2_GRENADE_COOLDOWN_MS
    }
    isBombAnimatingRef.current = true
    setBombAnimation({
      phase: 'flying',
      start: { ...player },
      end: bombImpactTile,
      isTargetedKill,
      targetTile,
      blastRadius,
    })
    const bombFlightDuration = isTargetedKill ? 380 : 360

    addMessage(
      isGrenadeMode
        ? 'You hurl a wider grenade toward the nearest target.'
        : 'You throw a bomb toward the nearest threat.',
    )

    const applyExplosion = () => {
      setBombAnimation((current) =>
        current
          ? {
              ...current,
              phase: 'exploding',
            }
          : current,
      )

      const currentRatsAtImpact = secretPocketRatsRef.current
      const nearbyRats = currentRatsAtImpact.filter((rat) => {
        if (rat.health <= 0) return false
        if (targetTile !== null && rat.x === targetTile.x && rat.y === targetTile.y) {
          return true
        }
        return isWithinRadius(rat, bombImpactTile, blastRadius)
      })

      if (nearbyRats.length > 0) {
        const nearbyRatKeys = new Set(
          nearbyRats.map((rat) => `${rat.x},${rat.y}`),
        )
        const nextRats = currentRatsAtImpact.map((rat) =>
          nearbyRatKeys.has(`${rat.x},${rat.y}`) && rat.health > 0
            ? {
                ...rat,
                health: rat.isBoss
                  ? Math.max(0, rat.health - 1)
                  : activeLevelRef.current === 1
                    ? 0
                    : getRatHealthAfterDamage(rat, 2),
                defeatedByDinosaur: false,
              }
            : rat,
        )
        triggerRatHitPulse(nearbyRats)
        const defeatedRats = nextRats.filter(
          (rat) =>
            rat.health <= 0 &&
            rat.health > -1 &&
            nearbyRatKeys.has(`${rat.x},${rat.y}`) &&
            !rat.isBoss,
        )
        const defeatedBoss = nextRats.find(
          (rat) =>
            rat.isBoss &&
            rat.health <= 0 &&
            nearbyRatKeys.has(`${rat.x},${rat.y}`),
        )
        triggerRatDeathPulse(defeatedRats)
        if (defeatedBoss) {
          triggerBossDeathPulse([defeatedBoss])
          triggerWallShake()
          addMessage('The dragon falls. The final barrier breaks.')
          if (bossDeathPulseTimeoutRef.current !== null) {
            window.clearTimeout(bossDeathPulseTimeoutRef.current)
          }
          bossDeathPulseTimeoutRef.current = window.setTimeout(() => {
            bossDeathPulseTimeoutRef.current = null
            returnToFirstRoomAfterDragon()
          }, 820)
          return
        }
        triggerInteractionPulse([bombImpactTile])

        setSecretPocketRats(nextRats)

        markRoomTransitionRewards(currentRatsAtImpact, nextRats)
        spawnBossDragonIfNeeded(nextRats)
        triggerWallShake()

        window.setTimeout(() => {
          setSecretPocketRats((current) =>
            current.filter(
              (rat) =>
                !(rat.health <= 0 && !rat.defeatedByDinosaur && nearbyRatKeys.has(`${rat.x},${rat.y}`)),
            ),
          )
        }, 2000)
      }

      if (isMouseAlive && isWithinRadius(mainMousePosition, bombImpactTile, blastRadius)) {
        setMainMouseHealth(0)
        triggerRatDeathPulse([mainMousePosition])
        revealMainMouseKey()
        applyRatDefeatProgress()
        addMessage('The mouse is caught in the blast.')
      } else if (nearbyRats.length === 0) {
        addMessage('The bomb goes off in silence.')
      }

      addMessage(isGrenadeMode ? 'The grenade explodes with a wider blast.' : 'The bomb explodes!')
      applyRatReprisal(player)
      bombImpactTimeoutRef.current = window.setTimeout(() => {
        clearBombAnimation()
      }, 250)
    }

  clearBombAnimation()
  bombFlightTimeoutRef.current = window.setTimeout(() => {
      applyExplosion()
    }, bombFlightDuration)
  }

  const gameKeyboardHandlersRef = useRef<{
    pickUpKeys: () => void
    useKeys: () => void
    throwBomb: () => void
    useFocusedShot: () => void
    fireRailShot: () => void
    cleaveAttack: () => void
    dinosaurAttack: () => void
    useSkinAbility: () => void
    attack: () => void
    releaseAttackCharge: () => void
    movePlayer: (movement: Position) => void
    handleCommandKey: (event: KeyboardEvent) => void
  }>({
    pickUpKeys: () => {},
    useKeys: () => {},
    throwBomb: () => {},
    useFocusedShot: () => {},
    fireRailShot: () => {},
    cleaveAttack: () => {},
    dinosaurAttack: () => {},
    useSkinAbility: () => {},
    attack: () => {},
    releaseAttackCharge: () => {},
    movePlayer: () => {},
    handleCommandKey: () => {},
  })

  gameKeyboardHandlersRef.current = {
    pickUpKeys,
    useKeys,
    throwBomb,
    useFocusedShot,
    fireRailShot,
    cleaveAttack,
    dinosaurAttack,
    useSkinAbility,
    attack,
    releaseAttackCharge,
    movePlayer,
    handleCommandKey,
  }

  function closeEnemyGuide() {
    setShowEnemyGuide(false)
    showEnemyGuideRef.current = false
    setEnemyGuideMode('list')
    enemyGuideModeRef.current = 'list'
    setEnemyGuideSearch('')
    enemyGuideSearchRef.current = ''
  }

  function openEnemyGuide() {
    setShowEnemyGuide(true)
    showEnemyGuideRef.current = true
    setEnemyGuideMode('list')
    enemyGuideModeRef.current = 'list'
    setEnemyGuideSearch('')
    enemyGuideSearchRef.current = ''
    setEnemyGuideIndex(0)
    enemyGuideIndexRef.current = 0
    clearRatReprisalTimer()
    addMessage('Enemy guide opened. Search or use J/K, then Enter.')
  }

  function moveEnemyGuideSelection(offset: number) {
    const entries = getEnemyGuideEntriesForLevel(activeLevelRef.current)
    if (entries.length === 0) return

    const nextIndex = (enemyGuideIndexRef.current + offset + entries.length) % entries.length
    enemyGuideIndexRef.current = nextIndex
    setEnemyGuideIndex(nextIndex)
    setEnemyGuideSearch('')
    enemyGuideSearchRef.current = ''
  }

  function updateEnemyGuideSearch(nextSearch: string) {
    const entries = getEnemyGuideEntriesForLevel(activeLevelRef.current)
    enemyGuideSearchRef.current = nextSearch
    setEnemyGuideSearch(nextSearch)

    const matchedIndex = entries.findIndex((entry) =>
      entry.label.toLowerCase().startsWith(nextSearch),
    )
    if (matchedIndex >= 0) {
      enemyGuideIndexRef.current = matchedIndex
      setEnemyGuideIndex(matchedIndex)
    }
  }

  function closeModeMenu() {
    setShowModeMenu(false)
    showModeMenuRef.current = false
    setModeMenuSearch('')
    modeMenuSearchRef.current = ''
  }

  function openModeMenu() {
    const currentModeIndex = difficulty === 'hard' ? 1 : 0
    setShowModeMenu(true)
    showModeMenuRef.current = true
    setModeMenuIndex(currentModeIndex)
    modeMenuIndexRef.current = currentModeIndex
    setModeMenuSearch('')
    modeMenuSearchRef.current = ''
    clearRatReprisalTimer()
    addMessage('Choose a mode with arrows, J/K, search, then Enter.')
  }

  function moveModeMenuSelection(offset: number) {
    const nextIndex = (modeMenuIndexRef.current + offset + MODE_OPTIONS.length) % MODE_OPTIONS.length
    modeMenuIndexRef.current = nextIndex
    setModeMenuIndex(nextIndex)
    setModeMenuSearch('')
    modeMenuSearchRef.current = ''
  }

  function updateModeMenuSearch(nextSearch: string) {
    modeMenuSearchRef.current = nextSearch
    setModeMenuSearch(nextSearch)

    const matchedIndex = MODE_OPTIONS.findIndex((option) =>
      option.label.toLowerCase().startsWith(nextSearch),
    )
    if (matchedIndex >= 0) {
      modeMenuIndexRef.current = matchedIndex
      setModeMenuIndex(matchedIndex)
    }
  }

  function selectModeFromMenu() {
    const selectedMode = MODE_OPTIONS[modeMenuIndexRef.current]?.key ?? 'normal'
    closeModeMenu()
    if (onModeChange) {
      onModeChange(selectedMode)
      return
    }
    restartGame(gameIntroMessage, 1)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (hasEscapedRef.current) return
      if (showKeyVanishedPopupRef.current) {
        event.preventDefault()
        if (Date.now() < keyVanishedPopupReadyAtRef.current) return
        if (event.repeat) return
        showKeyVanishedPopupRef.current = false
        keyVanishedPopupReadyAtRef.current = 0
        setShowKeyVanishedPopup(false)
        hardModeRespawnLevelRef.current = 1
        restartGame(gameIntroMessage, 1)
        addMessage('Hard mode restarts from Level 1.')
        return
      }
      if (tutorialPopupRef.current !== null) {
        event.preventDefault()
        if (event.key !== 'Enter' && Date.now() < tutorialPopupDismissReadyAtRef.current) return
        if (event.repeat) return
        setTutorialPopup(null)
        tutorialPopupRef.current = null
        tutorialPopupDismissReadyAtRef.current = 0
        return
      }
      if (showChallengePromptRef.current) {
        event.preventDefault()
        if (event.repeat) return
        const promptKey = event.key.toLowerCase()
        if (promptKey === 'y' || event.key === 'Enter') {
          showChallengePromptRef.current = false
          setShowChallengePrompt(false)
          resetRoomRuntimeState()
          challengeModeLevelRef.current = activeLevelRef.current
          restartGame('Challenge Mode starts. This level now has twice the enemies.', activeLevelRef.current)
          return
        }
        if (promptKey === 'n' || event.key === 'Escape') {
          showChallengePromptRef.current = false
          setShowChallengePrompt(false)
          addMessage('Challenge Mode declined. Continue the level.')
        }
        return
      }
      if (showSkinUnlockPopupRef.current) {
        event.preventDefault()
        if (event.repeat) return
        setShowSkinUnlockPopup(false)
        showSkinUnlockPopupRef.current = false
        setShowBossLevelSelect(true)
        showBossLevelSelectRef.current = true
        return
      }
      if (showSkinMenuRef.current) {
        event.preventDefault()
        if (event.key === 'Escape') {
          setShowSkinMenu(false)
          showSkinMenuRef.current = false
          setSkinMenuSearch('')
          skinMenuSearchRef.current = ''
          addMessage('Skin menu closed.')
          return
        }

        if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'k') {
          const nextIndex =
            (skinMenuIndexRef.current - 1 + PLAYER_SKIN_OPTIONS.length) %
            PLAYER_SKIN_OPTIONS.length
          skinMenuIndexRef.current = nextIndex
          setSkinMenuIndex(nextIndex)
          setSkinMenuSearch('')
          skinMenuSearchRef.current = ''
          return
        }

        if (event.key === 'ArrowDown' || event.key.toLowerCase() === 'j') {
          const nextIndex = (skinMenuIndexRef.current + 1) % PLAYER_SKIN_OPTIONS.length
          skinMenuIndexRef.current = nextIndex
          setSkinMenuIndex(nextIndex)
          setSkinMenuSearch('')
          skinMenuSearchRef.current = ''
          return
        }

        if (event.key === 'Enter') {
          const selectedSkin = PLAYER_SKIN_OPTIONS[skinMenuIndexRef.current]
          setEquippedSkin(selectedSkin.key)
          setShowSkinMenu(false)
          showSkinMenuRef.current = false
          setSkinMenuSearch('')
          skinMenuSearchRef.current = ''
          addMessage(`${selectedSkin.label} skin equipped.`)
          return
        }

        if (event.key === 'Backspace') {
          const nextSearch = skinMenuSearchRef.current.slice(0, -1)
          skinMenuSearchRef.current = nextSearch
          setSkinMenuSearch(nextSearch)
          const matchedIndex = PLAYER_SKIN_OPTIONS.findIndex((skin) =>
            skin.label.toLowerCase().startsWith(nextSearch),
          )
          if (matchedIndex >= 0) {
            skinMenuIndexRef.current = matchedIndex
            setSkinMenuIndex(matchedIndex)
          }
          return
        }

        if (/^[a-z0-9]$/i.test(event.key)) {
          const nextSearch = `${skinMenuSearchRef.current}${event.key.toLowerCase()}`
          const matchedIndex = PLAYER_SKIN_OPTIONS.findIndex((skin) =>
            skin.label.toLowerCase().startsWith(nextSearch),
          )
          if (matchedIndex >= 0) {
            skinMenuSearchRef.current = nextSearch
            setSkinMenuSearch(nextSearch)
            skinMenuIndexRef.current = matchedIndex
            setSkinMenuIndex(matchedIndex)
          }
          return
        }

        return
      }
      if (showModeMenuRef.current) {
        event.preventDefault()
        if (event.key === 'Escape') {
          closeModeMenu()
          addMessage('Mode menu closed.')
          return
        }

        if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'k') {
          moveModeMenuSelection(-1)
          return
        }

        if (event.key === 'ArrowDown' || event.key.toLowerCase() === 'j') {
          moveModeMenuSelection(1)
          return
        }

        if (event.key === 'Enter') {
          selectModeFromMenu()
          return
        }

        if (event.key === 'Backspace') {
          updateModeMenuSearch(modeMenuSearchRef.current.slice(0, -1))
          return
        }

        if (/^[a-z0-9]$/i.test(event.key)) {
          updateModeMenuSearch(`${modeMenuSearchRef.current}${event.key.toLowerCase()}`)
          return
        }

        return
      }
      if (showEnemyGuideRef.current) {
        event.preventDefault()
        if (event.key === 'Escape') {
          closeEnemyGuide()
          addMessage('Enemy guide closed.')
          return
        }

        if (enemyGuideModeRef.current === 'detail') {
          if (event.key === 'Enter' || event.key === 'Backspace') {
            setEnemyGuideMode('list')
            enemyGuideModeRef.current = 'list'
          }
          return
        }

        if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'k') {
          moveEnemyGuideSelection(-1)
          return
        }

        if (event.key === 'ArrowDown' || event.key.toLowerCase() === 'j') {
          moveEnemyGuideSelection(1)
          return
        }

        if (event.key === 'Enter') {
          setEnemyGuideMode('detail')
          enemyGuideModeRef.current = 'detail'
          return
        }

        if (event.key === 'Backspace') {
          updateEnemyGuideSearch(enemyGuideSearchRef.current.slice(0, -1))
          return
        }

        if (/^[a-z0-9]$/i.test(event.key)) {
          updateEnemyGuideSearch(`${enemyGuideSearchRef.current}${event.key.toLowerCase()}`)
          return
        }

        return
      }
      if (showNextLevelPromptRef.current) {
        event.preventDefault()
        if (event.repeat) return
        if (isHardMode) {
          const nextLevel = Math.min(activeLevelRef.current + 1, 4) as LevelChoice
          setShowNextLevelPrompt(false)
          showNextLevelPromptRef.current = false
          restartGame(gameIntroMessage, nextLevel)
          addMessage(`Hard mode continues to Level ${nextLevel}.`)
          return
        }
        const promptKey = event.key.toLowerCase()
        if (promptKey === 'y') {
          const nextLevel = Math.min(activeLevelRef.current + 1, 4) as LevelChoice
          setShowNextLevelPrompt(false)
          showNextLevelPromptRef.current = false
          restartGame(gameIntroMessage, nextLevel)
          addMessage(`Starting Level ${nextLevel}.`)
          return
        }

        if (promptKey === 'n') {
          setShowNextLevelPrompt(false)
          showNextLevelPromptRef.current = false
          if (activeLevelRef.current === 3) {
            enterLevelThreeTrophyRoom()
            return
          }
          setShowBossLevelSelect(true)
          showBossLevelSelectRef.current = true
          addMessage('Choose any unlocked level.')
          return
        }

        return
      }
      if (showBossLevelSelectRef.current) {
        event.preventDefault()
        if (event.repeat) return
        if (event.key === '1' || event.key === '2' || event.key === '3' || event.key === '4') {
          if (isLevelSelectionInProgressRef.current) {
            return
          }

          isLevelSelectionInProgressRef.current = true
          const nextLevel = Number(event.key) as LevelChoice
          if (isHardMode) {
            hardModeRespawnLevelRef.current = nextLevel
          }
          setShowBossLevelSelect(false)
          restartGame(gameIntroMessage, nextLevel)
          addMessage(`Returning to Level ${nextLevel}.`)
        }
        return
      }
      if (isDeadRef.current) {
        event.preventDefault()
        restartGame(gameIntroMessage, isHardMode ? hardModeRespawnLevelRef.current : activeLevelRef.current)
        return
      }
      if (isBombAnimatingRef.current) return
      if (teleportMapPulseRef.current !== null) return
      const key = event.key.toLowerCase()

      if (showVendingMenuRef.current) {
        event.preventDefault()
        if (event.key === 'Escape') {
          setShowVendingMenu(false)
          addMessage('You close the vending machine menu.')
          return
        }
        if (event.key === '1') {
          selectVendingReward()
          return
        }
        return
      }

      if (modeRef.current === 'command') {
        gameKeyboardHandlersRef.current.handleCommandKey(event)
        return
      }

      if (isPlayerStunnedNow() && key !== '?') {
        event.preventDefault()
        return
      }

      if (key === '?') {
        event.preventDefault()
        setShowHelp((current) => !current)
        return
      }

      if (key === ':') {
        event.preventDefault()
        setMode('command')
        setCommandInput('')
        return
      }

      if (key === 'w') {
        event.preventDefault()
        if (equippedSkinRef.current === 'dinosaur') {
          gameKeyboardHandlersRef.current.dinosaurAttack()
          return
        }
        gameKeyboardHandlersRef.current.throwBomb()
        return
      }

      if (key === 'a') {
        event.preventDefault()
        if (equippedSkinRef.current === 'dinosaur') {
          gameKeyboardHandlersRef.current.dinosaurAttack()
          return
        }
        gameKeyboardHandlersRef.current.useFocusedShot()
        return
      }

      if (key === 'p') {
        event.preventDefault()
        gameKeyboardHandlersRef.current.pickUpKeys()
        return
      }

      if (key === 'u') {
        event.preventDefault()
        gameKeyboardHandlersRef.current.useKeys()
        return
      }

      if (key === 's') {
        event.preventDefault()
        if (equippedSkinRef.current === 'dinosaur') {
          gameKeyboardHandlersRef.current.dinosaurAttack()
          return
        }
        gameKeyboardHandlersRef.current.fireRailShot()
        return
      }

      if (key === 'd') {
        event.preventDefault()
        if (equippedSkinRef.current === 'dinosaur') {
          gameKeyboardHandlersRef.current.dinosaurAttack()
          return
        }
        gameKeyboardHandlersRef.current.cleaveAttack()
        return
      }

      if (key === 'f') {
        event.preventDefault()
        gameKeyboardHandlersRef.current.dinosaurAttack()
        return
      }

      if (key === 'g') {
        event.preventDefault()
        gameKeyboardHandlersRef.current.useSkinAbility()
        return
      }

      if (key === 'e') {
        event.preventDefault()
        if (equippedSkinRef.current === 'dinosaur') {
          gameKeyboardHandlersRef.current.dinosaurAttack()
          return
        }
        if (!event.repeat) {
          startAttackCharge()
        }
        return
      }

      const movement = getMovement(key)
      if (!movement) return

      event.preventDefault()
      if (isHardMode) {
        const now = Date.now()
        if (playerSlowedUntilRef.current > now) {
          if (now - lastHardModeSlowMoveAtRef.current < HARD_MODE_TRAP_MOVE_DELAY_MS) {
            return
          }
          lastHardModeSlowMoveAtRef.current = now
        }
      }
      if (isHardMode && isAttackChargingRef.current) {
        const now = Date.now()
        if (now - lastHardModeChargeMoveAtRef.current < HARD_MODE_CHARGE_MOVE_DELAY_MS) {
          return
        }
        lastHardModeChargeMoveAtRef.current = now
      }
      gameKeyboardHandlersRef.current.movePlayer(movement)
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'e') return
      if (equippedSkinRef.current === 'dinosaur') return
      if (!isAttackChargingRef.current) return

      event.preventDefault()
      gameKeyboardHandlersRef.current.releaseAttackCharge()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  function addMessage(nextMessage: string) {
    setMessage((currentMessage) =>
      currentMessage === nextMessage ? currentMessage : nextMessage,
    )
    setMessages((currentMessages) =>
      currentMessages[0] === nextMessage ? currentMessages : [nextMessage, ...currentMessages].slice(0, 6),
    )
  }

  function showNormalModeTutorialOnce(tutorialLevel: LevelChoice) {
    if (isHardMode || normalModeTutorialsSeenRef.current.includes(tutorialLevel)) return

    const tutorial = NORMAL_MODE_TUTORIALS[tutorialLevel]
    if (!tutorial) return

    normalModeTutorialsSeenRef.current = [...normalModeTutorialsSeenRef.current, tutorialLevel]
    if (tutorialPopupDelayTimeoutRef.current !== null) {
      window.clearTimeout(tutorialPopupDelayTimeoutRef.current)
    }
    tutorialPopupDelayTimeoutRef.current = window.setTimeout(() => {
      tutorialPopupDelayTimeoutRef.current = null
      tutorialPopupRef.current = tutorial
      tutorialPopupDismissReadyAtRef.current = Date.now() + 3000
      setTutorialPopup(tutorial)
    }, 500)
  }

  function applyBombKillProgress() {
    ratKillsTowardNextBombRef.current += 1
    if (ratKillsTowardNextBombRef.current < 2) return

    ratKillsTowardNextBombRef.current = 0
    setBombCount((currentCount) => currentCount + 1)
    addMessage('Two rat kills earned you 1 bomb.')
  }

  function applyRatDefeatProgress(isDinosaur = false) {
    applyBombKillProgress()

    if (!isDinosaur && !isHardMode && activeLevelRef.current === 1) {
      setVendingMachineAvailable(true)
      showNormalModeTutorialOnce(1)
    }

    setRatsUntilDinosaurUnlocked((count) => {
      if (isDinosaur) {
        if (count <= 0) {
          addMessage('You spent Dinosaur Attack. Defeat 3 more rats to unlock it again.')
        }
        return 3
      }

      const nextCount = Math.max(0, count - 1)
      if (nextCount === 0) {
        addMessage('The ancient fury awakens: Dinosaur Attack unlocked.')
      } else {
        addMessage(`Need ${nextCount} more rat kills to unlock Dinosaur Attack.`)
      }
      return nextCount
    })
  }

  function processRatAttack(
    adjacentRatIndex: number,
    isDinosaur = false,
    damage = 1,
    isFocusedShot = false,
  ) {
    const rat = secretPocketRats[adjacentRatIndex]
    if (!rat) return

    if (isDinosaur) {
      triggerDinosaurAttackPulse([{ x: rat.x, y: rat.y }])
    } else {
      triggerPlayerAttackPulse([{ x: rat.x, y: rat.y }])
    }

    const nextHealth = getRatHealthAfterDamage(
      rat,
      isDinosaur ? rat.health : damage,
    )
    const hitMarkerCount = isDinosaur ? 1 : Math.max(1, Math.round(damage))
    triggerRatHitPulse(
      Array.from({ length: hitMarkerCount }).map(() => ({ x: rat.x, y: rat.y })),
    )
    if (nextHealth === 0) {
      const nextRats = secretPocketRats.map((value, index) =>
        index === adjacentRatIndex
          ? { ...value, health: nextHealth, defeatedByDinosaur: isDinosaur }
          : { ...value, defeatedByDinosaur: value.defeatedByDinosaur },
      )
      setSecretPocketRats(nextRats)
      const defeatedRat = nextRats[adjacentRatIndex]
      triggerRatDeathPulse([defeatedRat])
      if (rat.isBoss) {
        triggerBossDeathPulse([defeatedRat])
        triggerWallShake()
        addMessage(
          isFocusedShot
            ? 'Your shot drops the dragon from the sky.'
            : 'The dragon falls. The final barrier breaks.',
        )
        if (bossDeathPulseTimeoutRef.current !== null) {
          window.clearTimeout(bossDeathPulseTimeoutRef.current)
        }
        bossDeathPulseTimeoutRef.current = window.setTimeout(() => {
          bossDeathPulseTimeoutRef.current = null
          returnToFirstRoomAfterDragon()
        }, 820)
        return
      }

      markRoomTransitionRewards(secretPocketRats, nextRats, {
        countForDinosaurUnlock: false,
      })
      if (isDinosaur) {
        applyRatDefeatProgress(true)
      } else {
        applyRatDefeatProgress()
      }
      addMessage(isFocusedShot ? 'Your shot breaks the mouse.' : 'The mouse falls.')
      if (isDinosaur) {
        addMessage('You unleash a Dinosaur Attack!')
      }
      spawnBossDragonIfNeeded(nextRats)

      window.setTimeout(() => {
        setSecretPocketRats((current) =>
          current.filter(
            (rat) => !(rat.x === defeatedRat.x && rat.y === defeatedRat.y && rat.health === 0),
          ),
        )
      }, 2000)
      return
    }

  const nextRats = secretPocketRats.map((value, index) =>
      index === adjacentRatIndex ? { ...value, health: nextHealth } : value,
    )
    setSecretPocketRats(nextRats)
    const targetLabel = rat.isBoss ? 'dragon' : 'mouse'
    if (isFocusedShot) {
      addMessage(`Your shot hits a ${targetLabel}. ${targetLabel} health: ${nextHealth}/${rat.health}.`)
    } else {
      addMessage(`You strike the mouse. Mouse health: ${nextHealth}/${mouseMaxHealth}.`)
    }
  }

  function fireRailShot() {
    if (!canUseRailShotAbility()) {
      addMessage('Rail shot unlocks at Level 4.')
      applyRatReprisal(player)
      return
    }
    if (!isHardModeSharedAbilityReady('Rail shot')) {
      return
    }

    const now = Date.now()
    if (levelTwoRailShotReadyAtRef.current > now) {
      const remainingSeconds = ((levelTwoRailShotReadyAtRef.current - now) / 1000).toFixed(1)
      addMessage(`Rail shot recharging: ${remainingSeconds}s remaining.`)
      return
    }

    const shotLines = randomMovementDirections.map((direction) => {
      let cursor = { ...player }
      const hits: { index: number; distance: number }[] = []

      for (let distance = 1; distance <= LEVEL2_RAIL_SHOT_RANGE; distance += 1) {
        cursor = {
          x: cursor.x + direction.x,
          y: cursor.y + direction.y,
        }

        if (isTileWallForCurrentLevel(cursor, [])) {
          break
        }

        const hitIndex = secretPocketRats.findIndex(
          (rat) =>
            rat.health > 0 &&
            isSamePosition(rat, cursor),
        )

        if (hitIndex >= 0) {
          if (!hits.some((entry) => entry.index === hitIndex)) {
            hits.push({ index: hitIndex, distance })
          }
        }

        if (hits.length >= LEVEL2_RAIL_SHOT_TARGET_LIMIT) {
          break
        }
      }

      return {
        direction,
        hits,
      }
    })

    const bestLine = shotLines
      .filter((entry) => entry.hits.length > 0)
      .sort((first, second) => first.hits[0].distance - second.hits[0].distance)[0]

    if (!bestLine) {
      addMessage('No lined target for rail shot.')
      applyRatReprisal(player)
      return
    }

    levelTwoRailShotReadyAtRef.current = now + LEVEL2_RAIL_SHOT_COOLDOWN_MS
    startHardModeSharedAbilityCooldown()
    triggerAbilityPulse(
      'rail',
      [player, ...getLineFromDirection(player, bestLine.direction, LEVEL2_RAIL_SHOT_RANGE)],
    )

    const hitIndexes = new Set<number>(bestLine.hits.map((entry) => entry.index))
    const hitPositions = [...hitIndexes]
      .map((index) => secretPocketRats[index])
      .filter(Boolean)
      .map((rat) => ({ x: rat.x, y: rat.y }))

    if (hitPositions.length === 0) {
      addMessage('Your rail shot has no enemies in line.')
      return
    }

    triggerPlayerAttackPulse(hitPositions)
    triggerRatHitPulse(hitPositions)

    const nextRats = secretPocketRats.map((rat, index) => {
      if (!hitIndexes.has(index) || rat.health <= 0) {
        return rat
      }

      return {
        ...rat,
        health: getRatHealthAfterDamage(rat, 2),
      }
    })

    const defeatedRats = nextRats
      .map((rat, index) => ({ rat, index }))
      .filter((entry) => hitIndexes.has(entry.index) && entry.rat.health <= 0)

    const defeatedBossRat = defeatedRats.find((entry) => entry.rat.isBoss)

    if (defeatedBossRat) {
      triggerBossDeathPulse([defeatedBossRat.rat])
      triggerWallShake()
      addMessage('Your rail shot cracks the dragon open.')
      if (bossDeathPulseTimeoutRef.current !== null) {
        window.clearTimeout(bossDeathPulseTimeoutRef.current)
      }
      bossDeathPulseTimeoutRef.current = window.setTimeout(() => {
        bossDeathPulseTimeoutRef.current = null
        returnToFirstRoomAfterDragon()
      }, 820)
    } else {
      triggerRatDeathPulse(
        defeatedRats.map((entry) => ({ x: entry.rat.x, y: entry.rat.y })),
      )
      markRoomTransitionRewards(secretPocketRats, nextRats)
      spawnBossDragonIfNeeded(nextRats)

      window.setTimeout(() => {
        setSecretPocketRats((current) =>
          current.filter(
            (candidate) =>
              !(candidate.health <= 0 && !candidate.defeatedByDinosaur &&
                [...hitIndexes].some(
                  (index) =>
                    candidate.x === secretPocketRats[index].x &&
                    candidate.y === secretPocketRats[index].y,
                )),
          ),
        )
      }, 2000)
    }

    setSecretPocketRats(nextRats)
    addMessage('Your rail shot tears through a line of targets.')
    applyRatReprisal(player)
  }

  function useFocusedShot() {
    if (!canUseFocusedShotAbility()) {
      addMessage('Focused shot unlocks at Level 3.')
      return
    }
    if (!isHardModeSharedAbilityReady('Focused shot')) {
      return
    }

    const now = Date.now()
    if (focusedShotReadyAtRef.current > now) {
      const remainingSeconds = ((focusedShotReadyAtRef.current - now) / 1000).toFixed(1)
      addMessage(`Focused shot recharging. ${remainingSeconds}s remaining.`)
      return
    }

    const target = findVisibleRatTargetInRange(player, LEVEL2_FOCUSED_SHOT_RANGE)

    if (!target) {
      addMessage('No target in clear sight for focused shot.')
      applyRatReprisal(player)
      return
    }

    focusedShotReadyAtRef.current = now + LEVEL2_FOCUSED_SHOT_COOLDOWN_MS
    startHardModeSharedAbilityCooldown()
    triggerAbilityPulse(
      'focused',
      [player, ...getOrthogonalLinePositions(player, target.target, LEVEL2_FOCUSED_SHOT_RANGE)],
    )
    const shotDamage = 2
    processRatAttack(target.index, false, shotDamage, true)
    applyRatReprisal(player)
  }

  function useTaserShot() {
    if (!isLevelTwoRef.current) {
      addMessage('Stunner shot is locked to Level 2.')
      applyRatReprisal(player)
      return
    }

    const now = Date.now()
    if (levelTwoTaserReadyAtRef.current > now) {
      const remainingSeconds = ((levelTwoTaserReadyAtRef.current - now) / 1000).toFixed(1)
      addMessage(`Stunner shot recharging: ${remainingSeconds}s remaining.`)
      return
    }

    const target = findVisibleRatTargetInRange(player, LEVEL2_TASER_RANGE)

    if (!target) {
      addMessage('No lined target for stunner shot.')
      applyRatReprisal(player)
      return
    }

    levelTwoTaserReadyAtRef.current = now + LEVEL2_TASER_COOLDOWN_MS

    triggerPlayerAttackPulse([target.target])
    triggerRatHitPulse([target.target])

    const stunnedUntil = now + LEVEL2_TASER_STUN_DURATION_MS
    const nextRats = secretPocketRats.map((rat, index) => {
      if (index !== target.index || rat.health <= 0) return rat

      return {
        ...rat,
        stunnedUntil,
      }
    })

    setSecretPocketRats(nextRats)
    addMessage('Your taser dart locks a target in place.')
    applyRatReprisal(player)
  }

  function useShockwave() {
    if (!isLevelTwoRef.current) {
      addMessage('Shockwave is locked to Level 2.')
      applyRatReprisal(player)
      return
    }

    const now = Date.now()
    if (levelTwoShockwaveReadyAtRef.current > now) {
      const remainingSeconds = ((levelTwoShockwaveReadyAtRef.current - now) / 1000).toFixed(1)
      addMessage(`Shockwave recharging: ${remainingSeconds}s remaining.`)
      return
    }

    const adjacentRatIndexes = secretPocketRats
      .map((rat, index) => ({ rat, index }))
      .filter(({ rat }) => rat.health > 0 && !rat.isBoss && isAdjacent(player, rat))

    if (adjacentRatIndexes.length === 0) {
      addMessage('No adjacent rats to push away.')
      applyRatReprisal(player)
      return
    }

    levelTwoShockwaveReadyAtRef.current = now + LEVEL2_SHOCKWAVE_COOLDOWN_MS

    triggerPlayerAttackPulse(adjacentRatIndexes.map(({ rat }) => ({ x: rat.x, y: rat.y })))

    const occupiedSquares = new Set(
      secretPocketRats
        .filter((rat) => rat.health > 0)
        .map((rat) => `${rat.x},${rat.y}`),
    )
    const pushedRatPositions: Position[] = []
    const woundedRatPositions: Position[] = []

    const nextRats = secretPocketRats.map((rat) => {
      const isAffected = adjacentRatIndexes.some(({ index }) =>
        secretPocketRats[index]?.x === rat.x && secretPocketRats[index]?.y === rat.y,
      )

      if (!isAffected) {
        return rat
      }

      if (rat.health <= 0) {
        return rat
      }

      const pushDirectionX = Math.sign(rat.x - player.x)
      const pushDirectionY = Math.sign(rat.y - player.y)
      const destination = {
        x: rat.x + (pushDirectionX === 0 ? 0 : pushDirectionX),
        y: rat.y + (pushDirectionY === 0 ? 0 : pushDirectionY),
      }

      const destinationKey = `${destination.x},${destination.y}`
      const currentKey = `${rat.x},${rat.y}`

      const canPushToDestination =
        !isSamePosition(destination, player) &&
        !isSamePosition(destination, mainMousePosition) &&
        !isTileWallForCurrentLevel(
          destination,
          secretPocketRats,
        ) &&
        !occupiedSquares.has(destinationKey)

      if (!canPushToDestination) {
        const nextHealth = getRatHealthAfterDamage(rat, 1)
        occupiedSquares.delete(currentKey)
        if (nextHealth <= 0) {
          woundedRatPositions.push({ x: rat.x, y: rat.y })
        }
        return {
          ...rat,
          health: nextHealth,
          defeatedByDinosaur: false,
        }
      }

      occupiedSquares.delete(currentKey)
      occupiedSquares.add(destinationKey)
      pushedRatPositions.push(destination)
      return {
        ...rat,
        x: destination.x,
        y: destination.y,
      }
    })

    triggerRatHitPulse([
      ...adjacentRatIndexes.map(({ rat }) => ({ x: rat.x, y: rat.y })),
      ...pushedRatPositions,
    ])
    const defeatedRatPositions = nextRats
      .filter((rat) => rat.health <= 0)
      .map((rat) => ({ x: rat.x, y: rat.y }))

    if (defeatedRatPositions.length > 0) {
      triggerRatDeathPulse(defeatedRatPositions)
      markRoomTransitionRewards(secretPocketRats, nextRats)
      spawnBossDragonIfNeeded(nextRats)
    }

    setSecretPocketRats(nextRats)
    window.setTimeout(() => {
      setSecretPocketRats((current) =>
        current.filter(
          (candidate) =>
            !(candidate.health <= 0 && !candidate.defeatedByDinosaur &&
              (pushedRatPositions.some(
                ({ x, y }) => candidate.x === x && candidate.y === y,
              ) ||
                defeatedRatPositions.some(({ x, y }) => candidate.x === x && candidate.y === y))),
        ),
      )
    }, 2000)

    if (pushedRatPositions.length > 0) {
      addMessage('Your shockwave pushes adjacent rats back from you.')
    }
    if (woundedRatPositions.length > 0 && pushedRatPositions.length === 0) {
      addMessage('Your shockwave hits adjacent rats but cannot push them through open exits.')
    }

    addMessage(
      `Shockwave rattles ${adjacentRatIndexes.length} adjacent ${
        adjacentRatIndexes.length === 1 ? 'rat' : 'rats'}.`,
    )

    applyRatReprisal(player)
  }

  function useBlastWave() {
    if (!isLevelTwoRef.current) {
      addMessage('Blast wave is locked to Level 2.')
      applyRatReprisal(player)
      return
    }

    const now = Date.now()
    if (levelTwoBlastWaveReadyAtRef.current > now) {
      const remainingSeconds = ((levelTwoBlastWaveReadyAtRef.current - now) / 1000).toFixed(1)
      addMessage(`Blast wave recharging: ${remainingSeconds}s remaining.`)
      return
    }

    const blastTargets = secretPocketRats
      .map((rat, index) => ({
        rat,
        index,
      }))
      .filter(({ rat }) =>
        rat.health > 0 &&
        !rat.isBoss &&
        isWithinRadius(player, rat, LEVEL2_BLAST_WAVE_RADIUS),
      )

    if (blastTargets.length === 0) {
      addMessage('No enemies nearby for blast wave.')
      applyRatReprisal(player)
      return
    }

    levelTwoBlastWaveReadyAtRef.current = now + LEVEL2_BLAST_WAVE_COOLDOWN_MS

    const blastIndexes = new Set(blastTargets.map((entry) => entry.index))
    const blastPositions = blastTargets
      .map((entry) => ({ x: entry.rat.x, y: entry.rat.y }))

    triggerPlayerAttackPulse(blastPositions)
    triggerRatHitPulse(blastPositions)

    const nextRats = secretPocketRats.map((rat, index) => {
      if (!blastIndexes.has(index)) {
        return rat
      }

      const nextHealth = getRatHealthAfterDamage(rat, LEVEL2_BLAST_WAVE_DAMAGE)
      const stunnedUntil = Math.max(
        rat.stunnedUntil ?? 0,
        now + LEVEL2_BLAST_WAVE_STUN_MS,
      )

      return {
        ...rat,
        health: nextHealth,
        stunnedUntil,
      }
    })

    const defeatedRatPositions = nextRats
      .filter((rat) => rat.health <= 0)
      .filter((rat) =>
        blastTargets.some(
          (entry) => entry.rat.x === rat.x && entry.rat.y === rat.y,
        ),
      )
      .map((rat) => ({ x: rat.x, y: rat.y }))

    if (defeatedRatPositions.length > 0) {
      triggerRatDeathPulse(defeatedRatPositions)
      markRoomTransitionRewards(secretPocketRats, nextRats)
      spawnBossDragonIfNeeded(nextRats)

      window.setTimeout(() => {
        setSecretPocketRats((current) =>
          current.filter(
            (candidate) =>
              !(candidate.health <= 0 && !candidate.defeatedByDinosaur &&
                defeatedRatPositions.some((position) => candidate.x === position.x && candidate.y === position.y)),
          ),
        )
      }, 2000)
    }

    setSecretPocketRats(nextRats)
    addMessage(`Blast wave erupts through ${blastTargets.length} nearby rats.`)
    if (defeatedRatPositions.length > 0) {
      addMessage('Your blast wave shatters enemies and leaves them stunned.')
    }
    applyRatReprisal(player)
  }

  function useMindWave() {
    if (!isLevelTwoRef.current) {
      addMessage('Mind wave is locked to Level 2.')
      applyRatReprisal(player)
      return
    }

    const now = Date.now()
    if (levelTwoMindWaveReadyAtRef.current > now) {
      const remainingSeconds = ((levelTwoMindWaveReadyAtRef.current - now) / 1000).toFixed(1)
      addMessage(`Mind wave recharging: ${remainingSeconds}s remaining.`)
      return
    }

    const nearbyRatIndexes = secretPocketRats
      .map((rat, index) => ({ rat, index }))
      .filter(({ rat }) =>
        rat.health > 0 &&
        !rat.isBoss &&
        isWithinRadius(player, rat, LEVEL2_MIND_WAVE_RADIUS),
      )

    if (nearbyRatIndexes.length === 0) {
      addMessage('No nearby rat catches your mind wave.')
      applyRatReprisal(player)
      return
    }

    levelTwoMindWaveReadyAtRef.current = now + LEVEL2_MIND_WAVE_COOLDOWN_MS
    const stunEnd = now + LEVEL2_MIND_WAVE_STUN_MS
    const targetPositions = nearbyRatIndexes.map(({ rat }) => ({ x: rat.x, y: rat.y }))

    triggerPlayerAttackPulse(targetPositions)
    triggerRatHitPulse(targetPositions)

    const nextRats = secretPocketRats.map((rat) => {
      if (rat.isBoss || rat.health <= 0) {
        return rat
      }

      const isTarget = nearbyRatIndexes.some(
        ({ rat: targetRat }) => targetRat.x === rat.x && targetRat.y === rat.y,
      )

      if (!isTarget) return rat

      return {
        ...rat,
        stunnedUntil: Math.max(rat.stunnedUntil ?? 0, stunEnd),
      }
    })

    setSecretPocketRats(nextRats)
    addMessage(`Your mind wave stuns ${nearbyRatIndexes.length} rats.`)
    applyRatReprisal(player)
  }

  void useTaserShot
  void useShockwave
  void useBlastWave
  void useMindWave

  function cleaveAttack() {
    if (!canUseCleaveAbility()) {
      addMessage('Cleave unlocks at Level 2.')
      applyRatReprisal(player)
      return
    }
    if (!isHardModeSharedAbilityReady('Cleave')) {
      return
    }

    const now = Date.now()
    if (levelTwoCleaveReadyAtRef.current > now) {
      const remainingSeconds = ((levelTwoCleaveReadyAtRef.current - now) / 1000).toFixed(1)
      addMessage(`Cleave recharging: ${remainingSeconds}s remaining.`)
      return
    }

    const adjacentRatIndexes = secretPocketRats
      .map((rat, index) => ({ rat, index }))
      .filter(({ rat }) => rat.health > 0 && isAdjacent(player, rat))
    const hasMouseTarget = isMouseAlive && isAdjacent(player, mainMousePosition) && !isActiveBossFight

    if (adjacentRatIndexes.length === 0 && !hasMouseTarget) {
      addMessage('No target next to you for cleave.')
      applyRatReprisal(player)
      return
    }

    const adjacentRatPositions = adjacentRatIndexes.map(({ rat }) => ({
      x: rat.x,
      y: rat.y,
    }))

    triggerAbilityPulse(
      'cleave',
      [player, ...adjacentRatPositions, ...(hasMouseTarget ? [mainMousePosition] : [])],
    )

    const playerAttackTargets = hasMouseTarget
      ? [...adjacentRatPositions, { ...mainMousePosition }]
      : adjacentRatPositions

    triggerPlayerAttackPulse(playerAttackTargets)
    triggerRatHitPulse(adjacentRatPositions)

    levelTwoCleaveReadyAtRef.current = now + LEVEL2_CLEAVE_COOLDOWN_MS
    startHardModeSharedAbilityCooldown()

    const nextRats = secretPocketRats.map((rat) => {
      const hitIndex = adjacentRatIndexes.find((entry) =>
        entry.rat.x === rat.x && entry.rat.y === rat.y,
      )?.index

      if (hitIndex === undefined) {
        return rat
      }

      return {
        ...rat,
        health: getRatHealthAfterDamage(rat, 2),
      }
    })

    const defeatedRatPositions = adjacentRatIndexes
      .filter(({ index }) => nextRats[index].health <= 0)
      .map(({ rat }) => ({ x: rat.x, y: rat.y }))
    const defeatedBossRat = nextRats.find(
      ({ isBoss, x, y }) =>
        isBoss &&
        nextRats.some(
          (rat) =>
            rat.x === x &&
            rat.y === y &&
            rat.health <= 0,
        ),
    )

    if (defeatedBossRat) {
      triggerBossDeathPulse([defeatedBossRat])
      triggerWallShake()
      addMessage('Your cleave shatters the dragon on contact.')
      setSecretPocketRats(
        nextRats.map((rat) =>
          rat.isBoss ? { ...rat, health: 0, defeatedByDinosaur: false } : rat,
        ),
      )

      if (bossDeathPulseTimeoutRef.current !== null) {
        window.clearTimeout(bossDeathPulseTimeoutRef.current)
      }
      bossDeathPulseTimeoutRef.current = window.setTimeout(() => {
        bossDeathPulseTimeoutRef.current = null
        returnToFirstRoomAfterDragon()
      }, 820)
      return
    }

    if (defeatedRatPositions.length > 0) {
      triggerRatDeathPulse(defeatedRatPositions)
      markRoomTransitionRewards(secretPocketRats, nextRats)
      spawnBossDragonIfNeeded(nextRats)
      window.setTimeout(() => {
        setSecretPocketRats((current) =>
          current.filter(
            (candidate) =>
              !(candidate.health <= 0 && !candidate.defeatedByDinosaur &&
                defeatedRatPositions.some(
                  ({ x, y }) => candidate.x === x && candidate.y === y,
                )),
          ),
        )
      }, 2000)
      addMessage('You cleave the area, striking every nearby rat.')
    }

    if (hasMouseTarget) {
      setMainMouseHealth(0)
      triggerRatDeathPulse([mainMousePosition])
      revealMainMouseKey()
      applyRatDefeatProgress()
      addMessage('You cleave the mouse in one strong strike.')
    }

    setSecretPocketRats(nextRats)
    applyRatReprisal(player)
  }

  function attack(damage = 1) {
    const adjacentRatIndex = secretPocketRats.findIndex(
      (rat) => rat.health > 0 && isAdjacent(player, rat),
    )
    if (adjacentRatIndex >= 0) {
      if (hasSword && !secretPocketRats[adjacentRatIndex].isBoss) {
        triggerPlayerAttackPulse([{ ...secretPocketRats[adjacentRatIndex] }])
        applySecretRatSwordKill(secretPocketRats[adjacentRatIndex])
        applyRatReprisal(player)
        return
      }

      processRatAttack(adjacentRatIndex, false, damage)
      applyRatReprisal(player)
      return
    }

    if (!isMouseAlive && !isActiveBossFight) {
      addMessage('The mouse is already defeated.')
      applyRatReprisal(player)
      return
    }
    if (!isMouseAlive && isActiveBossFight) {
      addMessage('No enemy nearby. Move next to a target.')
      applyRatReprisal(player)
      return
    }

    if (!isAdjacent(player, mainMousePosition)) {
      addMessage('You swing at the empty air. Move next to the mouse first.')
      applyRatReprisal(player)
      return
    }

    if (hasSword) {
      triggerPlayerAttackPulse([mainMousePosition])
      setMainMouseHealth(0)
      triggerRatDeathPulse([mainMousePosition])
      revealMainMouseKey()
      applyRatDefeatProgress()
      addMessage('Your sword cleaves the mouse in one stroke.')
      applyRatReprisal(player)
      return
    }

    triggerPlayerAttackPulse([mainMousePosition])
    const nextMouseHealth = Math.max(0, mouseHealth - damage)
    if (nextMouseHealth === 0) {
      triggerRatDeathPulse([mainMousePosition])
      applyRatDefeatProgress()
      revealMainMouseKey()
    } else {
      triggerRatHitPulse([mainMousePosition])
    }
    setMainMouseHealth(nextMouseHealth)
    addMessage(
      nextMouseHealth === 0
        ? 'The mouse falls. The cell door unlocks.'
        : `You strike the mouse for ${damage} damage. Mouse health: ${nextMouseHealth}/${mouseMaxHealth}.`,
    )
    applyRatReprisal(player)
  }

  function handlePhysicalMouseEnemyClick(position: Position) {
    if (
      isDeadRef.current ||
      hasEscapedRef.current ||
      modeRef.current !== 'normal' ||
      showVendingMenuRef.current ||
      showBossLevelSelectRef.current ||
      showNextLevelPromptRef.current ||
      showSkinUnlockPopupRef.current ||
      showSkinMenuRef.current ||
      showEnemyGuideRef.current ||
      showModeMenuRef.current ||
      isBombAnimatingRef.current ||
      teleportMapPulseRef.current !== null
    ) {
      return
    }

    const clickedRatIndex = secretPocketRats.findIndex(
      (rat) => rat.health > 0 && isSamePosition(rat, position),
    )
    if (clickedRatIndex >= 0) {
      processRatAttack(clickedRatIndex, false, 1)
      return
    }

    if (
      !isActiveBossFightRef.current &&
      mouseHealthRef.current > 0 &&
      isSamePosition(mainMousePositionRef.current, position)
    ) {
      triggerPlayerAttackPulse([mainMousePositionRef.current])
      const nextMouseHealth = Math.max(0, mouseHealthRef.current - 1)
      if (nextMouseHealth === 0) {
        triggerRatDeathPulse([mainMousePositionRef.current])
        applyRatDefeatProgress()
        revealMainMouseKey()
      } else {
        triggerRatHitPulse([mainMousePositionRef.current])
      }
      setMainMouseHealth(nextMouseHealth)
      addMessage(
        nextMouseHealth === 0
          ? 'The mouse falls. The cell door unlocks.'
          : `You secretly click the mouse for 1 damage. Mouse health: ${nextMouseHealth}/${mouseMaxHealth}.`,
      )
    }
  }

  function dinosaurAttack() {
    const isDinosaurSkinEquipped = equippedSkinRef.current === 'dinosaur'
    if (!dinosaurAttackUnlocked && !isDinosaurSkinEquipped) {
      addMessage('You have not unlocked Dinosaur Attack yet.')
      return
    }

    triggerAbilityPulse('dinosaur', [player])

    const adjacentRatIndex = secretPocketRats.findIndex(
      (rat) => rat.health > 0 && isAdjacent(player, rat),
    )

    if (adjacentRatIndex < 0) {
      if (isActiveBossFight) {
        addMessage('Your roar lands on silence. No enemy is close enough.')
        return
      }
      if (!isMouseAlive || !isAdjacent(player, mainMousePosition)) {
        addMessage('You roar, but no mouse is within reach.')
        return
      }

      setIsDinosaurAttackActive(true)
      window.setTimeout(() => {
        setIsDinosaurAttackActive(false)
      }, 1000)
      setMainMouseHealth(0)
      triggerAbilityPulse('dinosaur', [player, mainMousePosition])
      triggerDinosaurAttackPulse([mainMousePosition])
      triggerRatDeathPulse([mainMousePosition])
      if (!isDinosaurSkinEquipped) {
        applyRatDefeatProgress(true)
      }
      addMessage('You unleash a Dinosaur Attack!')
      addMessage('The mouse falls. The cell door unlocks.')
      triggerWallShake()
      revealMainMouseKey()
      applyRatReprisal(player)
      return
    }

    setIsDinosaurAttackActive(true)
    window.setTimeout(() => {
      setIsDinosaurAttackActive(false)
    }, 1000)
    triggerAbilityPulse('dinosaur', [player, secretPocketRats[adjacentRatIndex]])
    processRatAttack(adjacentRatIndex, true)
    applyRatReprisal(player)
  }

  const secretPocketRatSpawns: RatSpawn[] = [
    { x: 1, y: -3 },
    { x: 3, y: -3 },
    { x: 1, y: -2 },
    { x: 3, y: -2 },
    { x: 2, y: -1 },
  ]
  const rightRoomRatSpawns: RatSpawn[] = [
    { x: 15, y: 4 },
    { x: 17, y: 1 },
    { x: 21, y: 3 },
  ]
  const thirdRoomRatSpawns: RatSpawn[] = [
    { x: 14, y: -5 },
    { x: 16, y: -5 },
    { x: 18, y: -5 },
  ]
  const bossRoomRatSpawns: RatSpawn[] = [
    { x: 4, y: 2, healthOverride: 2 },
    { x: 7, y: 2, healthOverride: 2 },
    { x: 10, y: 2, healthOverride: 2 },
    { x: 14, y: 2, healthOverride: 2 },
    { x: 18, y: 2, healthOverride: 2 },
    { x: 22, y: 2, healthOverride: 2 },
    { x: 5, y: 5, healthOverride: 2 },
    { x: 8, y: 5, healthOverride: 2 },
    { x: 11, y: 5, healthOverride: 2 },
    { x: 17, y: 5, healthOverride: 2 },
  ]
  if (isLevelTwo) {
    secretPocketRatSpawns.push(
      { x: 2, y: -4, kind: RAT_VARIANT_SNIPER },
      { x: 4, y: -1, kind: RAT_VARIANT_SNIPER },
      { x: 5, y: -2, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
      { x: 5, y: -3, kind: RAT_VARIANT_MINE, healthOverride: 1 },
      { x: 6, y: -2, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
      { x: 7, y: -2, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
      { x: 5, y: -4, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
      { x: 1, y: -5, kind: RAT_VARIANT_AURA, healthOverride: 2 },
    )
    rightRoomRatSpawns.push(
      { x: 16, y: 4, kind: RAT_VARIANT_SNIPER },
      { x: 20, y: 2 },
      { x: 19, y: 4, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
      { x: 23, y: 2, kind: RAT_VARIANT_MINE, healthOverride: 1 },
      { x: 18, y: 1, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
      { x: 21, y: 4, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
      { x: 22, y: 1, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
      { x: 17, y: 2, kind: RAT_VARIANT_AURA, healthOverride: 2 },
    )
    thirdRoomRatSpawns.push(
      { x: 13, y: -4, kind: RAT_VARIANT_SNIPER },
      { x: 20, y: -4 },
      { x: 17, y: -3 },
      { x: 15, y: -2, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
      { x: 16, y: -4, kind: RAT_VARIANT_MINE, healthOverride: 1 },
      { x: 14, y: -5, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
      { x: 19, y: -4, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
      { x: 15, y: -4, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
      { x: 10, y: -3, kind: RAT_VARIANT_AURA, healthOverride: 2 },
    )
    bossRoomRatSpawns.push(
      { x: 3, y: 7, kind: RAT_VARIANT_SNIPER },
      { x: 6, y: 7, healthOverride: 2 },
      { x: 9, y: 7, healthOverride: 2 },
      { x: 12, y: 7, healthOverride: 2 },
      { x: 15, y: 7, healthOverride: 2 },
      { x: 18, y: 3, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
      { x: 20, y: 3, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
      { x: 22, y: 5, kind: RAT_VARIANT_RUSHER, healthOverride: 2 },
      { x: 8, y: 3, kind: RAT_VARIANT_AURA, healthOverride: 2 },
    )
    if (activeLevel === 3) {
      bossRoomRatSpawns.push(
        { x: 4, y: 7, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
        { x: 16, y: 6, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
        { x: 21, y: 6, kind: RAT_VARIANT_AURA, healthOverride: 2 },
        { x: 5, y: 3, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
        { x: 12, y: 4, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
        { x: 19, y: 5, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
        { x: 23, y: 3, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
        { x: 6, y: 9, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
        { x: 14, y: 9, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
        { x: 21, y: 9, kind: RAT_VARIANT_MINE, healthOverride: 1 },
      )
    }
    if (activeLevel === 4) {
      bossRoomRatSpawns.push(
        { x: 4, y: 7, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
        { x: 7, y: 8, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
        { x: 10, y: 7, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
        { x: 13, y: 8, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
        { x: 16, y: 7, kind: RAT_VARIANT_AURA, healthOverride: 2 },
        { x: 19, y: 8, kind: RAT_VARIANT_WARDEN, healthOverride: 2 },
        { x: 22, y: 7, kind: RAT_VARIANT_SNIPER, healthOverride: 2 },
        { x: 5, y: 3, kind: RAT_VARIANT_MINE, healthOverride: 1 },
        { x: 12, y: 4, kind: RAT_VARIANT_STUNNER, healthOverride: 2 },
        { x: 20, y: 5, kind: RAT_VARIANT_GRENADIER, healthOverride: 2 },
      )
    }
  }

  function spawnBossDragonIfNeeded(currentRats: SecretRat[]) {
    if (!isActiveBossFight) return

    const hasBoss = currentRats.some((rat) => rat.isBoss && rat.health > 0)
    if (hasBoss) return

    const hasRemainingRats = currentRats.some(
      (rat) => rat.health > 0 && !rat.isBoss,
    )
    if (hasRemainingRats) return

    if (activeLevelRef.current === 2) {
      resetRoomRuntimeState()
      setIsBossFight(false)
      isActiveBossFightRef.current = false
      setIsLevelTwoBonusRoom(true)
      isLevelTwoBonusRoomRef.current = true
      setIsMushroomAvailable(true)
      setSecretPocketRats([])
      secretPocketRatsRef.current = []
      setMainMousePosition({ x: 999, y: 999 })
      mainMousePositionRef.current = { x: 999, y: 999 }
      setMainMouseHealth(0)
      setPlayerPosition(LEVEL2_BONUS_ROOM_START_POSITION)
      addMessage('The last rat falls. A small door opens into a quiet room.')
      return
    }

    setSecretPocketRats((current) => {
      const alreadySpawned = current.some((rat) => rat.isBoss)
      if (alreadySpawned) return current

      addMessage('The last rat falls. A dragon rises to finish the fight.')
      return [...current, { ...bossRoomBossPosition, health: isLevelTwo ? 7 : 5, isBoss: true }]
    })
  }

  function enterLevelTwoBonusRoom() {
    resetRoomRuntimeState()
    setIsBossFight(false)
    isActiveBossFightRef.current = false
    setIsLevelTwoBonusRoom(true)
    isLevelTwoBonusRoomRef.current = true
    setIsMushroomAvailable(true)
    setSecretPocketRats([])
    secretPocketRatsRef.current = []
    setLevelTwoRoomKeyDrops([])
    setMainMousePosition({ x: 999, y: 999 })
    mainMousePositionRef.current = { x: 999, y: 999 }
    setMainMouseHealth(0)
    setPlayerPosition(LEVEL2_BONUS_ROOM_START_POSITION)
    addMessage('The door opens into a quiet room. A strange mushroom waits inside.')
  }

  function enterLevelThreeTrophyRoom() {
    resetRoomRuntimeState()
    setIsBossFight(false)
    isActiveBossFightRef.current = false
    setIsLevelTwoBonusRoom(false)
    isLevelTwoBonusRoomRef.current = false
    setIsLevelThreeTrophyRoom(true)
    isLevelThreeTrophyRoomRef.current = true
    setIsMushroomAvailable(false)
    setSecretPocketRats([])
    secretPocketRatsRef.current = []
    setLevelTwoRoomKeyDrops([])
    setMainMousePosition({ x: 999, y: 999 })
    mainMousePositionRef.current = { x: 999, y: 999 }
    setMainMouseHealth(0)
    setPlayerPosition(LEVEL3_TROPHY_ROOM_START_POSITION)
    addMessage('The dragon falls. A quiet trophy room opens ahead.')
  }

  function movePlayerInLevelTwo(next: Position) {
    if (isLevelThreeTrophyRoomRef.current) {
      if (isTileWallInLevelTwo(next, [])) {
        addMessage('That path is blocked.')
        return
      }

      setPlayerPosition(next)
      triggerPlayerTrail(player)
      triggerMovePulse([next])

      if (isSamePosition(next, LEVEL3_TROPHY_POSITION)) {
        triggerPickupPulse([LEVEL3_TROPHY_POSITION])
        setShowBossLevelSelect(true)
        showBossLevelSelectRef.current = true
        addMessage('The trophy unlocks Level 4. Choose your next level.')
        return
      }

      addMessage('You step through the trophy room.')
      return
    }

    if (isLevelTwoBonusRoomRef.current) {
      if (isTileWallInLevelTwo(next, [])) {
        addMessage('That path is blocked.')
        return
      }

      setPlayerPosition(next)
      triggerPlayerTrail(player)
      triggerMovePulse([next])

      if (
        isMushroomAvailable &&
        isSamePosition(next, LEVEL2_BONUS_ROOM_MUSHROOM_POSITION)
      ) {
        setIsMushroomAvailable(false)
        setHasSkinChangeAbility(true)
        hasSkinChangeAbilityRef.current = true
        triggerPickupPulse([LEVEL2_BONUS_ROOM_MUSHROOM_POSITION])
        setShowSkinUnlockPopup(true)
        showSkinUnlockPopupRef.current = true
        addMessage('The mushroom unlocks skin changing. Use :skinchange to choose a new look.')
        return
      }

      addMessage('You step through the small room.')
      return
    }

    const roomConfig = getCurrentLevelTwoRoomConfig()
    const isTransitionTile = isCurrentLevelTwoRoomTransitionTile(next)
    const hasExitKeys = levelTwoRoomKeys >= roomConfig.requiredKeys

    if (isTransitionTile && !hasExitKeys) {
      addMessage(`A locked gate blocks your way. Need ${roomConfig.requiredKeys} room key(s).`)
      applyRatReprisal(player)
      return
    }

    if (
      activeLevelRef.current === 4 &&
      levelTwoCurrentRoomRef.current === 4 &&
      isTransitionTile &&
      levelTwoRoomKeysRef.current < 4
    ) {
      addMessage('The Level 4 boss door is locked. Defeat the key guard first.')
      applyRatReprisal(player)
      return
    }

    if (
      activeLevelRef.current === 2 &&
      levelTwoCurrentRoomRef.current === 4 &&
      isTransitionTile &&
      levelTwoRoomKeysRef.current < 4
    ) {
      addMessage('The Level 2 boss door is locked. Defeat the key guard first.')
      applyRatReprisal(player)
      return
    }

    const isRatOnNextTile = secretPocketRats.some(
      (rat) => rat.health > 0 && rat.x === next.x && rat.y === next.y,
    )
    const isFriendlyOverlayTile =
      getNormalModeFriendlySign(next) !== null ||
      getNormalModeChallengeDoor(next) !== null
    const canBypassLevelTwoEnemy = isNinjaPhasing() && isRatOnNextTile
    const canBypassLevelTwoWall =
      isGhostPhasing() &&
      !isRatOnNextTile &&
      !isOutOfLevelTwoBounds(next)

    if (
      isTileWallInLevelTwo(next, secretPocketRats) &&
      !canBypassLevelTwoEnemy &&
      !canBypassLevelTwoWall &&
      !isFriendlyOverlayTile
    ) {
      addMessage('That path is blocked.')
      applyRatReprisal(player)
      return
    }

    if (isAvailableRoomKeyDropAt(next)) {
      addMessage('A room key is on the ground. Stand next to it and press P to pick it up.')
      triggerInteractionPulse([next])
      return
    }

    if (isTransitionTile) {
      triggerMovePulse([next])
      triggerDoorPulse([next])

      if (roomConfig.next === 'boss') {
        if (activeLevelRef.current === 2 || activeLevelRef.current === 3) {
          showBossCompletionPrompt(activeLevelRef.current)
          return
        }
        enterBossFight()
        return
      }

      if (roomConfig.next === 'bonus') {
        enterLevelTwoBonusRoom()
        return
      }

      startLevelTwoRoom(roomConfig.next, 'You advance through a hidden passage into the next room.')
      return
    }

    setPlayerPosition(next)
    triggerPlayerTrail(player)
    triggerMovePulse([next])
    applyHardModeTrapIfNeeded(next)
    applyNormalModeFriendlyTile(next)
    applyRatReprisal(next)

    if (secretPocketRats.some((rat) => rat.health > 0 && isAdjacent(next, rat))) {
      addMessage('You are next to the enemy. Press x to strike.')
      return
    }

    addMessage('You move forward.')
  }

  function movePlayer(movement: Position) {
    const next = { x: player.x + movement.x, y: player.y + movement.y }
    const ratOccupancy = buildRatOccupancySet(secretPocketRats)

    if (isLevelTwoRef.current) {
      return movePlayerInLevelTwo(next)
    }

    const isSecretTeleporter =
      !isActiveBossFight &&
      hasSecretRoomTeleporter &&
      isSamePosition(next, secretRoomTeleporterPosition)
    const isSecondRoomTeleporter = !isActiveBossFight && isRightRoomTeleporterPosition(next)
    const isThirdRoomTeleporter = !isActiveBossFight && isThirdRoomTeleporterPosition(next)
    const isThirdRoomBossTeleporter = !isActiveBossFight && isThirdRoomBossTeleporterPosition(next)
    const passesThroughRightDoor =
      !rightRoomKnown &&
      isDoorOpen &&
      next.x === roomWidth &&
      next.y === dungeonDoorPosition.y &&
      player.x === roomWidth - 1 &&
      player.y === dungeonDoorPosition.y

    const canPushSecretWall = isSecretWallPushable(player, next, secretWallShifted)
    const canPassLeftCornerWall = isSecretWallCornerPassable(
      player,
      next,
      secretWallShifted,
      secretPocketOpen,
    )
    const canPushRightRoomWall = isRightRoomWallPushable(
      player,
      next,
      rightRoomBlockShifted,
    )
    const canPushThirdRoomWall = isThirdRoomWallPushable(
      player,
      next,
      thirdRoomBlockShifted,
    )
    const isRightRoomChestTile =
      !rightRoomChestOpen &&
      next.x === rightRoomChestPosition.x &&
      next.y === rightRoomChestPosition.y
    const isThirdRoomSupplyChestTile =
      (!thirdRoomLifeChestOpen &&
        next.x === thirdRoomLifeChestPosition.x &&
        next.y === thirdRoomLifeChestPosition.y) ||
      (!thirdRoomBombChestOpen &&
        next.x === thirdRoomBombChestPosition.x &&
        next.y === thirdRoomBombChestPosition.y) ||
      (!thirdRoomSwordChestOpen &&
        next.x === thirdRoomSwordChestPosition.x &&
        next.y === thirdRoomSwordChestPosition.y)
    const isThirdRoomChestTile =
      !thirdRoomChestOpen &&
      next.x === thirdRoomChestPosition.x &&
      next.y === thirdRoomChestPosition.y
    const isDoorTile =
      !isDoorOpen &&
      next.x === dungeonDoorPosition.x &&
      next.y === dungeonDoorPosition.y
    const canAutoOpenDoor = isDoorTile && doorKeyCount > 0
    const isThirdRoomDoorTile =
      !thirdRoomDoorOpen &&
      isThirdRoomDoorPosition(next)
    const canAutoOpenThirdRoomDoor = isThirdRoomDoorTile && doorKeyCount > 0
    const isThirdRoomBossTile = secretPocketRats.some(
      (rat) => rat.isBoss && rat.health > 0 && isSamePosition(next, rat),
    )
    const isThirdRoomBossTeleporterTile =
      isSupplyRoomFullyLooted && isThirdRoomBossTeleporter
    const isRatOnNextTile = secretPocketRats.some(
      (rat) => rat.health > 0 && isSamePosition(next, rat),
    )
    const isMainMouseOnNextTile = isMouseAlive && isSamePosition(next, mainMousePosition)
    const isWallBlockingNext = isTileWallForCurrentLevel(
      next,
      secretPocketRats,
      ratOccupancy,
    )
    const canBypassLevelOneWall =
      isGhostPhasing() &&
      isWallBlockingNext &&
      !isRatOnNextTile &&
      !isMainMouseOnNextTile &&
      !isRightRoomChestTile &&
      !isThirdRoomSupplyChestTile &&
      !isThirdRoomChestTile &&
      !isDoorTile &&
      !isThirdRoomDoorTile &&
      !isThirdRoomBossTile
    const canBypassLevelOneEnemy =
      isNinjaPhasing() &&
      (isRatOnNextTile || isMainMouseOnNextTile)

    if (
      (isWallBlockingNext &&
        !isSecretTeleporter &&
        !isRightRoomTeleporterPosition(next) &&
        !isThirdRoomTeleporter &&
        !canPushSecretWall &&
        !canPassLeftCornerWall &&
        !passesThroughRightDoor &&
        !canPushRightRoomWall &&
        !canPushThirdRoomWall &&
        !canBypassLevelOneWall &&
        !canBypassLevelOneEnemy
      ) ||
      (isMainMouseOnNextTile && !canBypassLevelOneEnemy)
    ) {
      if (isRightRoomChestTile) {
        addMessage('The chest is locked. Press U to use a key.')
        applyRatReprisal(player)
        return
      }
      if (isThirdRoomSupplyChestTile) {
        addMessage('That chest blocks your way. Press U to open it.')
        applyRatReprisal(player)
        return
      }
      if (isThirdRoomChestTile) {
        addMessage('The third-room chest is locked. Press U with a chest key.')
        applyRatReprisal(player)
        return
      }

      if (isThirdRoomBossTile) {
        addMessage('The dragon stands in your way. Strike it with x.')
        applyRatReprisal(player)
        return
      }
      if (isThirdRoomBossTeleporterTile) {
        enterBossFight()
        return
      }

      if (canAutoOpenDoor) {
        setDoorKeyCount((currentCount) => currentCount - 1)
        setIsDoorOpen(true)
        setPlayerPosition(next)
        triggerPlayerTrail(player)
        triggerDoorPulse([next])
        triggerMovePulse([next])
        addMessage('The door unlocks and crumbles away.')
        applyRatReprisal(player)
        return
      }
      if (canAutoOpenThirdRoomDoor) {
        setDoorKeyCount((currentCount) => currentCount - 1)
        setThirdRoomDoorOpen(true)
        setPlayerPosition(next)
        triggerPlayerTrail(player)
        triggerDoorPulse([next])
        triggerMovePulse([next])
        addMessage('You unlock the third-room door and enter.')
        applyRatReprisal(player)
        return
      }

      if (isDoorTile) {
        addMessage('The door is locked. Find a door key first.')
        applyRatReprisal(player)
        return
      }
      if (isThirdRoomDoorTile) {
        addMessage('The third-room door is locked. Find a key first.')
        applyRatReprisal(player)
        return
      }

      if (isMouseAlive && isSamePosition(next, mainMousePosition)) {
        addMessage('The mouse blocks that path.')
        applyRatReprisal(player)
        return
      }

      addMessage('That path is blocked. Try another motion.')
      applyRatReprisal(player)
      return
    }

    if (isSecretTeleporter) {
      triggerInteractionPulse([next])
      triggerTeleportPulse([next])
      triggerTeleportTransition(() => {
        resetRoomRuntimeState()
        setSecretPocketRats([])
        secretPocketRatsRef.current = []
        setPlayerPosition(startPosition)
      })
      addMessage('The teleporter activates and takes you back to the original room.')
      return
    }

    if (isSecondRoomTeleporter) {
      triggerInteractionPulse([next])
      triggerTeleportPulse([next])
      triggerTeleportTransition(() => {
        const nextRoomRats = createLevelOneRoomRats(thirdRoomRatSpawns, 'third')
        resetRoomRuntimeState()
        setThirdRoomKnown(true)
        setPlayerPosition(thirdRoomStartPosition)
        setSecretPocketRats(nextRoomRats)
        secretPocketRatsRef.current = nextRoomRats
        addMessage('You enter the third room and hear distant skittering.')
      })
      addMessage('The teleporter opens a hidden route to the third room.')
      return
    }

    if (isThirdRoomTeleporter) {
      if (thirdRoomChestOpen) {
        triggerInteractionPulse([next])
        triggerTeleportPulse([next])
        triggerTeleportTransition(() => {
          resetRoomRuntimeState()
          setSecretPocketRats([])
          secretPocketRatsRef.current = []
          setThirdRoomDoorOpen(true)
          setPlayerPosition(thirdRoomSupplyRoomStartPosition)
        })
        addMessage('The teleporter carries you into the supply room.')
      } else {
        triggerInteractionPulse([next])
        triggerTeleportPulse([next])
        triggerTeleportTransition(() => {
          resetRoomRuntimeState()
          setSecretPocketRats([])
          secretPocketRatsRef.current = []
          setPlayerPosition(startPosition)
        })
        addMessage('A hidden mechanism drags you back to the first room.')
      }
      return
    }

    if (isThirdRoomBossTeleporterTile) {
      triggerInteractionPulse([next])
      if (!isSupplyRoomFullyLooted) {
        addMessage('A hidden mechanism refuses to activate.')
      } else {
        triggerTeleportPulse([next])
        triggerTeleportTransition(() => {
          enterBossFight()
        })
      }
      return
    }

    if (!secretRoomKnown && (next.y < 0 || isSamePosition(next, secretRoomDoorPosition))) {
      setSecretRoomKnown(true)
      addMessage('A hidden passage opens; a new area emerges behind the wall.')
    }
    if (passesThroughRightDoor) {
      const nextRoomRats = createLevelOneRoomRats(rightRoomRatSpawns, 'right')
      resetRoomRuntimeState()
      setRightRoomKnown(true)
      addMessage('A hidden chamber opens in the wall to your right.')
      setSecretPocketRats(nextRoomRats)
      secretPocketRatsRef.current = nextRoomRats
      addMessage('You hear restless movement from the shadows.')
    }

    if (canPushSecretWall) {
      setSecretWallShifted(true)
      triggerWallShake()
      triggerWallShiftPulse([next])
      addMessage('You push the wall upward.')
    }

    if (canPassLeftCornerWall) {
      const nextRoomRats = secretPocketRatSpawns
        .filter(
          (rat) =>
            (rat.x !== next.x || rat.y !== next.y) &&
            (rat.x !== player.x || rat.y !== player.y),
        )
        .filter((rat) => !isLevelOneSpawnBlocked(rat, 'secret'))
        .map((rat) => createRatFromSpawn(rat))
      resetRoomRuntimeState()
      setSecretPocketOpen(true)
      setSecretPocketRatsSpawned(true)
      setSecretPocketRats(nextRoomRats)
      secretPocketRatsRef.current = nextRoomRats
      lastEnemyTickRef.current = Date.now()
      triggerWallShiftPulse([next])
      addMessage('A narrow corridor opens to a smaller chamber.')
    }

    if (canPushRightRoomWall) {
      setRightRoomBlockShifted(true)
      setRightRoomChestKeyVisible(true)
      triggerWallShake()
      triggerWallShiftPulse([next])
      addMessage('You shift the hidden wall inward. A hidden key appears.')
    }
    if (canPushThirdRoomWall) {
      setThirdRoomBlockShifted(true)
      setThirdRoomChestKeyVisible(true)
      triggerWallShake()
      triggerWallShiftPulse([next])
      addMessage('You press down on the lever and the wall moves aside.')
    }

    setPlayerPosition(next)
    triggerPlayerTrail(player)
    triggerMovePulse([next])
    applyHardModeTrapIfNeeded(next)
    applyNormalModeFriendlyTile(next)
    if (!canPassLeftCornerWall) {
      applyRatReprisal(next)
    }

    if (isMouseAlive && isAdjacent(next, mainMousePosition)) {
      addMessage('You are next to the mouse. Press x to strike.')
      return
    }

    addMessage('You move through the cell.')
  }

  function restartGame(
    messageText = gameIntroMessage,
    nextLevel: LevelChoice = activeLevel,
  ) {
    if (challengeModeLevelRef.current !== nextLevel) {
      challengeModeLevelRef.current = null
    }
    const isNextLevelTwo = nextLevel >= 2
    activeLevelRef.current = nextLevel
    isLevelTwoRef.current = isNextLevelTwo
    setActiveLevel(nextLevel)
    setShowBossLevelSelect(false)
    setShowNextLevelPrompt(false)

    resetRoomRuntimeState()

    if (isNextLevelTwo) {
      const rooms = getActiveAdvancedRooms(nextLevel)
      const levelTwoRoomSpawns = getLevelTwoRoomSpawns(1)
      setPlayerPosition(rooms[0].startPosition)
      setLevelTwoCurrentRoom(1)
      setLevelTwoRoomKeys(0)
      setLevelTwoRoomKeyDrops([])
      setSecretPocketRats(levelTwoRoomSpawns)
      secretPocketRatsRef.current = levelTwoRoomSpawns
      setMainMousePosition({ x: 999, y: 999 })
      mainMousePositionRef.current = { x: 999, y: 999 }
      setMainMouseHealth(0)
    } else {
      setPlayerPosition(startPosition)
      setMainMousePosition(initialMousePosition)
      mainMousePositionRef.current = initialMousePosition
      setMainMouseHealth(mouseMaxHealth)
      setSecretPocketRats([])
      secretPocketRatsRef.current = []
    }

    isDeadRef.current = false
    hasEscapedRef.current = false
    playerHealthRef.current = currentPlayerMaxHealth
    modeRef.current = 'normal'
    commandInputRef.current = ''
    showVendingMenuRef.current = false
    showBossLevelSelectRef.current = false
    showNextLevelPromptRef.current = false
    showSkinUnlockPopupRef.current = false
    showSkinMenuRef.current = false
    showEnemyGuideRef.current = false
    showModeMenuRef.current = false
    hasSkinChangeAbilityRef.current = nextLevel >= 3
    teleportMapPulseRef.current = null
    hasActiveBossRef.current = false
    isActiveBossFightRef.current = false
    levelTwoCurrentRoomRef.current = 1
    levelTwoRoomKeysRef.current = 0
    isLevelTwoBonusRoomRef.current = false
    isLevelThreeTrophyRoomRef.current = false
    isBombAnimatingRef.current = false
    doorUnlockedRef.current = isNextLevelTwo
    playerSlowedUntilRef.current = 0
    lastHardModeSlowMoveAtRef.current = 0
    ratKillsTowardNextBombRef.current = 0
    setPlayerHealth(currentPlayerMaxHealth)
    setIsDead(false)
    setHasEscaped(false)
    setMode('normal')
    setCommandInput('')
    setShowHelp(true)
    setSecretRoomKnown(false)
    setSecretWallShifted(false)
    setSecretPocketOpen(false)
    setMainMouseSkullVisible(false)
    setMainMouseKeyVisible(false)
    setDoorKeyCount(0)
    setSecretPocketRatsSpawned(false)
    setChestKeyCount(0)
    setSecretWallShaking(false)
    setRatsUntilDinosaurUnlocked(3)
    setRightRoomBlockShifted(false)
    setRightRoomChestKeyVisible(false)
    setRightRoomChestOpen(false)
    setThirdRoomLifeChestOpen(false)
    setThirdRoomChestKeyVisible(false)
    setThirdRoomChestOpen(false)
    setThirdRoomBombChestOpen(false)
    setThirdRoomSwordChestOpen(false)
    setBombCount(0)
    setHasSword(false)
    setVendingMachineAvailable(false)
    setShowVendingMenu(false)
    setIsDinosaurAttackActive(false)
    setRightRoomKnown(false)
    setThirdRoomKnown(false)
    setIsBossFight(false)
    setThirdRoomBlockShifted(false)
    setThirdRoomDoorOpen(false)
    setIsDoorOpen(false)
    setIsSecretRoomDoorOpen(false)
    setBombAnimation(null)
    setPlayerAttackPulsePositions([])
    setDinosaurAttackPulsePositions([])
    setRatHitPulsePositions([])
    setEnemyHitMarkers([])
    setRatDeathPulsePositions([])
    setRatAttackPulsePositions([])
    setRatAttackSourcePulsePositions([])
    setBossDeathPulsePositions([])
    setInteractionPulsePositions([])
    setMovePulsePositions([])
    setPlayerTrailPositions([])
    setDoorPulsePositions([])
    setPickupPulsePositions([])
    setChestPulsePositions([])
    setWallShiftPulsePositions([])
    setTeleportPulsePositions([])
    setAbilityPulsePositions([])
    setAbilityPulseType(null)
    setIsPlayerHurtPulse(false)
    setIsPlayerDeathPulse(false)
    setIsPlayerStunned(false)
    setTeleportMapPulse(null)
    setIsLevelTwoBonusRoom(false)
    setIsLevelThreeTrophyRoom(false)
    setIsMushroomAvailable(false)
    setShowSkinUnlockPopup(false)
    setShowSkinMenu(false)
    setShowEnemyGuide(false)
    setShowModeMenu(false)
    setShowKeyVanishedPopup(false)
    showKeyVanishedPopupRef.current = false
    keyVanishedPopupReadyAtRef.current = 0
    setShowChallengePrompt(false)
    showChallengePromptRef.current = false
    setTutorialPopup(null)
    tutorialPopupRef.current = null
    tutorialPopupDismissReadyAtRef.current = 0
    if (tutorialPopupDelayTimeoutRef.current !== null) {
      window.clearTimeout(tutorialPopupDelayTimeoutRef.current)
      tutorialPopupDelayTimeoutRef.current = null
    }
    setNormalModeChallengeDoorsUsed([])
    normalModeChallengeDoorsUsedRef.current = []
    setEnemyGuideMode('list')
    setEnemyGuideSearch('')
    setEnemyGuideIndex(0)
    setModeMenuSearch('')
    setModeMenuIndex(difficulty === 'hard' ? 1 : 0)
    setSkinMenuSearch('')
    setActiveSkinAbility(null)
    activeSkinAbilityRef.current = null
    setSkinAbilityCoolingDown(false)
    skinAbilityCoolingDownRef.current = false
    setSkinAbilityProgress(1)
    if (skinAbilityTimeoutRef.current !== null) {
      window.clearTimeout(skinAbilityTimeoutRef.current)
      skinAbilityTimeoutRef.current = null
    }
    if (skinAbilityIntervalRef.current !== null) {
      window.clearInterval(skinAbilityIntervalRef.current)
      skinAbilityIntervalRef.current = null
    }
    setHasSkinChangeAbility(nextLevel >= 3)
    lastEnemyTickRef.current = 0
    lastBossTickRef.current = 0
    focusedShotReadyAtRef.current = 0
    levelTwoGrenadeReadyAtRef.current = 0
    levelTwoBombReadyAtRef.current = 0
    levelTwoCleaveReadyAtRef.current = 0
    hardModeSharedAbilityReadyAtRef.current = 0
    setHardModeSharedAbilityProgress(1)
    if (hardModeSharedAbilityIntervalRef.current !== null) {
      window.clearInterval(hardModeSharedAbilityIntervalRef.current)
      hardModeSharedAbilityIntervalRef.current = null
    }
    levelTwoShockwaveReadyAtRef.current = 0
    setMessages([messageText])
    setMessage(messageText)
    clearTimeoutRef(playerAttackPulseTimeoutRef)
    clearTimeoutRef(dinosaurAttackPulseTimeoutRef)
    clearTimeoutRef(ratHitPulseTimeoutRef)
    clearTimeoutRef(ratDeathPulseTimeoutRef)
    clearTimeoutRef(ratAttackPulseTimeoutRef)
    clearTimeoutRef(ratAttackSourcePulseTimeoutRef)
    clearTimeoutRef(bossDeathPulseTimeoutRef)
    clearTimeoutRef(interactionPulseTimeoutRef)
    clearTimeoutRef(playerHurtPulseTimeoutRef)
    clearTimeoutRef(playerDeathPulseTimeoutRef)
    clearTimeoutRef(movePulseTimeoutRef)
    clearTimeoutRef(doorPulseTimeoutRef)
    clearTimeoutRef(pickupPulseTimeoutRef)
    clearTimeoutRef(chestPulseTimeoutRef)
    clearTimeoutRef(wallShiftPulseTimeoutRef)
    clearTimeoutRef(teleportPulseTimeoutRef)
    clearTimeoutRef(abilityPulseTimeoutRef)
    clearTimeoutRef(teleportTransitionDepartRef)
    clearTimeoutRef(teleportTransitionArriveRef)
    clearPlayerStunTimer()
    playerStunnedUntilRef.current = 0
    levelTwoRailShotReadyAtRef.current = 0
    hardModeSharedAbilityReadyAtRef.current = 0
    setHardModeSharedAbilityProgress(1)
    if (hardModeSharedAbilityIntervalRef.current !== null) {
      window.clearInterval(hardModeSharedAbilityIntervalRef.current)
      hardModeSharedAbilityIntervalRef.current = null
    }
    levelTwoTaserReadyAtRef.current = 0
    levelTwoShockwaveReadyAtRef.current = 0
    levelTwoBlastWaveReadyAtRef.current = 0
    levelTwoMindWaveReadyAtRef.current = 0
    setBombCooldownProgress(1)
    if (bombCooldownIntervalRef.current !== null) {
      window.clearInterval(bombCooldownIntervalRef.current)
      bombCooldownIntervalRef.current = null
    }
    if (nextLevel > 1) {
      showNormalModeTutorialOnce(nextLevel)
    }
  }

  function handleCommandKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setMode('normal')
      setCommandInput('')
      addMessage('Back to NORMAL mode.')
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const normalizedCommand = commandInputRef.current.trim().toLowerCase()
      if (normalizedCommand === 'skinchange') {
        setMode('normal')
        setCommandInput('')
        if (!hasSkinChangeAbilityRef.current) {
          addMessage('Skin changing is locked. Find and eat the mushroom first.')
          return
        }

        setShowSkinMenu(true)
        showSkinMenuRef.current = true
        const currentSkinIndex = Math.max(
          0,
          PLAYER_SKIN_OPTIONS.findIndex((skin) => skin.key === equippedSkin),
        )
        skinMenuIndexRef.current = currentSkinIndex
        setSkinMenuIndex(currentSkinIndex)
        setSkinMenuSearch('')
        skinMenuSearchRef.current = ''
        clearRatReprisalTimer()
        addMessage('Choose a skin with Up/Down, then press Enter.')
        return
      }

      if (normalizedCommand === 'level') {
        setMode('normal')
        setCommandInput('')
        if (isHardMode) {
          addMessage('Level select is disabled in hard mode.')
          return
        }
        clearRatReprisalTimer()
        setShowBossLevelSelect(true)
        showBossLevelSelectRef.current = true
        addMessage('Choose a level with 1, 2, 3, or 4.')
        return
      }

      if (normalizedCommand === 'hlevel') {
        setMode('normal')
        setCommandInput('')
        if (!isHardMode) {
          addMessage('Unknown command.')
          return
        }

        clearRatReprisalTimer()
        setShowBossLevelSelect(true)
        showBossLevelSelectRef.current = true
        addMessage('Hard test level skip opened.')
        return
      }

      if (normalizedCommand === 'enemy') {
        setMode('normal')
        setCommandInput('')
        openEnemyGuide()
        return
      }

      if (normalizedCommand === 'mode') {
        setMode('normal')
        setCommandInput('')
        openModeMenu()
        return
      }

      const result = runCommand(commandInputRef.current, { doorUnlocked: doorUnlockedRef.current })
      setMode('normal')
      setCommandInput('')
      if (result.shouldRestart) {
        restartGame(result.message, activeLevelRef.current)
      } else {
        addMessage(result.showIntro ? gameIntroMessage : result.message)
        const isTrap = Boolean(result.isTrap)
        if (isTrap) {
        }
        setIsDead(isTrap)
        if (isTrap) {
          triggerBooleanPulse(setIsPlayerDeathPulse, playerDeathPulseTimeoutRef, 900)
        }
        setHasEscaped(Boolean(result.escaped))
      }
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      setCommandInput((current) => current.slice(0, -1))
      return
    }

  if (event.key.length === 1) {
      event.preventDefault()
      setCommandInput((current) => `${current}${event.key}`)
    }
  }

  const isLevelTwoMapView = activeLevel >= 2
  const isInRightSideWorld =
    !isLevelTwoMapView && player.x >= roomWidth && (rightRoomKnown || thirdRoomKnown)
  const mapViewportX = isLevelTwoMapView
    ? 0
    : isActiveBossFight
      ? 0
      : isInRightSideWorld
        ? roomWidth
        : 0
  const isInSecretRoom = !isLevelTwoMapView
    && player.y < 0 && player.x < roomWidth && secretRoomKnown && !isActiveBossFight
  const isInThirdRoomSupplyRoom = !isLevelTwoMapView
    && player.x >= roomWidth + 3 &&
    player.x <= roomWidth + 7 &&
    player.y <= -7 &&
    thirdRoomKnown &&
    !isActiveBossFight
  const shouldFocusThirdRoom = !isLevelTwoMapView
    && player.y < 0
    && player.x >= roomWidth
    && thirdRoomKnown
    && !isActiveBossFight
  const shouldRenderSecretRoom = isInSecretRoom
  const shouldRenderThirdRoom = shouldFocusThirdRoom
  const focusRoomStartY = isLevelTwoMapView
    ? 0
    : shouldRenderThirdRoom
      ? isInThirdRoomSupplyRoom
        ? -9
        : -6
      : shouldRenderSecretRoom
        ? -secretRoomHeight
        : 0
  const focusRoomEndY = isLevelTwoMapView
    ? 0
    : shouldRenderThirdRoom || shouldRenderSecretRoom
      ? (isInThirdRoomSupplyRoom ? -6 : 0)
      : dungeonMap.length
  const mapHiddenRowsAbove = isLevelTwoMapView
    ? false
    : shouldFocusThirdRoom
      ? -1
      : shouldRenderSecretRoom
        ? false
        : (thirdRoomDoorOpen && player.y <= -6
          ? -6
          : false)
  const mapViewportWidth = isLevelTwoMapView
    ? isLevelThreeTrophyRoom
      ? LEVEL3_TROPHY_ROOM_LAYOUT[0].length
      : isLevelTwoBonusRoom
      ? LEVEL2_BONUS_ROOM_LAYOUT[0].length
      : getLevelTwoRoomWidth(getCurrentLevelTwoRoomConfig())
    : roomWidth

  const mapRows = useMemo<MapTileId[][]>(
    () =>
      isLevelTwoMapView
        ? buildLevelTwoMapRows()
        : applyLevelThreeBossWallPattern(
          drawMap(
            player,
            mouseHealth,
            mainMousePosition,
            shouldRenderSecretRoom,
            secretWallShifted,
            secretPocketOpen,
            secretPocketRats,
            mainMouseSkullVisible,
            mainMouseKeyVisible,
            isDoorOpen,
            rightRoomKnown,
            shouldRenderThirdRoom,
            rightRoomBlockShifted,
            rightRoomChestKeyVisible,
            rightRoomChestOpen,
            !isHardMode && vendingMachineAvailable,
            isSecretRoomDoorOpen,
            hasSecretRoomTeleporter,
            thirdRoomChestKeyVisible,
            thirdRoomChestOpen,
            thirdRoomLifeChestOpen,
            thirdRoomBombChestOpen,
            thirdRoomSwordChestOpen,
            thirdRoomBlockShifted,
            thirdRoomDoorOpen,
            mapHiddenRowsAbove,
            mapViewportX,
            mapViewportWidth,
            isActiveBossFight,
          ),
        ),
    [
      isLevelTwoMapView,
      player,
      mouseHealth,
      mainMousePosition,
      shouldRenderSecretRoom,
      secretWallShifted,
      secretPocketOpen,
      secretPocketRats,
      mainMouseSkullVisible,
      mainMouseKeyVisible,
      isDoorOpen,
      rightRoomKnown,
      shouldRenderThirdRoom,
      rightRoomBlockShifted,
      rightRoomChestKeyVisible,
      rightRoomChestOpen,
      vendingMachineAvailable,
      isSecretRoomDoorOpen,
      hasSecretRoomTeleporter,
      thirdRoomChestKeyVisible,
      thirdRoomChestOpen,
      thirdRoomLifeChestOpen,
      thirdRoomBombChestOpen,
      thirdRoomSwordChestOpen,
      thirdRoomBlockShifted,
      thirdRoomDoorOpen,
      mapHiddenRowsAbove,
      mapViewportX,
      mapViewportWidth,
      isActiveBossFight,
      levelTwoCurrentRoom,
      levelTwoRoomKeys,
      levelTwoRoomKeyDrops,
      isLevelTwoBonusRoom,
      isLevelThreeTrophyRoom,
      isMushroomAvailable,
      equippedSkin,
      normalModeChallengeDoorsUsed,
    ],
  )
  const mapSecretHeight = useMemo(
    () =>
      isLevelTwoMapView
        ? 0
        : isActiveBossFight
          ? 0
          : Math.max(0, mapRows.length - dungeonMap.length),
    [isLevelTwoMapView, isActiveBossFight, mapRows.length],
  )
  const visibleMapRows = useMemo<MapTileId[][]>(
    () => {
      if (isLevelTwoMapView || isActiveBossFight) {
        return mapRows.length > 0 ? mapRows : [['floor']]
      }

      const visibleStartY = Math.max(0, focusRoomStartY + mapSecretHeight)
      const visibleEndY = Math.max(
        visibleStartY,
        Math.min(mapRows.length, focusRoomEndY + mapSecretHeight),
      )
      const nextRows = mapRows.slice(visibleStartY, visibleEndY)

      if (nextRows.length > 0) {
        return nextRows
      }

      if (mapRows.length > 0) {
        return mapRows
      }

      return [['floor']]
    },
    [
      isLevelTwoMapView,
      isActiveBossFight,
      mapRows,
      focusRoomStartY,
      focusRoomEndY,
      mapSecretHeight,
    ],
  )
  const mapColumns = useMemo(
    () =>
      Math.max(
        ...visibleMapRows.map((row) => row.length),
        1,
      ),
    [visibleMapRows],
  )
  const mapRowOffsetY = isLevelTwoMapView || isActiveBossFight ? 0 : -focusRoomStartY
  const isInVisibleMap = (position: Position) =>
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < mapColumns &&
    position.y < visibleMapRows.length

  const getMapGridPosition = (position: Position) => ({
    x: position.x - mapViewportX,
    y: position.y + mapRowOffsetY,
  })

  const playerPositionCellKey = (position: Position) => {
    const gridPosition = getMapGridPosition(position)
    if (!isInVisibleMap(gridPosition)) return null
    return `${gridPosition.x},${gridPosition.y}`
  }

  const toPulseCellKeySet = (positions: Position[]) => {
    if (positions.length === 0) {
      return EMPTY_POSITION_KEY_SET
    }

    const keys = new Set<string>()
    for (const position of positions) {
      const key = playerPositionCellKey(position)
      if (key !== null) {
        keys.add(key)
      }
    }

    return keys
  }
  const mapRef = useRef<HTMLDivElement | null>(null)

  const getMapCellStepPixels = () => {
    if (typeof window === 'undefined') return null
    const mapElement = mapRef.current
    if (!mapElement) return null
    const firstCell = mapElement.querySelector('.map-cell') as HTMLElement | null
    const firstRow = mapElement.querySelector('.map-row') as HTMLElement | null
    if (!firstCell) return null
    const cellWidth = firstCell.getBoundingClientRect().width
    const gapValue = firstRow
      ? parseFloat(getComputedStyle(firstRow).getPropertyValue('column-gap'))
      : Number.NaN
    const gap = Number.isFinite(gapValue) ? gapValue : 0
    const step = cellWidth + gap
    if (!Number.isFinite(step) || step <= 0) return null
    return step
  }

  const getFallbackMapCellStepPixels = () => {
    if (typeof window === 'undefined') return null
    const rootStyle = getComputedStyle(document.documentElement)
    const rootSpriteSize = parseFloat(rootStyle.getPropertyValue('--sprite-size'))
    const rootGap = parseFloat(rootStyle.getPropertyValue('--sprite-gap'))
    const step = (Number.isFinite(rootSpriteSize) ? rootSpriteSize : 0)
      + (Number.isFinite(rootGap) ? rootGap : 0)
    if (!Number.isFinite(step) || step <= 0) return null
    return step
  }

  const pulseCellKeyDependencies = [
    mapViewportX,
    mapRowOffsetY,
    mapColumns,
    visibleMapRows.length,
  ]
  const playerAttackCellKeys = useMemo(
    () => toPulseCellKeySet(playerAttackPulsePositions),
    [playerAttackPulsePositions, ...pulseCellKeyDependencies],
  )
  const dinosaurAttackCellKeys = useMemo(
    () => toPulseCellKeySet(dinosaurAttackPulsePositions),
    [dinosaurAttackPulsePositions, ...pulseCellKeyDependencies],
  )
  const ratHitCellKeys = useMemo(
    () => toPulseCellKeySet(ratHitPulsePositions),
    [ratHitPulsePositions, ...pulseCellKeyDependencies],
  )
  const ratDeathCellKeys = useMemo(
    () => toPulseCellKeySet(ratDeathPulsePositions),
    [ratDeathPulsePositions, ...pulseCellKeyDependencies],
  )
  const ratAttackCellKeys = useMemo(
    () => toPulseCellKeySet(ratAttackPulsePositions),
    [ratAttackPulsePositions, ...pulseCellKeyDependencies],
  )
  const ratAttackSourceCellKeys = useMemo(
    () => toPulseCellKeySet(ratAttackSourcePulsePositions),
    [ratAttackSourcePulsePositions, ...pulseCellKeyDependencies],
  )
  const bossDeathCellKeys = useMemo(
    () => toPulseCellKeySet(bossDeathPulsePositions),
    [bossDeathPulsePositions, ...pulseCellKeyDependencies],
  )
  const interactionCellKeys = useMemo(
    () => toPulseCellKeySet(interactionPulsePositions),
    [interactionPulsePositions, ...pulseCellKeyDependencies],
  )
  const moveCellKeys = useMemo(
    () => toPulseCellKeySet(movePulsePositions),
    [movePulsePositions, ...pulseCellKeyDependencies],
  )
  const playerTrailCellKeys = useMemo(
    () => toPulseCellKeySet(playerTrailPositions),
    [playerTrailPositions, ...pulseCellKeyDependencies],
  )
  const playerTrailCellColors = useMemo(() => {
    const trailColors = new Map<string, number>()
    for (const position of playerTrailPositions) {
      const key = playerPositionCellKey(position)
      if (key !== null) {
        trailColors.set(key, position.colorIndex)
      }
    }
    return trailColors
  }, [playerTrailPositions, ...pulseCellKeyDependencies])
  const doorCellKeys = useMemo(
    () => toPulseCellKeySet(doorPulsePositions),
    [doorPulsePositions, ...pulseCellKeyDependencies],
  )
  const pickupCellKeys = useMemo(
    () => toPulseCellKeySet(pickupPulsePositions),
    [pickupPulsePositions, ...pulseCellKeyDependencies],
  )
  const chestCellKeys = useMemo(
    () => toPulseCellKeySet(chestPulsePositions),
    [chestPulsePositions, ...pulseCellKeyDependencies],
  )
  const wallShiftCellKeys = useMemo(
    () => toPulseCellKeySet(wallShiftPulsePositions),
    [wallShiftPulsePositions, ...pulseCellKeyDependencies],
  )
  const teleportCellKeys = useMemo(
    () => toPulseCellKeySet(teleportPulsePositions),
    [teleportPulsePositions, ...pulseCellKeyDependencies],
  )
  const abilityCellKeys = useMemo(
    () => toPulseCellKeySet(abilityPulsePositions),
    [abilityPulsePositions, ...pulseCellKeyDependencies],
  )
  const visibleBombAnimation = bombAnimation
    ? (() => {
        const from = getMapGridPosition(bombAnimation.start)
        const to = getMapGridPosition(bombAnimation.end)
        const clampToMap = (position: { x: number; y: number }) => ({
          x: Math.max(0, Math.min(position.x, mapColumns - 1)),
          y: Math.max(0, Math.min(position.y, mapRows.length - 1)),
        })
        const clampedFrom = clampToMap(from)
        const clampedTo = clampToMap(to)
        const cellStep = getMapCellStepPixels() ?? getFallbackMapCellStepPixels()
        if (cellStep === null) return null
        const fromPixels = {
          x: clampedFrom.x * cellStep,
          y: clampedFrom.y * cellStep,
        }
        const toPixels = {
          x: clampedTo.x * cellStep,
          y: clampedTo.y * cellStep,
        }

        return {
          phase: bombAnimation.phase,
          from: clampedFrom,
          to: clampedTo,
          fromPixels,
          toPixels,
          isTargetedKill: bombAnimation.isTargetedKill,
        }
      })()
    : null
  const enemyHitMarkerCounts = useMemo(() => {
    const hitCounts = new Map<string, number>()
    for (const marker of enemyHitMarkers) {
      const key = `${marker.x},${marker.y}`
      hitCounts.set(key, Math.min(6, (hitCounts.get(key) ?? 0) + 1))
    }
    return hitCounts
  }, [enemyHitMarkers])
  const enemyHealthDotLookup = useMemo(() => {
    const healthLookup = new Map<string, boolean[]>()

    for (const rat of secretPocketRats) {
      if (rat.health <= 0) continue

      const maxHealth = Math.max(1, rat.maxHealth ?? rat.health)
      healthLookup.set(
        `${rat.x},${rat.y}`,
        Array.from({ length: maxHealth }).map((_, index) => index < rat.health),
      )
    }

    if (!isActiveBossFight && mouseHealth > 0) {
      healthLookup.set(
        `${mainMousePosition.x},${mainMousePosition.y}`,
        Array.from({ length: mouseMaxHealth }).map((_, index) => index < mouseHealth),
      )
    }

    return healthLookup
  }, [isActiveBossFight, mainMousePosition, mouseHealth, secretPocketRats])
  const getEnemyHitDots = (position: Position) => {
    const dotCount = enemyHitMarkerCounts.get(`${position.x},${position.y}`) ?? 0

    return Array.from({ length: dotCount }).map((_, index) => {
      const seed = Math.abs((position.x + 11) * 37 + (position.y + 17) * 53 + index * 29)
      return {
        x: 24 + (seed % 48),
        y: 22 + ((seed * 7) % 48),
      }
    })
  }
  const getEnemyHealthDots = (position: Position) => {
    return enemyHealthDotLookup.get(`${position.x},${position.y}`) ?? []
  }
  const enemyGuideEntries = getEnemyGuideEntriesForLevel(activeLevel)
  const selectedEnemyGuideEntry =
    enemyGuideEntries[Math.min(enemyGuideIndex, Math.max(0, enemyGuideEntries.length - 1))]
  const activeLevelMeta =
    levelMeta.gameplayLevel === activeLevel
      ? levelMeta
      : getLevelMetaForGameplayLevel(activeLevel)
  const activeSectionLevels = getSectionLevels(activeLevelMeta.sectionNumber)
  return (
    <section className="game-screen">
        <section className="main-panel" aria-label="Prison room">
        <div className="door-unlocked-banner">
          Door Keys: {doorKeyCount} 🔑 | Room Keys: {levelTwoRoomKeys}/{LEVEL2_MAX_ROOM_KEYS} 🔑 | Bombs: {isLevelTwo ? '∞' : bombCount} 💣 | Chest Keys: {chestKeyCount} ⚿ | Sword: {hasSword ? '⚔️' : '—'}
          {isLevelTwo && (
            <span
              className="bomb-cooldown"
              aria-label={bombCooldownProgress >= 1 ? 'Bomb ready' : 'Bomb recharging'}
              style={{ '--bomb-cooldown-progress': bombCooldownProgress } as CSSProperties}
            />
          )}
          {isHardMode && activeLevel >= 2 && (
            <span
              className="hard-ability-cooldown"
              aria-label={
                hardModeSharedAbilityProgress >= 1
                  ? 'Hard ability ready'
                  : 'Hard ability cooling down'
              }
              style={{ '--hard-ability-progress': hardModeSharedAbilityProgress } as CSSProperties}
            >
              ✦
            </span>
          )}
          {SKIN_ABILITY_SKINS.includes(equippedSkin) && (
            <span
              className={`skin-ability-cooldown ${
                activeSkinAbility === equippedSkin
                  ? 'skin-ability-cooldown--active'
                  : skinAbilityCoolingDown
                    ? 'skin-ability-cooldown--cooldown'
                    : 'skin-ability-cooldown--ready'
              }`}
              aria-label={
                activeSkinAbility === equippedSkin
                  ? 'Skin ability active'
                  : skinAbilityCoolingDown
                    ? 'Skin ability cooling down'
                  : 'Skin ability ready'
              }
              style={{ '--skin-ability-progress': skinAbilityProgress } as CSSProperties}
            >
              {getPlayerSkinTile(equippedSkin)}
            </span>
          )}
        </div>
        <div
          ref={mapRef}
          className={`ascii-map${secretWallShaking ? ' ascii-map--shake' : ''}${teleportMapPulse ? ` ascii-map--teleport-${teleportMapPulse}` : ''}`}
        >
          {visibleMapRows.map((row, rowIndex) => {
            return (
                <span
                  key={`row-${rowIndex}`}
                  className="map-row"
                  aria-hidden
                  style={{ gridTemplateColumns: `repeat(${mapColumns}, var(--sprite-size, 28px))` }}
                >
                {row.map((cell, cellIndex) => {
                  const cellGridKey = `${cellIndex},${rowIndex}`
                  const playerCellPosition = {
                    x: cellIndex + mapViewportX,
                    y: rowIndex - mapRowOffsetY,
                  }
                  const isCurrentPlayerTile = isSamePosition(playerCellPosition, player)
                  const displayedCell: MapTileId =
                    !isCurrentPlayerTile &&
                    getNormalModeChallengeDoor(playerCellPosition) &&
                    !normalModeChallengeDoorsUsed.includes(getNormalModeChallengeDoorKey(playerCellPosition) ?? '')
                      ? 'challenge-door'
                      : cell === 'player' && isDinosaurAttackActive
                        ? 'dinosaur-player'
                        : cell
                  const label = cellSpriteLabel[displayedCell] ?? 'floor'
                  const enemyHitDots = getEnemyHitDots(playerCellPosition)
                  const enemyHealthDots = getEnemyHealthDots(playerCellPosition)
                  const animationClasses = [
                    playerAttackCellKeys.has(cellGridKey) ? 'map-cell--attack' : '',
                    dinosaurAttackCellKeys.has(cellGridKey)
                      ? 'map-cell--dinosaur-attack'
                      : '',
                    ratAttackCellKeys.has(cellGridKey) ? 'map-cell--rat-attack' : '',
                    ratAttackSourceCellKeys.has(cellGridKey) ? 'map-cell--rat-attack-source' : '',
                    ratHitCellKeys.has(cellGridKey) ? 'map-cell--rat-hit' : '',
                    ratDeathCellKeys.has(cellGridKey) ? 'map-cell--rat-death' : '',
                    bossDeathCellKeys.has(cellGridKey)
                      ? 'map-cell--boss-death'
                      : '',
                    interactionCellKeys.has(cellGridKey) ? 'map-cell--interaction' : '',
                    playerTrailCellKeys.has(cellGridKey) ? 'map-cell--player-trail' : '',
                    playerTrailCellKeys.has(cellGridKey)
                      ? `map-cell--player-trail-${playerTrailCellColors.get(cellGridKey) ?? 0}`
                      : '',
                    moveCellKeys.has(cellGridKey) ? 'map-cell--move' : '',
                    doorCellKeys.has(cellGridKey) ? 'map-cell--door-trigger' : '',
                    pickupCellKeys.has(cellGridKey) ? 'map-cell--pickup' : '',
                    chestCellKeys.has(cellGridKey) ? 'map-cell--chest-open' : '',
                    wallShiftCellKeys.has(cellGridKey) ? 'map-cell--wall-shift' : '',
                    teleportCellKeys.has(cellGridKey) ? 'map-cell--teleport-use' : '',
                    abilityCellKeys.has(cellGridKey) && abilityPulseType
                      ? `map-cell--ability-${abilityPulseType}`
                      : '',
                    isCurrentPlayerTile && isAttackCharging
                      ? `map-cell--charge-ready map-cell--charge-level-${Math.max(1, Math.min(3, attackChargeLevel))}`
                      : '',
                    isCurrentPlayerTile && isPlayerHurtPulse ? 'map-cell--player-hurt' : '',
                    isCurrentPlayerTile && isPlayerDeathPulse ? 'map-cell--player-death' : '',
                    isCurrentPlayerTile && isPlayerStunned ? 'map-cell--player-stunned' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <span
                      key={`${rowIndex}-${cellIndex}`}
                      className={`map-cell map-cell--${displayedCell} ${animationClasses}`}
                      aria-label={label}
                      onClick={() => handlePhysicalMouseEnemyClick(playerCellPosition)}
                    >
                      {enemyHitDots.map((dot, index) => (
                        <span
                          key={`hit-dot-${index}`}
                          className="enemy-hit-dot"
                          style={
                            {
                              '--enemy-hit-dot-x': `${dot.x}%`,
                              '--enemy-hit-dot-y': `${dot.y}%`,
                            } as CSSProperties
                          }
                        />
                      ))}
                      {enemyHealthDots.length > 0 && (
                        <span className="enemy-health-dots" aria-hidden>
                          {enemyHealthDots.map((isFilled, index) => (
                            <span
                              key={`health-dot-${index}`}
                              className={`enemy-health-dot ${isFilled ? 'enemy-health-dot--filled' : ''}`}
                            />
                          ))}
                        </span>
                      )}
                    </span>
                  )
                })}
              </span>
            )
          })}
          {visibleBombAnimation && (
            <span
              className={`map-bomb-animation ${
                visibleBombAnimation.phase === 'flying' &&
                visibleBombAnimation.isTargetedKill
                  ? 'map-bomb-animation--flying-kill'
                  : `map-bomb-animation--${visibleBombAnimation.phase}`
              }`}
              aria-hidden
                  style={
                    {
                      '--bomb-start-x': `${visibleBombAnimation.fromPixels.x}px`,
                      '--bomb-start-y': `${visibleBombAnimation.fromPixels.y}px`,
                      '--bomb-end-x': `${visibleBombAnimation.toPixels.x}px`,
                      '--bomb-end-y': `${visibleBombAnimation.toPixels.y}px`,
                    } as CSSProperties
                  }
                />
              )}
          {teleportMapPulse && (
            <span className={`teleport-transition teleport-transition--${teleportMapPulse}`} aria-hidden />
          )}
          {showVendingMenu && (
            <div className="vending-menu" role="dialog" aria-live="polite">
              <div className="vending-menu__panel">
                <p className="vending-menu__title">Vending Machine</p>
                <p>Choose an option:</p>
                <p>[1] 3 Bombs</p>
                <p>[Esc] Cancel</p>
              </div>
            </div>
          )}
          {showSkinMenu && (
            <div className="death-popup" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">Skin Change</p>
                {PLAYER_SKIN_OPTIONS.map((skin, index) => (
                  <p key={skin.key} className="death-popup__body">
                    {skinMenuIndex === index ? '>' : ' '} {skin.label}{equippedSkin === skin.key ? ' (equipped)' : ''}
                  </p>
                ))}
                <p className="death-popup__body">Typed: {skinMenuSearch || '...'}</p>
                <p className="death-popup__body">Up/Down to choose. Enter equips. Esc cancels.</p>
              </div>
            </div>
          )}
          {showEnemyGuide && selectedEnemyGuideEntry && (
            <div className="death-popup" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">Enemy Guide</p>
                {enemyGuideMode === 'list' ? (
                  <>
                    {enemyGuideEntries.map((entry, index) => (
                      <p key={entry.key} className="death-popup__body">
                        {enemyGuideIndex === index ? '>' : ' '} {entry.label}
                      </p>
                    ))}
                    <p className="death-popup__body">Search: {enemyGuideSearch || '...'}</p>
                    <p className="death-popup__body">J/K or arrows move. Enter opens. Esc closes.</p>
                  </>
                ) : (
                  <>
                    <p className="death-popup__body">{selectedEnemyGuideEntry.label}</p>
                    <p className="death-popup__body">{selectedEnemyGuideEntry.description}</p>
                    <p className="death-popup__body">Attacks: {selectedEnemyGuideEntry.attacks}</p>
                    <p className="death-popup__body">Health: {selectedEnemyGuideEntry.health}</p>
                    <p className="death-popup__body">Enter or Backspace returns. Esc closes.</p>
                  </>
                )}
              </div>
            </div>
          )}
          {showModeMenu && (
            <div className="death-popup" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">Choose Mode</p>
                {MODE_OPTIONS.map((option, index) => (
                  <p key={option.key} className="death-popup__body">
                    {modeMenuIndex === index ? '>' : ' '} {option.label}
                  </p>
                ))}
                <p className="death-popup__body">Search: {modeMenuSearch || '...'}</p>
                <p className="death-popup__body">J/K OR ARROWS MOVE. ENTER TO SELECT.</p>
              </div>
            </div>
          )}
          {showChallengePrompt && (
            <div className="death-popup" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">Challenge Mode</p>
                <p className="death-popup__body">Restart this level with 2x the enemies?</p>
                <p className="death-popup__body">[Y] Yes</p>
                <p className="death-popup__body">[N] No</p>
              </div>
            </div>
          )}
          {tutorialPopup && (
            <div className="death-popup death-popup--tutorial" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">{tutorialPopup.title}</p>
                <p className="death-popup__body">{tutorialPopup.body}</p>
                <p className="death-popup__body">Press any key to continue.</p>
                <p className="death-popup__body">Skip with Enter.</p>
              </div>
            </div>
          )}
          {showKeyVanishedPopup && (
            <div className="death-popup death-popup--slow" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">Key Vanished</p>
                <p className="death-popup__body">You did not collect the key fast enough.</p>
                <p className="death-popup__body">Press any key to restart hard mode.</p>
              </div>
            </div>
          )}
          {showSkinUnlockPopup && (
            <div className="death-popup" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">Skin Change Unlocked</p>
                <p className="death-popup__body">Use :skinchange to choose your character skin.</p>
                <p className="death-popup__body">Press any key to continue.</p>
              </div>
            </div>
          )}
          {isDead && (
            <div className="death-popup" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">You Died</p>
                <p className="death-popup__body">Press any key to restart.</p>
              </div>
            </div>
          )}
          {showNextLevelPrompt && (
            <div className="death-popup" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">Level Clear</p>
                {isHardMode ? (
                  <>
                    <p className="death-popup__body">Hard mode continues forward.</p>
                    <p className="death-popup__body">Press any key to continue.</p>
                  </>
                ) : (
                  <>
                    <p className="death-popup__body">Go to the next level?</p>
                    <p className="death-popup__body">[Y] Yes</p>
                    <p className="death-popup__body">[N] No</p>
                  </>
                )}
              </div>
            </div>
          )}
          {showBossLevelSelect && (
            <div className="death-popup" role="dialog" aria-live="polite">
              <div className="death-popup__panel">
                <p className="death-popup__title">Level Select</p>
                <p className="death-popup__body">Which level?</p>
                {activeSectionLevels.map((entry) => (
                  <p key={entry.levelNumber} className="death-popup__body">
                    [{entry.levelNumber}] Level {entry.levelNumber}: {entry.roomName}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="legend">
          <span>
            <i className="legend-sprite map-cell--player" /> you
          </span>
          <span>
            <i className="legend-sprite map-cell--dinosaur-player" /> Dinosaur Attack (f)
          </span>
          <span>
            {dinosaurAttackUnlocked
              ? 'Dinosaur Attack: READY'
              : `Dinosaur Attack: ${ratsUntilDinosaurUnlocked} more rat kills`}
          </span>
          <span>
            <i className="legend-sprite map-cell--rat-burst" /> dinosaur kill
          </span>
          <span>
            <i className="legend-sprite map-cell--rat" /> mouse
          </span>
          <span>
            <i className="legend-sprite map-cell--rat-sniper" /> sniper rat
          </span>
          <span>
            <i className="legend-sprite map-cell--rat-grenadier" /> grenadier rat
          </span>
          <span>
            <i className="legend-sprite map-cell--rat-mine" /> mine rat
          </span>
          <span>
            <i className="legend-sprite map-cell--rat-warden" /> warden rat
          </span>
          <span>
            <i className="legend-sprite map-cell--rat-stunner" /> stunner rat
          </span>
          <span>
            <i className="legend-sprite map-cell--rat-rusher" /> rusher rat
          </span>
          <span>
            <i className="legend-sprite map-cell--rat-aura" /> aura rat
          </span>
          <span>
            <i className="legend-sprite map-cell--dragon" /> dragon
          </span>
          <span>
            <i className="legend-sprite map-cell--rat-dead" /> defeated mouse
          </span>
          <span>
            <i className="legend-sprite map-cell--key" /> door key
          </span>
          <span>
            <i className="legend-sprite map-cell--chest-key" /> chest key
          </span>
          <span>
            <i className="legend-sprite map-cell--door-locked" /> locked door
          </span>
          <span>
            <i className="legend-sprite map-cell--chest" /> chest
          </span>
          <span>
            <i className="legend-sprite map-cell--vending-machine" /> vending machine
          </span>
          <span>
            <i className="legend-sprite map-cell--teleporter" /> secret teleporter
          </span>
          <span>
            <i className="legend-sprite map-cell--wall" /> wall
          </span>
        </div>
      </section>
      <section className="side-column">
        <ObjectivePanel levelMeta={activeLevelMeta} />
        <HelpPanel
          levelMeta={activeLevelMeta}
          showHelp={showHelp}
          playerHealth={playerHealth}
          mouseHealth={mouseHealth}
          messages={messages}
        />
      </section>
      <StatusBar
        mode={mode}
        message={message}
        commandInput={commandInput}
        isCommandOpen={mode === 'command'}
        playerHealth={playerHealth}
        levelMeta={activeLevelMeta}
      />
    </section>
  )
}

function getMovement(key: string): Position | null {
  if (key === 'h') return { x: -1, y: 0 }
  if (key === 'j') return { x: 0, y: 1 }
  if (key === 'k') return { x: 0, y: -1 }
  if (key === 'l') return { x: 1, y: 0 }
  return null
}
