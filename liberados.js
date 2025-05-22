const fs = require('fs');
const axios = require('axios');
const path = require('path');
require('dotenv').config(); // Carrega variáveis de ambiente

const CAMINHO = path.join(__dirname, 'usuarios.json');
const CHAVE_GROQ = process.env.GROQ_API_KEY;

// ✅ Formata o número para o padrão do WhatsApp
function formatarNumero(numero) {
  return `${numero.replace(/\D/g, '')}@c.us`;
}

// 🔗 Carrega os dados salvos dos usuários
function carregarUsuarios() {
  if (!fs.existsSync(CAMINHO)) {
    fs.writeFileSync(CAMINHO, JSON.stringify({}, null, 2));
  }
  try {
    const data = fs.readFileSync(CAMINHO, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ Erro ao carregar usuários:', err);
    return {};
  }
}

// 💾 Salva os dados no arquivo JSON
function salvarUsuarios(usuarios) {
  fs.writeFileSync(CAMINHO, JSON.stringify(usuarios, null, 2));
}

// ✅ Libera o acesso de um número ao plano
function liberarUsuario(numero) {
  const usuarios = carregarUsuarios();
  const numFormatado = formatarNumero(numero);
  if (!usuarios[numFormatado]) usuarios[numFormatado] = {};
  usuarios[numFormatado].liberado = true;
  usuarios[numFormatado].etapa = 'final';
  salvarUsuarios(usuarios);
  console.log(`✅ Usuário ${numFormatado} liberado para o Plano Essencial`);
}

// 🔥 Consulta a IA da Groq com os dados do usuário e a pergunta feita
async function consultarIA(numero, pergunta) {
  const usuarios = carregarUsuarios();
  const numFormatado = formatarNumero(numero);
  const user = usuarios[numFormatado];

  if (!user) {
    return '⚠️ Você ainda não fez a avaliação. Por favor, envie "oi" para começar.';
  }

  if (!user.liberado) {
    return '🚫 Seu acesso não está liberado. Complete o pagamento para ter acesso ao plano.';
  }

  const promptBase = `
Você é uma nutricionista virtual chamada NutriIA.
Responda com empatia, clareza e linguagem informal, sempre focando em emagrecimento saudável.

Dados do usuário:
- Peso: ${user.peso || 'não informado'}
- Altura: ${user.altura || 'não informado'}
- Idade: ${user.idade || 'não informado'}
- Preferências: ${user.preferencias || 'nenhuma'}
- Restrições: ${user.restricao || 'nenhuma'}
- Saúde: ${user.saude || 'nenhuma'}
- Objetivo: ${user.objetivo || 'emagrecer'}

Mensagem do usuário: ${pergunta}

Responda com recomendações personalizadas de alimentação, treino e motivação. Seja leve, direta e prática.
`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: 'Você é uma nutricionista especializada em emagrecimento.' },
          { role: 'user', content: promptBase }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${CHAVE_GROQ}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const respostaIA = response.data.choices[0].message.content;
    return respostaIA.trim();

  } catch (err) {
    console.error('🚨 Erro na consulta à Groq:', err.response?.data || err.message);
    return '❌ Desculpe, ocorreu um erro ao consultar a nutricionista. Tente novamente em instantes.';
  }
}

// 🚀 Exporta funções para uso no chatbot
module.exports = {
  carregarUsuarios,
  salvarUsuarios,
  liberarUsuario,
  consultarIA,
  formatarNumero
};
