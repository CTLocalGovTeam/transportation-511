﻿/*global define */
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
define({
        showNullValue: "@fr@ N/A",
        buttons: {
            okButtonText: "@fr@ OK",
            print: "@fr@ Print",
            back: "@fr@ Back",
            more: "@fr@ More",
            less: "@fr@ Less",
            link: "@fr@ Link",
            email: "Email",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
            Facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
            Twitter: "Twitter",  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
        },
        tooltips: {
            search: "Rechercher",
            route: "@fr@ Route",
            locate: "Emplacement actuel",
            share: "Partager",
            help: "Aide"
        },
        titles: {
            directionsDisplayText: "@fr@ Directions",
            informationPanelTitle: "@fr@ Information for current map view",
            frequentRoute: "@fr@ Frequently travelled route",
            webpageDisplayText: "@fr@ Copy/paste HTML into your web page"
        },
        sentenceFragment: {
            to: "@fr@ to"
        },
        errorMessages: {
            invalidSearch: "Aucun résultat",
            falseConfigParams: "Valeurs clés de configuration requis sont null ou pas exactement correspondant à des attributs de la couche. Ce message peut apparaître plusieurs fois.",
            invalidLocation: "@fr@ Current location not found.",
            invalidProjection: "@fr@ Unable to plot current location on the map.",
            widgetNotLoaded: "@fr@ Unable to load widgets.",
            shareLoadingFailed: "@fr@ Unable to load share options.",
            shareFailed: "@fr@ Unable to share.",
            noDirection: "@fr@ No direction found"
        },
        notUsed: {
            addressDisplayText: "@fr@ Address",
            backToMap: "@fr@ Back to map"
        },


        appSpecific: {
            titles: {
                informationDisplayText: "@fr@ 511 Information",
                reRouteDisplayText: "@fr@ Traffic Incidents found on this road"
            },
            messages: {
                splashScreenContent: "Une application qui permet au public de trouver des informations sur l'état des routes, 511 alertes, les problèmes de circulation, et al."
            },
            notUsed: {
                incidentInformationDisplayText: "@fr@ Incident Information"
            }
        }
});
