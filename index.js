import fs from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Client, Collection, Events, GatewayIntentBits, REST, Routes } from 'discord.js'
import { DISCORD_APPLICATION_ID, DISCORD_TOKEN } from './config.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.commands = new Collection()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'))

// Register commands
for (const file of commandFiles) {
  const filePath = path.join(commandPath, file)
  const command = (await import(filePath)).default

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command)
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`)
  }
}

const rest = new REST().setToken(DISCORD_TOKEN);

// Deploy commands
(async () => {
  const commands = client.commands.map(command => command.data)

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`)

    const data = await rest.put(
      Routes.applicationCommands(DISCORD_APPLICATION_ID),
      { body: commands }
    )

    console.log(`Successfully reloaded ${data.length} application (/) commands.`)
  } catch (error) {
    console.error(error)
  }
})()

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`)
})

// Command handling listener
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return

  const command = interaction.client.commands.get(interaction.commandName)

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
    }
  }
})

// Start the bot
client.login(DISCORD_TOKEN)
