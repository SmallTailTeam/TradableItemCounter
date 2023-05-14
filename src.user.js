// ==UserScript==
// @name         Tradable item counter
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Count tradable assets from inventory and market
// @author       SmallTailTeam
// @match        https://steamcommunity.com/market/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=steamcommunity.com
// @grant GM_xmlhttpRequest
// @require     https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// ==/UserScript==

const appId = 730;
const contextId = 2;
let button;
let infobox;

(async function() {
    'use strict';

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
    await loadInventory(assets);

    addInfoLabel('Готово!');

    setTimeout(() => {
        ensureInfoBox();

        button.disabled = false;

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

async function loadMarketListings(assets) {
    let start = 0;
    let total = 0;
    let count = 100;

    do {
        let response = await fetch(`https://steamcommunity.com/market/mylistings/render/?query=&start=${start}&count=${count}?l=russian`);
        let json = await response.json();

        if (json.assets[appId] !== undefined) {
            Object.values(json.assets[appId][contextId]).forEach(asset => {
                let tradableAfter = null;

                if (asset.owner_descriptions !== undefined) {
                    tradableAfter = asset.owner_descriptions.find(x => x.value.includes('Можно будет передать другим после'))?.value;
                }

                if (!tradableAfter) {
                    tradableAfter = 'Можно будет передать другим сейчас';
                }

                assets.push({
                    name: asset.name,
                    tradableAfter
                });
            });
        }

        console.log(`Загружаю торговую -> ${start}/${json.total_count}`)
        addInfoLabel(`Загружаю торговую -> ${start}/${json.total_count}`);

        start += count;
        total = json.total_count;
    } while (start < total);
}

async function loadInventory(assets) {
    let response = await fetch(`https://steamcommunity.com/inventory/${g_steamID}/${appId}/${contextId}?l=russian&count=2000`);
    let json = await response.json();

    console.log(`Загружаю инвентарь -> ${json.assets.length}/${json.total_inventory_count}`);
    addInfoLabel(`Загружаю инвентарь -> ${json.assets.length}/${json.total_inventory_count}`);

    json.assets.forEach(asset => {
        let description = json.descriptions.find(d => d.classid === asset.classid);

        let tradableAfter = null;

        if (description.owner_descriptions) {
            tradableAfter = description.owner_descriptions.find(x => x.value.includes('Можно будет передать другим после'))?.value;
        }

        if (!tradableAfter) {
            tradableAfter = 'Можно будет передать другим сейчас';
        }

        assets.push({
            name: description.name,
            tradableAfter
        })
    });
}

function display(assets) {
    var grouped = {};

    assets.forEach(a => {
        var key = a.tradableAfter;

        if (!grouped[key]) {
            grouped[key] = [];
        }

        grouped[key].push(a);
    });

    Object.keys(grouped).sort().forEach(key => {
        addInfoLabel(`${key} -> ${grouped[key].length}`);
    })
}
