import { Aki } from 'aki-api'
import {
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
import {
  createConfirmationActionRow,
  createFinalGuessEmbed,
  createGuessEmbed,
  createQuestionActionRow,
  createQuestionAnswerRow,
  createQuestionEmbed
} from '../components/akinatorComponents.js'

const aki = new Aki({ region: AKINATOR_REGION, childMode: AKINATOR_CHILD_MODE, proxy: AKINATOR_PROXY })

const data = new SlashCommandBuilder()
  .setName('akinator')
  .setDescription('Permainan menebak karakter')

const execute = async function (interaction) {
  /**
   *
   * @param {string} question
   * @param {string} progress
   * @param {string} answers
   * @param {number} currentStep
   * @returns
   */
  const replyQuestion = async (question, progress, answers, currentStep) => {
    return await interaction.editReply({
      content: '',
      embeds: [
        createQuestionEmbed(question, progress, currentStep)
      ],
      components: [
        createQuestionAnswerRow(answers),
        createQuestionActionRow(currentStep)
      ]
    })
  }

  /**
   *
   * @param {string} name
   * @param {string} description
   * @param {string} picturePath
   * @param {string} probability
   * @returns
   */
  const replyGuessQuestion = async (name, description, picturePath, probability) => {
    return await interaction.editReply({
      content: 'Apakah ini yang kamu maksud?',
      embeds: [
        createGuessEmbed(name, description, picturePath, probability)
      ],
      components: [
        createConfirmationActionRow()
      ]
    })
  }

  /**
   *
   * @param {import('aki-api/typings/src/functions/Request.js').guess} guesses
   * @returns
   */
  const replyFinalGuessQuestion = async (guesses) => {
    return await interaction.editReply({
      content: 'Apakah tokoh yang sedang anda pikirkan adalah salah satu dari mereka?',
      embeds: [
        createFinalGuessEmbed(guesses)
      ],
      components: [
        createConfirmationActionRow()
      ]
    })
  }

  const replyInactiveFallback = async () => {
    await interaction.editReply({
      content: `Akinator dibatalkan karena tidak dijawab selama ${AKINATOR_MAX_RESPONSE_MINUTE} minute`,
      components: []
    })
  }

  const awaitMessageComponentOption = {
    filter: (i) => i.user.id === interaction.user.id,
    time: AKINATOR_MAX_RESPONSE_MINUTE * 60000
  }

  await interaction.reply('Pikirkan seorang tokoh atau karakter untuk saya tebak...')

  let lastWinAki = null
  let guessCounter = 0

  let tempAki = await aki.start()

  while (true) {
    const questionResponse = await replyQuestion(tempAki.question, aki.progress, tempAki.answers, aki.currentStep)

    // Question handling
    try {
      const questionConfirmation = await questionResponse.awaitMessageComponent(awaitMessageComponentOption)

      if (questionConfirmation.customId === 'stop') {
        await questionConfirmation.update({
          content: 'Akinator dibatalkan',
          embeds: [],
          components: []
        })

        break
      }

      if (questionConfirmation.customId === 'back') {
        tempAki = await aki.back()
      } else {
        const answer = Number(questionConfirmation.customId)

        tempAki = await aki.step(answer)
      }

      await questionConfirmation.deferUpdate()
    } catch (e) {
      await replyInactiveFallback()
      console.error(e)
    }

    if (aki.progress >= AKINATOR_GUESS_WHEN_PROGRESS || aki.currentStep % AKINATOR_GUESS_EVERY_STEP === 0) {
      await interaction.editReply({
        content: 'Tunggu sebentar, saya sedang menebak 🤔...',
        embeds: [],
        components: []
      })

      guessCounter++

      lastWinAki = await aki.win()
      const firstGuess = lastWinAki.guesses[0]

      const guessQuestionResponse = await replyGuessQuestion(firstGuess.name, firstGuess.description, firstGuess.absolute_picture_path, firstGuess.proba)

      // Guess question handling
      try {
        const guessQuestionConfirmation = await guessQuestionResponse.awaitMessageComponent(awaitMessageComponentOption)

        if (guessQuestionConfirmation.customId === 'yes') {
          const correctGuessEmbed = createGuessEmbed(firstGuess.name, firstGuess.description, firstGuess.absolute_picture_path, firstGuess.proba).setFooter({
            text: `Jumlah tebakan: ${guessCounter}`
          })

          await guessQuestionConfirmation.update({
            content: 'Baik, berarti tebakan saya benar. Senang bermain dengan anda 😉',
            embeds: [
              correctGuessEmbed
            ],
            components: []
          })

          break
        }

        if (guessQuestionConfirmation.customId === 'no') {
          await guessQuestionConfirmation.deferUpdate()
        }
      } catch (e) {
        await replyInactiveFallback()
        console.error(e)
      }
    }

    if (guessCounter >= AKINATOR_MAX_GUESS_COUNT && lastWinAki) {
      const guesses = lastWinAki.guesses.slice(0, 5)

      const finalGuessResponse = await replyFinalGuessQuestion(guesses)

      // Final guess handling
      try {
        const finalGuessConfirmation = await finalGuessResponse.awaitMessageComponent(awaitMessageComponentOption)

        let content = ''
        const embeds = []

        if (finalGuessConfirmation.customId === 'yes') {
          content = 'Jika begitu, tokoh yang anda maksud adalah salah satu dari mereka. Senang bermain dengan anda 😉'
          embeds.push(createFinalGuessEmbed(guesses))
        }

        if (finalGuessConfirmation.customId === 'no') {
          content = 'Baiklah, saya menyerah 🏳️🏳️🏳️. Saya tidak tahu lagi apa yang sedang kamu pikirkan.'
        }

        await finalGuessConfirmation.update({ content, embeds, components: [] })

        break
      } catch (e) {
        await replyInactiveFallback()
        console.error(e)
      }
    }
  }
}

export default { data, execute }
