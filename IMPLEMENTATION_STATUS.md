# Implementação - Sistema de Aprovação de Tickets e Lixeira

## ✅ CONCLUÍDO

### Backend (C#):

1. **Entidade Ticket** atualizada com novos campos:

   - `ResolutionApproved` (bool?) - Aprovação da solução
   - `ReopenedAt` (DateTime?) - Data de reabertura
   - `IsDeleted` (bool) - Soft delete
   - `DeletedAt` (DateTime?) - Data de exclusão
   - `EditedAt` (DateTime?) - Data de edição da descrição
   - `EditedBy` (Guid?) - Quem editou

2. **TicketStatus enum** - Novos status:

   - `Reopened = 4` - Reaberto após rejeição
   - `PendingApproval = 5` - Aguardando aprovação do usuário

3. **Migration criada**: `20251111000000_AddTicketApprovalAndDeletionFields.cs`

4. **TicketService** - Novos métodos:

   - `ApproveResolutionAsync()` - Aprovar solução (usuário)
   - `RejectResolutionAsync()` - Rejeitar e reabrir (usuário)
   - `SoftDeleteAsync()` - Mover para lixeira (técnico)
   - `RestoreAsync()` - Restaurar da lixeira (técnico)
   - `UpdateDescriptionAsync()` - Editar descrição (criador)
   - `GetDeletedAsync()` - Listar tickets deletados
   - `ResolveTicketAsync()` modificado para status `PendingApproval`

5. **TicketsController** - Novos endpoints:
   - `POST /tickets/{id}/approve-resolution` - Aprovar solução
   - `POST /tickets/{id}/reject-resolution` - Rejeitar solução
   - `DELETE /tickets/{id}/soft-delete` - Deletar ticket (técnico apenas)
   - `POST /tickets/{id}/restore` - Restaurar da lixeira
   - `GET /tickets/deleted` - Listar lixeira (técnico apenas)
   - `PUT /tickets/{id}/description` - Atualizar descrição

### Frontend:

1. **api.ts** - Interface `Ticket` atualizada com novos campos

2. **TicketDetail.tsx**:
   - STATUS_MAP e STATUS_COLOR incluem status 4 e 5
   - Novos estados: `isApprovingResolution`, `isRejectingResolution`, `isEditingDescription`, `editedDescription`
   - `handleApproveResolution()` - Aprovar solução
   - `handleRejectResolution()` - Rejeitar e reabrir
   - `handleUpdateDescription()` - Salvar descrição editada
   - Card visual de "Solução Proposta" (status 5, não-técnico)
   - Botões "✓ Aprovar Solução" e "✗ Rejeitar Solução"
   - Textarea desabilitado quando `status === 5` (aguardando aprovação)
   - Botão "✏️ Editar" na descrição (apenas criador)
   - Mostra "Editado por [usuário] em [data]" quando editado

## ⏳ PENDENTE

### Frontend - Home.tsx:

1. **Atualizar STATUS_MAP**:

   ```typescript
   const STATUS_MAP: Record<number, StatusKind> = {
     1: "Aberto",
     2: "Pendente",
     3: "Resolvido",
     4: "Reaberto",
     5: "Aguardando Aprovação",
   };
   ```

2. **Adicionar lixeira no menu lateral**:

   ```tsx
   <Link to="/home?trash=true" className="sidenav__submenu-item">
     Apagar️ Lixeira
   </Link>
   ```

3. **Modificar bolinha de status** para `PendingApproval` (cinza com centro branco):

   ```tsx
   {
     t.status === 5 ? (
       <div
         style={{
           width: "12px",
           height: "12px",
           borderRadius: "50%",
           background: "#dee2e6",
           border: "3px solid #7e7e7e",
         }}
       />
     ) : (
       <div
         style={{
           width: "12px",
           height: "12px",
           borderRadius: "50%",
           background: STATUS_COLOR[t._status],
         }}
       />
     );
   }
   ```

4. **Botão de deletar ticket** (técnicos):

   ```tsx
   {
     isTechnician() && (
       <button onClick={() => handleSoftDelete(ticket.id)}>Apagar️ Mover para Lixeira</button>
     );
   }
   ```

5. **Filtro de lixeira**: Adicionar parâmetro `?trash=true` na URL e filtrar tickets deletados

### Backend:

1. **Aplicar migration**:

   ```bash
   # IMPORTANTE: Parar o backend primeiro!
   cd CSharp
   dotnet ef database update
   ```

2. **Reiniciar backend**:
   ```bash
   dotnet run
   ```

## 🎯 Fluxo Completo

### Quando Técnico Resolve Ticket:

1. Técnico preenche "Mensagem de Resolução"
2. Backend muda status para `PendingApproval` (5)
3. Usuário vê card amarelo com solução e botões

### Quando Usuário Aprova:

1. Clica em "✓ Aprovar Solução"
2. Status muda para `Resolved` (3)
3. `ResolutionApproved = true`
4. Bolinha fica completamente cinza na listagem

### Quando Usuário Rejeita:

1. Clica em "✗ Rejeitar Solução"
2. Status muda para `Reopened` (4)
3. `ResolutionApproved = false`
4. Textarea é habilitado automaticamente
5. Foco vai para campo de mensagem
6. Aparece como "Reaberto" na listagem

### Quando Usuário Edita Descrição:

1. Apenas criador vê botão "✏️ Editar"
2. Clica e textarea aparece
3. Salva alterações
4. Mostra "Editado por [nome] em [data/hora]"

### Quando Técnico Deleta Ticket:

1. Ticket não é removido do banco
2. `IsDeleted = true`, `DeletedAt = now`
3. Some da listagem normal
4. Aparece apenas em "Apagar️ Lixeira"
5. Técnico pode restaurar se necessário

## 📝 Notas Importantes

- Status 5 (PendingApproval) só permite mensagens de técnicos
- Usuários comuns têm textarea desabilitado em status 5
- Botões de aprovar/rejeitar só aparecem para criador do ticket
- Edição de descrição só para criador do ticket
- Soft delete só para técnicos
- Lixeira só visível para técnicos

## 🔐 Permissões

| Ação                     | Usuário Comum | Técnico |
| ------------------------ | ------------- | ------- |
| Criar ticket             | ✅            | ✅      |
| Editar descrição         | ✅ (próprio)  | ❌      |
| Aprovar/Rejeitar solução | ✅ (próprio)  | ❌      |
| Resolver ticket          | ❌            | ✅      |
| Pausar/Retomar           | ❌            | ✅      |
| Deletar ticket           | ❌            | ✅      |
| Ver lixeira              | ❌            | ✅      |
| Restaurar da lixeira     | ❌            | ✅      |
