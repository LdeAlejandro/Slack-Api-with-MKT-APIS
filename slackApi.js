console.log('Executing slackApi.js');

//requires  to access .env
require('dotenv').config();

//axios
const axios = require('axios');

//Mercadolivre Canales
const slackMLQuestionsChannel= 'mercadolivre-perguntas';
const slackMlOrdersChannel = 'mercadolivre-pedidos';

//slack variables
const { WebClient } = require('@slack/web-api');
const slackToken = process.env.SLACK_TOKEN
const web = new WebClient(slackToken);

 //Validar conexion de la api
async function checkSlackApiConnection() {
    const apiUrl = 'https://slack.com/api/auth.test';
  
    try {
  
      const response = await axios.post(apiUrl, null, {
        headers: {
          'Authorization': `Bearer ${slackToken}`,
        },
      });
  
      if (response.data.ok) {
        console.log(`Slack API connection is successful. \n Connected to team:  ${response.data.team} \n Bot user ID:  ${response.data.user_id}`);
      } else {
        console.error('Slack API connection failed. Response:', response.data);
      }
    } catch (error) {
      console.error('Error connecting to Slack API: checkSlackApiConnection()', error.message);   
    }
  }
 
   //Encontrar canales de slack atrave del nombre de los mismos
  async function findChannelByName(channelName) {
    // Implement the logic to find a channel by name using the Conversations API
    // You might want to iterate through the list of channels to find the matching one
    // You can use the conversations.list method for this purpose
    // Note: Ensure you handle pagination if there are many channels
  
    // Sample implementation (adjust as needed):
    const response = await axios.post('https://slack.com/api/conversations.list', {
      types: 'public_channel',
    }, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
      },
    });
  
    if (response.data.ok) {
      const channel = response.data.channels.find(c => c.name === channelName);
      return channel;
    } else {
      console.error(`Error finding channel by name. Response:`, response.data);
      return null;
    }
  }

  //Enviar mensaje a slack atraves de Api
async function sentMessageToSlack(slackMessage) {
  try {
    const slackPostApi = 'https://slack.com/api/chat.postMessage';
    await axios.post(slackPostApi, slackMessage, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Mensaje enviado a Slack exitosamente.');
  } catch (error) {
    console.error(`Error al enviar el mensaje a Slack: ${error.message}`);
  }
}


  //VERIFICAR HISTORIAL DE MENSAJES
  async function checkQuestionChannelinfo (Id, targetChannel) {
    try {
      // Find the channel by name
      const channel = await findChannelByName(targetChannel);
  console.log(channel.name);
      if (!channel) {
        console.error(`Channel with name 'test' not found.`);
        return [false, null]; // Return false along with null or some default value
      }
  
      // Retrieve the message history of the channel
      const historyResponse = await web.conversations.history({
        channel: channel.id,
      });
  
      // Check if any message, attachment, or block contains the specific word
      for (const message of historyResponse.messages) {
        if (message.attachments && message.attachments.length > 0) {
          for (const attachment of message.attachments) {
            if (attachment.blocks) {
              for (const block of attachment.blocks) {
                //mercadolivre

                if (block.text.text.includes(Id) && block.text.text.includes('UNANSWERED') && channel.name === slackMLQuestionsChannel) {
                  // Return true along with the message timestamp
                  return [true, message.ts,'UNANSWERED'];
                }
  
                else if (block.text.text.includes(Id) && block.text.text.includes('ANSWERED') && channel.name === slackMLQuestionsChannel){
                  return [true, message.ts, 'ANSWERED'];
                }

                 if (block.text.text.includes(Id) && channel.name === slackMlOrdersChannel){
                  return [true, message.ts, null];
                }

                // if (block.text.text.includes(Id) && !block.text.text.includes('ANSWERED') && !block.text.text.includes('UNANSWERED')){
                //  return [true, message.ts, null];
              //  }
              }
            } else {
              console.error(`Attachment ${attachment} has no blocks.`);
              // Return false along with null or some default value
              return [false, null, 'has no blocks'];
            }
          }
        }
      }
  
      // If no matching message is found, return false along with null or some default value
      return [false, null, 'notInHistory'];
    } catch (error) {
      console.error('Error:', error.message);
      // Return false along with null or some default value
      return [false, null, null];
    }
  }
  
  
  
  async function deleteSlackMessage(channelID, messageTimestamp){
  // Make the API call to delete the message
  axios.post('https://slack.com/api/chat.delete', {
    channel: channelID,
    ts: messageTimestamp,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${slackToken}`,
    },
  })
    .then(response => {
      // Check if the message was deleted successfully
      if (response.data.ok) {
        console.log(`Message: ${messageTimestamp} deleted successfully ${channelID}` );
      } else {
        console.error('Error deleting message:', response.data.error);
      }
    })
    .catch(error => {
      console.error('Error making API request:', error.message);
    });
  
  }
  
   //Exportar variable y funciones para que puedan ser usadas por otros scripts
  module.exports = {
    checkSlackApiConnection,
    findChannelByName,
    sentMessageToSlack,
    checkQuestionChannelinfo,
    deleteSlackMessage,
    slackToken,
    web,
    slackMLQuestionsChannel,
    slackMlOrdersChannel
  };