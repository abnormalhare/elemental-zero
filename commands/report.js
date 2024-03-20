const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription("Report a bug you saw or suggest a feature you'd like to see added.")
    .addStringOption(option =>
      option.setName('title')
        .setDescription("A couple words about the bug or suggestion")
        .setRequired(true))

    .addStringOption(option =>
      option.setName('description')
        .setDescription("A description about the bug or suggestion")
        .setRequired(true)),
  
  async execute() { return "report" },
};