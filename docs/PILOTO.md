# Ativação de um piloto real

## Situação atual

A aplicação funciona como demonstração local, sem conta ou serviço externo. Os controles de perfil no React e no reducer organizam o fluxo da demo; não são uma fronteira de segurança. Não use dados reais de clientes neste modo.

O projeto Supabase ainda não foi criado e não há integração de backend implementada. Criar uma conta, adicionar variáveis ou executar um schema isoladamente não ativa autenticação nesta aplicação.

## Implementação necessária

1. Criar o projeto Supabase do escritório e configurar URLs de acesso e recuperação de conta.
2. Implementar login, logout e recuperação de senha com sessão verificada no servidor. Associar cada usuário a um escritório e, para clientes, a uma empresa. O usuário não deve escolher ou alterar seu próprio papel.
3. Migrar os dados para tabelas de escritórios, empresas, vínculos de usuários, competências, solicitações, arquivos e eventos. Usar identificadores únicos e relacionamentos obrigatórios. A competência deve integrar a unicidade das solicitações; a chave fiscal deve integrar a unicidade das notas.
4. Habilitar RLS em todas as tabelas: escritório acessa somente suas empresas; cliente acessa somente a empresa vinculada. Revisões são exclusivas do escritório. Testar também acesso com identificadores de outro escritório e de outro cliente.
5. Criar bucket privado com políticas equivalentes às tabelas. Armazenar o caminho do objeto e metadados no banco; gerar URLs temporárias para download após verificar a sessão. Nunca expor credenciais administrativas no navegador.
6. Substituir as ações locais por operações autenticadas, com validação no servidor e transações para revisões. Revalidar tamanho, conteúdo, CNPJ, competência, duplicidade e valores; as verificações atuais no navegador são apenas feedback da demo.
7. Registrar autor, horário, transição e motivo em uma trilha persistente. Tratar falhas parciais de upload e remoção e limpar objetos sem referência.
8. Validar a agenda de obrigações com o escritório e definir os layouts fiscais aceitos. A conferência de CNPJ e emissão não comprova autenticidade do XML.

## Critérios para liberar

- Escritório e cliente em navegadores diferentes compartilham somente os dados autorizados.
- Um cliente não consegue ler, baixar, alterar ou revisar documentos de outra empresa, mesmo chamando a API diretamente.
- Upload, download, substituição, duplicidade, aprovação e ajuste funcionam após nova sessão.
- A troca de competência preserva histórico e auditoria.
- Falhas de rede e de armazenamento não criam um envio aparentemente concluído.
- Backup, recuperação, retenção e exclusão são definidos com o escritório.

O `lib/store.tsx` concentra as ações atuais; `lib/upload-validation.ts` concentra as verificações de vínculo fiscal. `lib/file-storage.ts` é exclusivamente local e deverá ser substituído pelo armazenamento privado do backend.
