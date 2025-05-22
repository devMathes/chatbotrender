const fs = require('fs');
const axios = require('axios');

// Caminho do banco de dados JSON
const DB_PATH = './usuarios.json';

// Sua chave da API Groq
const CHAVE_GROQ = 'SUA_CHAVE_GROQ_AQUI'; // 🔥 Substitua pela sua chave

// Função para carregar os dados dos usuários
function carregarUsuarios() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }

  try {
    const conteudo = fs.readFileSync(DB_PATH, 'utf8').trim();
    return conteudo ? JSON.parse(conteudo) : {};
  } catch (error) {
    console.error('❌ Erro ao carregar usuários:', error);
    return {};
  }
}

// Função para salvar os dados dos usuários
function salvarUsuarios(usuarios) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(usuarios, null, 2));
  } catch (error) {
    console.error('❌ Erro ao salvar usuários:', error);
  }
}

// Função para liberar o usuário após pagamento
function liberarUsuario(numero) {
  const usuarios = carregarUsuarios();

  if (!usuarios[numero]) {
    usuarios[numero] = {}; // Cria o usuário caso não exista
  }

  usuarios[numero].liberado = true;
  usuarios[numero].etapa = 'final';

  salvarUsuarios(usuarios);
  console.log(`✅ Usuário ${numero} liberado com sucesso!`);
}

// Função para consultar a IA da Groq
async function consultarIA(numero, pergunta) {
  const usuarios = carregarUsuarios();
  const user = usuarios[numero];

  if (!user) {
    return '⚠️ Você ainda não fez a avaliação. Envie "oi" para começar.';
  }

  const prompt = `Você é uma nutricionista virtual especialista em emagrecimento saudável.
Dados do cliente:
- Peso: ${user.peso}
- Altura: ${user.altura}
- Idade: ${user.idade}
- Preferências: ${user.preferencias}
- Restrições: ${user.restricao}
- Condições de saúde: ${user.saude}
- Objetivo: ${user.objetivo}

Pergunta do cliente: ${pergunta}

Responda de forma clara, simpática e profissional.`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: 'Você é uma nutricionista experiente.' },
          { role: 'user', content: prompt }
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

    const resposta = response.data.choices[0].message.content.trim();
    return resposta;
  } catch (error) {
    console.error('❌ Erro na IA:', error.message);
    return '❌ Erro ao consultar a IA. Tente novamente mais tarde.';
  }
}

module.exports = {
  carregarUsuarios,
  salvarUsuarios,
  liberarUsuario,
  consultarIA
};
