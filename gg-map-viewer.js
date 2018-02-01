import { Element as PolymerElement } from '../../@polymer/polymer/polymer-element.js';
import '../../@polymer/paper-toggle-button/paper-toggle-button.js';

import { LeafletMap } from '../../@ggcity/leaflet-map/leaflet-map.js';
import { LeafletWMSGroup } from '../../@ggcity/leaflet-wms/leaflet-wms-group.js';
import { LeafletTileLayer } from '../../@ggcity/leaflet-tile-layer/leaflet-tile-layer.js';
import { LeafletGeoJSON } from '../../@ggcity/leaflet-geojson/leaflet-geojson-points.js';


// wtf
var yaml = require('../../js-yaml/dist/js-yaml.min.js');
// wtf2
import template from './app.template.html';
4
export class GGMapViewer extends PolymerElement {
  static get template() {
    return template;
  }

  static get properties() {
    return {
      config: {
        type: String
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
      }
    }
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    fetch(this.config).then(r => r.text())
      .then(this.initialize.bind(this));
  }

  initialize(response) {
    let rjson = yaml.safeLoad(response);

    this.baseMaps = rjson.baseMaps;
    this.overlayMaps = rjson.overlayMaps;

    // iterate through groups of layers
    for (let i = 0; i < this.overlayMaps.length; i++) {
      let l = this.overlayMaps[i].layers;
      this.overlayMaps[i].flattenedLayers = [];

      // iterate through layer interaction types (always on, exclusives, optionals)
      for (let t in l) {
        this.overlayMaps[i].flattenedLayers = this.overlayMaps[i].flattenedLayers.concat(l[t]);

        // iterate through layers
        for (let j = 0; j < l[t].length; j++) {
          l[t][j].interaction = t;

          // always on layers should always be visible
          if (t === 'alwaysOn') {
            l[t][j].visible = true;
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

  _parseLayers(overlay) {
    console.log('parsing this overlay', overlay);

    let layers = overlay.flattenedLayers;
    let wmsLayers = {};

    // reset
    this.wmsGroups = [];
    this.geojsonLayers = [];

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

    console.log('wmsGroups', this.wmsGroups);
    console.log('geojsonLayers', this.geojsonLayers);
  }

  toggleLayer(event) {
    // First save the current state
    let currVisible = event.model.layer.visible;

    if (event.model.layer.interaction === 'exclusives') {
      // Turn all exclusive layers off
      for(let i = 0; i < this.selectedOverlay.layers.exclusives.length; i++) {
        this.set('selectedOverlay.layers.exclusives.' + i + '.visible', false);
      }
    }

    // Compute toggle on original state
    event.model.set('layer.visible', !currVisible);

    this._parseLayers(this.selectedOverlay);
  }

  _isCurrentExclusive(layer) {
    return layer.visible;
  }

  overlaySelect(event) {
    this.selectedOverlay = (event) ? event.model.item : this.overlayMaps[0];

    if (this.selectedOverlay.resetViewOnSelect) {
      this.map.flyTo(this.selectedOverlay.initialCenter, this.selectedOverlay.initialZoom);
    }
  }

  _overlayChanged(newOverlay) {
    console.log('overlay changed fired');
    this._parseLayers(newOverlay);
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

  _isCurrentOverlay(selected, item) {
    return selected === item;
  }

  _overlayLayersShow(selected, item) {
    if (selected === item) return "collapse show";
    return "collapse";
  }

  _overlayItemClass(selected, item) {
    let defaultClass = "overlay-item d-flex justify-content-start";
    if (selected === item) return defaultClass + ' selected';
    return defaultClass;
  }

  toggleLayersMenu() {
    let layersMenu = this.shadowRoot.querySelector('main#layers-menu');
    layersMenu.classList.toggle('show');
  }

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
