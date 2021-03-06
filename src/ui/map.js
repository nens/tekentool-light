require('qs-hash');
require('../lib/custom_hash.js');

var popup = require('../lib/popup'),
    escape = require('escape-html'),
    LGeo = require('leaflet-geodesy'),
    geojsonRewind = require('geojson-rewind'),
    writable = false,
    showStyle = false,
    makiValues = require('../../data/maki.json'),
    maki = '';

for (var i = 0; i < makiValues.length; i++) {
    maki += '<option value="' + makiValues[i].icon + '">';
}

var themas = '<option value="Hevige neerslag"><option value="Langdurige neerslag"><option value="Hitte"><option value="Droogte"><option value="Dijkdoorbraken"><option value="Overig">';
var priorities = '<option value="Laag"><option value="Midden"><option value="Hoog">';

module.exports = function(context, readonly) {

    writable = !readonly;

    function map(selection) {
        // Set map to that of configured map
        context.map = L.map(selection.node(), null);

        var geocoder = L.Control.geocoder({
                defaultMarkGeocode: false,
                placeholder: "Zoeken..."
            })
            .on('markgeocode', function(e) {
                var bbox = e.geocode.bbox;
                var poly = L.polygon([
                     bbox.getSouthEast(),
                     bbox.getNorthEast(),
                     bbox.getNorthWest(),
                     bbox.getSouthWest()
                ]);
                context.map.fitBounds(poly.getBounds());
            })
            .addTo(context.map);        

            // .addControl(L.mapbox.geocoderControl('mapbox.places', {
            //     position: 'topright'
            // }));

        if (data.topleft && data.bottomright) {
          var tl = data.topleft.split(",");
          var br = data.bottomright.split(",")
          context.map.fitBounds([
            [tl[0], tl[1]],
            [br[0], br[1]]
          ]);            
        }
        else {
          context.map.setView([52.1858,5.2677], 8);
        }

        L.control.scale().setPosition('bottomright').addTo(context.map);
        context.map.zoomControl.setPosition('topright');

        L.hash(context.map);

        context.mapLayer = L.featureGroup().addTo(context.map);


        // L.Draw translations:
        L.drawLocal.draw.handlers.circle.tooltip.start = 'Klik en sleep om cirkel te tekenen';
        L.drawLocal.draw.handlers.marker.tooltip.start = 'Klik op kaart om marker te plaatsen';
        L.drawLocal.draw.handlers.polygon.tooltip.cont = 'Klik de vorm verder te tekenen';
        L.drawLocal.draw.handlers.polygon.tooltip.end = 'Klik op het eerste punt om de vorm te sluiten';
        L.drawLocal.draw.handlers.polygon.tooltip.start = 'Klik te beginnen met tekenen';
        L.drawLocal.draw.handlers.polyline.error = '<strong>Fout:</strong> vorm kan niet kruisen!';
        L.drawLocal.draw.handlers.polyline.tooltip.cont = 'Klik de vorm verder te tekenen';
        L.drawLocal.draw.handlers.polyline.tooltip.end = 'Klik op het laatste punt om de vorm te sluiten';
        L.drawLocal.draw.handlers.polyline.tooltip.start = 'Klik te beginnen met tekenen';
        L.drawLocal.draw.handlers.rectangle.tooltip.start = 'Klik en sleep om het vierkant te tekenen';
        L.drawLocal.draw.handlers.simpleshape.tooltip.end = 'Laat los om af te ronden';
        L.drawLocal.draw.toolbar.actions.text = 'Afbreken';
        L.drawLocal.draw.toolbar.actions.title = 'Tekenen afbreken';
        L.drawLocal.draw.toolbar.buttons.marker = 'Marker plaatsen';
        L.drawLocal.draw.toolbar.buttons.polygon = 'Polygoon tekenen';
        L.drawLocal.draw.toolbar.buttons.polyline = 'Lijn tekenen';
        L.drawLocal.draw.toolbar.buttons.rectangle = 'Vierkant tekenen';
        L.drawLocal.draw.toolbar.undo.text = 'Laatste punt verwijderen';
        L.drawLocal.draw.toolbar.undo.title = 'Laatstgetekende punt verwijderen';
        L.drawLocal.edit.toolbar.actions.cancel.text = 'Afbreken';
        L.drawLocal.edit.toolbar.actions.cancel.title = 'Tekenen afbreken, wijzigingen gaan verloren';
        L.drawLocal.edit.toolbar.actions.save.text = 'Opslaan';
        L.drawLocal.edit.toolbar.actions.save.title = 'Veranderingen opslaan';
        L.drawLocal.edit.toolbar.buttons.edit = "Lagen bewerken";
        L.drawLocal.edit.toolbar.buttons.editDisabled = "Geen lagen om te bewerken";
        L.drawLocal.edit.toolbar.buttons.remove = "Verwijder lagen";
        L.drawLocal.edit.toolbar.buttons.removeDisabled = "Geen lagen om te verwijderen";
        L.drawLocal.edit.handlers.edit.tooltip.text = "Sleep uiteinden of markers om features te wijzigen";
        L.drawLocal.edit.handlers.edit.tooltip.subtext = "Klik op afbreken om veranderingen terug te draaien";
        L.drawLocal.edit.handlers.remove.tooltip.text = "Klik op een feature om te verwijderen";


        if (writable) {
          context.drawControl = new L.Control.Draw({
              position: 'topright',
              edit: { featureGroup: context.mapLayer },
              draw: {
                  circle: false,
                  polyline: { metric: (navigator.language !== 'en-us' && navigator.language !== 'en-US') },
                  polygon: { metric: (navigator.language !== 'en-us' && navigator.language !== 'en-US') },
                  marker: true,
                  circlemarker: false
              }
          }).addTo(context.map);

          context.map
            .on('draw:edited', update)
            .on('draw:deleted', update);
        }

        context.map
            .on('draw:created', created)
            .on('popupopen', popup(context));

        // context.map.attributionControl.setPrefix('<a target="_blank" href="http://www.klimaatatlas.net/">Over</a>');

        function update() {
            var geojson = context.mapLayer.toGeoJSON();
            // console.log('geojson pre-rewind', geojson);
            geojson = geojsonRewind(geojson);
            // console.log('geojson post-rewind', geojson);
            geojsonToLayer(geojson, context.mapLayer);
            context.data.set({map: layerToGeoJSON(context.mapLayer)}, 'map');
        }

        context.dispatch.on('change.map', function() {
            geojsonToLayer(context.data.get('map'), context.mapLayer);
        });

        function created(e) {
            context.mapLayer.addLayer(e.layer);
            update();
        }
    }

    function layerToGeoJSON(layer) {
        var features = [];
        layer.eachLayer(collect);
        function collect(l) { if ('toGeoJSON' in l) features.push(l.toGeoJSON()); }
        features = features.map(function(feature, i) {
            feature.properties["Nr"] = i;
            return feature;
        });
        return {
            type: 'FeatureCollection',
            features: features
        };
    }

    return map;
};


function geojsonToLayer(geojson, layer) {


    function format_url(path, accessToken) {
        accessToken = "pk.eyJ1IjoibmVsZW5zY2h1dXJtYW5zIiwiYSI6ImNrZWlnbHdycjFqNHMyem95cWFqNzhkc3IifQ.ymzd92iqviR5RZ-dd-xRIg";

        var url = (document.location.protocol === 'https:') ? "https://a.tiles.mapbox.com/v4" : "http://a.tiles.mapbox.com/v4";

        url = url.replace(/\/v4$/, '');
        url += path;
        url += url.indexOf('?') !== -1 ? '&access_token=' : '?access_token=';
        url += accessToken;
        // if (config.REQUIRE_ACCESS_TOKEN) {
        //     if (accessToken[0] === 's') {
        //         throw new Error('Use a public access token (pk.*) with Mapbox.js, not a secret access token (sk.*). ' +
        //             'See https://www.mapbox.com/mapbox.js/api/v' + version + '/api-access-tokens/');
        //     }

        //     url += url.indexOf('?') !== -1 ? '&access_token=' : '?access_token=';
        //     url += accessToken;
        // }

        return url;

    }

    function icon(fp, options) {
        fp = fp || {};

        var sizes = {
                small: [20, 50],
                medium: [30, 70],
                large: [35, 90]
            },
            size = fp['marker-size'] || 'medium',
            symbol = ('marker-symbol' in fp && fp['marker-symbol'] !== '') ? '-' + fp['marker-symbol'] : '',
            color = (fp['marker-color'] || '7e7e7e').replace('#', '');

        return L.icon({
            iconUrl: format_url('/v4/marker/' +
                'pin-' + size.charAt(0) + symbol + '+' + color +
                // detect and use retina markers, which are x2 resolution
                (L.Browser.retina ? '@2x' : '') + '.png', options && options.accessToken),
            iconSize: sizes[size],
            iconAnchor: [sizes[size][0] / 2, sizes[size][1] / 2],
            popupAnchor: [0, -sizes[size][1] / 2]
        });
    }


    var defaults = {
        stroke: '#555555',
        'stroke-width': 2,
        'stroke-opacity': 1,
        fill: '#555555',
        'fill-opacity': 0.5
    };

    var mapping = [
        ['stroke', 'color'],
        ['stroke-width', 'weight'],
        ['stroke-opacity', 'opacity'],
        ['fill', 'fillColor'],
        ['fill-opacity', 'fillOpacity']
    ];

    function fallback(a, b) {
        var c = {};
        for (var k in b) {
            if (a[k] === undefined) c[k] = b[k];
            else c[k] = a[k];
        }
        return c;
    }

    function remap(a) {
        var d = {};
        for (var i = 0; i < mapping.length; i++) {
            d[mapping[i][1]] = a[mapping[i][0]];
        }
        return d;
    }

    function style(feature) {
        return remap(fallback(feature.properties || {}, defaults));
    }

    function strip_tags(_) {
        return _.replace(/<[^<]+>/g, '');
    }

    function markerStyle(f, latlon, options) {
        return L.marker(latlon, {
            icon: icon(f.properties, options),
            title: strip_tags(
                // sanitize(
                    (f.properties && f.properties.title) || '')
                // )
        });
    }




    layer.clearLayers();
    L.geoJson(geojson, {
        style: style,
        pointToLayer: function(feature, latlon) {
            if (!feature.properties) feature.properties = {};
            return markerStyle(feature, latlon);
        }
    }).eachLayer(add);
    function add(l) {
        bindPopup(l);
        l.addTo(layer);
    }
}


function bindPopup(l) {

    var props = JSON.parse(JSON.stringify(l.toGeoJSON().properties)),
        table = '',
        info = '';


    var properties = {
        "Nr": "",
        "Thema": "",
        "Omschrijving": "",
        "Prioriteit": ""
    };

    // Steer clear of XSS
    for (var k in props) {
        var e = escape(k);
        // users don't want to see "[object Object]"
        if (typeof props[k] === 'object') {
          properties[e] = escape(JSON.stringify(props[k]));
        } else {
          properties[e] = escape(props[k]);
        }
    }

    if (!properties) return;

    if (!Object.keys(properties).length) properties = { '': '' };


    if (l.feature && l.feature.geometry && writable) {
        if (l.feature.geometry.type === 'Point' || l.feature.geometry.type === 'MultiPoint') {
            if (!('marker-color' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="marker-color"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="color" value="#7E7E7E"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
            if (!('marker-size' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="marker-size"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="text" list="marker-size" value="medium"' + (!writable ? ' readonly' : '') + ' /><datalist id="marker-size"><option value="small"><option value="medium"><option value="large"></datalist></td></tr>';
            }
            if (!('marker-symbol' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="marker-symbol"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="text" list="marker-symbol" value=""' + (!writable ? ' readonly' : '') + ' /><datalist id="marker-symbol">' + maki + '</datalist></td></tr>';
            }            
        }
        if (l.feature.geometry.type === 'LineString' || l.feature.geometry.type === 'MultiLineString' || l.feature.geometry.type === 'Polygon' || l.feature.geometry.type === 'MultiPolygon') {
            if (!('stroke' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="stroke"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="color" value="#555555"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
            if (!('stroke-width' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="stroke-width"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="number" min="0" step="0.1" value="2"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
            if (!('stroke-opacity' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="stroke-opacity"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="number" min="0" max="1" step="0.1" value="1"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
        }
        if (l.feature.geometry.type === 'Polygon' || l.feature.geometry.type === 'MultiPolygon') {
            if (!('fill' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="fill"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="color" value="#555555"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
            if (!('fill-opacity' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="fill-opacity"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="number" min="0" max="1" step="0.1" value="0.5"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
        }
    }

    for (var key in properties) {
        if ((key == 'marker-color' || key == 'stroke' || key == 'fill') && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="color" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
        }

        else if (key == 'Thema' && writable) {
            table += '<tr class=""><th><input type="text" value="Thema" /></th>' +
                '<td><input type="text" list="theme-value" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /><datalist id="theme-value">' + themas + '</datalist></td></tr>';
        }
        
        else if (key == 'Prioriteit' && writable) {
            table += '<tr class=""><th><input type="text" value="Prioriteit" /></th>' +
                '<td><input type="text" list="priority-value" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /><datalist id="priority-value">' + priorities + '</datalist></td></tr>';
        }

        else if (key == 'marker-size' && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="text" list="marker-size" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /><datalist id="marker-size"><option value="small"><option value="medium"><option value="large"></datalist></td></tr>';
        }
        else if (key == 'marker-symbol' && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="text" list="marker-symbol" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /><datalist id="marker-symbol">' + maki + '</datalist></td></tr>';
        }
        else if (key == 'stroke-width' && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="number" min="0" step="0.1" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
        }
        else if ((key == 'stroke-opacity' || key == 'fill-opacity') && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="number" min="0" max="1" step="0.1" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
        }
        else {
            table += '<tr><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="text" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
        }
    }

    if (l.feature && l.feature.geometry) {
        info += '<table class="metadata">';
        if (l.feature.geometry.type === 'LineString') {
            var total = d3.pairs(l.feature.geometry.coordinates).reduce(function(total, pair) {
                return total + L.latLng(pair[0][1], pair[0][0])
                    .distanceTo(L.latLng(pair[1][1], pair[1][0]));
            }, 0);
            info += '<tr><td>Meters</td><td>' + total.toFixed(2) + '</td></tr>' +
                    '<tr><td>Kilometers</td><td>' + (total / 1000).toFixed(2) + '</td></tr>' +
                    '<tr><td>Feet</td><td>' + (total / 0.3048).toFixed(2) + '</td></tr>' +
                    '<tr><td>Yards</td><td>' + (total / 0.9144).toFixed(2) + '</td></tr>' +
                    '<tr><td>Miles</td><td>' + (total / 1609.34).toFixed(2) + '</td></tr>';
        } else if (l.feature.geometry.type === 'Point') {
            info += '<tr><td>Latitude </td><td>' + l.feature.geometry.coordinates[1].toFixed(4) + '</td></tr>' +
                    '<tr><td>Longitude</td><td>' + l.feature.geometry.coordinates[0].toFixed(4) + '</td></tr>';
        } else if (l.feature.geometry.type === 'Polygon') {
          info += '<tr><td>Sq. Meters</td><td>' + (LGeo.area(l)).toFixed(2) + '</td></tr>' +
                  '<tr><td>Sq. Kilometers</td><td>' + (LGeo.area(l) / 1000000).toFixed(2) + '</td></tr>' +
                  '<tr><td>Sq. Feet</td><td>' + (LGeo.area(l) / 0.092903).toFixed(2) + '</td></tr>' +
                  '<tr><td>Acres</td><td>' + (LGeo.area(l) / 4046.86).toFixed(2) + '</td></tr>' +
                  '<tr><td>Sq. Miles</td><td>' + (LGeo.area(l) / 2589990).toFixed(2) + '</td></tr>';
        }
        info += '</table>';
    }

    var tabs = '<div class="pad1 tabs-ui clearfix col12">' +
                    '<div class="tab col12">' +
                        '<input class="hide" type="radio" id="properties" name="tab-group" checked="true">' +
                        '<label class="keyline-top keyline-right tab-toggle pad0 pin-bottomleft z10 center col6" for="properties">Eigenschappen</label>' +
                        '<div class="space-bottom1 col12 content">' +
                            '<table class="space-bottom0 marker-properties">' + table + '</table>' +
                            (writable ? '<div class="add-row-button add fl col4">+ Toevoegen</div>' +
                            '<div class="fl text-right col8"><input type="checkbox" id="show-style" name="show-style" value="true" checked><label for="show-style">Toon stijlattributen</label></div>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div class="space-bottom2 tab col12">' +
                        '<input class="hide" type="radio" id="info" name="tab-group">' +
                        '<label class="keyline-top tab-toggle pad0 pin-bottomright z10 center col6" for="info">Info</label>' +
                        '<div class="space-bottom1 col12 content">' +
                            '<div class="marker-info">' + info + ' </div>' +
                        '</div>' +
                    '</div>' +
                '</div>';

    var content = tabs +
        (writable ? '<div class="clearfix col12 pad1 keyline-top">' +
            '<div class="pill col6">' +
            '<button class="save col6 major">Opslaan</button> ' +
            '<button class="minor col6 cancel">Sluit</button>' +
            '</div>' +
            '<button class="col6 text-right pad0 delete-invert"><span class="icon-remove-sign"></span> Verwijder feature</button></div>' : '');

    l.bindPopup(L.popup({
        closeButton: false,
        maxWidth: 500,
        maxHeight: 400,
        autoPanPadding: [5, 45],
        className: 'geojsonio-feature'
    }, l).setContent(content));

    l.on('popupopen', function(e){
        if (showStyle === false) {
            d3.select('#show-style').property('checked', false);
              d3.selectAll('.style-row').style('display','none');
        }
        d3.select('#show-style').on('click', function() {
            if (this.checked) {
                showStyle = true;
                d3.selectAll('.style-row').style('display','');
            } else {
                showStyle = false;
                d3.selectAll('.style-row').style('display','none');
            }
        });
    });
}
