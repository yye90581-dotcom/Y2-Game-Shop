# GameTopUpMM — Production Starter

## Included
- Mobile Legends, PUBG Mobile, MLBB 2X Diamonds
- Real server-side order storage with SQLite
- Payment screenshot upload (images, max 5 MB)
- Admin login and order status management
- Product prices stored on the server
- Telegram notification for every new order
- Payment screenshot forwarded to Telegram when uploaded

## Run
1. Install Node.js 18+.
2. In this folder run: `npm install`
3. Copy `.env.example` to `.env` and set strong secrets.
4. Run: `npm start`
5. Open `http://localhost:3000`

## Telegram setup
1. Create a bot with Telegram's **@BotFather** and copy its bot token.
2. Create/open the private group or channel where you want order notifications.
3. Add the bot to that chat and give it permission to send messages/photos.
4. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in your hosting environment.
5. Place a test order. The bot sends the order details and, when present, the payment screenshot.

Telegram uses the official Bot API over HTTPS. The integration uses `sendMessage` and `sendPhoto`.

## Important
This integration sends notifications only. It does NOT automatically verify KPay/Wave payments or mark orders as paid. Keep bot tokens private and set them as hosting environment variables, not in GitHub.


## Products
The website includes Buy Now cards for Mobile Legends, PUBG Mobile, and MLBB 2X Diamonds with the current MMK prices supplied by the owner.
