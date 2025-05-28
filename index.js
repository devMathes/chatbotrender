const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { liberarUsuario } = require('./liberados');

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;

// 🛠️ Função para normalizar o número
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
app.post('/webhook', (req, res) => {
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
    liberarUsuario(numeroFormatado);
    return res.status(200).json({ message: '✅ Usuário liberado com sucesso!' });
  }

  console.log(`ℹ️ Status ${status} não é aprovado. Ignorando.`);
  return res.status(200).json({ message: `Status ${status} recebido e ignorado.` });
});

// 🌎 Teste rápido
app.get('/', (req, res) => {
  res.send('🚀 API da NutriIA está online!');
});

// ▶️ Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
