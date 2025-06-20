//==============================================================
//                   ABRIR FORMULÁRIO
//==============================================================
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
  .setTitle('Solicitação de Arquivo')
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}
//==============================================================
//                   PROCESSAR O FORMULÁRIO
//==============================================================
function processForm(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const aba = ss.getSheetByName('main')

  const solicitacao = [
    new Date,       //Carimbo data/hora
    data.nome,      //Nome do solicitante
    data.entrega,   //Forma de entrega
    data.numero,    //Numero Whatsapp
    data.email      //Email
  ]

  aba.appendRow(solicitacao);

  //Enviar email
  const datahora = solicitacao[0];
  const nome = solicitacao[1];
  const tipo = solicitacao[2];
  const numero = solicitacao[3] || ''
  const emailSol = solicitacao[4] || ''
  const email = 'INSIRA_O_EMAIL_AQUI' // Coloque o email para onde deseja enviar a notificação
  const assunto = `Solicitação de Contra-cheque recebida!`
  const corpo =  `Uma solicitação de contra-cheque foi realizada por: ${nome}
  Data/Hora: ${datahora}
  Forma de entrega: ${tipo}
  Número: ${numero}
  email: ${emailSol}`

  MailApp.sendEmail(email, assunto, corpo);

  return 'Solicitação Recebida com sucesso!'
}
