# GameTopUpMM — Deploy Ready

## Recommended deployment: Render

1. Create a private GitHub repository and upload this project.
2. In Render, choose **New → Blueprint** and select the repository.
3. Render reads `render.yaml`.
4. Set a strong `ADMIN_PASSWORD`.
5. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` when prompted.
6. Deploy the service.
7. Add your custom domain from the service's **Custom Domains** section.

The project stores the SQLite database and payment receipt uploads under `/var/data`, which is configured as a persistent disk.

## Telegram
- `TELEGRAM_BOT_TOKEN`: token from @BotFather.
- `TELEGRAM_CHAT_ID`: the destination private chat/group/channel ID.
- The bot sends order details immediately after an order is saved.
- If a payment screenshot was uploaded, it is forwarded to the same Telegram chat.
- If Telegram is unavailable, the order is still saved; the notification failure is logged by the server.

## Before public launch
- Use a strong admin password and session secret.
- Never commit `.env` or Telegram secrets to GitHub.
- Use HTTPS and a custom domain.
- Back up the database.
- Confirm your KPay/Wave payment instructions.
- Test an order end-to-end.
- Add real payment verification later if needed.

## Local test
Node.js 18+:
`npm install`
Copy `.env.example` to `.env` and set the variables.
`npm start`
Open `http://localhost:3000`
