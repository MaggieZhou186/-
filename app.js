// 核心状态数据
let availableCash = 250000.00;
let ownedStocks = [];
let watchlist = [];

const DEFAULT_OWNED = [
    {
        name: "腾讯控股",
        symbol: "0700.HK",
        apiSymbol: "hk00700",
        industry: "互联网服务",
        mechanism: "moat",
        mechanismText: "护城河 (Moat)",
        rationale: "社交与游戏帝国的网络效应，以及强大的投资生态系统。",
        buyPrice: 320.50,
        currentPrice: 412.00,
        quantity: 1000,
        buyDate: "2024-03-15",
        targetPrice: "520.00",
        triggers: "微信用户增长停滞，或由于监管导致核心游戏业务大幅萎缩。",
        reasoning: "价格处于历史平均PE以下，分红与回购力度加大。"
    }
];

const DEFAULT_WATCHLIST = [
    {
        name: "拼多多",
        reason: "跨境电商Temu扩展潜力。",
        signal: "季报显示Temu亏损收窄。",
        budget: "20,000 USD"
    }
];

function saveData() {
    const data = {
        availableCash,
        ownedStocks,
        watchlist
    };
    localStorage.setItem('stock_os_data', JSON.stringify(data));
}

function loadData() {
    const stored = localStorage.getItem('stock_os_data');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            availableCash = parsed.availableCash || 250000.00;
            ownedStocks = parsed.ownedStocks || [];
            watchlist = parsed.watchlist || [];
        } catch (e) {
            console.error("Load error:", e);
        }
    } else {
        // 第一次使用，加载默认值
        ownedStocks = DEFAULT_OWNED;
        watchlist = DEFAULT_WATCHLIST;
    }
}

function formatCurrency(val) {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
}

function calculateHoldingDays(dateStr) {
    const buyDate = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today - buyDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function updateDashboard() {
    let totalMarketValue = 0;
    let totalProfit = 0;
    const industryProfits = {};

    ownedStocks.forEach(stock => {
        const marketValue = stock.currentPrice * stock.quantity;
        const profit = (stock.currentPrice - stock.buyPrice) * stock.quantity;

        totalMarketValue += marketValue;
        totalProfit += profit;

        // Industry calculation
        if (!industryProfits[stock.industry]) {
            industryProfits[stock.industry] = 0;
        }
        industryProfits[stock.industry] += profit;
    });

    document.getElementById('total-assets').textContent = formatCurrency(totalMarketValue + availableCash);
    document.getElementById('total-market-value').textContent = formatCurrency(totalMarketValue);
    document.getElementById('available-cash').textContent = formatCurrency(availableCash);
    const profitEl = document.getElementById('total-profit');
    profitEl.textContent = formatCurrency(totalProfit);
    profitEl.className = `value ${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;

    renderIndustryAnalysis(industryProfits);
}

function renderIndustryAnalysis(industryProfits) {
    const grid = document.getElementById('industry-grid');
    grid.innerHTML = Object.entries(industryProfits).map(([industry, profit]) => `
        <div class="industry-block">
            <h4>${industry}</h4>
            <div class="profit ${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${profit >= 0 ? '+' : ''}${formatCurrency(profit)}
            </div>
        </div>
    `).join('');
}

function renderOwnedStocks() {
    const grid = document.getElementById('owned-grid');
    grid.innerHTML = ownedStocks.map(stock => {
        const profit = (stock.currentPrice - stock.buyPrice) * stock.quantity;
        const profitPercent = ((stock.currentPrice / stock.buyPrice - 1) * 100).toFixed(2);
        const days = calculateHoldingDays(stock.buyDate);

        return `
            <div class="stock-card">
                <div class="card-header">
                    <div class="stock-info">
                        <h3>${stock.name} <span class="duration-tag">📅 持有 ${days} 天</span></h3>
                        <span class="stock-symbol">${stock.symbol}</span>
                    </div>
                    <span class="mechanism-tag ${stock.mechanism}">${stock.mechanismText}</span>
                </div>
                
                <div class="card-stats">
                    <div class="info-group">
                        <label>持仓盈亏</label>
                        <p class="${profit >= 0 ? 'profit-positive' : 'profit-negative'}" style="font-weight: 700">
                            ${formatCurrency(profit)} (${profitPercent}%)
                        </p>
                    </div>
                </div>

                <div class="card-body">
                    <div class="info-group">
                        <label>核心机制</label>
                        <p>${stock.rationale}</p>
                    </div>
                    <div class="info-group">
                        <label>买入逻辑</label>
                        <p>${stock.reasoning}</p>
                    </div>
                    <div class="price-targets">
                        <div class="info-group">
                            <label>买入价</label>
                            <p style="color: var(--accent-blue)">${stock.buyPrice}</p>
                        </div>
                        <div class="info-group" style="text-align: right">
                            <label>预期卖出</label>
                            <p style="color: var(--accent-gold)">${stock.targetPrice}</p>
                        </div>
                    </div>
                    <div class="trigger-box">
                        <label style="color: var(--accent-rose)">触发器 (认错信号)</label>
                        <p style="font-size: 0.875rem">${stock.triggers}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function handleImport() {
    document.getElementById('file-upload').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;
        parseAndLoadData(content);
    };
    reader.readAsText(file, 'GB2312'); // 东方财富导出的文件通常是 GB2312 编码
}

function parseAndLoadData(csvText) {
    console.log("Starting data parse...", csvText.substring(0, 100));
    try {
        const rows = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (rows.length < 2) {
            alert("文件似乎为空或只有一行。内容预览: " + csvText.substring(0, 50));
            return;
        }

        // 尝试多种分隔符
        let headers = [];
        const delimiters = ['\t', ',', ';'];
        let bestDelimiter = ',';
        let maxCols = 0;

        delimiters.forEach(d => {
            const cols = rows[0].split(d);
            if (cols.length > maxCols) {
                maxCols = cols.length;
                bestDelimiter = d;
                headers = cols.map(h => h.trim().replace(/"/g, ''));
            }
        });

        console.log("Detected delimiter:", bestDelimiter === '\t' ? 'TAB' : bestDelimiter);
        console.log("Headers:", headers);

        const findIndex = (names) => headers.findIndex(h => names.some(n => h.includes(n)));

        const idxMap = {
            name: findIndex(['证券名称', '名称', '股票名称', '证券代码']),
            code: findIndex(['证券代码', '代码', 'Stock Code']),
            quantity: findIndex(['证券数量', '持仓数量', '数量', '股份余额']),
            cost: findIndex(['成本价', '买入价', '成本', '成本金额']),
            current: findIndex(['当前价', '现价', '市价']),
            industry: findIndex(['所属行业', '细分行业', '行业'])
        };

        console.log("Column Mapping:", idxMap);

        if (idxMap.name === -1 || idxMap.cost === -1) {
            alert("识别失败！未能找到关键列（如'证券名称'、'成本价'）。\n识别出的表头是: " + headers.join(' | '));
            return;
        }

        const newStocks = [];
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(bestDelimiter).map(c => c.trim().replace(/"/g, ''));
            if (cols.length < 2 || !cols[idxMap.name]) continue;

            const name = cols[idxMap.name];
            const code = idxMap.code !== -1 ? cols[idxMap.code] : "";

            // 尝试构建 apiSymbol (腾讯 API 格式: shXXXXXX, szXXXXXX)
            let apiSymbol = "";
            if (code && code.length === 6) {
                if (code.startsWith('6')) apiSymbol = 'sh' + code;
                else if (code.startsWith('0') || code.startsWith('3') || code.startsWith('00')) apiSymbol = 'sz' + code;
            }

            const stockData = {
                name: name,
                symbol: code || "API_AUTO",
                apiSymbol: apiSymbol,
                industry: idxMap.industry !== -1 ? cols[idxMap.industry] : "未分类",
                mechanism: "growth",
                mechanismText: "自动导入",
                rationale: "从表格自动导入",
                buyPrice: parseFloat(cols[idxMap.cost].replace(/,/g, '')),
                currentPrice: idxMap.current !== -1 ? parseFloat(cols[idxMap.current].replace(/,/g, '')) : parseFloat(cols[idxMap.cost].replace(/,/g, '')),
                quantity: parseFloat(cols[idxMap.quantity].replace(/,/g, '')) || 0,
                buyDate: new Date().toISOString().split('T')[0],
                targetPrice: "待定",
                triggers: "待定",
                reasoning: "表格数据，请手动编辑投资逻辑"
            };

            newStocks.push(stockData);
        }

        if (newStocks.length > 0) {
            // 清理旧数据并更新
            newStocks.forEach(ns => {
                const existing = ownedStocks.find(os => os.name === ns.name);
                if (existing) {
                    Object.assign(existing, ns);
                } else {
                    ownedStocks.push(ns);
                }
            });

            alert(`成功加载 ${newStocks.length} 只股票数据！\n部分自动导入的股票需要您补充核心机制和逻辑。`);
            updateDashboard();
            renderOwnedStocks();
            saveData();
            refreshPrices();
        } else {
            alert("未能在文件中解析出有效的股票数据。");
        }
    } catch (e) {
        console.error("Parse error:", e);
        alert("文件解析发生致命错误: " + e.message);
    }
}

function renderWatchlist() {
    const tbody = document.getElementById('watchlist-body');
    if (!tbody) return;
    tbody.innerHTML = watchlist.map((item, index) => `
        <tr>
            <td>
                <input type="text" class="table-input" style="font-weight: 600" 
                    value="${item.name}" placeholder="股票名称"
                    onchange="updateWatchlist(${index}, 'name', this.value)">
            </td>
            <td>
                <input type="text" class="table-input" style="color: var(--text-secondary)" 
                    value="${item.reason}" placeholder="关注理由"
                    onchange="updateWatchlist(${index}, 'reason', this.value)">
            </td>
            <td>
                <input type="text" class="table-input" 
                    value="${item.signal}" placeholder="等待信号"
                    onchange="updateWatchlist(${index}, 'signal', this.value)">
            </td>
            <td>
                <input type="text" class="table-input" style="font-family: monospace" 
                    value="${item.budget}" placeholder="预算"
                    onchange="updateWatchlist(${index}, 'budget', this.value)">
            </td>
            <td>
                <button class="action-btn" onclick="removeFromWatchlist(${index})" title="删除">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function addToWatchlist() {
    watchlist.push({
        name: "",
        reason: "",
        signal: "",
        budget: ""
    });
    renderWatchlist();
    saveData();
}

function removeFromWatchlist(index) {
    if (confirm("确定要删除这条关注记录吗？")) {
        watchlist.splice(index, 1);
        renderWatchlist();
        saveData();
    }
}

function updateWatchlist(index, field, value) {
    watchlist[index][field] = value;
    saveData();
}

async function refreshPrices() {
    const statusEl = document.getElementById('sync-status');
    if (!statusEl) return;
    statusEl.textContent = "正在同步市场数据...";

    const symbols = ownedStocks.map(s => s.apiSymbol).filter(s => s);
    if (symbols.length === 0) {
        statusEl.textContent = "无同步代码";
        return;
    }

    const oldScript = document.getElementById('price-api-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'price-api-script';
    script.src = `https://qt.gtimg.cn/q=${symbols.join(',')}?r=${Math.random()}`;

    script.onload = () => {
        symbols.forEach(apiSymbol => {
            const dataStr = window['v_' + apiSymbol];
            if (dataStr) {
                const parts = dataStr.split('~');
                const price = parseFloat(parts[3]);
                const stock = ownedStocks.find(s => s.apiSymbol === apiSymbol);
                if (stock && !isNaN(price)) {
                    stock.currentPrice = price;
                }
            }
        });
        statusEl.textContent = `同步成功: ${new Date().toLocaleTimeString()}`;
        updateDashboard();
        renderOwnedStocks();
    };

    script.onerror = () => {
        statusEl.textContent = "同步失败 (网络联通性问题)";
    };

    document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
    loadData(); // 加载持久化数据
    updateDashboard();
    renderOwnedStocks();
    renderWatchlist();
    document.getElementById('import-btn').addEventListener('click', handleImport);
    document.getElementById('file-upload').addEventListener('change', handleFileSelect);

    // 自动刷新价格
    refreshPrices();
});
