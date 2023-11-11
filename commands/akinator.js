import { Aki } from 'aki-api'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import {
  AKINATOR_REGION,
  AKINATOR_CHILD_MODE,
  AKINATOR_PROXY,
  AKINATOR_MAX_RESPONSE_MINUTE,
  AKINATOR_GUESS_EVERY_STEP,
  AKINATOR_GUESS_WHEN_PROGRESS,
  AKINATOR_MAX_GUESS_COUNT
} from '../config.js'

export default {
  data: new SlashCommandBuilder()
    .setName('akinator')
    .setDescription('Permainan menebak karakter'),
  async execute (interaction) {
    await interaction.reply('Pikirkan seorang tokoh atau karakter untuk saya tebak...')

    const aki = new Aki({ region: AKINATOR_REGION, childMode: AKINATOR_CHILD_MODE, proxy: AKINATOR_PROXY })

    const getQuestionEmbed = (akiQuestion, akiProgress, akiCurrentStep) => (new EmbedBuilder())
      .setTitle(akiQuestion)
      .setFooter({ text: `Progress: ${akiProgress}%, Pertanyaan: ${akiCurrentStep + 1}` })

    const getGuesserComponent = (akiCurrentStep) => {
      const answerButtons = tempAki.answers.map((answer, index) => (new ButtonBuilder()).setCustomId(index.toString())
        .setLabel(answer)
        .setStyle(ButtonStyle.Primary))

      const backButton = (new ButtonBuilder()).setCustomId('back')
        .setLabel('Kembali')
        .setStyle(ButtonStyle.Secondary)

      const stopButton = (new ButtonBuilder()).setCustomId('stop')
        .setLabel('Berhenti')
        .setStyle(ButtonStyle.Danger)

      const answerRow = (new ActionRowBuilder()).addComponents(...answerButtons)
      const actionRow = new ActionRowBuilder()

      if (akiCurrentStep !== 0) {
        actionRow.addComponents(backButton)
      }

      actionRow.addComponents(stopButton)

      return [answerRow, actionRow]
    }

    const binaryButtonComponent = (new ActionRowBuilder()).addComponents(
      (new ButtonBuilder()).setCustomId('yes')
        .setLabel('Iya')
        .setStyle(ButtonStyle.Primary),
      (new ButtonBuilder()).setCustomId('no')
        .setLabel('Tidak')
        .setStyle(ButtonStyle.Secondary)
    )

    const awaitMessageComponentOption = {
      filter: (i) => i.user.id === interaction.user.id,
      time: AKINATOR_MAX_RESPONSE_MINUTE * 60000
    }

    let tempAki = await aki.start()
    let latestWinAki = null
    let guessCounter = 0

    while (true) {
      const response = await interaction.editReply({
        content: '',
        embeds: [getQuestionEmbed(tempAki.question, aki.progress, aki.currentStep)],
        components: getGuesserComponent(aki.currentStep)
      })

      try {
        const confirmation = await response.awaitMessageComponent(awaitMessageComponentOption)

        if (confirmation.customId === 'stop') {
          await confirmation.update({
            content: 'Akinator dibatalkan',
            embeds: [],
            components: []
          })

          break
        } else if (confirmation.customId === 'back') {
          tempAki = await aki.back()
        } else {
          const answer = Number(confirmation.customId)

          tempAki = await aki.step(answer)
        }

        await confirmation.deferUpdate()
      } catch (e) {
        await interaction.editReply({
          content: `Akinator dibatalkan karena tidak dijawab selama ${AKINATOR_MAX_RESPONSE_MINUTE} minute`,
          components: []
        })
      }

      if (aki.progress >= AKINATOR_GUESS_WHEN_PROGRESS || aki.currentStep % AKINATOR_GUESS_EVERY_STEP === 0) {
        await interaction.editReply({
          content: 'Tunggu sebentar, saya sedang menebak 🤔...',
          embeds: [],
          components: []
        })

        latestWinAki = await aki.win()
        const firstGuess = latestWinAki.guesses[0]
        guessCounter++

        const guessEmbed = new EmbedBuilder().setTitle(firstGuess.name)
          .setDescription(firstGuess.description)
          .setImage(firstGuess.absolute_picture_path)

        const winResponse = await interaction.editReply({
          content: 'Apakah ini yang kamu maksud?',
          embeds: [guessEmbed.setFooter({ text: `Saya yakin ${Math.round((firstGuess.proba * 100) * 100) / 100}% adalah dia` })],
          components: [binaryButtonComponent]
        })

        try {
          const winConfirmation = await winResponse.awaitMessageComponent(awaitMessageComponentOption)

          if (winConfirmation.customId === 'yes') {
            await winConfirmation.update({
              content: 'Baik, berarti tebakan saya benar. Senang bermain dengan anda 😉',
              embeds: [guessEmbed.setFooter({ text: `Jumlah tebakan: ${guessCounter}` })],
              components: []
            })

            break
          }

          if (winConfirmation.customId === 'no') {
            await winConfirmation.deferUpdate()
          }
        } catch (e) {
          await interaction.editReply({
            content: `Akinator dibatalkan karena tidak dijawab selama ${AKINATOR_MAX_RESPONSE_MINUTE} minute`,
            components: []
          })
        }
      }

      if (guessCounter >= AKINATOR_MAX_GUESS_COUNT) {
        const guesses = latestWinAki.guesses

        const lastGuessEmbed = (new EmbedBuilder()).setTitle('Tebakan-tebakan saya adalah:')
          .setFields(
            ...guesses.slice(0, 5)
              .map(guess => ({
                name: `${guess.name} (${Math.round((guess.proba * 100) * 100) / 100}%)`,
                value: guess.description
              })))
        const lastGuessResponse = await interaction.editReply({
          content: 'Apakah tokoh yang sedang anda pikirkan adalah salah satu dari mereka?',
          embeds: [lastGuessEmbed],
          components: [binaryButtonComponent]
        })

        try {
          const lastGuessConfirmation = await lastGuessResponse.awaitMessageComponent(awaitMessageComponentOption)

          let content = ''
          const embeds = []

          if (lastGuessConfirmation.customId === 'yes') {
            content = 'Jika begitu, tokoh yang anda maksud adalah salah satu dari mereka. Senang bermain dengan anda 😉'
            embeds.push(lastGuessEmbed)
          }

          if (lastGuessConfirmation.customId === 'no') {
            content = 'Baiklah, saya menyerah 🏳️🏳️🏳️. Saya tidak tahu lagi apa yang sedang kamu pikirkan.'
          }

          await lastGuessConfirmation.update({ content, embeds, components: [] })

          break
        } catch (e) {
          await interaction.editReply({
            content: `Akinator dibatalkan karena tidak dijawab selama ${AKINATOR_MAX_RESPONSE_MINUTE} minute`,
            components: []
          })
        }
      }
    }
  }
}
