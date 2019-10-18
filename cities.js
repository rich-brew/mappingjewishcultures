let view;
let map;
let id;
let geom;
let layer;
let cafeLayer;
let sql = "";
let cafes;
let startYear = 1800;
let endYear = 2000;
require(["dojo/parser", "dojox/form/RangeSlider", "dojo/ready"],
    function(parser, RangeSlider, ready){
        ready(function() {
            parser.parse();
            console.log("Parsed");
            var rangeSlider = new dojox.form.HorizontalRangeSlider({
                id: "yearSlider",
                value: [startYear, endYear],
                minimum: 1800,
                maximum: 2000,
                intermediateChanges: true,
                discreteValues: 231,
                showButtons: false,
                onChange: function (value) {
                    dojo.byId("startYear").value = Math.round(value[0]);
                    dojo.byId("endYear").value = Math.round(value[1]);
                    doSearch();
                }
            }, "yearRange");

            dojo.byId("startYear").value = startYear;
            dojo.byId("endYear").value = endYear;
        });
    });
require([
    "esri/Map",
    "esri/views/MapView",
    "esri/WebMap",
    "esri/layers/VectorTileLayer",
    "esri/layers/TileLayer",
    "esri/PopupTemplate",
    "esri/layers/FeatureLayer",
    "esri/widgets/Popup",
    "esri/widgets/Popup/PopupViewModel",
    "esri/widgets/Home",
    "esri/widgets/Search",
    "esri/widgets/Expand",
    "esri/widgets/LayerList",
    "dojo/on",
    "dojo/domReady!",
], function(Map, MapView, WebMap, VectorTileLayer, TileLayer, PopupTemplate, FeatureLayer, Popup, PopupVM, Home, Search, Expand, LayerList, on) {


    /************************************************************
     * Define the feature and vector tile layers that will be added to the map, define popupTemplates, set arcadeExpressionInfos
     **************************************************************/


    var tilesytle = new VectorTileLayer({ //Add the vector tile layer of the gray basemap. In order to have the correct style rendering, specify the style (.json) rather than the vector tile service (the same service is used for multiple basemaps)
        url: "https://umich.maps.arcgis.com/sharing/rest/content/items/291da5eab3a0412593b66d384379f89f/resources/styles/root.json",
        //portalItem: {
        //    id: "93d2afe8c4f94d15bc193c1fe5282d09"
        //},
        title: "Basemap",
        listMode: "hide"
        //visible at all scales
    });

    var zoomInAction = {//define the custom zoom to city action for the popup template
        title: "Zoom to city",
        id: "zoom-in",
        className: "esri-icon-organization"
    };

    var citiesTemplate = {//autocasts as a new popup template
        title: "{Name}",
        content:[{
            type: "text",
            text: "{: displayURL}" //call the displayURL function to format the text.
        },{
            type: "media",
            mediaInfos: [{
                type: "image",
                value: {
                    sourceURL: "{ImageURL}"
                }
            }]
        }],
        overwriteActions: true,
        actions: [zoomInAction], //adding the custom zoom action to the popupTemplate
        outFields: ["*"] //include all fields for use in popupTemplate.
    };

    displayURL = function (value, key, data) {
        //function for formatting text display in citiesTemplate. Text with link to Story Map only displays when a story map exists for a city.
        // var url = data.StoryMapURL; //access data attribute of field "StoryMapURL"
        var url = data.EmbeddedStoryURL;
        var city = data.Name; //access data attribute of field "Name"
        if (url == null){
            return " ";
        } else {
            return "For a guided tour of " + city + " see the </strong><a href=" + url + " target='_blank'>Story Map</a>";
            // return 'For a guided tour of ' + city + ' see the <iframe src=' + url + '></iframe>'; //testing iframe
            //  return "For a guided tour of " + city + " see the </strong><a href=" + url + " target='StoryMapFrame'>Story Map</a>"; //testing iframe
        };
    };

    var cities = new FeatureLayer({
        url: "https://services1.arcgis.com/4ezfu5dIwH83BUNL/arcgis/rest/services/Mapping_Jewish_Diasporic_Cultures_Cities/FeatureServer/0",
        popupTemplate: citiesTemplate,
        title: "Cities",
        outFields: ["*"], //ensures all the attribute fields are included in the layer
        //min and max scale already set for the hosted feature service
        definitionExpression: "(Name not like 'Paris') AND (Name not like 'Lviv (Lemberg)')"
    });

    console.log(cities);


    var arcadeExpressionInfos = [{ //grabbing the output of arcade expressions by id and putting into an array to be set in the cafesTemplate expressionInfos
        name: "establishedPresent-arcade",
        // expression: document.getElementById("establishedPresent-arcade").text
        expression: 'IIf(IsEmpty($feature.established), " ", "Established: ");'
    },{
        name: "establishedDate-arcade",
        // expression: document.getElementById("establishedDate-arcade").text
        expression: 'IIf(IsEmpty($feature.established), " ", Year($feature.established));'
    },{
        name: "closedPresent-arcade",
        // expression: document.getElementById("closedPresent-arcade").text
        expression: 'IIf(IsEmpty($feature.closed), " ", "Closed: ");'

    },{
        name: "closedDate-arcade",
        // expression: document.getElementById("closedDate-arcade").text
        expression: 'IIf(IsEmpty($feature.closed), " ", Year($feature.closed));'
    }];


    var cafesTemplate = {//autocasts as a new popup template
        title: "{name}",
        expressionInfos: arcadeExpressionInfos,
        content: [{
            type: "text",
            text: "{expression/establishedPresent-arcade} {expression/establishedDate-arcade}" //Established: YYYY, displays blank if no data
        },{
            type: "text",
            text: "{expression/closedPresent-arcade} {expression/closedDate-arcade}" //Closed: YYYY, displays blank if no data
        },{
            type: "media",
            mediaInfos: [{
                type: "image",
                value: {
                    sourceURL: "{image_url}"
                }
            }]
        }]
    };

    var cafes = new FeatureLayer({
        url: "https://services1.arcgis.com/4ezfu5dIwH83BUNL/arcgis/rest/services/Cafes_and_Landmarks/FeatureServer/0",
        title: "Cafes and Landmarks",
        popupTemplate: cafesTemplate
    });

    /************************************************************
     * Define the Tile Layers that will be added to the map when zooming in
     **************************************************************/

    var Berlin_1816_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Berlin_1816_Map/MapServer",
        title: "Berlin 1816",
        visible: false

    });

    var Berlin_1905_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Berlin_1905/MapServer",
        title: "Berlin 1905",
        visible: false

    });

    var Berlin_1929_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Berlin_1929/MapServer",
        title: "Berlin 1929",
        visible: false

    });

    var Berlin_1937_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Berlin_Silva_1937/MapServer",
        title: "Berlin 1937",
        visible: false

    });

    var Vienna_1905_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/1905_Wien_Meyers/MapServer",
        title: "Vienna 1905",
        visible: false
    });

    var Vienna_1920_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Vienna_1920/MapServer",
        title: "Vienna 1920",
        visible: false
    });

    var NewYork_1910_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/1910_NYC/MapServer",
        title: "New York 1910",
        visible: false
    });

    var NewYork_1920_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Lower_Manhattan_1920/MapServer",
        title: "New York 1920 - Lower Manhattan",
        visible: false
    });

    var NewYork_1939_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/NYC_1939/MapServer",
        title: "New York 1939",
        visible: false
    });

    var Odessa_1914_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Odessa_1914_map_English/MapServer",
        title: "Odessa 1914",
        visible: false
    });

    var Jerusalem_1917_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Environs_Jerusalem_NLI/MapServer",
        title: "Jerusalem 1917",
        visible: false
    });

    var Jerusalem_1947_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Jerusalem_Reproduced_Feb47/MapServer",
        title: "Jerusalem 1947",
        visible: false
    });

    var Jerusalem_1949_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Copy_of_NLA/MapServer",
        title: "Jerusalem 1949",
        visible: false
    });

    var Jerusalem_1973_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Jerusalem_City_in_1973_Atlas/MapServer",
        title: "Jerusalem 1973",
        visible: false
    });

    var TelAviv_1923_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Jaffa_Palmer_1923_map/MapServer",
        title: "Tel Aviv 1923 (Jaffa)",
        visible: false
    });

    var TelAviv_1926_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Tel_Aviv_1926_New/MapServer",
        title: "Tel Aviv 1926",
        visible: false
    });

    var TelAviv_1931_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/tel_aviv_1931/MapServer",
        title: "Tel Aviv 1931",
        visible: false
    });

    var TelAviv_1950_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/Tel_Aviv/MapServer",
        title: "Tel Aviv 1950",
        visible: false
    });

    var TelAviv_1986_TileLayer = new TileLayer({
        url: "https://tiles.arcgis.com/tiles/4ezfu5dIwH83BUNL/arcgis/rest/services/TelAviv_1986/MapServer",
        title: "Tel Aviv 1986",
        visible: false
    });

    /************************************************************
     * Create the Map and Map View
     **************************************************************/


    var map = new Map({
        layers: [tilesytle, cities]
    });

    //check for window size, if less than 700px in width, change center of view
    var mapCenter = window.innerWidth > 700 ? [-23,42]:[23,42];

    var view = new MapView({
        container: "viewDiv",
        map: map,
        zoom: 3,
        // center: [-23,42],
        center: mapCenter,
        popup: {
            dockEnabled: true,
            dockOptions: {
                buttonEnabled: false,
                breakpoint: false
            }
        },
        constraints: {
            minZoom: 3,
            maxZoom: 15
        }
    });

    /************************************************************
     * Define and add Widgets
     **************************************************************/

    var homeButton = new Home({
        view: view,
    });

    view.ui.add(homeButton, {
        position: "top-left",
        index: 0
    })

    var searchWidget = new Search({ //creating a variable and div for the Search widget
        view: view,
        container: document.createElement("div")
    });

    var searchExpand = new Expand({ //creating a variable for the expand widget, which is assigned the search bar
        view: view,
        content: searchWidget
    });

    view.ui.add(searchExpand, { //adding the expand widget to the view.
        position: "top-left",
        index: 2
    });


    //Desktop

    var fullLayerList = new LayerList({
        view: view,
        container: document.createElement("div")
    });

    //Mobile
    var expandLayerList = new Expand({
        view: view,
        content: new LayerList({
            view: view,
            container: document.createElement("div")
        })
    });

    view.popup.open({
        title: "Click on a city for more information",
        content: "",
        overwriteActions: true,
        actions:[] //make sure default "zoom to" action is not displayed
    });


    /************************************************************
     * Switch layers in view and zoom in on "zoom to city"
     **************************************************************/

    // Custom zoom-to function
    function zoomTo(selectedFeature) {
        // Zoom to selected feature at specified zoom level.
        view.goTo({
            center: selectedFeature.geometry,
            zoom: 12
        });
        // Close the popup from which the zoom-to command came
        view.popup.close();
        // Add appropriate historical map for selected city.
        if( selectedFeature.attributes.Name == "Berlin" ) {
            view.map.addMany([Berlin_1816_TileLayer, Berlin_1905_TileLayer, Berlin_1929_TileLayer, Berlin_1937_TileLayer]);
        }
        else if( selectedFeature.attributes.Name == "Vienna" ) {
            view.map.addMany([Vienna_1905_TileLayer, Vienna_1920_TileLayer]);
        }
        else if( selectedFeature.attributes.Name == "New York"){
            view.map.addMany([NewYork_1910_TileLayer, NewYork_1920_TileLayer, NewYork_1939_TileLayer])
        }
        else if( selectedFeature.attributes.Name == "Odessa"){
            view.map.addMany([Odessa_1914_TileLayer])
        }
        else if( selectedFeature.attributes.Name == "Jerusalem"){
            view.map.addMany([Jerusalem_1917_TileLayer, Jerusalem_1947_TileLayer, Jerusalem_1949_TileLayer, Jerusalem_1973_TileLayer])
        }
        else if( selectedFeature.attributes.Name == "Tel Aviv"){
            view.map.addMany([TelAviv_1923_TileLayer, TelAviv_1926_TileLayer, TelAviv_1931_TileLayer, TelAviv_1950_TileLayer, TelAviv_1986_TileLayer])
        }
        view.map.remove(cities);// Remove cities layer from map
        view.map.add(cafes);//Add cafes layer to map
        cafes.definitionExpression = "";//Clear the definition expression, if set previously using the doSearch function
    }

    view.when(function(){
        var popup = view.popup;
        //changing home button icon to globe. needs to be after the view initializes, else it returns undefined
        var HomeIcon = document.getElementsByClassName("esri-icon-home"); //search for "esri-icon-home" class in html
        HomeIcon[0].classList.add("esri-icon-globe");//it returns an array. take the first element and add the "esri-icon-globe" class
        popup.viewModel.on("trigger-action", function(event){
            //if the zoom-in action is clicked, the following code executes
            if(event.action.id === "zoom-in") {
                console.log("Zoom to:", event.target.selectedFeature.attributes.Name);
                zoomTo(event.target.selectedFeature);
                layer = cafes;//setting cafes to layer for use in the search function
                // view.ui.add(layerListWidget, { //adding layer list widget to toggle maps on and off
                //     position: "bottom-left",
                //     index: 0
                // });
                // Load

                isResponsiveSize = view.widthBreakpoint === "xsmall";
                updateView(isResponsiveSize);

                // Breakpoints

                view.watch("widthBreakpoint", function(breakpoint) {
                    switch (breakpoint) {
                        case "xsmall":
                            updateView(true);
                            break;
                        case "small":
                        case "medium":
                        case "large":
                        case "xlarge":
                            updateView(false);
                            break;
                        default:
                    }
                });

                function updateView(isMobile) {
                    setLayerListMobile(isMobile);
                }

                function setLayerListMobile(isMobile) {
                    var toAdd = isMobile ? expandLayerList : fullLayerList;
                    var toRemove = isMobile ? fullLayerList : expandLayerList;

                    view.ui.remove(toRemove);
                    view.ui.add(toAdd, "top-right");
                }
            };
        });
    });



    /************************************************************
     * Switch web maps in view and zoom in on "zoom to city"
     **************************************************************/

    // let id = popup.viewModel.selectedFeature.attributes.WebMapID;
    // //grabbing the attribute WebMapID (portal item ID)
    // console.log(id);
    // let geom = popup.viewModel.selectedFeature.geometry;
    // //getting the lat,long for the center of the map
    // let citymap = new WebMap({
    //   portalItem:{
    //     id: id
    //   }
    // });
    // //let zoom = 10;
    // view.center = geom;
    // view.zoom = 12;
    // view.map = citymap; //loads the new web map in the view
    // console.log("City Map loaded");
    // console.log(citymap);

    // citymap.when(function() { //once citymap is defined, then find the cafes layer by ID. this will be used for the time search
    //     layer = citymap.findLayerById("Cafes_and_Landmarks_1476"); //layer is already defined previously, don't need to use 'let'. this redefines it locally in this function
    //     console.log(layer);
    //     layer.popupTemplate = cafesTemplate; //assigning popup template to the new cafes layer
    //     console.log(layer.popupTemplate);
    //     //view.ui.add(homeButton, "top-left");
    // });


    /************************************************************
     * On a button click (esri-icon-globe), change the map in the view back to the cities view.
     ************************************************************/
    //
    // on(document.querySelector(".btns"), ".esri-icon.esri-icon-globe:click", function(
    //   event) {
    //
    //    var mapid = event.target.getAttribute("data-id"); //this pulls the webmap ID from the data-id property(?correct terminology) of the div.
    //    //can I reference a map that was already created, e.g. the first map instance added to the view with the cafes and cities layers?
    //    //slicker option would be to zoom in and add layers to the map based on the city, rather than swiching the entire map in the view.
    //    console.log(mapid);
    //    if (mapid) {
    //      var webmap = new WebMap({ //creates a new webmap with the portalItem ID
    //        portalItem:{
    //          id: mapid
    //        }
    //      });
    //      view.center = [-23,42];
    //      view.zoom = 3; //this zoom seems to change based on whether the previous map in the view was built from scratch in javascript, or referenced via item ID.
    //      view.map = webmap; //adding the map to the view
    //      webmap.layers.add(cities); //map is blank, adding cities as a layer to access the popupTemplate for the layer i defined earlier
    //      webmap.layers.add(cafes);//same for cafes
    //      console.log("Map loaded");
    //      view.ui.remove(layerList);//removing the layer list widget, as only applicable to maps with historical map layers.
    //      console.log(webmap);
    //    };
    //  });

    /************************************************************
     * On home-button click (esri-icon-globe), change the map in the view back to the cities view.
     ************************************************************/

    // Monitor for click on Home button by watching for "go" event.
    homeButton.on("go", function(event){
        console.log("Going Home");
        clearSearch(); //clearing the search results from the time slider
        // as this persisted even when removing and adding cafes back to the map
        console.log("Cleared search");
        // Remove all layers on the map.
        view.map.removeAll();
        view.ui.remove(fullLayerList);
        // Add pointLayer to the map.
        view.map.addMany([tilesytle, cities]);
        view.popup.close();
    });

});

/************************************************************
 * Defining filter by time functions
 **************************************************************/

function doSearch() {

    let searchStartYear = document.getElementById('startYear').value;
    let searchEndYear = document.getElementById('endYear').value;
    if (searchStartYear != startYear || searchEndYear != endYear) {
        console.log(searchStartYear, startYear, searchEndYear, endYear);

        sql = "(established_raw >=" + searchStartYear + " AND closed_raw <= " + searchEndYear + ") OR (established_raw >=" + searchStartYear + " AND established_raw <=" + searchEndYear +") OR (closed_raw >=" + searchStartYear + " AND closed_raw <=" + searchEndYear + ")";

    }
    console.log(sql);
    //setting the definition expression for the layer, which will update the view?
    if (sql) {
        layer.definitionExpression = sql;
        console.log(layer.definitionExpression);
    }
    // updateResultText();
}

function clearSearch() {

    let startYearText = dojo.byId('startYear');
    startYearText.setAttribute("onChange", "");
    startYearText.value = startYear;
    let endYearText = dojo.byId('endYear');
    endYearText.setAttribute("onChange", "");
    endYearText.value = endYear;
    dojo.byId('yearSlider').setAttribute("onChange", "");
    dijit.byId('yearSlider').set("value", [startYear, endYear]);
    // let searchText = document.getElementById('searchBox');
    //  searchText.value = defaultSearchString;
    //  document.getElementById('languageBox').value = "";
    //  document.getElementById('genreBox').value = "";

    layer.definitionExpression = "";

    startYearText.setAttribute("onChange", "updateSlider(this);");
    endYearText.setAttribute("onChange", "updateSlider(this);");
    dojo.byId('yearSlider').setAttribute("onChange", "updateSearchYears();");
    // updateResultText();

}

function updateSearchYears() {
    //console.log(value);
    value = dojo.byId('yearSlider').value;
    dojo.byId("startYear").value = Math.round(value[0]);
    dojo.byId("endYear").value = Math.round(value[1]);
    doSearch();
}
function updateSlider(e) {
    //console.log(e.id);
    //console.log(e.value);
    let startYear = (e.id === 'startYear') ? parseInt(e.value) : parseInt(dojo.byId('startYear').value);
    let endYear = (e.id === 'startYear') ? parseInt(dojo.byId('endYear').value): parseInt(e.value);
    console.log( [startYear, endYear]);
    if (startYear <= endYear ) {
        // dijit.byId returns the widget and is
        // not to be confused with dojo.byId, which returns a DOM element with no .set method...
        let yearSlider = dijit.byId('yearSlider');
        console.log(yearSlider);
        yearSlider.set("value", [startYear, endYear]);
    }
}