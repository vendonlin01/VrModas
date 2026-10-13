import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. LISTAR MEMBROS COM SUAS PERMISSÕES
    if (req.method === 'GET') {
      const equipe = await sql`
        SELECT id, nome, email, role, permissoes 
        FROM usuarios 
        WHERE role IN ('admin', 'owner')
        ORDER BY role DESC, id ASC;
      `;
      return res.status(200).json(equipe);
    }

    // 2. CADASTRAR / PROMOVER COM PERMISSÕES ESPECÍFICAS
    if (req.method === 'POST') {
      const { email, permissoes } = req.body;

      if (!email) return res.status(400).json({ erro: 'Informe o e-mail.' });

      const [usuarioExistente] = await sql`SELECT id, role FROM usuarios WHERE email = ${email};`;
      if (!usuarioExistente) {
        return res.status(404).json({ erro: 'Usuário não encontrado. Peça para ele criar uma conta na loja primeiro.' });
      }

      if (usuarioExistente.role === 'owner') {
        return res.status(400).json({ erro: 'Não é possível alterar o proprietário.' });
      }

      const permissoesObj = permissoes || {
        dashboard: false, produtos: true, pedidos: false, banners: false, configuracoes: false
      };

      await sql`
        UPDATE usuarios 
        SET role = 'admin', permissoes = ${JSON.stringify(permissoesObj)}::jsonb
        WHERE email = ${email};
      `;

      return res.status(200).json({ sucesso: true, mensagem: 'Membro configurado com sucesso!' });
    }

    // 3. ATUALIZAR PERMISSÕES DE UM ADMIN EXISTENTE
    if (req.method === 'PUT') {
      const { id, permissoes } = req.body;
      if (!id || !permissoes) return res.status(400).json({ erro: 'Dados incompletos.' });

      await sql`
        UPDATE usuarios 
        SET permissoes = ${JSON.stringify(permissoes)}::jsonb
        WHERE id = ${id} AND role != 'owner';
      `;

      return res.status(200).json({ sucesso: true, mensagem: 'Permissões atualizadas!' });
    }

    // 4. REVOGAR ACESSO
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await sql`UPDATE usuarios SET role = 'cliente', permissoes = '{}'::jsonb WHERE id = ${id} AND role != 'owner';`;
      return res.status(200).json({ sucesso: true, mensagem: 'Acesso revogado.' });
    }

    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (err) {
    console.error('Erro na API de equipe:', err);
    return res.status(500).json({ erro: 'Erro no banco: ' + err.message });
  }
}