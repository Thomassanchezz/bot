// bot.js - Bot de Discord para análisis de acciones

require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { analyzeStock, getTopOpportunities } = require('./analysis');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Token del bot desde .env
const TOKEN = process.env.DISCORD_TOKEN;

client.once('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  registerCommands();
});

// Registrar comandos slash
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('analizar')
      .setDescription('Analiza una acción y da una recomendación')
      .addStringOption(option =>
        option.setName('simbolo')
          .setDescription('Símbolo de la acción (ej: GGAL, AAPL)')
          .setRequired(true)
      )
      .addBooleanOption(option =>
        option.setName('local')
          .setDescription('¿Es una acción argentina?')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('mejores')
      .setDescription('Muestra las mejores oportunidades de compra'),

    new SlashCommandBuilder()
      .setName('lista')
      .setDescription('Muestra la lista de acciones disponibles para analizar'),

    new SlashCommandBuilder()
      .setName('oportunidades')
      .setDescription('Muestra las mejores oportunidades de compra'),

    new SlashCommandBuilder()
      .setName('precio')
      .setDescription('Obtiene el precio actual de una acción')
      .addStringOption(option =>
        option.setName('simbolo')
          .setDescription('Símbolo de la acción')
          .setRequired(true)
      )
  ];

  await client.application.commands.set(commands);
}

// Manejar interacciones
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() && !interaction.isButton()) return;

  const { commandName } = interaction;

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === 'local') {
      const stocks = ['GGAL', 'YPFD', 'PAMP', 'BBAR', 'TXAR', 'ALUA'];
      const embed = new EmbedBuilder()
        .setTitle('🇦🇷 Acciones Argentinas')
        .setDescription(`Usá \`/analizar [simbolo]\` para analizar:\n\n${stocks.map(s => `\`${s}\``).join(', ')}`)
        .setColor('Blue');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (customId === 'cedears') {
      const cedears = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'KO', 'WMT'];
      const embed = new EmbedBuilder()
        .setTitle('🌍 CEDEARs')
        .setDescription(`Usá \`/analizar [simbolo] local:false\` para analizar:\n\n${cedears.map(s => `\`${s}\``).join(', ')}`)
        .setColor('Green');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (customId === 'oportunidades_local') {
      await interaction.deferReply();
      try {
        const symbols = ['GGAL', 'YPFD', 'PAMP', 'BBAR', 'TXAR', 'ALUA'];
        const top = await getTopOpportunities(symbols);
        const embed = new EmbedBuilder()
          .setTitle('🟢 Mejores Oportunidades - Acciones Argentinas')
          .setColor('Green')
          .setDescription(top.length > 0 ? top.map((stock, index) =>
            `${index + 1}. **${stock.symbol}** - $${stock.price.toFixed(2)} (${stock.change > 0 ? '+' : ''}${stock.change}%, Confianza ${stock.confidence})`
          ).join('\n') : 'No hay oportunidades destacadas.')
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Error al obtener oportunidades.');
      }
    } else if (customId === 'oportunidades_cedears') {
      await interaction.deferReply();
      try {
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'KO', 'WMT'];
        const top = await getTopOpportunities(symbols);
        const embed = new EmbedBuilder()
          .setTitle('🟢 Mejores Oportunidades - CEDEARs')
          .setColor('Green')
          .setDescription(top.length > 0 ? top.map((stock, index) =>
            `${index + 1}. **${stock.symbol}** - $${stock.price.toFixed(2)} (${stock.change > 0 ? '+' : ''}${stock.change}%, Confianza ${stock.confidence})`
          ).join('\n') : 'No hay oportunidades destacadas.')
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Error al obtener oportunidades.');
      }
    }
    return;
  }

  if (commandName === 'analizar') {
    const simbolo = interaction.options.getString('simbolo');
    const local = interaction.options.getBoolean('local') ?? true;

    await interaction.deferReply();

    try {
      const data = await analyzeStock(simbolo, local);
      if (!data) {
        await interaction.editReply('❌ No se pudo obtener datos para este símbolo. Verifica que sea válido.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📊 Análisis de ${data.symbol} (${data.name})`)
        .setColor(data.recommendation === 'COMPRAR' ? 'Green' : data.recommendation === 'VENDER' ? 'Red' : 'Yellow')
        .addFields(
          { name: '💰 Precio actual', value: `$${data.price.toFixed(2)} (${data.change > 0 ? '+' : ''}${data.change}%)`, inline: true },
          { name: '📈 RSI', value: `${data.rsi}`, inline: true },
          { name: '📊 Recomendación', value: `${data.recommendation} - Confianza ${data.confidence}`, inline: false },
          { name: '🎯 Precio objetivo', value: `$${data.targetPrice}`, inline: true },
          { name: '⏰ Mantener', value: `${data.holdDays} días`, inline: true },
          { name: '📝 Razones', value: data.reasons.join(', ') || 'Sin razones específicas', inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Error al analizar la acción. Intenta de nuevo.');
    }
  }

  if (commandName === 'mejores') {
    await interaction.deferReply();

    try {
      const symbols = ['GGAL', 'YPFD', 'PAMP', 'BBAR', 'TXAR', 'ALUA', 'AAPL', 'GOOGL', 'MSFT', 'TSLA'];
      const top = await getTopOpportunities(symbols);

      if (top.length === 0) {
        await interaction.editReply('No hay oportunidades destacadas en este momento.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🟢 Mejores Oportunidades de Compra')
        .setColor('Green')
        .setDescription(top.map((stock, index) =>
          `${index + 1}. **${stock.symbol}** - $${stock.price.toFixed(2)} (${stock.change > 0 ? '+' : ''}${stock.change}%, Confianza ${stock.confidence})`
        ).join('\n'))
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Error al obtener las mejores oportunidades.');
    }
  }

  if (commandName === 'precio') {
    const simbolo = interaction.options.getString('simbolo');

    await interaction.deferReply();

    try {
      const data = await analyzeStock(simbolo);
      if (!data) {
        await interaction.editReply('❌ No se pudo obtener el precio. Verifica el símbolo.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`💰 Precio de ${data.symbol}`)
        .setColor('Blue')
        .addFields(
          { name: 'Precio actual', value: `$${data.price.toFixed(2)}`, inline: true },
          { name: 'Cambio', value: `${data.change > 0 ? '+' : ''}${data.change}%`, inline: true },
          { name: 'Volumen', value: `${data.volume.toLocaleString()}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Error al obtener el precio.');
    }
  }

  if (commandName === 'lista') {
    const embed = new EmbedBuilder()
      .setTitle('📈 Acciones Disponibles')
      .setDescription('Elegí el tipo de acciones que querés ver:')
      .setColor('Green');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('local')
          .setLabel('Acciones Argentinas')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('cedears')
          .setLabel('CEDEARs')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (commandName === 'oportunidades') {
    const embed = new EmbedBuilder()
      .setTitle('🟢 Mejores Oportunidades de Compra')
      .setDescription('Elegí el tipo de acciones:')
      .setColor('Green');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('oportunidades_local')
          .setLabel('Acciones Argentinas')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('oportunidades_cedears')
          .setLabel('CEDEARs')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const prefix = '.';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'lista') {
    const embed = new EmbedBuilder()
      .setTitle('📈 Acciones Disponibles')
      .setDescription('**Acciones Argentinas:**\nGGAL, YPFD, PAMP, BBAR, TXAR, ALUA\n\n**CEDEARs:**\nAAPL, GOOGL, MSFT, TSLA, KO, WMT\n\nUsá `.analizar [simbolo]` para analizar.')
      .setColor('Green');

    await message.reply({ embeds: [embed] });
  }

  if (command === 'oportunidades') {
    const embed = new EmbedBuilder()
      .setTitle('🟢 Mejores Oportunidades de Compra')
      .setDescription('Elegí el tipo de acciones:')
      .setColor('Green');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('oportunidades_local')
          .setLabel('Acciones Argentinas')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('oportunidades_cedears')
          .setLabel('CEDEARs')
          .setStyle(ButtonStyle.Secondary)
      );

    await message.reply({ embeds: [embed], components: [row] });
  }

  if (command === 'analizar') {
    const simbolo = args[0];
    if (!simbolo) return message.reply('Especificá un símbolo, ej: `.analizar GGAL`');

    await message.channel.send('Analizando...');

    try {
      const data = await analyzeStock(simbolo, true); // Assume local for now
      if (!data) {
        return message.reply('❌ No se pudo obtener datos para este símbolo.');
      }

      const embed = new EmbedBuilder()
        .setTitle(`📊 Análisis de ${data.symbol} (${data.name})`)
        .setColor(data.recommendation === 'COMPRAR' ? 'Green' : data.recommendation === 'VENDER' ? 'Red' : 'Yellow')
        .addFields(
          { name: '💰 Precio actual', value: `$${data.price.toFixed(2)} (${data.change > 0 ? '+' : ''}${data.change}%)`, inline: true },
          { name: '📈 RSI', value: `${data.rsi}`, inline: true },
          { name: '📊 Recomendación', value: `${data.recommendation} - Confianza ${data.confidence}`, inline: false },
          { name: '🎯 Precio objetivo', value: `$${data.targetPrice}`, inline: true },
          { name: '⏰ Mantener', value: `${data.holdDays} días`, inline: true },
          { name: '📝 Razones', value: data.reasons.join(', ') || 'Sin razones específicas', inline: false }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await message.reply('❌ Error al analizar la acción.');
    }
  }

  if (command === 'mejores') {
    await message.channel.send('Buscando mejores oportunidades...');

    try {
      const symbols = ['GGAL', 'YPFD', 'PAMP', 'BBAR', 'TXAR', 'ALUA', 'AAPL', 'GOOGL', 'MSFT', 'TSLA'];
      const top = await getTopOpportunities(symbols);

      if (top.length === 0) {
        return message.reply('No hay oportunidades destacadas en este momento.');
      }

      const embed = new EmbedBuilder()
        .setTitle('🟢 Mejores Oportunidades de Compra')
        .setColor('Green')
        .setDescription(top.map((stock, index) =>
          `${index + 1}. **${stock.symbol}** - $${stock.price.toFixed(2)} (${stock.change > 0 ? '+' : ''}${stock.change}%, Confianza ${stock.confidence})`
        ).join('\n'))
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await message.reply('❌ Error al obtener las mejores oportunidades.');
    }
  }

  if (command === 'precio') {
    const simbolo = args[0];
    if (!simbolo) return message.reply('Especificá un símbolo, ej: `.precio AAPL`');

    await message.channel.send('Obteniendo precio...');

    try {
      const data = await analyzeStock(simbolo);
      if (!data) {
        return message.reply('❌ No se pudo obtener el precio.');
      }

      const embed = new EmbedBuilder()
        .setTitle(`💰 Precio de ${data.symbol}`)
        .setColor('Blue')
        .addFields(
          { name: 'Precio actual', value: `$${data.price.toFixed(2)}`, inline: true },
          { name: 'Cambio', value: `${data.change > 0 ? '+' : ''}${data.change}%`, inline: true },
          { name: 'Volumen', value: `${data.volume.toLocaleString()}`, inline: true }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await message.reply('❌ Error al obtener el precio.');
    }
  }
});

client.login(TOKEN);