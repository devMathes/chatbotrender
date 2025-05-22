const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const DB_PATH = './usuarios.json';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());

// Função para carregar os usuários
function carregarUsuarios() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }
  const conteudo = fs.readFileSync(DB_PATH, 'utf8').trim();
  return conteudo ? JSON.parse(conteudo) : {};
}

// Função para salvar os usuários
function salvarUsuarios(usuarios) {
  fs.writeFileSync(DB_PATH, JSON.stringify(usuarios, null, 2));
}

// Rota de teste
app.get('/', (req, res) => {
  res.send('🚀 Servidor webhook NutriIA rodando!');
});

// Webhook PerfectPay
app.post('/webhook', (req, res) => {
  console.log('✅ Webhook recebido:\n', JSON.stringify(req.body, null, 2));

  try {
    const data = req.body;

    const status = (data.status || '').toLowerCase();
    const telefone = data.customer?.phone || data.phone;

    if (!telefone) {
      console.log('❌ Telefone não encontrado no payload!');
      return res.status(400).json({ message: 'Telefone não encontrado no payload.' });
    }

    const numeroFormatado = `${telefone.replace(/\D/g, '')}@c.us`;
    const usuarios = carregarUsuarios();

    if (status === 'aprovado' || status === 'approved') {
      if (usuarios[numeroFormatado]) {
        usuarios[numeroFormatado].liberado = true;
        salvarUsuarios(usuarios);
        console.log(`✅ Usuário ${numeroFormatado} liberado com sucesso!`);
        return res.status(200).json({ message: 'Usuário liberado com sucesso!' });
      } else {
        console.log(`❌ Usuário ${numeroFormatado} não encontrado no banco.`);
        return res.status(404).json({ message: 'Usuário não encontrado no banco de dados.' });
      }
    } else {
      console.log(`ℹ️ Status ${status} recebido. Ignorando.`);
      return res.status(200).json({ message: `Status ${status} recebido. Ignorado.` });
    }
  } catch (error) {
    console.error('🚨 Erro no processamento do webhook:', error);
    return res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Webhook rodando na porta ${PORT}`);
});
