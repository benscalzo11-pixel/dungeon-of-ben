import type { CommandContext, CommandResult } from './types'

export function runCommand(rawCommand: string, context: CommandContext): CommandResult {
  const command = rawCommand.trim().toLowerCase()

  if (command === 'w') {
    return { message: 'Game saved.' }
  }

  if (command === 'q') {
    if (context.doorUnlocked) {
      return {
        message: 'The door opens. You are not free yet, but you have escaped the first cell.',
        escaped: true,
      }
    }

    return { message: 'The door is still locked.' }
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

  return { message: `Unknown command: ${rawCommand}. Try :w, :q, :e intro, or :telnet level2.` }
}
