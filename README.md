# \<gg-map-viewer\>

UI for selecting groups of map overlays. Requires Polymer 3.x.

Installation
------------

This currently comes in as pure ES6 only.

    $ yarn add @ggcity/map-viewer

Usage
-----

Coming soon!


TODO
----

Features:
* ~~Download interface~~
* ~~Mobile view~~
* Accessibility
* Address search and markers
* Search suggestions
* Flat view of layers
* ~~Fetch layers in YAML instead of hard-coding them~~
* ~~Fetch URL should be an element's property~~
* Page title should be also property of this element
* Tour
* ~~Aerial toggle button image~~
* Smooth accordion animation for sublayers
* ~~Fetch external HTML~~
* Permalink
* (Optional) Sync aerial toggle to map pan / zoom
* (Optional) Get feature info about how many features before download

Bugs:
* Fix tile layer loading (should disconnect component, not refresh layer)
* ~~Fix Chrome~~
* Map toggle should not be able to untoggle visually

Project tasks:
* Write tests!
* Write usage README
* Rename project
* ~~Babel~~
* ~~Production build~~
* Decouple leaflet-map elements from this element, if possible!
* Comment code
* Publish on NPM
* ~~Create a GitHub Pages~~

Maintainers
-----------

* Rachot Moragraan ([mooman](https://github.com/mooman)) - moo@ci.garden-grove.ca.us

License
-------

    Copyright (C) 2017 City of Garden Grove

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.