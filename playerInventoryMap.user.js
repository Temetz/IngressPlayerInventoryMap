// ==UserScript==
// @id playerInventory
// @name IITC Plugin: Inventory keys in map
// @category Layer
// @version 0.0.1
// @namespace	https://github.com/Temetz/IngressPlayerInventoryMap
// @downloadURL	https://github.com/Temetz/IngressPlayerInventoryMap/raw/main/playerInventoryMap.user.js
// @updateURL	https://github.com/Temetz/IngressPlayerInventoryMap/raw/main/playerInventoryMap.user.js
// @homepageURL	https://github.com/Temetz/IngressPlayerInventoryMap
// @description Shows keys in a map layer
// @author Temetz
// @include		https://intel.ingress.com/*
// @match		https://intel.ingress.com/*
// @grant			none
// ==/UserScript==

function wrapper(plugin_info) {

    // Make sure that window.plugin exists. IITC defines it as a no-op function,
    // and other plugins assume the same.
    if (typeof window.plugin !== "function") window.plugin = function () {};
    window.plugin.PlayerInventory = function () {};

    const thisPlugin = window.plugin.PlayerInventory;
    // Name of the IITC build for first-party plugins
    plugin_info.buildName = "PlayerInventory";

    // Datetime-derived version of the plugin
    plugin_info.dateTimeVersion = "202102070043";

    // ID/name of the plugin
    plugin_info.pluginId = "playerinventory";

    const SIZE = 14
    thisPlugin.portalkeyicon = svgToIcon(getSVGString(SIZE, '#9538ff'), SIZE);

    function getSVGString(size, color) {
        return `<svg width="${(size+4)}" height="${(size+4)}" xmlns="http://www.w3.org/2000/svg"><circle stroke="${color}" stroke-width="4" fill="transparent" cx="${(size+4)/2}" cy="${(size+4)/2}" r="${(size/2)}"/></svg>`;
    }

    function svgToIcon(str, s) {
        const url = ("data:image/svg+xml," + encodeURIComponent(str)).replace(/#/g, '%23');
        return new L.Icon({
            iconUrl: url,
            iconSize: [s, s],
            iconAnchor: [s/2, s/2],
            className: 'no-pointer-events', //allows users to click on portal under the unique marker
        })
    }

    function latlngFromHex(location){
        const [latHex, lonHex] = location.split(',')
        return {
            lat: parseInt('0x'+latHex)/1000000,
            lng: parseInt('0x'+lonHex)/1000000,
        }
    }

    function drawMarkerOnPortal(portal){
        const coords = latlngFromHex(portal.portalLocation)
        L.marker(coords, {
            icon: thisPlugin.portalkeyicon,
            interactive: false,
            keyboard: false,
        }).addTo(thisPlugin.layerGroup);
    }

    thisPlugin.onInventoryData = function (data) {
        const items = data.result
        const inventoryKeysRaw = items
        .filter(item => item[2].portalCoupler)
        .map(item => item[2].portalCoupler)

        const inventoryKeysCounted = inventoryKeysRaw
        .map(item => ({...item, count: inventoryKeysRaw.filter(k => k.portalGuid === item.portalGuid).length}))

        const inventoryKeys =  [...new Map(inventoryKeysCounted.map(item => [item['portalGuid'], item])).values()];
        console.log('INVENTORY: Inventory keys only', inventoryKeys)

        const capsuleContents = data.result
        .filter(item => (item[2].container && (item[2].resource.resourceType === 'KEY_CAPSULE' || item[2].resource.resourceType === 'CAPSULE' || item[2].resource.resourceType === 'INTEREST_CAPSULE')))
        .map(item => item[2].container.stackableItems
             .filter(k => k.exampleGameEntity[2].portalCoupler)
             .map(k => ({...k.exampleGameEntity[2].portalCoupler, count: k.itemGuids.length}))
            )

        const capsuleKeys = [].concat(...capsuleContents)
        console.log('INVENTORY: Capsuled keys only', capsuleKeys)

        const keys = [].concat(...inventoryKeys, ...capsuleKeys)
        console.log('INVENTORY: Keys full', keys)
        for(const portal of keys){
            drawMarkerOnPortal(portal)
        }
    }

    thisPlugin.requestInventory = function() {
        console.log('Requesting inventory')
        var r = window.postAjax(
            'getInventory',
            {lastQueryTimestamp: 0},
            function(data, textStatus, jqXHR) {
                console.log('INVENTORY: Got data', data)
                thisPlugin.onInventoryData(data);
            },
            function(jqXHR, textStatus, errorThrown){
                console.error('INVENTORY: Error', errorThrown)
            });
    }

    function setup() {
        thisPlugin.layerGroup = new L.LayerGroup();
        window.addLayerGroup('Keys in Inventory', thisPlugin.layerGroup, false);
        $('#toolbox').append('<a onclick="window.plugin.PlayerInventory.requestInventory()">Load Inventory</a>');
    }

    setup.info = plugin_info; //add the script info data to the function as a property
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded) {
        setup();
    } else {
        if (!window.bootPlugins) {
            window.bootPlugins = [];
        }
        window.bootPlugins.push(setup);
    }
}



(function () {
    const plugin_info = {};
    if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
        plugin_info.script = {
            version: GM_info.script.version,
            name: GM_info.script.name,
            description: GM_info.script.description
        };
    }
    // Greasemonkey. It will be quite hard to debug
    if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {
        // inject code into site context
        const script = document.createElement('script');
        script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(plugin_info) + ');'));
        (document.body || document.head || document.documentElement).appendChild(script);
    } else {
        // Tampermonkey, run code directly
        wrapper(plugin_info);
    }
})();
