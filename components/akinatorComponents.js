import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'

function createQuestionEmbed (akiQuestion, akiProgress, akiCurrentStep) {
  const embed = new EmbedBuilder()
  embed.setTitle(akiQuestion)
    .setFooter({ text: `Progress: ${akiProgress}%, Pertanyaan: ${akiCurrentStep + 1}` })

  return embed
}

function createGuessEmbed (name, description, picturePath, probability) {
  const embed = new EmbedBuilder()
  embed.setTitle(name)
    .setDescription(description)
    .setImage(picturePath)
    .setFooter({
      text: `Saya yakin ${Math.round((probability * 100) * 100) / 100}% adalah dia`
    })

  return embed
}

function createFinalGuessEmbed (guesses) {
  const embed = new EmbedBuilder()
  embed.setTitle('Tebakan-tebakan saya adalah:')
    .setFields(guesses.map(guess => ({
      name: `${guess.name} (${Math.round((guess.proba * 100) * 100) / 100}%)`,
      value: guess.description
    })))

  return embed
}

function createQuestionAnswerRow (akiAnswers) {
  const answerButtons = akiAnswers.map((answer, index) => {
    const button = new ButtonBuilder()
    button.setCustomId(index.toString())
      .setLabel(answer)
      .setStyle(ButtonStyle.Primary)

    return button
  })

  const answerRow = new ActionRowBuilder()
  answerRow.addComponents(...answerButtons)

  return answerRow
}

function createQuestionActionRow (akiCurrentStep) {
  const backButton = new ButtonBuilder()
  backButton.setCustomId('back')
    .setLabel('Kembali')
    .setStyle(ButtonStyle.Secondary)

  const stopButton = new ButtonBuilder()
  stopButton.setCustomId('stop')
    .setLabel('Berhenti')
    .setStyle(ButtonStyle.Danger)

  const actionRow = new ActionRowBuilder()
  if (akiCurrentStep !== 0) {
    actionRow.addComponents(backButton)
  }

  actionRow.addComponents(stopButton)

  return actionRow
}

function createConfirmationActionRow () {
  const yesButton = new ButtonBuilder()
  yesButton.setCustomId('yes')
    .setLabel('Iya')
    .setStyle(ButtonStyle.Primary)

  const noButton = new ButtonBuilder()
  noButton.setCustomId('no')
    .setLabel('Tidak')
    .setStyle(ButtonStyle.Secondary)

  const actionRow = new ActionRowBuilder()
  actionRow.addComponents(yesButton, noButton)

  return actionRow
}

export {
  createQuestionEmbed,
  createGuessEmbed,
  createFinalGuessEmbed,
  createQuestionAnswerRow,
  createQuestionActionRow,
  createConfirmationActionRow
}
