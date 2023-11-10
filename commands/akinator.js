import { Aki } from 'aki-api'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { AKINATOR_REGION, AKINATOR_CHILD_MODE, AKINATOR_PROXY, AKINATOR_MAX_RESPONSE_MINUTE, AKINATOR_WIN_EVERY_STEP, AKINATOR_WIN_PROGRESS, AKINATOR_MAX_GUESS_COUNT } from '../config.js'

export default {
  data: new SlashCommandBuilder()
    .setName('akinator')
    .setDescription('Memulai akinator'),
  async execute (interaction) {
    await interaction.reply('Pikirkan sebuah tokoh atau karakter untuk saya tebak...')

    const aki = new Aki({ region: AKINATOR_REGION, childMode: AKINATOR_CHILD_MODE, proxy: AKINATOR_PROXY })

    const generateEmbed = (akiQuestion, akiProgress, akiCurrentStep) => (new EmbedBuilder())
      .setTitle(akiQuestion)
      .setFooter({ text: `Progress: ${akiProgress}%, Step: ${akiCurrentStep + 1}` })

    const generateComponents = (akiCurrentStep) => {
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

    let tempAki = await aki.start()
    let guessCounter = 0

    while (true) {
      const response = await interaction.editReply({
        content: '',
        embeds: [generateEmbed(tempAki.question, aki.progress, aki.currentStep)],
        components: generateComponents(aki.currentStep)
      })

      try {
        const confirmation = await response.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: AKINATOR_MAX_RESPONSE_MINUTE * 60000 })

        if (confirmation.customId === 'stop') {
          await confirmation.update({
            content: 'Akinator dihentikan',
            embeds: [],
            components: []
          })

          break
        } else if (confirmation.customId === 'back') {
          tempAki = await aki.back()
        } else {
          const answer = +confirmation.customId

          tempAki = await aki.step(answer)
        }

        await confirmation.deferUpdate()
      } catch (e) {
        await interaction.editReply({ content: `Confirmation not received within ${AKINATOR_MAX_RESPONSE_MINUTE} minute, cancelling`, components: [] })
      }

      if (aki.progress >= AKINATOR_WIN_PROGRESS || aki.currentStep % AKINATOR_WIN_EVERY_STEP === 0) {
        await interaction.editReply({
          content: 'Tunggu sebentar, saya sedang menebak...',
          embeds: [],
          components: []
        })

        const winAki = await aki.win()
        const firstGuess = winAki.guesses[0]
        guessCounter++

        const guessEmbed = new EmbedBuilder().setTitle(firstGuess.name)
          .setDescription(firstGuess.description)
          .setImage(firstGuess.absolute_picture_path)

        const winResponse = await interaction.editReply({
          content: 'Apakah ini yang kamu maksud?',
          embeds: [guessEmbed],
          components: [
            (new ActionRowBuilder()).addComponents(
              (new ButtonBuilder()).setCustomId('yes')
                .setLabel('Iya')
                .setStyle(ButtonStyle.Primary),
              (new ButtonBuilder()).setCustomId('no')
                .setLabel('Tidak')
                .setStyle(ButtonStyle.Secondary)
            )
          ]
        })

        try {
          const winConfirmation = await winResponse.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: AKINATOR_MAX_RESPONSE_MINUTE * 60000 })

          if (winConfirmation.customId === 'yes') {
            await winConfirmation.update({
              content: 'Baik, berarti tebakan saya benar.',
              embeds: [guessCounter.setFooter(`Jumlah tebakan: ${guessCounter}`)],
              components: []
            })
            break
          }

          if (winConfirmation.customId === 'no') {
            await winConfirmation.deferUpdate()
          }
        } catch (e) {
          await interaction.editReply({ content: `Guess confirmation not received within ${AKINATOR_MAX_RESPONSE_MINUTE} minute, cancelling`, components: [] })
        }
      }

      if (guessCounter >= AKINATOR_MAX_GUESS_COUNT) {
        await interaction.editReply({
          content: 'Baiklah, saya menyerah 🏳️🏳️🏳️. Saya tidak tahu lagi apa yang sedang kamu pikirkan.',
          embeds: [],
          components: []
        })

        break
      }
    }
  }
}
