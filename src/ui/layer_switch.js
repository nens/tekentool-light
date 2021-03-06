
module.exports = function(context) {


    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return "";
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    return function(selection) {
        var layers;
        var data = window.data;
        if (!data) {
            return false;
        }




        L.Mask = L.Rectangle.extend({
          options: {
            stroke: false,
            color: "#333",
            fillOpacity: 0.99,
            clickable: false,
            outerBounds: new L.LatLngBounds([-90, -360], [90, 360])
          },

          initialize: function(latLngBounds, boundingPolygon, options) {
            var boundingLatLngs;
            if (boundingPolygon) {
              // Convert array of [lon, lat] points from the GeoJSON to
              // array of {'lat': lat, 'lon': lon} objects.
                boundingLatLngs = boundingPolygon.map(function (point) {
                  return {
                    lat: point[1],
                    lon: point[0]
                  };
                });
            } else {
              boundingLatLngs = this._boundsToLatLngs(latLngBounds);
            }

            // The maskbound are an outer polygon (the whole world) with a hole in
            // it (the area the user is allowed to see clearly), given by boundingLatLngs.
            var maskBounds = [
              this._boundsToLatLngs(this.options.outerBounds),
              boundingLatLngs
            ];

            L.Polygon.prototype.initialize.call(this, maskBounds, options);
          },

          getLatLngs: function() {
            return this._holes[0];
          },

          setLatLngs: function(latlngs) {
            this._holes[0] = this._convertLatLngs(latlngs);
            return this.redraw();
          },

          setBounds: function(latLngBounds) {
            this._holes[0] = this._boundsToLatLngs(latLngBounds);
            return this.redraw();
          }
        });

        L.mask = function(latLngBounds, options) {
          return new L.Mask(latLngBounds, options);
        };

        if (data.topleft && data.bottomright) {
            var tl = data.topleft.split(",");
            var br = data.bottomright.split(",");
            window.mask = L.mask(
                [[Number(tl[0]), Number(tl[1])], [Number(br[0]), Number(br[1])]],
                data.boundingPolygon
            ).addTo(context.map);
        } else if (data.boundingPolygon) {
            // If there is only a polygon, ignore the bounds
            window.mask = L.mask(null, data.boundingPolygon).addTo(
                context.map
            );
        }

        window.removeMask = function() {
            api.map.removeLayer(window.mask);
        }

        var mapId = getParameterByName("mapid");
        var _map = data.maps.filter(function(m) {
            if (m.id === parseInt(mapId, 10)) {
                return m;
            }
            return false;
        });

        var obj = {};

        try {
            window.mapTitle = _map[0].name;
            _map[0].mapLayers.forEach(function(layer) {
                let wmsUrl = layer.url;
                if (
                    layer.url.indexOf("demo.lizard.net") > -1 ||
                    layer.url.indexOf("maps1.klimaatatlas.net") > -1
                ) {
                    if (window.location.href.indexOf("localhost") > -1 || window.location.href.indexOf('github') > -1) {
                        wmsUrl = "https://wpn.klimaatatlas.net/proxy/" + layer.url;    
                    }
                    else {
                        wmsUrl = "/proxy/" + layer.url;    
                    }
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
                } else {
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

        L.control
            .layers(
                {
                    Standaard: L.tileLayer(
                        "https://cartodb-basemaps-d.global.ssl.fastly.net/rastertiles/voyager_nolabels/{z}/{x}/{y}.png"
                    ).addTo(context.map),
                    // Topo: L.tileLayer("mapbox.streets"),
                    // Light: L.tileLayer("mapbox.light"),
                    "Satelliet (Mapbox)": L.tileLayer(
                        "https://api.mapbox.com/styles/v1/nelenschuurmans/ck8oabi090nys1imfdxgb6nv3/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibmVsZW5zY2h1dXJtYW5zIiwiYSI6ImNrZWlnbHdycjFqNHMyem95cWFqNzhkc3IifQ.ymzd92iqviR5RZ-dd-xRIg"
                    ),
                    "Luchtfoto (PDOK)": L.tileLayer.wms(
                        "https://geodata.nationaalgeoregister.nl/luchtfoto/rgb/wms", {
                            layers: "Actueel_ortho25"
                        }
                    )
                },
                obj, {
                    position: 'bottomright'
                }
            )
            .addTo(context.map);

        context.map.on("zoomend", function(e) {
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


            layers.forEach(function(layer) {
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


                var oReq = new XMLHttpRequest();
                oReq.addEventListener("load", function() {
                      var json = JSON.parse(this.responseText);
                      var splitStyles = styles.split(":");
                      var newStyles = splitStyles[0] + ":" + json[0].join(":");
                      if (newStyles.indexOf("dem-nl") > -1) {
                        // ONLY RESCALE DEM-NL FOR NOW
                          layer.setParams({
                              styles: newStyles
                          });
                      }
                });
                if (window.location.href.indexOf('localhost') > -1 || window.location.href.indexOf('github') > -1) {
                    oReq.open(
                      "GET",
                      "https://wpn.klimaatatlas.net/proxy/https://demo.lizard.net/api/v3/wms?request=getlimits&version=1.1.1&srs=EPSG%3A4326&layers=" +
                        layers +
                        "&bbox=" +
                        boundsCommaSeparated +
                        "&width=256&height=256"
                    );
                }
                else {
                    oReq.open(
                      "GET",
                      "/proxy/https://demo.lizard.net/api/v3/wms?request=getlimits&version=1.1.1&srs=EPSG%3A4326&layers=" +
                        layers +
                        "&bbox=" +
                        boundsCommaSeparated +
                        "&width=256&height=256"
                    );                    
                }
                oReq.send();                

            });
        });
    };
};
