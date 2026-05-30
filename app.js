const DEFAULT_ASSETS = [
  { symbol:"BTC", name:"Bitcoin", type:"crypto", category:"Crypto", coinId:"bitcoin" },
  { symbol:"ETH", name:"Ethereum", type:"crypto", category:"Crypto", coinId:"ethereum" },
  { symbol:"XRP", name:"XRP", type:"crypto", category:"Crypto", coinId:"ripple" },
  { symbol:"HBAR", name:"Hedera", type:"crypto", category:"Crypto", coinId:"hedera-hashgraph" },
  { symbol:"SOL", name:"Solana", type:"crypto", category:"Crypto", coinId:"solana" },
  { symbol:"XLM", name:"Stellar", type:"crypto", category:"Crypto", coinId:"stellar" },
  { symbol:"LINK", name:"Chainlink", type:"crypto", category:"Crypto", coinId:"chainlink" },
  { symbol:"NEAR", name:"NEAR Protocol", type:"crypto", category:"Crypto", coinId:"near" },
  { symbol:"SUI", name:"Sui", type:"crypto", category:"Crypto", coinId:"sui" },
  { symbol:"ONDO", name:"Ondo", type:"crypto", category:"Crypto", coinId:"ondo-finance" },
  { symbol:"NVDA", name:"NVIDIA", type:"stock", category:"AI" },
  { symbol:"AVGO", name:"Broadcom", type:"stock", category:"AI" },
  { symbol:"TSM", name:"Taiwan Semi", type:"stock", category:"AI" },
  { symbol:"AMD", name:"AMD", type:"stock", category:"AI" },
  { symbol:"MSFT", name:"Microsoft", type:"stock", category:"AI" },
  { symbol:"PLTR", name:"Palantir", type:"stock", category:"AI" },
  { symbol:"IONQ", name:"IonQ", type:"stock", category:"Quantum" },
  { symbol:"QBTS", name:"D-Wave Quantum", type:"stock", category:"Quantum" },
  { symbol:"RGTI", name:"Rigetti", type:"stock", category:"Quantum" },
  { symbol:"IBM", name:"IBM", type:"stock", category:"Quantum" },
  { symbol:"RKLB", name:"Rocket Lab", type:"stock", category:"Space" },
  { symbol:"ASTS", name:"AST SpaceMobile", type:"stock", category:"Space" },
  { symbol:"RDW", name:"Redwire", type:"stock", category:"Space" },
  { symbol:"LUNR", name:"Intuitive Machines", type:"stock", category:"Space" },
  { symbol:"PL", name:"Planet Labs", type:"stock", category:"Space" }
];

let assets = JSON.parse(localStorage.getItem("sw_assets_v2") || "null") || DEFAULT_ASSETS;
let apiKey = localStorage.getItem("twelve_data_api_key") || "";
let marketData = {};

const grid = document.getElementById("assetGrid");
const searchInput = document.getElementById("searchInput");
const apiInput = document.getElementById("apiKeyInput");
apiInput.value = apiKey;

function saveAssets(){ localStorage.setItem("sw_assets_v2", JSON.stringify(assets)); }
function fmt(n, decimals=2){
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const num = Number(n);
  if (Math.abs(num) < 1 && num !== 0) return "$" + num.toFixed(5);
  return "$" + num.toLocaleString(undefined,{maximumFractionDigits:decimals});
}
function pct(n){
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(2) + "%";
}
function sma(values, period){
  if (!values || values.length < period) return null;
  return values.slice(-period).reduce((a,b)=>a+b,0)/period;
}
function rsi(values, period=14){
  if (!values || values.length <= period) return null;
  let gains=0, losses=0;
  for(let i=values.length-period; i<values.length; i++){
    const diff = values[i] - values[i-1];
    if(diff >= 0) gains += diff; else losses -= diff;
  }
  if(losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}
function supportResistance(values, lookback=60){
  const chunk = values.slice(-lookback);
  if(!chunk.length) return {support:null, resistance:null};
  return { support: Math.min(...chunk), resistance: Math.max(...chunk) };
}
function scoreAsset(d){
  let score = 50;
  if (d.price && d.sma200) {
    const dist = ((d.price - d.sma200)/d.sma200)*100;
    if (dist > 0) score += 15;
    if (dist > 10) score += 5;
    if (dist < -5) score -= 10;
    if (dist > 40) score -= 20;
  }
  if (d.sma50 && d.sma200 && d.sma50 > d.sma200) score += 15;
  if (d.rsi !== null) {
    if (d.rsi >= 40 && d.rsi <= 65) score += 15;
    if (d.rsi < 30) score += 10;
    if (d.rsi > 75) score -= 25;
  }
  if (d.change24h !== null) {
    if (d.change24h > 0) score += 5;
    if (d.change24h < -8) score -= 10;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
function zone(score){
  if(score >= 80) return {label:"BUY ZONE", cls:"buy"};
  if(score >= 65) return {label:"ACCUMULATE", cls:"accumulate"};
  if(score >= 45) return {label:"HOLD", cls:"hold"};
  if(score >= 25) return {label:"REDUCE", cls:"reduce"};
  return {label:"TAKE PROFIT / AVOID", cls:"sell"};
}

async function fetchCrypto(asset){
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${asset.coinId}/market_chart?vs_currency=usd&days=365&interval=daily`;
    const chartRes = await fetch(url);
    const chart = await chartRes.json();
    const prices = (chart.prices || []).map(p => p[1]);
    const current = prices[prices.length-1];
    const yesterday = prices[prices.length-2];
    const sr = supportResistance(prices);
    const data = {
      price: current,
      change24h: yesterday ? ((current-yesterday)/yesterday)*100 : null,
      sma50: sma(prices,50),
      sma200: sma(prices,200),
      rsi: rsi(prices,14),
      support: sr.support,
      resistance: sr.resistance,
      volume: (chart.total_volumes || []).at(-1)?.[1] || null,
      history: prices
    };
    data.score = scoreAsset(data);
    return data;
  } catch(e) {
    return demoData(asset);
  }
}

async function fetchStock(asset){
  if(!apiKey) return demoData(asset);
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${asset.symbol}&interval=1day&outputsize=250&apikey=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    if(!json.values) return demoData(asset);
    const values = json.values.slice().reverse();
    const closes = values.map(v => Number(v.close));
    const price = closes.at(-1);
    const prev = closes.at(-2);
    const sr = supportResistance(closes);
    const data = {
      price,
      change24h: prev ? ((price-prev)/prev)*100 : null,
      sma50: sma(closes,50),
      sma200: sma(closes,200),
      rsi: rsi(closes,14),
      support: sr.support,
      resistance: sr.resistance,
      volume: Number(values.at(-1)?.volume) || null,
      history: closes
    };
    data.score = scoreAsset(data);
    return data;
  } catch(e) {
    return demoData(asset);
  }
}

function demoData(asset){
  const seed = asset.symbol.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const base = asset.type === "crypto" ? (seed % 100) / 10 + 0.2 : seed % 350 + 8;
  const history = Array.from({length:250}, (_,i) => base * (1 + Math.sin((i+seed)/22)*.12 + (i/250)*.18));
  const price = history.at(-1);
  const prev = history.at(-2);
  const sr = supportResistance(history);
  const data = {
    price, change24h: ((price-prev)/prev)*100, sma50:sma(history,50), sma200:sma(history,200),
    rsi:rsi(history,14), support:sr.support, resistance:sr.resistance, volume:null, history, demo:true
  };
  data.score = scoreAsset(data);
  return data;
}

async function loadData(){
  document.getElementById("marketStatus").textContent = "Updating";
  const promises = assets.map(async a => {
    const data = a.type === "crypto" ? await fetchCrypto(a) : await fetchStock(a);
    marketData[a.symbol] = data;
  });
  await Promise.all(promises);
  document.getElementById("marketStatus").textContent = "Live";
  document.getElementById("lastUpdated").textContent = "Updated " + new Date().toLocaleTimeString();
  render();
}

function render(){
  const q = searchInput.value.trim().toLowerCase();
  grid.innerHTML = "";
  assets
    .filter(a => [a.symbol,a.name,a.category,a.type].join(" ").toLowerCase().includes(q))
    .forEach(asset => {
      const d = marketData[asset.symbol] || demoData(asset);
      const z = zone(d.score);
      const card = document.createElement("div");
      card.className = "asset-card";
      card.innerHTML = `
        <div class="asset-top">
          <div>
            <div class="symbol">${asset.symbol}</div>
            <div class="name">${asset.name} · ${asset.category}</div>
          </div>
          <span class="badge ${z.cls}">${z.label}</span>
        </div>
        <div class="price">${fmt(d.price)}</div>
        <div class="${d.change24h >= 0 ? "positive" : "negative"}">${pct(d.change24h)} daily</div>
        <div class="metrics">
          <div class="metric"><small>Score</small><strong>${d.score}/100</strong></div>
          <div class="metric"><small>RSI</small><strong>${d.rsi ? d.rsi.toFixed(1) : "—"}</strong></div>
          <div class="metric"><small>50 MA</small><strong>${fmt(d.sma50)}</strong></div>
          <div class="metric"><small>200 MA</small><strong>${fmt(d.sma200)}</strong></div>
        </div>
      `;
      card.addEventListener("click", () => openDetail(asset));
      grid.appendChild(card);
    });
}

function openDetail(asset){
  const d = marketData[asset.symbol] || demoData(asset);
  const z = zone(d.score);
  const distance200 = d.price && d.sma200 ? ((d.price - d.sma200)/d.sma200)*100 : null;
  const reasons = [];
  if(d.price && d.sma200) reasons.push(d.price > d.sma200 ? "Price is above the 200MA, showing long-term trend strength." : "Price is below the 200MA, meaning the asset may still be in a weaker long-term trend.");
  if(d.sma50 && d.sma200) reasons.push(d.sma50 > d.sma200 ? "50MA is above the 200MA, a bullish trend structure." : "50MA is below the 200MA, so trend confirmation is weaker.");
  if(d.rsi) reasons.push(d.rsi > 75 ? "RSI is overextended; consider profit-taking or waiting." : d.rsi < 30 ? "RSI is oversold; watch for reversal confirmation." : "RSI is in a healthier trading range.");
  if(distance200 !== null) reasons.push(`Price is ${distance200.toFixed(2)}% from the 200MA.`);
  if(d.demo) reasons.push("Stock data is in demo mode until you add a Twelve Data API key.");

  document.getElementById("assetDetail").innerHTML = `
    <div class="detail-head">
      <p class="eyebrow">${asset.type.toUpperCase()} · ${asset.category}</p>
      <h2>${asset.symbol} — ${asset.name}</h2>
      <div class="detail-price">${fmt(d.price)}</div>
      <span class="badge ${z.cls}">${z.label} · Score ${d.score}/100</span>
    </div>

    <div class="detail-grid">
      <div class="metric"><small>Daily Change</small><strong class="${d.change24h >= 0 ? "positive" : "negative"}">${pct(d.change24h)}</strong></div>
      <div class="metric"><small>RSI 14</small><strong>${d.rsi ? d.rsi.toFixed(1) : "—"}</strong></div>
      <div class="metric"><small>50 MA</small><strong>${fmt(d.sma50)}</strong></div>
      <div class="metric"><small>200 MA</small><strong>${fmt(d.sma200)}</strong></div>
      <div class="metric"><small>Distance from 200MA</small><strong>${distance200 !== null ? distance200.toFixed(2)+"%" : "—"}</strong></div>
      <div class="metric"><small>Support</small><strong>${fmt(d.support)}</strong></div>
      <div class="metric"><small>Resistance</small><strong>${fmt(d.resistance)}</strong></div>
      <div class="metric"><small>Volume</small><strong>${d.volume ? Number(d.volume).toLocaleString() : "—"}</strong></div>
    </div>

    <div class="chart-placeholder">
      Chart engine placeholder. Next upgrade: embed TradingView Lightweight Charts for candlesticks, 50MA, 200MA, RSI panel, and volume.
    </div>

    <div class="signal-box">
      <h3>Trader Notes</h3>
      <ul>${reasons.map(r => `<li>${r}</li>`).join("")}</ul>
    </div>

    <div class="signal-box">
      <h3>Suggested Rules</h3>
      <ul>
        <li><strong>Better buy zone:</strong> price near support or 200MA with RSI 35–60 and improving volume.</li>
        <li><strong>Stronger hold:</strong> price above 200MA and 50MA above 200MA.</li>
        <li><strong>Profit-taking area:</strong> price far above 200MA, RSI above 75, or failure at resistance.</li>
        <li><strong>Risk control:</strong> consider stop-loss below recent support, not random percentages.</li>
      </ul>
    </div>

    <button class="remove-btn" onclick="removeAsset('${asset.symbol}')">Remove ${asset.symbol} from Watchlist</button>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

window.removeAsset = function(symbol){
  assets = assets.filter(a => a.symbol !== symbol);
  saveAssets();
  document.getElementById("modal").classList.add("hidden");
  loadData();
}

document.getElementById("closeModal").addEventListener("click", () => document.getElementById("modal").classList.add("hidden"));
document.getElementById("saveApiKeyBtn").addEventListener("click", () => {
  apiKey = apiInput.value.trim();
  localStorage.setItem("twelve_data_api_key", apiKey);
  loadData();
});
document.getElementById("addAssetBtn").addEventListener("click", () => {
  const symbol = document.getElementById("addSymbol").value.trim().toUpperCase();
  const type = document.getElementById("addType").value;
  const name = document.getElementById("addName").value.trim() || symbol;
  const category = document.getElementById("addCategory").value.trim() || (type === "crypto" ? "Crypto" : "Stock");
  const coinId = document.getElementById("addCoinId").value.trim();
  if(!symbol) return alert("Enter a symbol.");
  if(type === "crypto" && !coinId) return alert("For crypto, add the CoinGecko ID.");
  if(assets.some(a => a.symbol === symbol)) return alert("That symbol is already on your watchlist.");
  assets.push({symbol,name,type,category,coinId});
  saveAssets();
  ["addSymbol","addName","addCategory","addCoinId"].forEach(id => document.getElementById(id).value = "");
  loadData();
});
searchInput.addEventListener("input", render);

loadData();
setInterval(loadData, 5 * 60 * 1000);
