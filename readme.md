# Marketplace API to Slack Integration

This project is a prototype for a backend application that integrates with various marketplace APIs to monitor orders and product questions. It sends updates to a designated Slack channel and allows responses to be tracked and updated in real-time.

## Features

- **Marketplace API Integration**: Connects with marketplace APIs to retrieve new orders and product-related questions.
- **Slack Integration**: Sends notifications about new orders or questions to a specified Slack channel.
- **Status Updates**: When a question is answered, the app updates the message in Slack to reflect the status as "answered."
- **Real-Time Notifications**: Automatically updates Slack whenever there are changes or new information from the marketplaces.

## How It Works

1. The backend app periodically checks the marketplace APIs for new orders or product questions.
2. When a new order or question is detected, a message is sent to a pre-configured Slack channel.
3. If the question is answered via the marketplace or other means, the app updates the corresponding message in Slack to indicate that the question has been answered.
4. For every new event (order or question), Slack will receive a notification with relevant details such as:
   - Order information (e.g., order number, buyer, product).
   - Product questions and status.
   - Links to the marketplace for more details.

## Technologies Used

- **Node.js**: Backend development environment.
- **Marketplace APIs**: Custom integrations for connecting to third-party marketplaces like Amazon, eBay, etc.
- **Slack API**: Used to send and update messages in Slack channels.
- **Axios**: HTTP client to handle API requests and responses.
- **Webhooks**: For real-time marketplace event tracking and Slack updates.

