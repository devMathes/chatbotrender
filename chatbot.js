const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const {
  carregarUsuarios,
  salvarUsuarios,
  liberarUsuario,
  consultarIA
} = require('./banco');

const client = new Client({
  authStrategy: new LocalAuth()
});

const usuarios = carregarUsuarios();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ NutriIA está online!');
});

client.on('message', async (message) => {
  const numero = message.from;
  const texto = message.body.trim().toLowerCase();

  // Gatilho manual para iniciar avaliação a qualquer momento
  if (texto.includes('quero começar minha avaliação gratuita')) {
    usuarios[numero] = {
      etapa: 'peso',
      liberado: false
    };
    salvarUsuarios(usuarios);
    client.sendMessage(numero,
      `👋 Olá! Vamos iniciar sua avaliação gratuita.\n\n` +
      `📌 Por favor, informe seu *peso atual em kg* (Ex: 70)`
    );
    return;
  }

  // Início automático para novos usuários
  if (!usuarios[numero]) {
    usuarios[numero] = {
      etapa: 'peso',
      liberado: false
    };
    salvarUsuarios(usuarios);
    client.sendMessage(numero,
      `👋 Olá! Eu sou a NutriIA, sua assistente de emagrecimento.\n\n` +
      `Vamos começar com uma avaliação gratuita.\n\n` +
      `📌 Por favor, informe seu *peso atual em kg* (Ex: 70)`
    );
    return;
  }

  const user = usuarios[numero];

  // ✅ Gatilho de compra deve vir ANTES do fluxo de avaliação
  if (texto === 'quero assinar') {
    const linkPagamento = 'https://go.perfectpay.com.br/PPU38CPP36A';
    client.sendMessage(numero,
      `🚀 Perfeito! Para ativar o Plano Essencial e começar o atendimento personalizado com a NutriIA, clique abaixo:\n\n` +
      `💳 ${linkPagamento}\n\n` +
      `Assim que o pagamento for confirmado, seu acesso será liberado automaticamente.`
    );
    return;
  }

  // Fluxo de avaliação gratuita
  if (!user.liberado) {
    switch (user.etapa) {
      case 'peso':
        user.peso = texto;
        user.etapa = 'altura';
        client.sendMessage(numero, `📏 Agora informe sua *altura em centímetros* (Ex: 1,70)`);
        break;

      case 'altura':
        user.altura = texto;
        user.etapa = 'idade';
        client.sendMessage(numero, `🎂 Qual a sua *idade*? (Ex: 25)`);
        break;

      case 'idade':
        user.idade = texto;
        user.etapa = 'preferencias';
        client.sendMessage(numero,
          `🍽️ Quais são suas *preferências alimentares*?\n` +
          `Ex: vegetariano, frutas, carne, frango, salada, nada específico`
        );
        break;

      case 'preferencias':
        user.preferencias = texto;
        user.etapa = 'restricao';
        client.sendMessage(numero,
          `⚠️ Você possui alguma *restrição alimentar*?\n` +
          `Ex: lactose, glúten, alergias, nenhuma`
        );
        break;

      case 'restricao':
        user.restricao = texto;
        user.etapa = 'saude';
        client.sendMessage(numero,
          `❤️ Tem algum *problema de saúde* relevante?\n` +
          `Ex: diabetes, hipertensão, nenhum`
        );
        break;

      case 'saude':
        user.saude = texto;
        user.etapa = 'objetivo';
        client.sendMessage(numero,
          `🎯 Qual o seu *objetivo principal*?\n` +
          `Ex: perder 5kg em 14 dias, ganhar massa, melhorar energia, etc.`
        );
        break;

      case 'objetivo':
        
        user.objetivo = texto;
        user.etapa = 'final';
        salvarUsuarios(usuarios);

        const resumo =
          `📋 *Resumo da sua avaliação:*\n\n` +
          `⚖️ Peso: *${user.peso}kg*\n` +
          `📏 Altura: *${user.altura}cm*\n` +
          `🎂 Idade: *${user.idade} anos*\n` +
          `🍽️ Preferências: *${user.preferencias}*\n` +
          `⚠️ Restrições: *${user.restricao}*\n` +
          `❤️ Saúde: *${user.saude}*\n` +
          `🎯 Objetivo: *${user.objetivo}*\n\n` +
          `✅ Avaliação concluída! agora basta você assinar e seguir com consistencia o seu caminho que você terá um resultado explendido em até 14 dias\n\n` +
          `🎁 Quer liberar o Plano Essencial com cardápio, exercícios e atendimento personalizado por IA?\n` +
          `Digite *quero assinar* para liberar seu acesso.`;

        client.sendMessage(numero, resumo);
        break;
    }

    salvarUsuarios(usuarios);
    return;
  }

  // Atendimento com IA (após liberação)
  if (user.liberado) {
    const resposta = await consultarIA(numero, message.body);
    client.sendMessage(numero, resposta);
  } else {
    client.sendMessage(numero, '⚠️ Você ainda não tem acesso ao Plano Essencial. Digite *quero assinar* para liberar o atendimento completo.');
  }
});

client.initialize();
