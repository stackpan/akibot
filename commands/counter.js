import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('counter')
        .setDescription('Menghitung'),
    async execute(interaction) {
        let counter = 0;

        await interaction.deferReply();

        const incrementButton = new ButtonBuilder();
        incrementButton.setCustomId('add').setLabel('+').setStyle(ButtonStyle.Primary);
        
        const decrementButton = new ButtonBuilder();
        decrementButton.setCustomId('sub').setLabel('-').setStyle(ButtonStyle.Secondary);

        const stopButton = new ButtonBuilder();
        stopButton.setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder();
        actionRow.addComponents(incrementButton, decrementButton, stopButton);

        let tempResponse = await interaction.editReply({ content: `${counter}`, components: [actionRow]});

        while (true) {
            try {
                const confirmation = await tempResponse.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 60_000 });

                if (confirmation.customId === 'add') counter++;
                else if (confirmation.customId === 'sub') counter--;
                else if (confirmation.customId === 'stop') {
                    await confirmation.update({ content: `Hasil akhir: ${counter}`, components: []});
                    break;
                }

                if (counter === 5 || counter === -5) {
                    confirmation.update({ content: `Mencapai batas maksimal. Hasil akhir: ${counter}`, components: [] });
                    break;
                } else {
                    tempResponse = await confirmation.update({ content: `${counter}`, components: [actionRow]});
                }
            } catch (e) {
                await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
            }
        }
    },
}