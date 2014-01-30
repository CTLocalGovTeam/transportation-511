﻿/*global define, document, Modernizr */
/*jslint sloppy:true */
/** @license
| Version 10.2
| Copyright 2013 Esri
|
| Licensed under the Apache License, Version 2.0 (the "License");
| you may not use this file except in compliance with the License.
| You may obtain a copy of the License at
|
|    http://www.apache.org/licenses/LICENSE-2.0
|
| Unless required by applicable law or agreed to in writing, software
| distributed under the License is distributed on an "AS IS" BASIS,
| WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
| See the License for the specific language governing permissions and
| limitations under the License.
*/
//============================================================================================================================//
define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom-geometry",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/_base/html",
    "dojo/string",
    "esri/tasks/locator",
    "esri/tasks/query",
    "../scrollBar/scrollBar",
    "dojo/Deferred",
    "dojo/_base/array",
    "dojo/DeferredList",
    "esri/tasks/QueryTask",
    "widgets/infoWindow/infoWindow",
    "esri/geometry",
    "dojo/text!./templates/locatorTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/shared/nls/localizedStrings",
    "dojo/i18n!application/nls/localizedStrings",
    "dojo/topic"
    ],
     function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, html, string, Locator, Query, scrollBar, Deferred, array, DeferredList, QueryTask, InfoWindow, Geometry, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, appNls, topic) {
         //========================================================================================================================//

         return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
             templateString: template,
             lastSearchString: null,
             stagedSearch: null,
             locatorScrollbar: null,
             selectedPoint: null,

             /**
             * display locator widget
             *
             * @class
             * @name widgets/locator/locator
             */
             postCreate: function () {

                 /**
                 * close locator widget if any other widget is opened
                 * @param {string} widget Key of the newly opened widget
                 */
                 topic.subscribe("toggleWidget", lang.hitch(this, function (widget) {
                     if (widget != "locator") {
                         if (domGeom.getMarginBox(this.divAddressHolder).h > 0) {
                             domClass.replace(this.domNode, "esriCTTdHeaderSearch", "esriCTTdHeaderSearch-select");
                             domClass.replace(this.divAddressHolder, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                             domClass.replace(this.divAddressHolder, "esriCTZeroHeight", "esriCTAddressContentHeight");
                             this.txtAddress.blur();
                         }
                     }
                 }));
                 topic.subscribe("setMapTipPosition", this._onSetMapTipPosition);
                 this.domNode = domConstruct.create("div", { "title": sharedNls.tooltips.search, "class": "esriCTTdHeaderSearch" }, null);
                 domConstruct.place(this.divAddressContainer, dom.byId("esriCTParentDivContainer"));
                 this.own(on(this.domNode, "click", lang.hitch(this, function () {
                     domStyle.set(this.imgSearchLoader, "display", "none");
                     domStyle.set(this.close, "display", "block");
                     /**
                     * minimize other open header panel widgets and show locator widget
                     */
                     topic.publish("toggleWidget", "locator");
                     this._showLocateContainer();
                 })));
                 domStyle.set(this.divAddressContainer, "display", "block");
                 domAttr.set(this.divAddressContainer, "title", "");
                 domAttr.set(this.imgSearchLoader, "src", dojoConfig.baseURL + "/shared/themes/images/blue-loader.gif");
                 this._setDefaultTextboxValue();
                 this._attachLocatorEvents();
             },

             _onSetMapTipPosition: function (selectedPoint, map) {
                 if (selectedPoint) {
                     var screenPoint = map.toScreen(selectedPoint);
                     screenPoint.y = map.height - screenPoint.y;
                     map.infoWindow.setLocation(screenPoint);
                 }
             },

             /**
             * set default value of locator textbox as specified in configuration file
             * @param {array} dojo.configData.LocatorSettings.Locators Locator settings specified in configuration file
             * @memberOf widgets/locator/locator
             */
             _setDefaultTextboxValue: function () {
                 var locatorSettings = dojo.configData.LocatorSettings;
                 /**
                 * txtAddress Textbox for search text
                 * @member {textbox} txtAddress
                 * @private
                 * @memberOf widgets/locator/locator
                 */

                 domAttr.set(this.txtAddress, "defaultAddress", locatorSettings.LocatorDefaultAddress);
             },

             /**
             * attach locator events
             * @memberOf widgets/locator/locator
             */
             _attachLocatorEvents: function () {
                 this.own(on(this.esriCTSearch, "click", lang.hitch(this, function (evt) {
                     domStyle.set(this.imgSearchLoader, "display", "block");
                     domStyle.set(this.close, "display", "none");
                     this.txtAddress.value = domAttr.get(this.txtAddress, "defaultAddress");
                     this._locateAddress(evt);
                 })));
                 this.own(on(this.txtAddress, "keyup", lang.hitch(this, function (evt) {
                     domStyle.set(this.close, "display", "block");
                     this._submitAddress(evt);
                 })));
                 this.own(on(this.txtAddress, "dblclick", lang.hitch(this, function (evt) {
                     this._clearDefaultText(evt);
                 })));
                 this.own(on(this.txtAddress, "blur", lang.hitch(this, function (evt) {
                     this._replaceDefaultText(evt);
                 })));
                 this.own(on(this.txtAddress, "focus", lang.hitch(this, function () {
                     domStyle.set(this.close, "display", "block");
                     domClass.add(this.txtAddress, "esriCTColorChange");

                 })));
                 this.own(on(this.close, "click", lang.hitch(this, function () {
                     this._hideText();
                 })));
             },

             _hideText: function () {
                 this.txtAddress.value = "";
             },

             /**
             * show/hide locator widget and set default search text
             * @memberOf widgets/locator/locator
             */
             _showLocateContainer: function () {
                 this.txtAddress.blur();
                 if (domGeom.getMarginBox(this.divAddressHolder).h > 0) {

                     /**
                     * when user clicks on locator icon in header panel, close the search panel if it is open
                     */
                     domClass.replace(this.domNode, "esriCTTdHeaderSearch", "esriCTTdHeaderSearch-select");
                     domClass.replace(this.divAddressHolder, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                     domClass.replace(this.divAddressHolder, "esriCTZeroHeight", "esriCTAddressContentHeight");
                     this.txtAddress.blur();
                 } else {

                     /**
                     * when user clicks on locator icon in header panel, open the search panel if it is closed
                     */
                     domClass.replace(this.domNode, "esriCTTdHeaderSearch-select", "esriCTTdHeaderSearch");
                     domClass.replace(this.txtAddress, "esriCTBlurColorChange", "esriCTColorChange");
                     domClass.replace(this.divAddressHolder, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                     domClass.add(this.divAddressHolder, "esriCTAddressContentHeight");

                     domStyle.set(this.txtAddress, "verticalAlign", "middle");
                     this.txtAddress.value = domAttr.get(this.txtAddress, "defaultAddress");
                     this.lastSearchString = lang.trim(this.txtAddress.value);
                 }
                 this._setHeightAddressResults();
             },

             /**
             * search address on every key press
             * @param {object} evt Keyup event
             * @memberOf widgets/locator/locator
             */
             _submitAddress: function (evt) {
                 if (evt) {
                     if (evt.keyCode == dojo.keys.ENTER) {
                         if (this.txtAddress.value != '') {
                             domStyle.set(this.imgSearchLoader, "display", "block");
                             domStyle.set(this.close, "display", "none");
                             this._locateAddress(evt);
                             return;
                         }
                     }
                     domStyle.set(this.imgSearchLoader, "display", "block");
                     domStyle.set(this.close, "display", "none");

                     /**
                     * do not perform auto complete search if alphabets,
                     * numbers,numpad keys,comma,ctl+v,ctrl +x,delete or
                     * backspace is pressed
                     */
                     if ((!((evt.keyCode >= 46 && evt.keyCode < 58) || (evt.keyCode > 64 && evt.keyCode < 91) || (evt.keyCode > 95 && evt.keyCode < 106) || evt.keyCode == 8 || evt.keyCode == 110 || evt.keyCode == 188)) || (evt.keyCode == 86 && evt.ctrlKey) || (evt.keyCode == 88 && evt.ctrlKey)) {
                         evt.cancelBubble = true;
                         evt.stopPropagation && evt.stopPropagation();
                         return;
                     }

                     /**
                     * call locator service if search text is not empty
                     */
                     if (domGeom.getMarginBox(this.divAddressContent).h > 0) {
                         if (lang.trim(this.txtAddress.value) != '') {
                             if (this.lastSearchString != lang.trim(this.txtAddress.value)) {
                                 this.lastSearchString = lang.trim(this.txtAddress.value);
                                 domConstruct.empty(this.divAddressResults);

                                 /**
                                 * clear any staged search
                                 */
                                 clearTimeout(this.stagedSearch);
                                 if (lang.trim(this.txtAddress.value).length > 0) {

                                     /**
                                     * stage a new search, which will launch if no new searches show up
                                     * before the timeout
                                     */
                                     this.stagedSearch = setTimeout(lang.hitch(this, function () {
                                         this.stagedSearch = this._locateAddress();
                                     }), 500);
                                 }
                             }
                         } else {
                             this.lastSearchString = lang.trim(this.txtAddress.value);
                             domStyle.set(this.imgSearchLoader, "display", "none");
                             domStyle.set(this.close, "display", "block");
                             domConstruct.empty(this.divAddressResults);
                         }
                     }
                 }
             },

             /**
             * perform search by addess if search type is address search
             * @memberOf widgets/locator/locator
             */
             _locateAddress: function () {
                 domConstruct.empty(this.divAddressResults);
                 if (lang.trim(this.txtAddress.value) == '') {
                     domStyle.set(this.imgSearchLoader, "display", "none");
                     domStyle.set(this.close, "display", "block");
                     domConstruct.empty(this.divAddressResults);
                     return;
                 } else {
                     this._searchLocation();
                 }
             },

             /**
             * call locator service and get search results
             * @memberOf widgets/locator/locator
             */
             _searchLocation: function () {
                 var nameArray = { Address: [] };
                 domStyle.set(this.imgSearchLoader, "display", "block");
                 domStyle.set(this.close, "display", "none");
                 domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
                 this._setHeightAddressResults();

                 /**
                 * call locator service specified in configuration file
                 */
                 var locatorSettings = dojo.configData.LocatorSettings;
                 var locator = new Locator(locatorSettings.LocatorURL);
                 var searchFieldName = locatorSettings.LocatorParameters.SearchField;
                 var addressField = {};
                 addressField[searchFieldName] = lang.trim(this.txtAddress.value);
                 var baseMapExtent = this.map.getLayer(this.map.basemapLayerIds[0]).fullExtent;
                 var options = {};
                 options["address"] = addressField;
                 options["outFields"] = locatorSettings.LocatorOutFields;
                 options[locatorSettings.LocatorParameters.SearchBoundaryField] = baseMapExtent;
                 locator.outSpatialReference = this.map.spatialReference;
                 var searchFields = [];
                 var addressFieldValues = dojo.configData.LocatorSettings.FilterFieldValues;
                 var addressFieldName = dojo.configData.LocatorSettings.FilterFieldName;
                 for (var s in addressFieldValues) {
                     if (addressFieldValues.hasOwnProperty(s)) {
                         searchFields.push(addressFieldValues[s]);
                     }
                 }

                 /**
                 * get results from locator service
                 * @param {object} options Contains address, outFields and basemap extent for locator service
                 * @param {object} candidates Contains results from locator service
                 */
                 var defferedArray = [];
                 for (var index = 0; index < dojo.configData.SearchAnd511Settings.length; index++) {
                     this._locateLayersearchResult(defferedArray, dojo.configData.SearchAnd511Settings[index]);

                 }
                 var locatorDef = locator.addressToLocations(options);
                 locator.on("address-to-locations-complete", lang.hitch(this, function (candidates) {
                     var deferred = new Deferred();
                     deferred.resolve(candidates);
                     return deferred.promise;
                 }), function () {
                     domStyle.set(this.imgSearchLoader, "display", "none");
                     domStyle.set(this.close, "display", "block");
                     this._locatorErrBack();
                 });
                 var resultLength;
                 defferedArray.push(locatorDef);
                 var deferredListResult = new DeferredList(defferedArray);
                 deferredListResult.then(lang.hitch(this, function (result) {
                     if (result) {
                         if (result.length > 0) {
                             for (var num = 0; num < result.length; num++) {
                                 if (dojo.configData.SearchAnd511Settings[num]) {
                                     var key = dojo.configData.SearchAnd511Settings[num].SearchDisplayTitle;
                                     nameArray[key] = [];
                                     for (var order = 0; order < result[num][1].features.length; order++) {
                                         if (nameArray[key].length < dojo.configData.LocatorSettings.MaxResults) {
                                             nameArray[key].push({
                                                 name: string.substitute(dojo.configData.SearchAnd511Settings[num].SearchDisplayFields, result[num][1].features[order].attributes),
                                                 attributes: result[num][1].features[order].attributes,
                                                 layer: dojo.configData.SearchAnd511Settings[num]
                                             });
                                         }
                                     }
                                 } else {
                                     this._addressResult(result[num][1], nameArray, searchFields, addressFieldName);
                                 }
                                 resultLength = result[num][1].length;
                             }
                             this._showLocatedAddress(nameArray, resultLength);
                         }
                     }
                     else {
                         domClass.remove(this.divAddressContent, "esriCTAddressContainerHeight");
                         domStyle.set(this.imgSearchLoader, "display", "none");
                         domStyle.set(this.close, "display", "block");
                         this.mapPoint = null;
                         this._locatorErrBack();
                     }
                 }));
             },

             _addressResult: function (candidates, nameArray, searchFields, addressFieldName) {
                 for (var order = 0; order < candidates.length; order++) {
                     if (candidates[order].attributes[dojo.configData.LocatorSettings.AddressMatchScore.Field] > dojo.configData.LocatorSettings.AddressMatchScore.Value) {
                         for (var j in searchFields) {
                             if (searchFields.hasOwnProperty(j)) {
                                 if (candidates[order].attributes[addressFieldName] == searchFields[j]) {
                                     if (nameArray.Address.length < dojo.configData.LocatorSettings.MaxResults) {
                                         nameArray.Address.push({
                                             name: string.substitute(dojo.configData.LocatorSettings.DisplayField, candidates[order].attributes),
                                             attributes: candidates[order]
                                         });
                                     }
                                 }
                             }
                         }
                     }
                 }
             },

             _locateLayersearchResult: function (defferedArray, layerobject) {
                 domStyle.set(this.imgSearchLoader, "display", "block");
                 domStyle.set(this.close, "display", "none");
                 if (layerobject.QueryURL) {
                     var queryTask = new QueryTask(layerobject.QueryURL);
                     var query = new Query();
                     query.where = string.substitute(layerobject.SearchExpression, [lang.trim(this.txtAddress.value).toUpperCase()]);
                     query.outSpatialReference = this.map.spatialReference;
                     query.returnGeometry = false;
                     query.outFields = ["*"];
                     var queryTaskResult = queryTask.execute(query, lang.hitch(this, function (featureSet) {
                         var deferred = new Deferred();
                         deferred.resolve(featureSet);
                         return deferred.promise;
                     }), function (err) {
                         alert("error");
                     });
                     defferedArray.push(queryTaskResult);
                 }
             },

             /**
             * filter valid results from results returned by locator service
             * @param {object} candidates Contains results from locator service
             * @memberOf widgets/locator/locator
             */
             _showLocatedAddress: function (candidates, resultLength) {
                 domConstruct.empty(this.divAddressResults);
                 if (lang.trim(this.txtAddress.value) === "") {
                     this.txtAddress.focus();
                     domConstruct.empty(this.divAddressResults);
                     this.locatorScrollbar = new scrollBar({ domNode: this.divAddressScrollContent });
                     this.locatorScrollbar.setContent(this.divAddressResults);
                     this.locatorScrollbar.createScrollBar();
                     domStyle.set(this.imgSearchLoader, "display", "none");
                     domStyle.set(this.close, "display", "block");
                     return;
                 }

                 /**
                 * display all the located address in the address container
                 * 'this.divAddressResults' div dom element contains located addresses, created in widget template
                 */

                 if (this.locatorScrollbar) {
                     domClass.add(this.locatorScrollbar._scrollBarContent, "esriCTZeroHeight");
                     this.locatorScrollbar.removeScrollBar();
                 }
                 this.locatorScrollbar = new scrollBar({ domNode: this.divAddressScrollContent });
                 this.locatorScrollbar.setContent(this.divAddressResults);
                 this.locatorScrollbar.createScrollBar();
                 if (resultLength > 0) {
                     for (var candidateArray in candidates) {
                         if (candidates[candidateArray].length > 0) {
                             var divAddressCounty = domConstruct.create("div", { "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty" }, this.divAddressResults);
                             domAttr.set(divAddressCounty, "innerHTML", candidateArray);
                             domStyle.set(this.imgSearchLoader, "display", "none");
                             domStyle.set(this.close, "display", "block");
                             for (var i = 0; i < candidates[candidateArray].length; i++) {
                                 this._displayValidLocations(candidates[candidateArray][i], i, candidates[candidateArray]);
                             }
                         }
                     }
                 }
                 else {
                     domStyle.set(this.imgSearchLoader, "display", "none");
                     domStyle.set(this.close, "display", "block");
                     this.mapPoint = null;
                     this._locatorErrBack();
                     domClass.remove(this.divAddressContent, "esriCTAddressContainerHeight");
                 }
             },

             /**
             * display valid result in search panel
             * @param {object} candidate Contains valid result to be displayed in search panel
             * @return {Boolean} true if result is displayed successfully
             * @memberOf widgets/locator/locator
             */
             _displayValidLocations: function (candidate, index, candidateArray) {
                 domClass.add(this.divAddressContent, "esriCTAddressContainerHeight");
                 var candidateDate = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer" }, this.divAddressResults);
                 domAttr.set(candidateDate, "index", index);
                 try {
                     if (candidate.name) {
                         domAttr.set(candidateDate, "innerHTML", candidate.name);
                     }
                     else {
                         domAttr.set(candidateDate, "innerHTML", candidate);
                     }
                     if (candidate.attributes.location) {
                         domAttr.set(candidateDate, "x", candidate.attributes.location.x);
                         domAttr.set(candidateDate, "y", candidate.attributes.location.y);
                         domAttr.set(candidateDate, "address", string.substitute(dojo.configData.LocatorSettings.DisplayField, candidate.attributes.attributes));
                     }
                 } catch (err) {
                     alert(sharedNls.errorMessages.falseConfigParams);
                 }
                 var _this = this;
                 candidateDate.onclick = function (evt) {
                     _this.txtAddress.value = this.innerHTML;
                     domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                     _this._hideAddressContainer();
                     if (candidate.attributes.location) {
                         _this.mapPoint = new esri.geometry.Point(domAttr.get(this, "x"), domAttr.get(this, "y"), _this.map.spatialReference);
                         _this._locateAddressOnMap(_this.mapPoint);
                     }
                     else {
                         if (candidateArray[domAttr.get(candidateDate, "index", index)]) {
                             var counter = 0;
                             var layer = candidateArray[domAttr.get(candidateDate, "index", index)].layer.QueryURL;
                             for (infoIndex = 0; infoIndex < dojo.configData.InfoWindowSettings.length; infoIndex++) {
                                 if (dojo.configData.InfoWindowSettings[infoIndex] && dojo.configData.InfoWindowSettings[infoIndex].InfoQueryURL == layer) {
                                     _this._showFeatureResultsOnMap(candidateArray, candidate, infoIndex, index);
                                 }
                             }
                         }
                     }
                 };
             },

             _showFeatureResultsOnMap: function (candidateArray, candidate, infoIndex, index) {
                 domStyle.set(this.imgSearchLoader, "display", "block");
                 domStyle.set(this.close, "display", "none");
                 this.txtAddress.value = (candidate.name);
                 if (candidate.layer.QueryURL) {
                     var queryTask = new QueryTask(candidate.layer.QueryURL);
                     var query = new Query();
                     if (candidate.layer.InfoSearchExpression && candidate.layer.InfoSearchExpression.length != 0) {
                         query.where = candidate.layer.InfoSearchExpression;
                     } else {
                         query.where = "1=1";
                     }
                     query.outSpatialReference = this.map.spatialReference;
                     query.returnGeometry = true;
                     query.outFields = ["*"];
                     var queryTaskResult = queryTask.execute(query, lang.hitch(this, function (featureSet) {
                         if (featureSet.features[index].geometry.type == "point") {
                             this._createInfoWindowContent(featureSet.features[index].geometry, featureSet.features[index].attributes, featureSet.fields, candidate.layer, infoIndex);
                         } else if (featureSet.features[index].geometry.type == "polyline") {
                             var point = featureSet.features[index].geometry.getPoint(0, 0);
                             this._createInfoWindowContent(point, featureSet.features[index].attributes, featureSet.fields, candidate.layer, infoIndex);
                         }
                     }));
                 }
             },

             _createInfoWindowContent: function (mapPoint, attributes, fields, layer, infoIndex) {
                 var layerSettings = dojo.configData;
                 var infoPopupFieldsCollection = layerSettings.InfoWindowSettings[infoIndex].InfoWindowData;
                 var infoWindowTitle = layerSettings.InfoWindowSettings[infoIndex].InfoWindowHeaderField;
                 var infoPopupHeight = dojo.configData.InfoPopupHeight;
                 var infoPopupWidth = dojo.configData.InfoPopupWidth;
                 var showNullAs = dojo.configData.ShowNullValueAs;
                 selectedPoint = mapPoint;
                 var divInfoDetailsTab = domConstruct.create("div", { "class": "esriCTInfoDetailsTab" }, null);
                 var divInfoDetailsContainer = domConstruct.create("div", { "class": "divInfoDetailsContainer scrollbar_container" }, divInfoDetailsTab);
                 divInfoDetailsContainer.style.height = (infoPopupHeight - 80) + "px";
                 var divInfoDetailsContent = domConstruct.create("div", { "class": "esriCTInfoDetailsContent scrollbar_content" }, divInfoDetailsContainer);
                 domStyle.set(divInfoDetailsContent, "display", "block");
                 divInfoDetailsContent.style.height = (infoPopupHeight - 80) + "px";
                 var divInfoPopup = domConstruct.create("div", { "className": "esriCTdivTransparent" }, divInfoDetailsContent);
                 for (var key = 0; key < infoPopupFieldsCollection.length; key++) {
                     var divInfoRow = domConstruct.create("div", {}, divInfoPopup);
                     // Create the row's label
                     this.divInfoDisplayField = domConstruct.create("div", { "className": "esriCTDisplayField", "innerHTML": infoPopupFieldsCollection[key].DisplayText }, divInfoRow);
                     this.divInfoFieldValue = domConstruct.create("div", { "className": "esriCTValueField" }, divInfoRow);
                     var valueString = "";
                     var fieldNames = string.substitute(infoPopupFieldsCollection[key].FieldName, attributes);
                     if (infoPopupFieldsCollection[key].FieldName == "${Link}" || infoPopupFieldsCollection[key].FieldName == "Link") {
                         var link = fieldNames;
                         var divLink = domConstruct.create("div", { class: "esriCTLink", innerHTML: "Link" }, this.divInfoFieldValue);
                         on(divLink, "click", lang.hitch(this, function () {
                             window.open(link);
                         }));
                     }
                     else {
                         this.divInfoFieldValue.innerHTML = fieldNames;
                     }
                 }
                 var divDetailsDisplay = domConstruct.create("div", { "class": "esriCTDetailsDisplay" }, divInfoDetailsTab);
                 var divDisplayTable = domConstruct.create("div", {}, divDetailsDisplay);
                 var divDisplayRow = domConstruct.create("div", {}, divDisplayTable);
                 var divDisplayColumn1 = domConstruct.create("div", {}, divDisplayRow);
                 var divDisplayColumn2 = domConstruct.create("div", {}, divDisplayRow);
                 this.map.infoWindow.resize(infoPopupWidth, infoPopupHeight);
                 var possibleTitleFields = infoWindowTitle.split(",");
                 var infoTitle = string.substitute(layerSettings.InfoWindowSettings[infoIndex].InfoWindowHeaderField, attributes); ;
                 this.map.infoWindow.hide();
                 selectedMapPoint = mapPoint;
                 dojo.selectedMapPoint = selectedMapPoint;
                 this.map.setExtent(this._getBrowserMapExtent(selectedMapPoint));
                 var screenPoint = this.map.toScreen(selectedMapPoint);
                 screenPoint.y = this.map.height - screenPoint.y;
                 this.map.infoWindow.setTitle(infoTitle);
                 this.map.infoWindow.show(divInfoDetailsTab, screenPoint);
                 this.map.setLevel(dojo.configData.ZoomLevel);
                 this.map.centerAt(mapPoint);
             },

             _getBrowserMapExtent: function (mapPoint) {
                 var width = this.map.extent.getWidth();
                 var height = this.map.extent.getHeight();
                 var xmin = mapPoint.x - (width / 2);
                 var ymin = mapPoint.y - (height / 2.7);
                 var xmax = xmin + width;
                 var ymax = ymin + height;
                 return new Geometry.Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
             },

             _locateAddressOnMap: function (mapPoint) {
                 var geoLocationPushpin, locatorMarkupSymbol, graphic;
                 this.map.setLevel(dojo.configData.ZoomLevel);
                 this.map.centerAt(mapPoint);
                 geoLocationPushpin = dojoConfig.baseURL + dojo.configData.LocatorSettings.DefaultLocatorSymbol;
                 locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(geoLocationPushpin, "35", "35");
                 graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {}, null);
                 this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                 this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
             },

             /**
             * hide search panel
             * @memberOf widgets/locator/locator
             */
             _hideAddressContainer: function () {
                 domClass.replace(this.domNode, "esriCTTdHeaderSearch", "esriCTTdHeaderSearch-select");
                 this.txtAddress.blur();
                 domClass.replace(this.divAddressHolder, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                 domClass.replace(this.divAddressHolder, "esriCTZeroHeight", "esriCTAddressContentHeight");
             },

             /**
             * set height of the search panel
             * @memberOf widgets/locator/locator
             */
             _setHeightAddressResults: function () {

                 /**
                 * divAddressContent Container for search results
                 * @member {div} divAddressContent
                 * @private
                 * @memberOf widgets/locator/locator
                 */
                 var height = domGeom.getMarginBox(this.divAddressContent).h;
                 if (height > 0) {

                     /**
                     * divAddressScrollContent Scrollbar container for search results
                     * @member {div} divAddressScrollContent
                     * @private
                     * @memberOf widgets/locator/locator
                     */
                     domStyle.set(this.divAddressScrollContent, "height", (height - 120) + "px");
                 }
             },

             /**
             * display search by address tab
             * @memberOf widgets/locator/locator
             */
             _showAddressSearchView: function () {
                 if (domStyle.get(this.imgSearchLoader, "display", "block") == "block") {
                     return;
                 }
                 this.txtAddress.value = domAttr.get(this.txtAddress, "defaultAddress");
                 this.lastSearchString = lang.trim(this.txtAddress.value);
                 domConstruct.empty(this.divAddressResults);
             },

             /**
             * display error message if locator service fails or does not return any results
             * @memberOf widgets/locator/locator
             */
             _locatorErrBack: function () {
                 domConstruct.empty(this.divAddressResults);
                 domStyle.set(this.imgSearchLoader, "display", "none");
                 domStyle.set(this.close, "display", "block");
                 domClass.remove(this.divAddressContent, "esriCTAddressContainerHeight");
                 var errorAddressCounty = domConstruct.create("div", { "class": "esriCTBottomBorder esriCTCursorPointer esriAddressCounty" }, this.divAddressResults);
                 domAttr.set(errorAddressCounty, "innerHTML", sharedNls.errorMessages.invalidSearch);
             },

             /**
             * clear default value from search textbox
             * @param {object} evt Dblclick event
             * @memberOf widgets/locator/locator
             */
             _clearDefaultText: function (evt) {
                 var target = window.event ? window.event.srcElement : evt ? evt.target : null;
                 if (!target) return;
                 target.style.color = "#FFF";
                 target.value = '';
             },

             /**
             * set default value to search textbox
             * @param {object} evt Blur event
             * @memberOf widgets/locator/locator
             */
             _replaceDefaultText: function (evt) {
                 var target = window.event ? window.event.srcElement : evt ? evt.target : null;
                 if (!target) return;
                 this._resetTargetValue(target, "defaultAddress");
             },

             /**
             * set default value to search textbox
             * @param {object} target Textbox dom element
             * @param {string} title Default value
             * @param {string} color Background color of search textbox
             * @memberOf widgets/locator/locator
             */
             _resetTargetValue: function (target, title) {
                 if (target.value == '' && domAttr.get(target, title)) {
                     target.value = target.title;
                     if (target.title == "") {
                         target.value = domAttr.get(target, title);
                     }
                 }
                 if (domClass.contains(target, "esriCTColorChange")) {
                     domClass.remove(target, "esriCTColorChange");
                 }
                 domClass.add(target, "esriCTBlurColorChange");
                 this.lastSearchString = lang.trim(this.txtAddress.value);
             }
         });
     });