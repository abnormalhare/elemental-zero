const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('hint')
    .setDescription('Get a hint for an element, at random or of your choosing.')
    .addStringOption(option =>
      option.setName('element')
        .setDescription("The element you wish to find.")
        .setRequired(false)),
  async execute() { return "hint" },
};