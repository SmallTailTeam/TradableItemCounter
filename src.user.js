// ==UserScript==
// @name         Tradable item counter
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Count tradable assets from inventory and market
// @author       SmallTailTeam
// @match        https://steamcommunity.com/market/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=steamcommunity.com
// @grant GM_xmlhttpRequest
// @require     https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// ==/UserScript==

const appId = 730;
const contextId = 2;

const marketLoadingDelayMs = 1000;

let button;
let infobox;

let startDate;

(async function() {
    'use strict';

    startDate = new Date();

    var container = document.querySelector('#myMarketTabs');

    button = document.createElement('button')
    button.innerHTML = 'Загрузить трейдабильность';
    button.style.right = '150px';
    button.style.bottom = '8px';
    button.style.position = 'absolute';
    button.style.outline = 'none';
    button.style.background = '#2b475e';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.fontSize = '13px';
    button.style.padding = '5px 6px';
    button.style.borderRadius = '3px';
    button.style.cursor = 'pointer';

    container.appendChild(button)

    button.onclick = load;
})();

async function load() {
    let assets = [];

    button.disabled = true;

    ensureInfoBox();

    await loadMarketListings(assets);
    let countMarket = assets.length;

    addSpace();

    await loadInventory(assets);
    let countInventory = assets.length - countMarket;

    addSpace();

    addInfoLabel('Готово!');

    setTimeout(() => {
        ensureInfoBox();

        button.disabled = false;

        addInfoHeader('Статистика');

        addInfoLabel(`На торговой: ${countMarket}`);
        addInfoLabel(`В инвентаре: ${countInventory}`);
        addInfoLabel(`Всего: ${assets.length}`);

        addSpace();

        addInfoHeader('Трейдабильность');

        display(assets);
    }, 1500)
}

function ensureInfoBox() {
    if (!infobox) {
         var bg = document.querySelector('#BG_bottom');

        infobox = document.createElement('div');
        infobox.style.background = '#101822';
        infobox.style.padding = '6px';
        infobox.style.marginTop = '30px';

        bg.insertBefore(infobox, bg.firstChild);
    } else {
        infobox.innerHTML = '';
    }
}

function addInfoLabel(text) {
    var label = document.createElement('div');
    label.innerHTML = text;

    infobox.appendChild(label);
}

function addInfoHeader(text) {
    var label = document.createElement('h2');
    label.innerHTML = text;

    infobox.appendChild(label);
}

function addSpace() {
    var label = document.createElement('br');
    infobox.appendChild(label);
}

async function loadMarketListings(assets) {
    let start = 0;
    let total = 0;
    let count = 100;

    do {
        let response = await fetch(`https://steamcommunity.com/market/mylistings/render/?query=&start=${start}&count=${count}?l=russian`);
        let json = await response.json();

        if (json.assets[appId] !== undefined) {
            Object.values(json.assets[appId][contextId]).forEach(asset => {
                let tradableAfter = parseTradability(asset);

                assets.push({
                    name: asset.name,
                    text: tradableAfter.text,
                    date: tradableAfter.date
                });
            });
        }

        console.log(`Загружаю торговую... ${start}/${json.total_count}`)
        addInfoLabel(`Загружаю торговую... ${start}/${json.total_count}`);

        start += count;
        total = json.total_count;

        await delay(marketLoadingDelayMs);
    } while (start < total);
}

async function loadInventory(assets) {
    let response = await fetch(`https://steamcommunity.com/inventory/${g_steamID}/${appId}/${contextId}?l=russian&count=2000`);
    let json = await response.json();

    console.log(`Загружаю инвентарь... ${json.assets.length}/${json.total_inventory_count}`);
    addInfoLabel(`Загружаю инвентарь... ${json.assets.length}/${json.total_inventory_count}`);

    json.assets.forEach(asset => {
        let description = json.descriptions.find(d => d.classid === asset.classid);

        let tradableAfter = parseTradability(description);

        assets.push({
            name: description.name,
            text: tradableAfter.text,
            date: tradableAfter.date
        })
    });
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseTradability(asset) {
    let text = "";
    let date = undefined;

    if (asset.owner_descriptions) {
        text = asset.owner_descriptions.find(x => x.value.includes('Можно будет передать другим после'))?.value;
    }

    if (text) {
        const match = text.match(/(\d{2} .{3} \d{4})/);
        date = parseRussianDate(match[1]);
    }

    if (!text) {
        if(asset.tradable == 1) {
            text = 'Можно будет передать другим сейчас';
            date = startDate;
        } else {
            text = 'Нетрейдабильный';
        }
    }

    return {text, date};
}

const russianMonths = [
    "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"
];

function parseRussianDate(dateString) {
    const parts = dateString.split(' ');
    const day = parseInt(parts[0], 10);
    const month = russianMonths.indexOf(parts[1]);
    const year = parseInt(parts[2], 10);

    return new Date(year, month, day);
}

function display(assets) {
    var grouped = {};

    assets.forEach(a => {
        var key = a.date;

        if (!grouped[key]) {
            grouped[key] = [];
        }

        grouped[key].push(a);
    });

    let list = Object.keys(grouped);

    list.sort((a, b) => new Date(a) - new Date(b));

    list.forEach(key => {
        addInfoLabel(`${grouped[key][0].text}: ${grouped[key].length}`);
    })
}
