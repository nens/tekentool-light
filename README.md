Klimaatatlas - Tekentool - Light
================================


Development
-----------

Install 'n' (or nvm if you wish):

```bash
$ npm install -g n
```

Switch to node.js 4.x:

```bash
$ sudo n 4.0.0
```

```bash
$ npm install
$ make
```

Run `make` everytime you change the code and wish to see the updates.




TODO
----

- DONE On load, zoom to center of configured map

- NOT DOING, SWITCHED TO GEOJSON Fix shp-write IE bug: https://github.com/mapbox/shp-write/pull/50/files

- DONE Enable masking (needed!!!)

- DONE Auto-numbering of features

- COMPLICATED Bump leaflet draw from 0.2.3 to 0.4.14

- DONE BUT UNTESTED Use setParams() and ajax call to raster server to rescale on each moveend

- DONE Make multiple layers possible

- DONE Enlarge layer selection mechanism

- DONE Add instruction video

- DONE Disable mask console shortcut (disableMask())

- NOT DOING - UP TO USER Allow naming of export


Copyright notice
----------------

Hard forked from Mapbox' geojson.io in feb 2018.
All credits to them!