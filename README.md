# S.E.N.N.A. · versão GitHub (Central + Ajustes)

Login com e-mail e senha, liberação pelo moderador e os dados protegidos no Firebase.
O site (HTML) fica no GitHub Pages; **os dados nunca ficam no GitHub**.

| Peça | Onde fica |
|---|---|
| Páginas (Central, Ajustes, Usuários, Importar) | GitHub Pages |
| Login e senhas | Firebase Authentication (a senha é guardada pelo Google; a S.E.N.N.A. não grava senha) |
| Dados dos módulos, cargas, metas, usuários | Firestore, protegido por `firestore.rules` |
| Arquivos de migração `*.senna.json` | Só no seu computador (estão no `.gitignore`) |

## 1. Firebase (uma vez, pelo navegador)

1. Acesse console.firebase.google.com e crie o projeto `senna-ldm` (pode desligar o Google Analytics).
2. **Authentication › Método de login › E-mail/senha › Ativar.**
3. **Firestore Database › Criar banco** › modo produção › local `southamerica-east1 (São Paulo)`.
4. **Firestore › Regras**: apague o conteúdo, cole o arquivo `firestore.rules` e clique em Publicar.
5. **Configurações do projeto › Seus apps › Web (</>)**: registre o app e copie o bloco `firebaseConfig` para `assets/firebase-config.js`.
6. Depois de publicar no GitHub (passo 2): **Authentication › Configurações › Domínios autorizados › Adicionar** `SEU-USUARIO.github.io`.

## 2. GitHub (comandos no terminal, dentro desta pasta)

```bash
# instalar (uma vez)
winget install Git.Git
winget install GitHub.cli

# login no GitHub (abre o navegador; não salve token em arquivo)
gh auth login

# criar o repositório e enviar
git init -b main
git add .
git commit -m "S.E.N.N.A. - Central e Ajustes com login"
gh repo create senna --private --source . --push

# ligar o GitHub Pages na branch main
gh api -X POST repos/{owner}/senna/pages -f "source[branch]=main" -f "source[path]=/"
```

O endereço fica `https://SEU-USUARIO.github.io/senna/`.
GitHub Pages a partir de repositório **privado** exige plano pago (Pro/Team/Enterprise). No plano gratuito o repositório precisa ser público: o código fica visível, mas os dados continuam protegidos pelo login.

Para publicar uma alteração depois:

```bash
git add .
git commit -m "descreva a alteração"
git push
```

## 3. Primeiro moderador

1. Abra o site, clique em **Solicitar acesso** e crie seu acesso.
2. No Firebase: **Firestore › usuarios ›** o documento com o seu e-mail › mude `status` para `aprovado` e `papel` para `moderador`.
3. Recarregue o site. Daqui para frente, os acessos são liberados na página **Usuários** (link no canto inferior direito).

Papéis: **leitor** (só vê), **piloto** (sobe cargas e edita metas), **moderador** (tudo + libera acessos).

## 4. Importar os dados atuais

Com o moderador ativo, abra **Importar dados** e selecione `ajustes.senna.json` e `central.senna.json`
(entregues separadamente pelo Senna, fora do repositório). Eles trazem a base de lançamentos, o cadastro de produtos,
as cargas, a meta, o resumo do Pit Stop e o status da Central.

## Módulos

| Pasta | Módulo |
|---|---|
| `central/` | S.E.N.N.A. - Central |
| `ajustes/` | Ajustes |
| `rotativo/` | Inventários Rotativos |
| `io/` | Inventário Oficial |
| `nal/` | NAL |
| `nfs/` | NFs Pendentes |
| `checklists/` | Checklists (quem preenche checklist precisa do papel **Auditor** ou **Piloto**) |
| `pitstop/` | Pit Stop (lê ao vivo o resumo que cada módulo grava) |
| `cadastro/` | Cadastro de Itens (ao gravar uma versão, NAL, Rotativo, Ajustes e I.O. passam a usá-la) |

## App no celular e no tablet

No celular ou tablet, os módulos ganham uma barra inferior (Início, Módulos e Conta) e botões maiores.
Para instalar como app:
- **Android (Chrome):** menu ⋮ › **Instalar app**, ou Conta › **Instalar o app neste aparelho**.
- **iPhone/iPad (Safari):** botão Compartilhar › **Adicionar à Tela de Início**.

O app guarda só as páginas, nunca os dados: sem internet ele abre, mas os números precisam de conexão.

## Limites desta versão

- **Beto e Bety foram retirados.**
- **Fotos e assinaturas do Checklists** ficam no próprio Firestore, reduzidas para caber (até ~650 KB cada).
- **Importar dados substitui o módulo inteiro.** Se o módulo já recebeu cargas direto no site, não importe o arquivo dele de novo.
