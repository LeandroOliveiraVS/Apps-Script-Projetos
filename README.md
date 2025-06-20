# Repositório para projetos de formulários personalizados utilizando Google Apps Script

# Formulário de Solicitação de Arquivo
Este formulário é um formulário de solicitação de arquivos, o projeto foi criado em HTML utilizando o Apps Script. O objetivo é oferecer uma forma alternativa ao Google Forms para criar formulários personalizados. Usando apenas HTML e JavaScript, é possível criar um formulário que envia os dados para uma planilha do Google Sheets.

## Como Usar
1. Abra o Google Drive e crie uma nova planilha.
2. No menu, clique em "Extensões" > "Apps Script".
3. Apague qualquer código no editor e cole o código do arquivo Código.js.
4. Salve o projeto e implante como 'App da Web' com as seguintes configurações:
   - Execute como: "Você"
   - Quem tem acesso: "Qualquer pessoa"

## Funcionalidades

### Campos Personalizados
   - Campos personalizados ao formulário, como nome, e-mail, telefone.

### Campos escondidos
   - Campos de email e número que não são exibidos inicialmente, mas são apresentados após selecionar a opção correspondente
   - na questão 'Como deseja receber a sua via do arquivo ?'

### Envio a Planilha
   - Os dados do formulário são enviados para uma planilha do Google Sheets que servirá como base de dados.

### Envio de E-mail
   - Após o envio do formulário, um e-mail é enviado para um usuário com os dados preenchidos.

# Formulário de Reembolso
Este formulário é um formulário de solicitação de reembolso, o projeto foi criado em HTML utilizando o Apps Script. O objetivo é oferecer uma forma alternativa ao Google Forms para criar formulários personalizados. Usando apenas HTML e JavaScript, é possível criar um formulário que envia os dados para uma planilha do Google Sheets.

## Como Usar
1. Abra o Google Drive e crie uma nova planilha.
2. No menu, clique em "Extensões" > "Apps Script".
3. Apague qualquer código no editor e cole o código do arquivo Código.js.
4. Salve o projeto e implante como 'App da Web' com as seguintes configurações:
   - Execute como: "Você"
   - Quem tem acesso: "Qualquer pessoa"

## Funcionalidades

### Formulário Dinâmico
   - O formulário é dinâmico, criando dois formulários interdependentes: um para o solicitante e outro para o aprovador.

### Envio de E-mails
   - Após o envio do formulário, um e-mail é enviado para o solicitante com os dados preenchidos.
   - Um e-mail é enviado para o aprovador com os dados do solicitante.
   - O aprovador recebe um link para aprovar ou rejeitar o reembolso.
   - Após a aprovação, um e-mail é enviado ao solicitante informando sobre a aprovação ou rejeição do reembolso.

### Gerar código para cada reembolso
   - Um código único é gerado para cada reembolso, facilitando o rastreamento e a referência.

### Manipulação de Planilhas
   - Os dados do formulário são enviados para uma planilha do Google Sheets que servirá como base de dados.
   - A planilha é atualizada com o status do reembolso após a aprovação ou rejeição.

### Aprovador dinamico
   - O aprovador é selecionado dinamicamente com base no e-mail do solicitante, permitindo uma gestão mais eficiente dos reembolsos.