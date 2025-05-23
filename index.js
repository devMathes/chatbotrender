const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const DB_PATH = './usuarios.json';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());

// 🔥 Inicializa o WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📲 Escaneie o QR Code acima para conectar no WhatsApp');
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado e pronto!');
});

client.initialize();

// 🔧 Funções de Banco
function carregarUsuarios() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
    }
    const conteudo = fs.readFileSync(DB_PATH, 'utf8').trim();
    return conteudo ? JSON.parse(conteudo) : {};
}

function salvarUsuarios(usuarios) {
    fs.writeFileSync(DB_PATH, JSON.stringify(usuarios, null, 2));
}

// 🔥 Normalizar telefone
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

// ✅ Rota de teste
app.get('/', (req, res) => {
    res.send('🚀 Servidor webhook NutriIA rodando!');
});

// 🚀 Webhook PerfectPay + WhatsApp
app.post('/webhook', async (req, res) => {
    console.log('✅ Webhook recebido:\n', JSON.stringify(req.body, null, 2));

    try {
        const data = req.body;
        const status = (data.sale_status_enum_key || '').toLowerCase();

        const ddd = data.customer?.phone_area_code || '';
        const numero = data.customer?.phone_number || '';
        const telefoneDireto = data.customer?.phone || data.phone || '';

        const numeroFormatado = normalizarTelefone(ddd, numero, telefoneDireto);

        if (!numeroFormatado) {
            console.log('❌ Telefone não encontrado ou inválido no payload!');
            return res.status(400).json({ message: 'Telefone não encontrado no payload.' });
        }

        const usuarios = carregarUsuarios();

        if (status === 'approved') {
            if (usuarios[numeroFormatado]) {
                usuarios[numeroFormatado].liberado = true;
                salvarUsuarios(usuarios);

                console.log(`✅ Usuário ${numeroFormatado} liberado com sucesso!`);

                // 🟢 Enviar mensagem automática no WhatsApp
                const mensagem = `🥳 Olá! Sua assinatura na NutriIA foi confirmada com sucesso! Seu acesso está liberado. 

Agora você tem acesso ao Plano Essencial com sua dieta, treino e acompanhamento personalizado.

Basta voltar aqui no chat e digitar *"iniciar"* para começar sua jornada! 🚀💚`;

                await client.sendMessage(numeroFormatado, mensagem);
                console.log(`📤 Mensagem enviada para ${numeroFormatado}`);

                return res.status(200).json({ message: 'Usuário liberado e mensagem enviada!' });
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

// 🚀 Inicia o servidor
app.listen(PORT, () => {
    console.log(`🚀 Webhook rodando na porta ${PORT}`);
});
