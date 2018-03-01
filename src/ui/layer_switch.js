module.exports = function(context) {

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    return function(selection) {
        var layers;
        var data = window.data;
        var mapId = getParameterByName("mapid");
        var _map = data.maps.filter(function(m) {
            if (m.id === parseInt(mapId, 10)) {
                return m;
            }
            return false;
        });        

        var obj = {};

        try {
            _map[0].mapLayers.forEach(function(layer) {
                let wmsUrl = layer.url;
                if (
                    layer.url.indexOf("demo.lizard.net") > -1 ||
                    layer.url.indexOf("maps1.klimaatatlas.net") > -1
                ) {
                    wmsUrl = "https://wpn.klimaatatlas.net/proxy/" + layer.url;
                }

                if (layer.hasOwnProperty("styles")) {
                    obj[layer.name] = L.tileLayer.wms(wmsUrl, {
                        layers: layer.layerName,
                        opacity: layer.opacity,
                        width: layer.width,
                        height: layer.height,
                        format: layer.format,
                        zindex: layer.zindex,
                        styles: layer.styles,
                        transparent: layer.transparent
                    });
                } 
                else {
                    obj[layer.name] = L.tileLayer.wms(wmsUrl, {
                        layers: layer.layerName,
                        opacity: layer.opacity,
                        width: layer.width,
                        height: layer.height,
                        format: layer.format,
                        zindex: layer.zindex,
                        styles: layer.styles,
                        transparent: layer.transparent
                    });                    
                }
            });
        } catch (e) {
            console.log(e);
        }


        // Add labels layer
        obj["Labels"] = L.tileLayer(
          "https://cartodb-basemaps-d.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png"
            );

        L.control.layers({
            'Standaard': L.tileLayer("https://cartodb-basemaps-d.global.ssl.fastly.net/rastertiles/voyager_nolabels/{z}/{x}/{y}.png").addTo(context.map),
            'Topo': L.mapbox.tileLayer('mapbox.streets'),
            'Light': L.mapbox.tileLayer('mapbox.light')
        }, obj).addTo(context.map);


        context.map.on("zoomend", function(e) {
            // console.log(e);

            var layers = [];
            context.map.eachLayer(function(layer) {
                if (
                    layer instanceof L.TileLayer &&
                    layer._url &&
                    layer._url.indexOf("demo.lizard.net") > -1
                ) {
                    layers.push(layer);
                }
            });

            // console.log("------->", layers);

            layers.forEach(function(layer) {
                // console.log("Processing layer", layer);
                // Rescale layer to new extent
                var bounds = context.map.getBounds();
                var boundsCommaSeparated =
                    bounds._northEast.lng +
                    "," +
                    bounds._northEast.lat +
                    "," +
                    bounds._southWest.lng +
                    "," +
                    bounds._southWest.lat;
                var layers = layer.wmsParams.layers;
                var styles = layer.wmsParams.styles;
                fetch(
                    "https://wpn.klimaatatlas.net/proxy/https://demo.lizard.net/api/v3/wms?request=getlimits&version=1.1.1&srs=EPSG%3A4326&layers=" +
                        layers +
                        "&bbox=" +
                        boundsCommaSeparated +
                        "&width=256&height=256"
                )
                    .then(function(data) {
                        // console.log(data);
                        return data.json();
                    })
                    .then(function(json) {
                        // console.log(json, layer);

                        var splitStyles = styles.split(":");
                        layer.setParams({
                            styles: splitStyles[0] + ":" + json[0] + ":" + json[1]
                        });
                    });
            });
        });





    };
};
