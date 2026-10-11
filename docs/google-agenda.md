# Google Agenda no painel

Em **Meu espaço → Agenda**, o botão **Conectar com Google** liga o painel à
sua agenda principal. Depois disso:

- o card de hoje e a prévia de amanhã mostram os compromissos ao vivo;
- a lista **Sua semana** mostra os próximos 7 (ou 14) dias e se atualiza a
  cada 5 minutos;
- **Novo compromisso** salva direto na agenda, sem abrir outra aba.

A conexão fica guardada neste navegador, num cookie cifrado que só o servidor
consegue abrir. Em outro navegador ou no celular, basta clicar em **Conectar
com Google** uma vez lá também. **Desconectar** revoga o acesso no Google.

## Configuração (uma vez só)

O Google exige que o site tenha a própria "chave" de acesso. Ela é gratuita.

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) com a sua
   conta Google e crie um projeto (por exemplo, "Painel").
2. Em **APIs e serviços → Biblioteca**, procure **Google Calendar API** e
   clique em **Ativar**.
3. Em **Google Auth Platform → Branding** (ou "Tela de consentimento OAuth"),
   clique em **Começar**: nome do app "Painel", seu e-mail de suporte,
   público **Externo** e seu e-mail de contato. Depois, ainda em Branding,
   preencha (não envie logo, que obriga a verificação do Google):
   - **Página inicial do app**: `https://pedroazara.vercel.app`;
   - **Política de Privacidade**: `https://pedroazara.vercel.app/privacidade`;
   - **Termos de Serviço**: `https://pedroazara.vercel.app/termos`;
   - **Domínios autorizados**: `pedroazara.vercel.app`.
4. Em **Google Auth Platform → Público**, clique em **Publicar app** para ele
   ficar "Em produção". Em modo de teste, o Google derruba a conexão a cada 7
   dias. Se ainda não der para publicar, adicione o seu e-mail em **Usuários
   de teste**: funciona igual, só pede **Conectar com Google** de novo a cada
   7 dias.
5. Em **Google Auth Platform → Clientes**, clique em **Criar cliente**:
   - tipo: **Aplicativo da Web**;
   - **Origens JavaScript autorizadas**: `https://pedroazara.vercel.app`;
   - **URIs de redirecionamento autorizados**:
     `https://pedroazara.vercel.app/api/google-agenda-callback`.

   Se o site tiver outro domínio, use esse domínio nos dois campos (pode
   adicionar os dois).
6. Copie o **ID do cliente** e a **Chave secreta do cliente**. Na Vercel, em
   **Settings → Environment Variables**, crie (ambiente Production):
   - `GOOGLE_CLIENT_ID` = o ID do cliente;
   - `GOOGLE_CLIENT_SECRET` = a chave secreta.

   Depois, em **Deployments**, faça **Redeploy** do último deploy para as
   variáveis valerem. A chave secreta é só sua: não a cole em chats nem no
   código.
7. Abra **Meu espaço → Agenda** e clique em **Conectar com Google**. Como o app
   é seu e não passou pela verificação do Google, ele avisa "O Google não
   verificou este app": clique em **Avançado → Acessar Painel** e permita o
   acesso à agenda.

Opcional: `ADMIN_USER_IDS` (o mesmo da tradução) restringe a agenda a esses
usuários do Supabase. Sem ele, basta estar logado no painel.

Para testar em `localhost`, adicione também `http://localhost:3000` às
origens e `http://localhost:3000/api/google-agenda-callback` aos
redirecionamentos, e coloque as duas variáveis no `.env`.
