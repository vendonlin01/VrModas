res.json({
  sucesso: true,
  usuario: {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    permissoes: user.permissoes || {}
  }
});