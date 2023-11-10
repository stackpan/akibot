import { SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('akinator')
        .setDescription('Memulai akinator'),
    async execute(interaction) {
        await interaction.reply('Akinator');
    },
};
