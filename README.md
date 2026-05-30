# Silent Warrior Market Terminal v2

## What was added
- Click any stock or crypto card to open a detailed trader view.
- Detail panel includes:
  - Live/current price where API data is available
  - Daily price change
  - RSI 14
  - 50-day moving average
  - 200-day moving average
  - Distance from 200MA
  - Support and resistance
  - Score and buy/sell zone
  - Trader notes
- Add custom stocks or cryptocurrencies from the website.
- Watchlist changes are saved in your browser using localStorage.
- Crypto uses CoinGecko public API.
- Stocks use Twelve Data API when you enter a free API key.

## How to use on iPhone
The best method is to upload this folder to Vercel, Netlify, or GitHub Pages. Then open the site URL in Safari.

## Stock API setup
1. Create a free Twelve Data account.
2. Copy your API key.
3. Paste it into the API key box at the top of the website.
4. Tap Save.

Without a stock API key, stock cards show demo-style calculated data so the dashboard layout still works.

## Crypto setup
Crypto needs the correct CoinGecko ID. Examples:
- BTC = bitcoin
- ETH = ethereum
- XRP = ripple
- HBAR = hedera-hashgraph
- SOL = solana
- XLM = stellar
- LINK = chainlink

## Next upgrades
- TradingView Lightweight Charts candlestick panel
- Portfolio positions and profit/loss
- Alerts when assets enter buy/sell zones
- Login/account sync across phone and computer
- Token unlock calendar
- Bitcoin dominance and Fear & Greed index
