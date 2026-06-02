import type { CommandResult } from './types'

export function runCommand(rawCommand: string): CommandResult {
  const command = rawCommand.trim().toLowerCase()

  if (command === 'w') {
    return { message: 'Game saved.' }
  }

  if (command === 'q') {
    return { message: 'The door is still locked.' }
  }

  if (command === 'restart') {
    return { message: 'The game restarts from the beginning.', shouldRestart: true }
  }

  if (command === 'e intro') {
    return {
      message: 'Opened intro.',
      showIntro: true,
    }
  }

  if (command === 'telnet level2') {
    return {
      message: 'You tried telnet. The dungeon noticed. Telnet is insecure. You died.',
      isTrap: true,
    }
  }

  if (command.length === 0) {
    return { message: 'No command entered.' }
  }

  return { message: `Unknown command: ${rawCommand}. Try :w, :q, :e intro, :telnet level2, or :restart.` }
}
