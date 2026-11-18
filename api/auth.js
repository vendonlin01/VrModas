// api/auth.js - Autenticação Segura (PBKDF2 + JWT Assinado)
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

function gerarHashSenha(senha, salt = null) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(senha, salt, 10000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

function verificarSenha(senhaDigitada, saltSalvo, hashSalvo) {
    if (!saltSalvo || !hashSalvo) return false;
    const { hash } = gerarHashSenha(senhaDigitada, saltSalvo);
    const bufA = Buffer.from(hash, 'hex');
    const bufB = Buffer.from(hashSalvo, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

function gerarToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('Variável de ambiente JWT_SECRET não configurada no servidor.');
    }
    const agora = Math.floor(Date.now() / 1000);
    const dadosToken = { ...payload, iat: agora, exp: agora + (12 * 60 * 60) };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const corpo = Buffer.from(JSON.stringify(dadosToken)).toString('base64url');
    const assinatura = crypto.createHmac('sha256', secret).update(`${header}.${corpo}`).digest('base64url');
    return `${header}.${corpo}.${assinatura}`;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
        return res.status(500).json({ erro: 'Configuração de segurança incompleta no servidor.' });
    }

    const sql = neon(process.env.DATABASE_URL);
    const { acao, email, senha, nome, telefone, cpf, endereco, dataNascimento } = req.body || {};

    try {
        if (acao === 'cadastro') {
            if (!email || !senha || !nome) {
                return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
            }
            if (String(senha).length < 6) {
                return res.status(400).json({ erro: 'A senha deve ter no mínimo 6 caracteres.' });
            }

            const emailNorm = String(email).toLowerCase().trim();
            const existentes = await sql`SELECT id FROM usuarios WHERE LOWER(email) = ${emailNorm};`;
            if (existentes.length > 0) {
                return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
            }

            const { salt, hash } = gerarHashSenha(String(senha));
            const [novoUsuario] = await sql`
                INSERT INTO usuarios (nome, email, senha_hash, senha_salt, telefone, cpf, endereco, data_nascimento, role)
                VALUES (
                    ${String(nome).trim()},
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

        if (acao === 'login') {
            if (!email || !senha) {
                return res.status(400).json({ erro: 'Informe e-mail e senha.' });
            }

            const emailNorm = String(email).toLowerCase().trim();
            const usuarios = await sql`
                SELECT * FROM usuarios WHERE LOWER(email) = ${emailNorm} LIMIT 1;
            `;

            if (usuarios.length === 0) {
                return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
            }

            const u = usuarios[0];
            const credencialValida = verificarSenha(String(senha), u.senha_salt, u.senha_hash);

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
                    role: roleFinal,
                    permissoes: u.permissoes || {}
                }
            });
        }

        return res.status(400).json({ erro: 'Ação inválida.' });
    } catch (erro) {
        console.error('Erro na autenticação:', erro);
        return res.status(500).json({ erro: 'Erro interno ao processar autenticação.' });
    }
}