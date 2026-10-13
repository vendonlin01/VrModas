import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Funções utilitárias de Criptografia e Hash Seguro (PBKDF2)
function gerarHashSenha(senha, salt = null) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(senha, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

function verificarSenha(senhaDigitada, saltSalvo, hashSalvo) {
    if (!saltSalvo || !hashSalvo) return false;
    const { hash } = gerarHashSenha(senhaDigitada, saltSalvo);
    return hash === hashSalvo;
}

// Cria um token assinado simples (HMAC)
function gerarToken(payload) {
    const secret = process.env.JWT_SECRET || 'chave_secreta_padrao_vrmodas_2026';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const corpo = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const assinatura = crypto.createHmac('sha256', secret).update(`${header}.${corpo}`).digest('base64url');
    return `${header}.${corpo}.${assinatura}`;
}

export default async function handler(req, res) {
    // Configuração de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    const sql = neon(process.env.DATABASE_URL);
    const { acao, email, senha, nome, telefone, whatsapp, cpf, endereco, dataNascimento } = req.body;

    try {
        // 1. Garante que a tabela usuarios existe
        await sql`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha_hash TEXT,
                senha_salt TEXT,
                telefone VARCHAR(50),
                whatsapp VARCHAR(50),
                cpf VARCHAR(20),
                endereco JSONB,
                data_nascimento VARCHAR(20),
                role VARCHAR(50) DEFAULT 'cliente',
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // 2. Adiciona todas as colunas que possam faltar de tabelas legadas
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash TEXT;`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_salt TEXT;`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(50);`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS endereco JSONB;`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS data_nascimento VARCHAR(20);`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'cliente';`;

        // ==========================================
        // 1. AÇÃO: CADASTRO DE CLIENTE
        // ==========================================
        if (acao === 'cadastro') {
            if (!email || !senha || !nome) {
                return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
            }

            const emailNormalizado = email.toLowerCase().trim();

            // Verifica se o e-mail já existe
            const usuariosExistentes = await sql`
                SELECT id FROM usuarios WHERE LOWER(email) = ${emailNormalizado};
            `;
            if (usuariosExistentes.length > 0) {
                return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
            }

            // Gera hash com salt
            const { salt, hash } = gerarHashSenha(senha);
            const contato = telefone || whatsapp || null;

            const [novoUsuario] = await sql`
                INSERT INTO usuarios (
                    nome, 
                    email, 
                    senha_hash, 
                    senha_salt, 
                    telefone, 
                    whatsapp, 
                    cpf, 
                    endereco, 
                    data_nascimento, 
                    role
                )
                VALUES (
                    ${nome.trim()},
                    ${emailNormalizado},
                    ${hash},
                    ${salt},
                    ${contato},
                    ${contato},
                    ${cpf || null},
                    ${JSON.stringify(endereco || {})}::jsonb,
                    ${dataNascimento || null},
                    'cliente'
                )
                RETURNING id, nome, email, telefone, role;
            `;

            const token = gerarToken({ id: novoUsuario.id, email: novoUsuario.email, role: novoUsuario.role });

            return res.status(201).json({
                sucesso: true,
                mensagem: 'Cadastro realizado com sucesso!',
                token,
                usuario: novoUsuario
            });
        }

        // ==========================================
        // 2. AÇÃO: LOGIN (CLIENTE OU ADMIN)
        // ==========================================
        if (acao === 'login') {
            if (!email || !senha) {
                return res.status(400).json({ erro: 'Informe e-mail e senha.' });
            }

            const emailNormalizado = email.toLowerCase().trim();

            // CASO ESPECIAL: Credencial master inicial do lojista
            if (emailNormalizado === 'admin@vrmodas.com' && senha === 'admin123') {
                const tokenAdmin = gerarToken({ id: 0, email: 'admin@vrmodas.com', role: 'admin' });
                return res.status(200).json({
                    sucesso: true,
                    token: tokenAdmin,
                    usuario: { id: 0, nome: 'Administrador VR Modas', email: 'admin@vrmodas.com', role: 'admin' }
                });
            }

            // Busca no banco
            const usuarios = await sql`
                SELECT id, nome, email, senha_hash, senha_salt, telefone, whatsapp, cpf, endereco, role
                FROM usuarios 
                WHERE LOWER(email) = ${emailNormalizado}
                LIMIT 1;
            `;

            if (usuarios.length === 0) {
                return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
            }

            const usuarioBanco = usuarios[0];

            // Verifica o hash da senha
            const senhaValida = verificarSenha(senha, usuarioBanco.senha_salt, usuarioBanco.senha_hash);
            if (!senhaValida) {
                return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
            }

            const token = gerarToken({ id: usuarioBanco.id, email: usuarioBanco.email, role: usuarioBanco.role });

            return res.status(200).json({
                sucesso: true,
                token,
                usuario: {
                    id: usuarioBanco.id,
                    nome: usuarioBanco.nome,
                    email: usuarioBanco.email,
                    telefone: usuarioBanco.telefone || usuarioBanco.whatsapp,
                    cpf: usuarioBanco.cpf,
                    endereco: usuarioBanco.endereco,
                    role: usuarioBanco.role
                }
            });
        }

        return res.status(400).json({ erro: 'Ação não reconhecida. Use "login" ou "cadastro".' });

    } catch (erro) {
        console.error('Erro na API de autenticação:', erro);
        return res.status(500).json({ erro: 'Erro interno ao processar autenticação.' });
    }
}