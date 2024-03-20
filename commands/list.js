const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List the current elements'),
  async execute() { return "list" },
};