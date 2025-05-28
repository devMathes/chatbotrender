const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
require('dotenv').config();
const { liberarUsuario } = require('./liberados');

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;

// ▶️ Inicia o WhatsApp
const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  console.log('🔐 Escaneie o QR Code para conectar no WhatsApp:');
  console.log(qr);
});

client.on('ready', () => {
  console.log('💻 WhatsApp conectado com sucesso!');
});

client.initialize();

// 🛠️ Função para normalizar o telefone
function normalizarTelefone(ddd, numero, telefoneDireto) {
  let telefone = '';

  if (telefoneDireto) {
    telefone = telefoneDireto.replace(/\D/g, '');
    if (!telefone.startsWith('55')) {
      telefone = '55' + telefone;
    }
  } else if (ddd && numero) {
    telefone = `55${ddd}${numero}`.replace(/\D/g, '');
  }

  if (telefone.length < 11) {
    return null;
  }

  return `${telefone}@c.us`;
}

// 🚀 Webhook PerfectPay
app.post('/webhook', async (req, res) => {
  const body = req.body;
  const status = body.transaction?.status || '';
  const data = body.transaction?.customer || {};

  const ddd = data.phone_area_code || '';
  const numero = data.phone_number || '';
  const telefoneDireto = data.phone || body.transaction?.phone || '';

  const numeroFormatado = normalizarTelefone(ddd, numero, telefoneDireto);

  if (!numeroFormatado) {
    console.log('❌ Número inválido.');
    return res.status(400).json({ message: 'Número inválido.' });
  }

  console.log(`📲 Webhook recebido. Número: ${numeroFormatado}, Status: ${status}`);

  if (status === 'approved') {
    const numeroLiberado = liberarUsuario(numeroFormatado);

    // ✅ Envia mensagem automática no WhatsApp
    const mensagem = `✅ Olá! Seu pagamento foi efetuado com sucesso. 🎉 Seja bem-vindo(a) ao Plano Essencial da NutriIA! 

Me diga por onde você quer começar: 
🍎 Alimentação
🏋️ Treino
💡 Dúvidas

Responda com uma dessas opções! 💚`;

    client.sendMessage(numeroLiberado, mensagem);
    console.log(`💌 Mensagem enviada para ${numeroLiberado}`);

    return res.status(200).json({ message: '✅ Usuário liberado e mensagem enviada!' });
  }

  console.log(`ℹ️ Status ${status} não é aprovado. Ignorando.`);
  return res.status(200).json({ message: `Status ${status} recebido e ignorado.` });
});

// 🌎 Rota teste
app.get('/', (req, res) => {
  res.send('🚀 API da NutriIA está online e WhatsApp conectado!');
});

// ▶️ Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
