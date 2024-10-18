console.log('Executing mercadoLivreApi.js');

//requires  to access .env
require('dotenv').config();

//requires
const axios = require('axios');
const qs = require('querystring');
const fs = require('fs')

//console.log color
const resetColor = "\x1b[0m";
const greenColor = "\x1b[32m";
const redColor = "\x1b[31m";
const yellowColor = "\x1b[33m";

//message Constructor para perguntas sin responder slackMessageQML y para perguntas respondidas slackMessageQMLAnswered
var slackMessageQML;
var slackMessageQMLAnswered;
var slackMessageOrdersML;

//slack importamos las variables y funciones del cript de slackApi
const {
    findChannelByName,
    sentMessageToSlack,
    checkQuestionChannelinfo,
    deleteSlackMessage,
    slackMLQuestionsChannel, slackMlOrdersChannel} = require('./slackApi');


//Mercadolivre  Mlsite corresponde al codigo de sitio de mercadolivre segundo el pais correspondiente,
const MLSite='MLB';
const apiUrlMloauthToken = 'https://api.mercadolibre.com/oauth/token';

//obtenemos el token para la api del archivo .env
const MLToken = process.env.ML_TOKEN;
//urls para obtener preguntas y orders realizadas en mercadolire
const mlseller_id = '1582704016';
const apiUrlMlQuestions = `https://api.mercadolibre.com/questions/search?seller_id=${mlseller_id}&api_version=4`;
const apiUrlMlOrders = `https://api.mercadolibre.com/orders/search?seller=${mlseller_id}`;

//refreshToken que se actualizara cada cierto tiempo para mantener la comunicacion con la api de mercadolivre
var MLRefreshToken = process.env.ML_REFRESH_TOKEN;

//cambiando console.log
//almacenar el console.log para cambiar funcionamiento po defecto.
const originalConsoleLog = console.log;

// cambiar como son impresos los console.log para que tenga astericos y el texto aparezca en verde
console.log = function () {
  originalConsoleLog('**********************************************************\n'+ greenColor, ...arguments, resetColor);
};

// almacenar el console.error para cambiar funcionamiento po defecto.
const originalConsoleError = console.error;

// Override console.error to print in red
console.error = function () {
  originalConsoleError(redColor, ...arguments, resetColor);
};

//codigo para actualizar y reemplazar los token o informaciones de .env 
// Function to add or update a variable in the .env file
function updateEnvVariable(key, value) {
  // Read the current contents of the .env file
  const envData = fs.readFileSync('.env', 'utf8').split('\n');

  // Find and remove the existing line with the specified key
  const updatedEnvData = envData.filter(line => !line.startsWith(`${key}=`));

  // Add the new key-value pair to the end of the file
  updatedEnvData.push(`${key}=${value}`);

  // Write the updated lines back to the .env file
  fs.writeFileSync('.env', updatedEnvData.join('\n'));

  console.log( `Variable ${key}=${value} updated successfully.` );
}


//refreshToken para mantener comnucacion con api mercadolivre
async function MlRefreshToken(){
  try{
    const response = await axios.post(apiUrlMloauthToken, qs.stringify({
        'grant_type': 'refresh_token',
        'client_id' : '**********',
        'client_secret' : '*******',
        'refresh_token': MLRefreshToken

      }), {

      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
  });
      //console.log('API Response:', response.data);
      //console.log( response.data.access_token);
      //console.log( response.data.refresh_token);


//actualizar token en .env
    updateEnvVariable('ML_TOKEN', `'${response.data.access_token}'`);
    updateEnvVariable('ML_REFRESH_TOKEN', `'${response.data.refresh_token}'`);

  } catch (error) {
    console.error('Error al hacer la solicitud refresh Token:', error.message);

  }
}

// Call the function to refresh the token every 4 hours (in milliseconds)
//const refreshInterval = 4 * 60 * 60 * 1000; // 4 hours
//setInterval(MlRefreshToken, refreshInterval);

MlRefreshToken();


//function para obtener las preguntas de mercadolivre  via api.
async function MLApiGetQuestions(){
try {   
  // Make a GET request to the MercadoLibre API
  const MLApiResponse = await axios.get(apiUrlMlQuestions, {
    headers: {
      'Authorization': `Bearer ${MLToken}`,
      'Content-Type': 'application/json',
    },
  });

  return MLApiResponse;

} catch (error) {
  // Log any errors that occurred during the request
  console.error('Error making MercadoLibre API request: apiUrlMlQuestions from function: MLApiGetQuestions()', error.message);

}

}

//function para obtener las preguntas de mercadolivre  via api.
async function MLApiGetOrders(){
  try {   
    // Make a GET request to the MercadoLibre API
    const MLApiResponse = await axios.get(apiUrlMlOrders, {
      headers: {
        'Authorization': `Bearer ${MLToken}`,
        'Content-Type': 'application/json',
      },
    });
  
    return MLApiResponse;
  
  } catch (error) {
    // Log any errors that occurred during the request
    console.error('Error making MercadoLibre API request: apiUrlMlOrders from function: MLApiGetOrders', error.message);
  
  }
  
  }

//function para obtener las preguntas de la api de mercadolivre y formatear los datos para enviar las preguntas sin responder o respondidas a el chat de Slackt al canal de perguntas.
async function MercadoLibreApiQuestionRequest() {
  try { 
   
    //GET request to the MercadoLibre API para almacenar los datos de preguntas en responde
    const response = await MLApiGetQuestions();
    
                  //Conseguir el canal de preguntas por nombre
                  const channel = await findChannelByName(slackMLQuestionsChannel);

                  if (!channel) {
                     console.error(`Channel with name ${slackMLQuestionsChannel} not found.`);
                     return false;
                 }

                 else if (channel){
                  console.log(`Channel with name ${slackMLQuestionsChannel} found.`)
                 }

                 /*
 
                // Retrieve the message history of the channel
                   const historyResponse = await web.conversations.history({
                   channel: channel.id,
                });
                */

    // Log the response data
   // console.log('API Response:', response.data);
    
   /** Declarar MLQResponse con los datos de la respuesta de la api 
    * MLQResponse.total si las preguntas son mayores a 0 entonces ejecutar ciclo para que para cada pregunta en el array se evalue si debe ser enviada a slack,
    * si es la primera vez o en caso de haya sido respondida actualice la respuesta en slack eliminando la pergunta pendiente anterior
    * 
    * */
   
       var MLQResponse =  response.data;
    if (MLQResponse.total > 0 ) {
      for (const question of MLQResponse.questions) {
        try{
            /** DchannelInfo se almacena el return de la function checkQuestionChannelinfo(question.id) con el id de la pergunta de mercadolivre para que la funcione evalue si la misma ya
             * fue envianda anteriormente y si la misma ya fue respondida, esta funciona retornara 3 valores  para saber si atrave del id de la pregunta,
             * para obtener:
             *  Bool const duplicated = si la misma ya fue enviada en el canal de slack
             * string const messageid  = timeSpam que seria el id del mensaje enviado en el historial del canal
             * string const pastAnswerStatusMsg = para evaluar si anteriormente estaba sin responder, respondida o si nunca fue enviada al canal anteriormente con las siguites
             *  string = "notInHistory", "UNANSWERED" , "ANSWERED"
             * * */
        const channelInfo = await checkQuestionChannelinfo(question.id,slackMLQuestionsChannel);
        const duplicated  = channelInfo[0];
        const messageid = channelInfo[1];
        const pastAnswerStatusMsg =channelInfo[2];
        
              console.log(channelInfo);
              /** question.status de la pregunta en la response.data de api de mercadolivre,
               *  duplicated es de la funcion checkQuestionChannelinfo 
               * para atraves del id de la pregunta obtenidad por la api saber si habia sido enviada anteriormente al canal de slack
               * pastAnswerStatusMsg === 'notInHistory' la pregunta nunca fue enviada al canal anteriormente.
               * pastAnswerStatusMsg === "UNANSWERED" la pregunta no respondia fue enviada al canal al canal anteriormente
               * pastAnswerStatusMsg === "ANSWERED" la pregunta respondida fue enviada al canal anteriormente
               *   * * */
            
          if (question.status === "UNANSWERED" && duplicated== false && pastAnswerStatusMsg === 'notInHistory') {

            const creationDate =  new Date(question.date_created);         
            const formattedDate = formatSlackDate(creationDate)
            /*console.log("MKT: Mercadolivre");
            console.log("Pergunta sem responder " + "MKT: Mercadolivre" +"STATUS : " + question.status);
            console.log("Id de pergunta : " + question.id);
            console.log("Data da pergunta : " + formattedDate);
            console.log("Id de item : " + question.item_id);
            console.log("Enlace de anuncio : " +"https://produto.mercadolivre.com.br/"+question.item_id);
            console.log("Pergunta : " + question.text);
            console.log("****************************************************");
*/
                // Construir el mensaje para Slack en base la documentacion de la api https://api.slack.com/methods/chat.postMessage
     slackMessageQML = {
      channel: `#${slackMLQuestionsChannel}`,
      "attachments": [ 
      {

      "color": "#de0404",
      "blocks": [
        {
          "type": "section",
         
          "text": {
            "type": "mrkdwn",
            "text": `Pergunta sem responder status: ${question.status} | Id de Item: ${question.item_id} | \nId de perguta : ${question.id}`,
                  }
             
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `Produto : https://produto.mercadolivre.com.br/${question.item_id.replace(MLSite, `${MLSite}-`)}\n Status : ${question.status} \n Link da pergunta : https://www.mercadolivre.com.br/perguntas/vendedor/produto/${question.item_id}?question_id=${question.id}\n Data da pergunta : ${formattedDate}\n Pergunta do cliente : ${question.text} `
          },
         
        }
     
      ]}]
     
    };
    console.log('Pergunta enviada ' + question.id );
    // Enviar el mensaje a Slack
    await sentMessageToSlack(slackMessageQML);

          } else if (question.status === "UNANSWERED" && duplicated=== true && pastAnswerStatusMsg === 'UNANSWERED'){
            console.log(`Pergunta ja foi enviada ao slack anteriormente ${question.id}`);
           
            
          }

          else if(question.status === "ANSWERED" && duplicated== false  && pastAnswerStatusMsg === 'notInHistory') {
            const creationDate =  new Date(question.date_created);         
            const formattedDate = formatSlackDate(creationDate)
            const answeredDate = new Date(question.answer.date_created);
            const formattedAnsweredDate = answeredDate

            console.log(`Pergunta respondida : ${question.id} `);

            slackMessageQMLAnswered = {
             channel: `#${slackMLQuestionsChannel}`, // Reemplaza con el nombre del canal en Slack,
             "attachments": [ 
             {
       
             "color": "#007F00",
             "blocks": [
               {
                 "type": "section",
                
                 "text": {
                   "type": "mrkdwn",
                   "text": `Pergunta respondida status: ${question.status} | Id de Item: ${question.item_id} | \nId de perguta : ${question.id}`,
                         }
                    
               },
               {
                 "type": "section",
                 "text": {
                   "type": "mrkdwn",
                   "text": `Produto : https://produto.mercadolivre.com.br/${question.item_id.replace(MLSite, `${MLSite}-`)}\n Pergunta do cliente : ${question.text}\n Resposta : ${question.answer.text}\n Data da resposta: ${formattedAnsweredDate}  \n Link da pergunta : https://www.mercadolivre.com.br/perguntas/vendedor/produto/${question.item_id}?question_id=${question.id}\n Data da pergunta : ${formattedDate} `
                 },
                
               }
            
             ]}]
            
           };
           //enviar mensaje a slack
           await sentMessageToSlack(slackMessageQMLAnswered);

          }
               else if(question.status === "ANSWERED" && duplicated== true && pastAnswerStatusMsg =="UNANSWERED") {
                const creationDate =  new Date(question.date_created);         
                const formattedDate = formatSlackDate(creationDate)
                const answeredDate = new Date(question.answer.date_created);
                const formattedAnsweredDate = answeredDate

                console.log(`Pergunta atualizada: ${question.id} `);
                //eliminar mensaje antiguo de slack
                deleteSlackMessage(channel.id, messageid);

                console.log(`Pergunta respondida : ${question.id} `);

                slackMessageQMLAnswered = {
                 channel: `#${slackMLQuestionsChannel}`, // Reemplaza con el nombre del canal en Slack,
                 "attachments": [ 
                 {
           
                 "color": "#007F00",
                 "blocks": [
                   {
                     "type": "section",
                    
                     "text": {
                       "type": "mrkdwn",
                       "text": `Pergunta respondida status: ${question.status} | Id de Item: ${question.item_id} | \nId de perguta : ${question.id}`,
                             }
                        
                   },
                   {
                     "type": "section",
                     "text": {
                       "type": "mrkdwn",
                       "text": `Produto : https://produto.mercadolivre.com.br/${question.item_id.replace(MLSite, `${MLSite}-`)}\n Pergunta do cliente : ${question.text}\n Resposta : ${question.answer.text}\n Data da resposta: ${formattedAnsweredDate}  \n Link da pergunta : https://www.mercadolivre.com.br/perguntas/vendedor/produto/${question.item_id}?question_id=${question.id}\n Data da pergunta : ${formattedDate} `
                     },
                    
                   }
                
                 ]}]
                
               };
               
               //enviar mensaje a slack
               await sentMessageToSlack(slackMessageQMLAnswered);

              }
              else if(question.status === "ANSWERED" && duplicated== true && pastAnswerStatusMsg ==="ANSWERED") {
           
                console.log(`Pergunta: ${question.id}  ja foi respondida e enviada ao slack anteriormente`);
             
              }
               else{
                console.error('Nao foi possivel validar mensagens anteriores');
               }     

              } catch (error) {
                // Handle errors if needed
                console.error('Error processing MercadoLibreApiQuestionRequest():', error.message);
              }
      };
  }
          else {
            console.log('Sem perguntas');
                }

  } catch (error) {
    // Log any errors that occurred during the request
    console.error('Error making MercadoLibre API request: apiUrlMlQuestions from: function MercadoLibreApiQuestionRequest() ', error.message);

  }
 }

 
async function MercadoLibreApiOrdersRequest() {
  try { 
   
    //GET request to the MercadoLibre API para almacenar los datos de las ordenes en responde
    const response = await MLApiGetOrders();
    
                  //Conseguir el canal de preguntas por nombre
                  const channel = await findChannelByName(slackMlOrdersChannel);

                  if (!channel) {
                     console.error(`Channel with name ${slackMlOrdersChannel} not found.`);
                     return false;
                 }

                 else if (channel){
                  console.log(`Channel with name ${slackMlOrdersChannel} found.`)
                 }

   
       var MLOrdersResponse =  response.data;
       
       
       if (MLOrdersResponse.results) {
        const orders = MLOrdersResponse.results;
        for (const order of orders) {
          try{
            //console.log(order.buyer.nickname);
            
            for (const payment of order.payments) { 

              if(payment.status === 'approved'){
                const channelInfo = await checkQuestionChannelinfo(payment.order_id, slackMlOrdersChannel);
                const duplicated  = channelInfo[0];
                console.log (channelInfo);

                if(duplicated === false){
                const approvedDate =  new Date(payment.date_approved); 
                const orderDate_approved = formatSlackDate(approvedDate );

                buyerName = order.buyer.nickname;

                 console.log (payment.reason,
                  payment.order_id)

                 slackMessageOrdersML = {
                  channel: `#${slackMlOrdersChannel}`,
                  "attachments": [ 
                  {
            
                  "color": "#007F00",
                  "blocks": [
                    {
                      "type": "section",
                     
                      "text": {
                        "type": "mrkdwn",
                        "text": `Pedido recebido : #${payment.order_id} \nO cliente : ${buyerName} fez uma compra\nValor de compra : ${payment.transaction_amount} \n Estado de pago : ${payment.status} | ${orderDate_approved} \n Total pago: ${payment.total_paid_amount} `,
                              }
                         
                    },
                    {
                      "type": "section",
                      "text": {
                        "type": "mrkdwn",
                        "text": `Detalhe da venda : https://www.mercadolivre.com.br/vendas/${payment.order_id}/detalhe  `
                      },
                     
                    }
                 
                  ]}]
                 
                };

                //enviar mensaje a slack
               await sentMessageToSlack(slackMessageOrdersML);

               }
              }
            }
            

          } catch (error) {
            // Log any errors that occurred during the request
            console.error('Error making MercadoLibre API request: order from:function MercadoLibreApiOrdersRequest() ', error.message);
        
          }
        }
      }
  } catch (error) {
    // Log any errors that occurred during the request
    console.error('Error making MercadoLibre API request: apiUrlMlOrders from: function MercadoLibreApiOrdersRequest() ', error.message);

  }
 }

 MercadoLibreApiOrdersRequest();
 MercadoLibreApiQuestionRequest();

 // codigo para formatear fecha y hora obtenida de la api de ML para que sea mas legible.
 function formatSlackDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hour = date.getHours();
  const minutes = date.getMinutes();

  return `${day}/${month}/${year} ${hour}:${minutes}`;
}


// Call the function to make the API request
//MercadoLibreApiQuestionRequest();


