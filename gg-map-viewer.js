import { Element as PolymerElement } from '../../@polymer/polymer/polymer-element.js';
import '../../@polymer/paper-toggle-button/paper-toggle-button.js';

import { FeatureGroup } from '../../leaflet/src/layer/FeatureGroup.js';
import { Marker } from '../../leaflet/src/layer/marker/Marker.js';
import { Icon } from '../../leaflet/src/layer/marker/Icon.js';
import icon from '../../leaflet/dist/images/marker-icon.png';
import iconShadow from '../../leaflet/dist/images/marker-shadow.png';

import { LeafletMap } from '../../@ggcity/leaflet-map/leaflet-map.js';
import { LeafletWMSGroup } from '../../@ggcity/leaflet-wms/leaflet-wms-group.js';
import { LeafletTileLayer } from '../../@ggcity/leaflet-tile-layer/leaflet-tile-layer.js';
import { LeafletGeoJSON } from '../../@ggcity/leaflet-geojson/leaflet-geojson-points.js';

var yaml = require('../../js-yaml/dist/js-yaml.min.js');
import template from './app.template.html';

export class GGMapViewer extends PolymerElement {
  static get template() {
    return template;
  }

  static get properties() {
    return {
      config: {
        type: String
      },
      mapTitle: {
        type: String,
        value: 'City of Garden Grove Public Maps'
      },
      flat: {
        type: Boolean,
        value: false,
      },
      map: {
        type: Object
      },
      baseSource: {
        type: String
      },
      baseFormat: {
        type: String
      },
      selectedOverlay: {
        type: Object,
        observer: '_overlayChanged'
      },
      wmsGroups: {
        type: Array,
        value: []
      },
      geojsonLayers: {
        type: Array,
        value: []
      },
      baseMaps: {
        type: Array
      },
      overlayMaps: {
        type: Array
      },
      searchMarkers: {
        type: Array,
        value: [],
        observer: '_markMap'
      }
    }
  }

  constructor() {
    super();

    this._markersGroup = new FeatureGroup([]);
  }

  connectedCallback() {
    super.connectedCallback();

    fetch(this.config).then(r => r.text())
      .then(this.initializeMap.bind(this));

    this.initializeSearch();
  }

  initializeMap(response) {
    console.log(location.hash);
    let rjson = yaml.safeLoad(response);

    this.baseMaps = rjson.baseMaps;
    this.overlayMaps = rjson.overlayMaps;

    if (this.flat && this.overlayMaps.length > 1) {
      console.error('You cannot enable flat mode with multiple overlays at this time.');
    }

    if (this.overlayMaps.length === 1) {
      this.flat = true;
    }

    if (rjson.mapTitle) {
      this.mapTitle = rjson.mapTitle;
    }

    // iterate through groups of layers
    for (let i = 0; i < this.overlayMaps.length; i++) {
      let l = this.overlayMaps[i].layers;
      this.overlayMaps[i].flattenedLayers = [];

      // iterate through layer interaction types (always on, exclusives, optionals)
      for (let t in l) {
        this.overlayMaps[i].flattenedLayers = this.overlayMaps[i].flattenedLayers.concat(l[t]);

        // iterate through all layers
        for (let j = 0; j < l[t].length; j++) {
          l[t][j].interaction = t;

          // always on layers should always be visible
          if (t === 'alwaysOn') {
            l[t][j].visible = true;
          }

          if (location.hash !== '') {
            if (l[t][j].machineName === location.hash.substring(1)) {
              l[t][j].visible = true;
            } else {
              l[t][j].visible = false;
            }
          }

          // For convenience, allow source to be globally defined, but propagate it here.
          if (
            (l[t][j].type === 'wms' || l[t][j].type === undefined)
            && l[t][j].source === undefined
          ) {
            l[t][j].type = 'wms';
            l[t][j].source = rjson.wmsDefaultSource;
          }
        }
      }
    }

    // FIXME: hacky hardcoded initial view
    this._selectedBasemap = 0;
    this.baseSource = this.baseMaps[0].source;
    this.baseFormat = this.baseMaps[0].format;
    this.baseLayers = this.baseMaps[0].layers;

    this.overlaySelect();
  }

  initializeSearch() {
    this._markersGroup.addTo(this.map);

    jQuery('#search', this.shadowRoot).autocomplete({
      preventBadQueries: false,
      deferRequestBy: 200,
      minChars: 3,
      serviceUrl: '//www.ci.garden-grove.ca.us/maps/api/addresses/search',
      paramName: 'q',
      // params: { limit: 10 },
      transformResult: function (response) {
        let addresses = JSON.parse(response).addresses;
        return {
          suggestions: addresses.map(d => ({ value: d.address, data: d }))
        }
      },
      onSearchStart: () => this.set('searchMakers', []),
      onSearchComplete: (q, s) => this.set('searchMarkers', s.map(obj => (
        { coords: [obj.data.latitude, obj.data.longitude], address: obj.data.address }
      ))),
      onSelect: obj => this.set('searchMarkers', [{ coords: [obj.data.latitude, obj.data.longitude], address: obj.data.address }])
    });
  }

  toggleLayer(event) {
    // First save the current state
    let currVisible = event.model.layer.visible;

    if (event.model.layer.interaction === 'exclusives') {
      // Turn all exclusive layers off
      for (let i = 0; i < this.selectedOverlay.layers.exclusives.length; i++) {
        this.set('selectedOverlay.layers.exclusives.' + i + '.visible', false);
      }
    }

    // Compute toggle on original state
    event.model.set('layer.visible', !currVisible);

    this._parseLayers(this.selectedOverlay);
  }

  overlaySelect(event) {
    this.selectedOverlay = (event) ? event.model.item : this.overlayMaps[0];

    if (this.selectedOverlay.resetViewOnSelect) {
      this.map.flyTo(this.selectedOverlay.initialCenter, this.selectedOverlay.initialZoom);
    }
  }

  // FIXE: Achtung! Uber hacky!!!
  switchBasemap(event) {
    let idx = ++this._selectedBasemap % 2;
    this.baseSource = this.baseMaps[idx].source;
    this.baseFormat = this.baseMaps[idx].format;
    this.baseLayers = this.baseMaps[idx].layers;

    if (idx === 1) {
      event.target.style.backgroundImage = "url(./vector.png)";
    } else {
      event.target.style.backgroundImage = "url(./aerial.png)";
    }
  }

  toggleLayersMenu() {
    let layersMenu = this.shadowRoot.querySelector('main#layers-menu');
    layersMenu.classList.toggle('show');
  }

  _parseLayers(overlay) {
    let layers = overlay.flattenedLayers;
    let wmsLayers = {};

    // reset
    this.set('wmsGroups', []);
    this.set('geojsonLayers', []);

    layers
      .filter(l => l.visible)
      .forEach(l => {
        if (l.type === 'wms') {
          // group the sources
          wmsLayers[l.source] = wmsLayers[l.source] || [];
          wmsLayers[l.source].push(l.machineName);
        } else if (l.type === 'geojson') {
          this.push('geojsonLayers', l);
        }
      });

    // flattened the grouped WMS sources
    for (let s in wmsLayers) {
      this.push('wmsGroups', { source: s, layers: wmsLayers[s] });
    }
  }

  _markMap(markersData) {
    this._markersGroup.clearLayers();
    if (markersData.length === 0) return;

    markersData.forEach(m => {
      this._markersGroup
        .addLayer(new Marker(m.coords, {
          icon: new Icon({
            iconUrl: icon,
            shadowUrl: iconShadow,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41]
          })
        }).bindPopup(m.address))
    });

    if (markersData.length === 1) this.map.flyTo(markersData[0].coords);
    else this.map.fitBounds(this._markersGroup.getBounds());
  }

  _isCurrentExclusive(layer) {
    return layer.visible;
  }

  _isCurrentOverlay(selected, item) {
    return selected === item;
  }

  _overlayChanged(newOverlay) {
    this._parseLayers(newOverlay);
  }

  _overlayLayersShow(selected, item) {
    if (selected === item || this.flat) return "collapse show";
    return "collapse";
  }

  _overlayItemClass(selected, item) {
    let defaultClass = "overlay-item d-flex justify-content-start";
    if (selected === item) return defaultClass + ' selected';
    return defaultClass;
  }

  // FIXME: make this less hardcodey
  downloadLayer(event) {
    event.stopPropagation();
    event.preventDefault();

    // if modal is not already found in light DOM, pull from shadow DOM
    let dom = (document.querySelector('#download-modal')) ? document : this.shadowRoot;

    let layer = event.model.layer;
    // FIXME: hardcoded url
    let downloadURL = `https://www.ci.garden-grove.ca.us/geoserver/gis/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer.machineName}`;

    jQuery('#layer-name', dom).html(layer.name);
    jQuery('#geojson-download', dom).attr('href', downloadURL + '&outputFormat=application/json');
    jQuery('#csv-download', dom).attr('href', downloadURL + '&outputFormat=csv');
    jQuery('#kml-download', dom).attr('href', downloadURL + '&outputFormat=application/vnd.google-earth.kml+xml');
    jQuery('#shapefile-download', dom).attr('href', downloadURL + '&outputFormat=SHAPE-ZIP');
    jQuery('#download-modal', dom).modal();
  }
}

customElements.define('gg-map-viewer', GGMapViewer);
