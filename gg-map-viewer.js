import { Element as PolymerElement } from '../../@polymer/polymer/polymer-element.js';
import '../../@polymer/paper-toggle-button/paper-toggle-button.js';

import { LeafletMap } from '../../@ggcity/leaflet-map/leaflet-map.js';
import { LeafletWMSGroup } from '../../@ggcity/leaflet-wms/leaflet-wms-group.js';
import { LeafletTileLayer } from '../../@ggcity/leaflet-tile-layer/leaflet-tile-layer.js';

// wtf
var yaml = require('../../js-yaml/dist/js-yaml.min.js');
// wtf2
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
      wmsSource: {
        type: String,
        value: ''
      },
      wmsLayers: {
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

  initialize(response){
    let rjson = yaml.safeLoad(response);

    this.baseMaps = rjson.baseMaps;
    this.overlayMaps = rjson.overlayMaps;

    // FIXME: hacky hardcoded initial view
    this._selectedBasemap = 0;
    this.baseSource = this.baseMaps[0].source;
    this.baseFormat = this.baseMaps[0].format;
    this.baseLayers = this.baseMaps[0].layers;

    this.overlaySelect();
  }

  toggleLayersMenu() {
    let layersMenu = this.shadowRoot.querySelector('main#layers-menu');
    layersMenu.classList.toggle('show');
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

  overlaySelect(event) {
    this.selectedOverlay = (event) ? event.model.item : this.overlayMaps[0];

    if (this.selectedOverlay.resetViewOnSelect) {
      this.map.flyTo(this.selectedOverlay.initialCenter, this.selectedOverlay.initialZoom);
    }
  }
  // FIXME: what if you were in other overlay and select another overlay's layer?
  exclusiveSelect(event) {
    // First save the current state
    let currVisible = event.model.layer.visible;
    // Then turn all layers off
    this.selectedOverlay.layers.exclusives.forEach(e => e.visible = false);
    // Compute toggle on original state
    event.model.layer.visible = !currVisible;

    // Refresh layers list
    this.wmsLayers = this._computeOverlaysList(this.selectedOverlay.layers);
  }

  // FIXME: this depends on wmsLayer to trigger re-evaluation :(
  // We should be using this.set instead
  _isCurrentExclusive(layer) {
    return layer.visible;
  }
  
  optionalSelect(event) {
    event.model.set('layer.visible', !event.model.layer.visible);
    this.wmsLayers = this._computeOverlaysList(this.selectedOverlay.layers);    
  }

  _overlayChanged(newOverlay) {
    let layers = newOverlay.layers;

    // Update wms-group
    this.wmsSource = newOverlay.source;
    this.wmsLayers = this._computeOverlaysList(layers);
  }

  _computeOverlaysList(layers) {
    let result = [];

    // first tack on alwaysOn layers by default
    if (layers.alwaysOn) {
      result.push(...layers.alwaysOn.reverse());
    }

    // now tack on the ONE exclusive
    if (layers.exclusives) {
      let e = layers.exclusives.find(l => l.visible);
      if (e) result.push(e.machineName);
    }

    // then the rest of the optionals
    // machineName of all visible optional layers
    if (layers.optionals) {
      result.push(
        ...layers.optionals
        .filter(l => l.visible)
        .map(l => l.machineName)
        .reverse()
      );
    }

    return result;
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
