/**
 * Script para Gerenciamento de Reembolso de Despesas
 * Versão: 1
 *
 * Este projeto contém:
 * - processForm(formData): Manipula o Formulário de Requisição
 * (que grava na aba "Requisições").
 * - onApprovalFormSubmit(e): Manipula o Formulário de Aprovação
 * (que grava na aba "Aprovações - Respostas").
 * - gerarCodigoSolicitacao(numeroLinha): cria um código PC-YYYMMMDD-<linha>
 * - obterOuCriarPasta(idPasta, nomePasta): cria uma subpasta para as imagens
 * de cada resposta numa pasta chamada imagens.
 *
 * Requisitos atendidos:
 * 1. Geração de código de requisição ("PC-YYYYMMDD-<linha>"). v
 * 2. Status inicial "Aguardando Aprovação" no momento da requisição. v
 * 3. Envio de e-mail ao solicitante confirmando a requisição. v
 * 4. Determinar e-mail do aprovador (exemplo via dicionário), v
 * com fallback default para "nuncio.lima@maisvidaservicos.com.br".
 * 5. Enviar e-mail ao aprovador, com link para o Form de Aprovação V
 * (passando o código via parâmetro) e listando os links dos arquivos
 * enviados nas questões "Envie resumo da prestação" e "Envie comprovantes".
 * 6. Ao aprovar/reprovar, atualizar a aba "Requisições - Respostas": V
 * - Atualizar o Status para "Aprovada" ou "Reprovada".
 * - Alterar cor da linha (amarelo se aprovado, salmão se reprovado).
 * - Enviar e-mail ao solicitante avisando o resultado final.
 */

const config = {
  idPlanilha: 'ID_DA_PLANILHA', // Substitua pelo ID da sua planilha
  idPastaImagens: 'ID_DA_PASTA_DE_IMAGENS', // ID da pasta principal de imagens
  nomePastaImagens: 'Imagens', // Nome da pasta principal de imagens
}

function doGet(e) {
  Logger.log('doGet - Objeto e recebido: %s', JSON.stringify(e));
  Logger.log('doGet - Parâmetros recebidos: %s', JSON.stringify(e.parameter));

  // Crie um template para o HTML
  const htmlTemplate = HtmlService.createTemplateFromFile('approvalForm');

  // Passe a variável 'codigo' (e outras se precisar) para o template
  if (e && e.parameter && e.parameter.codigo) {
    htmlTemplate.codigoDaUrl = e.parameter.codigo; // Agora o HTML pode acessar <?= codigoDaUrl ?>
    return htmlTemplate.evaluate() // Avalia o template e o retorna
      .setTitle('Aprovar Reembolso')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  }
  
  // Se não houver código, retorna o formulário de requisição padrão
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Reembolso de despesas')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function processForm(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Requisições') || ss.insertSheet('Requisições');

    const proximaLinha = sheet.getLastRow() + 1;
    const codigoSolicitacao = gerarCodigoSolicitacao(proximaLinha);

    const idPastaPrincipalImagens = config.idPastaImagens; // <-- ID da sua pasta principal de imagens
    const pastaPrincipalImagens = obterOuCriarPasta(idPastaPrincipalImagens, config.nomePastaImagens);

    const subpastaSolicitacao = pastaPrincipalImagens.createFolder(codigoSolicitacao);
    const idSubpastaSolicitacao = subpastaSolicitacao.getId();

    const timestamp = new Date();
    const nomeSolicitante = formData.recipientName;
    const emailSolicitante = formData.recipientEmail;
    const dataDespesa = formData.data;
    const tipoDespesa = formData.tipo;
    const valorTotal = formData.valor;
    const observacoes = formData.observations;

    let urlArquivoPrestacao = '';
    if (formData.prestacao) {
      const arquivoPrestacao = salvarArquivoNoDrive(formData.prestacao, nomeSolicitante + '_Prestacao', idSubpastaSolicitacao);
      urlArquivoPrestacao = arquivoPrestacao.getUrl();
      arquivoPrestacao.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    let urlArquivoComprovantes = '';
    if (formData.comprovantes) {
      const arquivoComprovantes = salvarArquivoNoDrive(formData.comprovantes, nomeSolicitante + '_Comprovantes', idSubpastaSolicitacao);
      urlArquivoComprovantes = arquivoComprovantes.getUrl();
      arquivoComprovantes.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    const estadoInicial = 'Aguardando Aprovação';

    const aprovadores = {
      'exemplo@gmail.com': 'exemplo@exemplo.com.br',
      'outro@exemplo.com.br': 'outro_exemplo@exemplo.com.br',
    };
    const aprovadorPadrao = 'exemplo@exemplo.com.br';
    const aprovadorEmail = aprovadores[emailSolicitante] || aprovadorPadrao;

    const dadosLinha = [
      timestamp,
      nomeSolicitante,
      emailSolicitante,
      dataDespesa,
      tipoDespesa,
      valorTotal,
      observacoes,
      urlArquivoPrestacao,
      urlArquivoComprovantes,
      codigoSolicitacao,
      estadoInicial,
      aprovadorEmail
    ];

    sheet.appendRow(dadosLinha);

    Logger.log('Dados da solicitação adicionados à planilha: %s', JSON.stringify(dadosLinha));

    // --- Envio de E-mails ---

    // E-mail para o solicitante
    const subjectSolicitante = `Reembolso registrado (código: ${codigoSolicitacao})`;
    const bodySolicitante = `Olá ${nomeSolicitante},

      Sua solicitação de reembolso foi recebida e está aguardando aprovação.

      Detalhes:
      - Código da requisição: ${codigoSolicitacao}
      - Data: ${dataDespesa}
      - Tipo de despesa: ${tipoDespesa}
      - Valor total: R$ ${valorTotal}
      - Observações: ${observacoes || 'Nenhuma.'}

      Agora seu pedido está com status "Aguardando Aprovação". Em breve você receberá
      novas atualizações por e-mail.

      Atenciosamente,
      Equipe de Reembolso`;
    GmailApp.sendEmail(emailSolicitante, subjectSolicitante, bodySolicitante);
    Logger.log('E-mail de confirmação enviado ao solicitante: %s', emailSolicitante);

    // E-mail para o aprovador
    // Obtenha a URL do App Web da sua DEPLOYMENT.
    // Vá em "Implantar" > "Gerenciar Implantações" > Copie a "URL do App da Web"
    // Esta URL pode ser a mesma para ambos os formulários, pois doGet(e) gerencia qual página será exibida.
    const urlBaseWebApp = ScriptApp.getService().getUrl();
    const linkFormAprovacao = `${urlBaseWebApp}?codigo=${codigoSolicitacao}`;

    const subjectAprovador = `Solicitação de Reembolso Pendente - ${codigoSolicitacao}`;
    const bodyAprovador = `Olá,

Uma nova solicitação de reembolso (${codigoSolicitacao}) está pendente de sua aprovação.

Detalhes da Solicitação:
- Solicitante: ${nomeSolicitante} (${emailSolicitante})
- Data: ${dataDespesa}
- Tipo de Despesa: ${tipoDespesa}
- Valor: R$ ${valorTotal}
- Observações: ${observacoes || 'Nenhuma.'}

Documentos Anexados:
- Resumo da Prestação: ${urlArquivoPrestacao || 'N/A'}
- Comprovantes: ${urlArquivoComprovantes || 'N/A'}

Para aprovar ou reprovar esta solicitação, por favor, acesse o link abaixo:
${linkFormAprovacao}

Atenciosamente,
Sistema de Reembolsos`;
    MailApp.sendEmail(aprovadorEmail, subjectAprovador, bodyAprovador);
    Logger.log('E-mail de aprovação enviado ao aprovador: %s', aprovadorEmail);

    return 'Sucesso';
  } catch (e) {
    Logger.log('Erro ao processar o formulário: ' + e.message);
    throw new Error('Não foi possível processar o formulário: ' + e.message);
  }
}

/**
 * Busca e retorna os detalhes de uma solicitação específica da planilha.
 * Usado pelo formulário de aprovação para pré-preencher os dados.
 * @param {string} codigoSolicitacao O código único da solicitação.
 * @returns {Object|null} Um objeto contendo os detalhes da solicitação ou null se não encontrado.
 */
function getDetalhesSolicitacao(codigo) {
  // Validação inicial
  if (!codigo || codigo.trim() === '') {
    throw new Error('O código da solicitação não foi fornecido ou está em branco.');
  }

  try {
    const sheet = SpreadsheetApp.openById(config.idPlanilha).getSheetByName('Requisições');
    if (!sheet) {
      throw new Error(`A planilha com o nome '${'Requisições'}' não foi encontrada.`);
    }
    const data = sheet.getDataRange().getValues();
    const header = data.shift();

    // ---- CORREÇÃO PRINCIPAL AQUI ----
    // Usando os nomes exatos dos cabeçalhos que você forneceu nos logs.
    const colunas = {
      codigo: header.indexOf('Codigo'), // Seu log mostra "Codigo"
      nome: header.indexOf('Nome do solicitante'),
      email: header.indexOf('E-mail do solicitante'),
      data: header.indexOf('Data'), // Seu log mostra "Data"
      tipo: header.indexOf('Tipo de despesa'),
      valor: header.indexOf('Valor total'),
      observacoes: header.indexOf('Observações e justificativas'),
      urlPrestacao: header.indexOf('URL Resumo da Prestação'), // Seu log mostra este nome
      urlComprovantes: header.indexOf('URL Comprovantes')      // Seu log mostra este nome
    };

    // Validação para garantir que todas as colunas foram encontradas
    for (const key in colunas) {
        if (colunas[key] === -1) {
            throw new Error(`A coluna do cabeçalho "${key}" não foi encontrada na planilha. Verifique os nomes.`);
        }
    }

    // Procura pela linha que corresponde ao código
    for (const row of data) {
      if (row[colunas.codigo] == codigo) {
        // Encontrou a linha!
        // Monta o objeto de detalhes para retornar ao JavaScript.
        const detalhes = {
          nome:           row[colunas.nome],
          email:          row[colunas.email],
          // ---- BÔNUS: FORMATANDO A DATA ----
          // Isso transforma a data em um formato amigável (dd/MM/yyyy) antes de enviar.
          dataDespesa:    Utilities.formatDate(new Date(row[colunas.data]), Session.getScriptTimeZone(), "dd/MM/yyyy"),
          tipo:           row[colunas.tipo],
          valor:          row[colunas.valor],
          observacoes:    row[colunas.observacoes],
          urlPrestacao:   row[colunas.urlPrestacao],
          urlComprovantes:row[colunas.urlComprovantes]
        };
        
        return detalhes; // Retorna o objeto com sucesso!
      }
    }
    
    // Se o loop terminar, a solicitação não existe.
    throw new Error(`A solicitação com o código '${codigo}' não foi encontrada.`);

  } catch (err) {
    Logger.log('Erro em getDetalhesSolicitacao: ' + err.stack);
    throw new Error(err.message);
  }
}


/**
 * Manipula a submissão do formulário de aprovação/reprovação.
 * @param {Object} formData Dados do formulário de aprovação (codigoSolicitacao, decisao, justificativa).
 */
function onApprovalFormSubmit(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Requisições');
    if (!sheet) {
      throw new Error('Planilha "Requisições" não encontrada.');
    }

    const codigoSolicitacao = formData.codigoSolicitacao;
    const decisao = formData.decisao; // 'Aprovada' ou 'Reprovada'
    const justificativaAprovador = formData.justificativa;

    const ultimaLinha = sheet.getLastRow();
    if (ultimaLinha < 2) {
      throw new Error('Nenhuma solicitação encontrada na planilha.');
    }

    // Busca as colunas relevantes
    const cabecalhos = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const indiceColunaCodigo = cabecalhos.indexOf('Codigo');
    const indiceColunaStatus = cabecalhos.indexOf('Status');
    const indiceColunaEmailSolicitante = cabecalhos.indexOf('E-mail do solicitante');
    const indiceColunaJustificativa = cabecalhos.indexOf('Observações e justificativas'); // Reutilizando para justificativa do aprovador ou adicionando nova coluna

    // Se você quiser uma coluna separada para a justificativa do aprovador:
    let indiceColunaJustificativaAprovador = cabecalhos.indexOf('Justificativa Aprovador');
    if (indiceColunaJustificativaAprovador === -1) {
        // Se a coluna não existe, adicione-a e ajuste os cabeçalhos.
        // Isso é mais complexo em tempo de execução sem afetar dados, então é melhor adicionar
        // manualmente a coluna 'Justificativa Aprovador' na planilha antes de usar.
        // Por enquanto, vamos usar a coluna de 'Observações e justificativas' ou adicionar no final se não existir.
        // Para simplificar, vou adicionar ao final se não houver uma coluna 'Justificativa Aprovador'
        // Mas o ideal é que ela esteja na planilha já.
        // Para este exemplo, vamos manter simples e talvez sobrescrever 'Observações e justificativas'
        // OU, melhor, adicionar uma nova coluna ao final se não existir e ajustar os cabeçalhos.
        // Para uma solução mais robusta, é recomendado ter a coluna "Justificativa Aprovador" predefinida.
        // Por simplicidade, vou usar a coluna de Observações se ela for a única disponível.
        // Ou, se você quiser uma coluna dedicada:
         const novaColunaNome = 'Justificativa Aprovador';
         if (!cabecalhos.includes(novaColunaNome)) {
             sheet.insertColumnAfter(sheet.getLastColumn()); // Insere nova coluna no final
             sheet.getRange(1, sheet.getLastColumn()).setValue(novaColunaNome); // Define o cabeçalho
             cabecalhos.push(novaColunaNome); // Atualiza os cabeçalhos em memória
             indiceColunaJustificativaAprovador = cabecalhos.indexOf(novaColunaNome); // Pega o novo índice
         } else {
             indiceColunaJustificativaAprovador = cabecalhos.indexOf(novaColunaNome);
         }
    }


    if (indiceColunaCodigo === -1 || indiceColunaStatus === -1 || indiceColunaEmailSolicitante === -1) {
      throw new Error('Colunas essenciais (Codigo, Status, E-mail do solicitante) não encontradas na planilha.');
    }

    // Encontra a linha da solicitação
    const rangeDados = sheet.getRange(2, 1, ultimaLinha - 1, sheet.getLastColumn());
    const valoresDados = rangeDados.getValues();
    let linhaIndex = -1;
    let solicitanteEmailDaLinha = '';

    for (let i = 0; i < valoresDados.length; i++) {
      if (valoresDados[i][indiceColunaCodigo] === codigoSolicitacao) {
        linhaIndex = i + 2; // +2 porque dados começam na linha 2 e o array é 0-indexed
        solicitanteEmailDaLinha = valoresDados[i][indiceColunaEmailSolicitante];
        break;
      }
    }

    if (linhaIndex === -1) {
      throw new Error(`Solicitação com código ${codigoSolicitacao} não encontrada para atualização.`);
    }

    // Atualiza o Status
    sheet.getRange(linhaIndex, indiceColunaStatus + 1).setValue(decisao);

    // Adiciona a justificativa do aprovador
    if (justificativaAprovador) {
        sheet.getRange(linhaIndex, indiceColunaJustificativaAprovador + 1).setValue(justificativaAprovador);
    }

    // Altera a cor da linha
    let corFundo;
    if (decisao === 'Aprovada') {
      corFundo = '#FFFF99'; // Amarelo
    } else if (decisao === 'Reprovada') {
      corFundo = '#fa8072'; // Salmão
    }
    sheet.getRange(linhaIndex, 1, 1, sheet.getLastColumn()).setBackground(corFundo);


    // Envia e-mail de notificação ao solicitante sobre o resultado final
    const assuntoFinal = `Atualização da Solicitação de Reembolso - ${codigoSolicitacao} (${decisao})`;
    const corpoFinal = `Olá,

Sua solicitação de reembolso com o código ${codigoSolicitacao} foi ${decisao}.

Detalhes da decisão:
Status: ${decisao}
Justificativa do Aprovador: ${justificativaAprovador || 'Nenhuma justificativa fornecida.'}

Atenciosamente,
Sistema de Reembolsos`;

    MailApp.sendEmail(solicitanteEmailDaLinha, assuntoFinal, corpoFinal);
    Logger.log('E-mail de status final enviado ao solicitante: %s', solicitanteEmailDaLinha);

    return 'Sucesso';
  } catch (e) {
    Logger.log('Erro ao processar a aprovação/reprovação: ' + e.message);
    throw new Error('Não foi possível processar a decisão: ' + e.message);
  }
}


/**
 * Funções auxiliares (gerarCodigoSolicitacao, salvarArquivoNoDrive, obterOuCriarPasta)
 * permanecem as mesmas.
 */

/**
 * Gera um código de solicitação único no formato PC-ANOMESDIA-LINHA.
 * @param {number} numeroLinha O número da linha onde os dados serão adicionados na planilha.
 * @returns {string} O código de solicitação gerado.
 */
function gerarCodigoSolicitacao(numeroLinha) {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
  const dia = agora.getDate().toString().padStart(2, '0');

  return `PC-${ano}${mes}${dia}-${numeroLinha}`;
}

/**
 * Salva um arquivo codificado em Base64 em uma pasta específica do Google Drive.
 * @param {string} dadosBase64 A string Base64 codificada do arquivo.
 * @param {string} nomeArquivo O nome desejado para o arquivo no Drive.
 * @param {string} idPasta O ID da pasta onde o arquivo deve ser salvo.
 * @returns {GoogleAppsScript.Drive.File} O objeto do arquivo salvo no Google Drive.
 */
function salvarArquivoNoDrive(dadosBase64, nomeArquivo, idPasta) {
  const partes = dadosBase64.split(';base64,');
  const tipoConteudo = partes[0].split(':')[1];
  const dadosBrutos = Utilities.base64Decode(partes[1]);
  const blob = Utilities.newBlob(dadosBrutos, tipoConteudo, nomeArquivo);

  let pasta;
  try {
    pasta = DriveApp.getFolderById(idPasta);
  } catch (e) {
    Logger.log('Erro: Pasta de destino para o arquivo não encontrada. ID: ' + idPasta + '. ' + e.message);
    throw new Error('Pasta de destino para o arquivo não encontrada. Por favor, verifique o ID da pasta.');
  }

  const arquivo = pasta.createFile(blob);
  return arquivo;
}

/**
 * Obtém uma pasta do Google Drive por ID, ou a cria se não existir ou o ID for inválido.
 * @param {string} idPasta O ID da pasta.
 * @param {string} nomePasta O nome a ser usado se a pasta precisar ser criada.
 * @returns {GoogleAppsScript.Drive.Folder} O objeto da pasta do Google Drive.
 */
function obterOuCriarPasta(idPasta, nomePasta) {
  let pasta;
  try {
    if (idPasta) {
      pasta = DriveApp.getFolderById(idPasta);
    }
  } catch (e) {
    Logger.log('Pasta com ID ' + idPasta + ' não encontrada ou inacessível. Tentando criar uma nova pasta: ' + nomePasta);
  }

  if (!pasta) {
    const pastas = DriveApp.getFoldersByName(nomePasta);
    if (pastas.hasNext()) {
      pasta = pastas.next();
    } else {
      pasta = DriveApp.createFolder(nomePasta);
      Logger.log('Nova pasta criada: ' + nomePasta + ' com ID: ' + pasta.getId());
    }
  }
  return pasta;
}