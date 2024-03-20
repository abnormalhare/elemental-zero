const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Suggest an element or operator.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('element')
        .setDescription('Suggest an element.')
        .addStringOption(option =>
          option.setName('element')
            .setDescription("The element to suggest.")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('machine')
        .setDescription('Suggest a machine.')
        .addStringOption(option =>
          option.setName('machine')
            .setDescription("The machine to suggest.")
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('reqlength')
            .setDescription("The required amount of elements needed to function.")
            .setRequired(true))),
        
  async execute() { return "suggest" },
};