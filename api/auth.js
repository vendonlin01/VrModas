import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Encriptação PBKDF2
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

function gerarToken(payload) {
    const secret = process.env.JWT_SECRET || 'chave_secreta_padrao_vrmodas_2026';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const corpo = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const assinatura = crypto.createHmac('sha256', secret).update(`${header}.${corpo}`).digest('base64url');
    return `${header}.${corpo}.${assinatura}`;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    const sql = neon(process.env.DATABASE_URL);
    const { acao, email, senha, nome, telefone, cpf, endereco, dataNascimento } = req.body;

    try {
        // Assegura estrutura de colunas atualizada
        await sql`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                telefone VARCHAR(50),
                cpf VARCHAR(20),
                endereco JSONB,
                data_nascimento VARCHAR(20),
                role VARCHAR(50) DEFAULT 'cliente',
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash TEXT;`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_salt TEXT;`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'cliente';`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);`;
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS data_nascimento VARCHAR(20);`;

        // ==========================================
        // 1. CADASTRO
        // ==========================================
        if (acao === 'cadastro') {
            if (!email || !senha || !nome) {
                return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
            }

            const emailNorm = email.toLowerCase().trim();
            const existentes = await sql`SELECT id FROM usuarios WHERE LOWER(email) = ${emailNorm};`;
            if (existentes.length > 0) {
                return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
            }

            const { salt, hash } = gerarHashSenha(senha);
            const [novoUsuario] = await sql`
                INSERT INTO usuarios (nome, email, senha_hash, senha_salt, telefone, cpf, endereco, data_nascimento, role)
                VALUES (
                    ${nome.trim()},
                    ${emailNorm},
                    ${hash},
                    ${salt},
                    ${telefone || null},
                    ${cpf || null},
                    ${JSON.stringify(endereco || {})}::jsonb,
                    ${dataNascimento || null},
                    'cliente'
                )
                RETURNING id, nome, email, telefone, role;
            `;

            const token = gerarToken({ id: novoUsuario.id, email: novoUsuario.email, role: novoUsuario.role });
            return res.status(201).json({ sucesso: true, token, usuario: novoUsuario });
        }

        // ==========================================
        // 2. LOGIN
        // ==========================================
        if (acao === 'login') {
            if (!email || !senha) {
                return res.status(400).json({ erro: 'Informe e-mail e senha.' });
            }

            const emailNorm = email.toLowerCase().trim();

            // ACESSO MESTRE DE EMERGÊNCIA
            if (emailNorm === 'admin@vrmodas.com' && senha === 'admin123') {
                const tokenAdmin = gerarToken({ id: 0, email: 'admin@vrmodas.com', role: 'admin' });
                return res.status(200).json({
                    sucesso: true,
                    token: tokenAdmin,
                    usuario: { id: 0, nome: 'Administrador VR Modas', email: 'admin@vrmodas.com', role: 'admin' }
                });
            }

            // Procura o utilizador no Neon
            const usuarios = await sql`
                SELECT * FROM usuarios WHERE LOWER(email) = ${emailNorm} LIMIT 1;
            `;

            if (usuarios.length === 0) {
                return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
            }

            const u = usuarios[0];
            let credencialValida = false;

            // 1. Verificação normal por PBKDF2
            if (u.senha_hash && u.senha_salt) {
                credencialValida = verificarSenha(senha, u.senha_salt, u.senha_hash);
            }

            // 2. Compatibilidade com contas antigas criadas sem hash
            if (!credencialValida) {
                if (u.senha && u.senha === senha) {
                    credencialValida = true;
                } else if (u.senha_hash && u.senha_hash === senha) {
                    credencialValida = true;
                } else if (!u.senha_hash && !u.senha_salt) {
                    // Se as colunas de senha estavam nulas na base de dados, aceita e define a nova senha fornecida
                    credencialValida = true;
                }

                // Se autenticou por método antigo/nulo, atualiza imediatamente para hash seguro no Neon
                if (credencialValida) {
                    const { salt, hash } = gerarHashSenha(senha);
                    await sql`
                        UPDATE usuarios 
                        SET senha_hash = ${hash}, senha_salt = ${salt}
                        WHERE id = ${u.id};
                    `;
                }
            }

            if (!credencialValida) {
                return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
            }

            const roleFinal = (u.role || 'cliente').toString().trim().toLowerCase();
            const token = gerarToken({ id: u.id, email: u.email, role: roleFinal });

            return res.status(200).json({
                sucesso: true,
                token,
                usuario: {
                    id: u.id,
                    nome: u.nome,
                    email: u.email,
                    telefone: u.telefone,
                    cpf: u.cpf,
                    endereco: u.endereco,
                    role: roleFinal
                }
            });
        }

        return res.status(400).json({ erro: 'Ação inválida.' });

    } catch (erro) {
        console.error('Erro na autenticação:', erro);
        return res.status(500).json({ erro: 'Erro no servidor: ' + erro.message });
    }
}