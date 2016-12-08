var query = "", 
    parameters = {}, 
    tabNumber = 0,
    tabText = "",
    availableStorage = false;

if (typeof sessionStorage!='undefined') {availableStorage = true;}

function dateTimePick() {
  $('.datetimepicker1').datetimepicker({
    sideBySide:true
  });
  $('.datetimepicker2').datetimepicker({
    sideBySide:true,
  });
}
function toggleEndDate() {
  var input = $(".datetimepicker2");
// désactivé tant que le filtre par date de fin n'est pas opérationnel sur le xml
//  input.css('visibility', input.css('visibility') == 'hidden' ? 'visible' : 'hidden');
}
function closeForm() {
  $(".active > .js-task-choice").hide();
}
function openForm() {
  $(".active > .js-task-choice").show();
}

function init() {
  query = window.location.search ; 
  tabNumber = Number($('.tab-content .tab-pane.active').attr('id').slice(3));
  tabText = tabNumber.toString();

  if (query !== "") {
    parameters = {};
    query.substr(1).split("&").forEach(function(item) {
      var s = item.split("=");
      var key = s[0];
      var value = s[1] && decodeURIComponent(s[1]);
      (key in parameters) ? parameters[key].push(value) : parameters[key] = [value];
    })

    for (var i = 0, first = true; i < 4; i++, tabNumber++, tabNumber %= 4) {
      tab = tabNumber.toString();
      if (first && ('task0' in parameters) && ('start0' in parameters)) {
        getTask(parameters['task'+tab], parameters["start"+tab], tab);
        first = false;
      } else if (first && ('task'+tab in parameters) && ('start'+tab in parameters)) {
        $('.nav-tabs li:eq('+tab+') a').tab('show');
        first = false;
      } else if (('task'+tab in parameters) && ('start'+tab in parameters)) {
          $('.nav-tabs li:eq('+tab+') a').text('# '+parameters['task'+tab]);
      }
    }
  }
}

function getTask(taskID, startDate, tab) {
  if (taskID !== undefined) {
    if (availableStorage && (taskID in sessionStorage)) {
      var task = JSON.parse(sessionStorage.getItem(taskID));
      createDashboard(task, startDate, tab);
    } else {

      $.getJSON( "https://tasks.hotosm.org/project/"+ taskID +".json", function( task ) {
        if (task && task.geometry) {
          createDashboard(task, startDate, tab);
          if (availableStorage) {
            sessionStorage.setItem(taskID, JSON.stringify(task));
          }
        } else if (task) {
          alert("This task has no geometry attribute.");
        } else {
          alert ("This task does not exist or you do not have permission to access it.");
        }
      });
    }
  } else {
    alert("This task does not exist or you do not have permission to access it.");
  }
}

function loadDashboard() {
  var taskID = document.querySelector(".active .js-tasknumber").value;
  var startDateValue = document.querySelector(".active .js-startdate").value;
  var startDateText = moment(startDateValue, "MM/DD/YYYY hh:mm a").toISOString();
  var endDateInput = $(".js-enddate");
  var endDateValue = endDateInput.css('visibility') == 'hidden' ? moment().format() : endDateInput.val();

  if (taskID && startDateValue) {
    tabNumber = Number($('.tab-content .tab-pane.active').attr('id').slice(3));  
    tabText = tabNumber.toString();
    var task = "task"+tabText;
    var start = "start"+tabText;
    if (query === "") {
      history.pushState(null, null, "?"+task+"="+taskID+"&"+start+"="+startDateText);
    } else {
      parameters[task] = taskID;
      parameters[start] = startDateText;

      query = "?";
      for (var key in parameters) {
        query += key + "=" + parameters[key] + "&";
      }
      history.pushState(null, null, query.slice(0, -1));
    }
    getTask(taskID, startDateText, tabText);

  } else {
    alert("Veuillez remplir tous les champs.");
  }
}

function createDashboard(task,startDate, tab) {
    console.log("Creating the dasboard for task "+task.id+" and start date: "+startDate+" in tab "+tab+".");

    $(".tab-pane.active > .js-task-choice").hide();
    $(".tab-pane.active .js-dashboard").empty();

//    var tabContent = document.querySelector(".tab-pane.active");
    var tabContent = document.querySelector("#tab"+tab);
    var taskTemplate = document.querySelector('#task-template');
    var dashboard = document.importNode(taskTemplate.content, true);
    tabContent.appendChild(dashboard);
    
    var longName = "Task # "+task.id+" | "+task.properties.name;
    var tabName = longName.length <= 30 ? longName : longName.substring(5,30)+" …";

//    document.querySelector(".tab-pane.active .js-task_title").dataset.tabname = tabName;
//    $(".nav-tabs > li.active > a").text(tabName);
//    $(".tab-pane.active .js-task_title").html("<h3>"+ longName +"</h3>");
//    $(".tab-pane.active .js-task_date").html("<p><b>Since :</b> "+moment(startDate.toString()).format("llll")+"</p>");
//    $(".tab-pane.active #km_highways").attr('id', 'km_highways_'+tab);
//    $(".tab-pane.active #area_landuse").attr('id', 'area_landuse_'+tab);
//    $(".tab-pane.active #nb_buildings").attr('id', 'nb_buildings_'+tab);
    document.querySelector("#tab"+tab+" .js-task_title").dataset.tabname = tabName;
    $('.nav-tabs li:eq('+tab+') a').text(tabName);
    $("#tab"+tab+" .js-task_title").html("<h3>"+ longName +"</h3>");
    $("#tab"+tab+" .js-task_date").html("<p><b>Since :</b> "+moment(startDate.toString()).format("llll")+"</p>");
    $("#tab"+tab+" #km_highways").attr('id', 'km_highways_'+tab);
    $("#tab"+tab+" #area_landuse").attr('id', 'area_landuse_'+tab);
    $("#tab"+tab+" #nb_buildings").attr('id', 'nb_buildings_'+tab);


//carte principale
    var map = L.map($(".tab-pane.active .js-map")[0]).setView([0,0 ], 4);

    var OpenMapSurfer_Grayscale = L.tileLayer('http://korona.geog.uni-heidelberg.de/tiles/roadsg/x={x}&y={y}&z={z}', {
	attribution: 'Map tiles by <a href="" target="_blank">korona.geog.uni-heidelberg.de</a> <br>Map data &copy; <a href="http://www.openstreetmap.org" target="_blank">OpenStreetMap</a> contributors, <a href="http://opendatacommons.org/licenses/odbl/1.0/" target="_blank">ODbL</a>',
	maxZoom: 19,
	}).addTo(map);

//carte length
var map_length = L.map($('.tab-pane.active .js-map_length')[0], { zoomControl:false, attributionControl: true }).setView([0,0 ], 4);
map_length.locate({setView: true, maxZoom: 16});
    var bm_length  = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com" target="_blank">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0" target="_blank">CC BY 3.0</a> <br>Map data &copy; <a href="http://www.openstreetmap.org" target="_blank">OpenStreetMap</a> contributors, <a href="http://opendatacommons.org/licenses/odbl/1.0/" target="_blank">ODbL</a>',
	subdomains: 'abcd',
	minZoom: 0,
	maxZoom: 20,
	ext: 'png'
    }).addTo(map_length);

    var style_aoi = {
    	"color": "#f9ec12",
    	"weight": 5,
    	"fillOpacity": 0,
    	"opacity": 1
    };

    var task_polygon = L.geoJson(task,{style: style_aoi}).addTo(map);
    
    map.fitBounds(task_polygon.getBounds());
    var polygon_bounds = task_polygon.getBounds();

    var bbox = ""+polygon_bounds._southWest.lng+","+polygon_bounds._southWest.lat+","+polygon_bounds._northEast.lng+","+polygon_bounds._northEast.lat+"";
    
    loading();
    
    //count buildings
    var buildings_count = [];
    $.get("http://overpass.osm.rambler.ru/cgi/xapi?way[building=*][bbox="+bbox+"][@newer="+startDate+"][@meta]", function(buildings) {
    
        var building_geojson = osmtogeojson(buildings);
        for (var i in building_geojson.features)
        {
        var item = building_geojson.features[i];        
        
        	if (item.geometry.type =="Polygon") {
            buildings_count.push(item)
            }
            else{}
        }
        
    var style_building = {
            "color": "#58c4f2",
            "weight": 4,
            "fillOpacity": 1,
            "opacity": 1,
        	};
    
        var buildings_layer = L.geoJson(buildings_count,{style: style_building})
        .addTo(map);
        
        buildings_layer.bringToFront();

        // awful but need to understand first element before improving
        if (tab == 0) {nb_buildings_0.innerHTML = buildings_count.length +" buildings";} 
        else if (tab == 1) {nb_buildings_1.innerHTML = buildings_count.length +" buildings";} 
        else if (tab == 2) {nb_buildings_2.innerHTML = buildings_count.length+" buildings";}
        else if (tab == 3) {nb_buildings_3.innerHTML = buildings_count.length+ " buildings";}
        else {alert("Problème d'onglets, veuillez recharger votre navigateur.");}
        
    loading();
    
    });    
        

    var highways_count = [];
    //count highway
    $.get("http://overpass.osm.rambler.ru/cgi/xapi?way[highway=*][bbox="+bbox+"][@newer="+startDate+"][@meta]", function(highways) {
        
        var hw_geojson = osmtogeojson(highways);
        var length = 0;
        
        for (var i in hw_geojson.features)
        {
          var item = hw_geojson.features[i];
        
      	  if (item.geometry.type =="LineString") {
            highways_count.push(item)
          } else {}
        }
        
        var style_highways = {
            "color": "#f0782c",
            "weight": 2,
            "fillOpacity": 1,
            "opacity": 1,
        };
        	
        var highways_layer = L.geoJson(highways_count,{style: style_highways})
        .addTo(map);
        
        for (var i in highways_count)
        {
          var item = highways_count[i];
          item.date = new Date(item.properties.meta.timestamp);
          var length_obj = turf.lineDistance(highways_count[i], 'kilometers');
          length = length+length_obj
          highways_count[i].properties.length = length_obj;
        }
        
        length = Math.round(length * 10) / 10;

        // awful but need to understand first element before improving
        if (tab == 0) {km_highways_0.innerHTML = length+" km of roads<br>"+ highways_count.length +" roads created";} // TODO bon décompte ?
        else if (tab == 1) {km_highways_1.innerHTML = length+" km of roads<br>"+ highways_count.length +" roads created";}
        else if (tab == 2) {km_highways_2.innerHTML = length+" km of roads<br>"+ highways_count.length +" roads created";}
        else if (tab == 3) {km_highways_3.innerHTML = length+" km of roads<br>"+ highways_count.length +" roads created";}
        else {alert("Problème d'onglets, veuillez recharger votre navigateur.");}        
    
    // draw line corresponding of length
    var pt1 = turf.point([5.9215,45.58789]);
    var pt1_layer = L.geoJson(pt1).addTo(map_length);
    
    var distance = length;
    var distance2 = length/3;
    var bearing = 90;
    var units = 'kilometers';

    var pt2 = turf.destination(pt1, distance, bearing, units);
    var pt2_layer = L.geoJson(pt2).addTo(map_length);
    
    var line = turf.linestring([
            pt1.geometry.coordinates,
            pt2.geometry.coordinates
        	]);
    
    var line_layer = L.geoJson(line).addTo(map_length);
    map_length.fitBounds(line_layer.getBounds());
    
    var pt_label_options = {
    	radius: 0,
    	opacity: 0,
    	fillOpacity: 0
    };
    
    var pt_label = turf.destination(pt1, distance2, bearing, units);
    
    var pt_label_layer = L.geoJson(pt_label, {
        	pointToLayer: function (feature, latlng) {
        	return L.circleMarker(latlng, pt_label_options).bindLabel(distance+" km", { noHide: true, offset:[0,-15] });
        	}
        }).addTo(map_length);
    
    //////////////// pie chart highways per type
    
    var ndx;
    var chart = dc.pieChart("#tab"+tab+" .js-graph_highways");
    ndx = crossfilter(highways_count);
    var hw_graph_dim = ndx.dimension(function(d){return d.properties.tags.highway});
    var hw_graph_group = hw_graph_dim.group().reduceSum(function(d) {return d.properties.length});
    
	chart
    .width(200)
    .height(200)
    .slicesCap(4)
    .innerRadius(40)
	.ordinalColors(['#e6251f', '#9fc659','#f9ec11','#58c4f2', '#f0772b' ])
    .dimension(hw_graph_dim)
    .group(hw_graph_group) // by default, pie charts will use group.key as the label
    .renderLabel(true)
	.render();
	
    loading();
	
	
	////////////////////////// landuse
	
    var landuse_count = [];
    var residential_count = [];
    //count landuse
    $.get("http://overpass.osm.rambler.ru/cgi/xapi?way[landuse=*][bbox="+bbox+"][@newer="+startDate+"][@meta]", function(landuse) {
        
    var landuse_geojson = osmtogeojson(landuse);
    var area_landuse = 0;
    var area_residential = 0;
    for (var i in landuse_geojson.features) {
      var item = landuse_geojson.features[i];
      if (item.geometry.type =="Polygon") {
        landuse_count.push(item);
        if (item.properties.tags.landuse === "residential") {
          residential_count.push(item);
        }
      }
    }
    loading();

    
    var style_landuse = {
            "color": "#9ec658",
            "weight": 2,
            "fillOpacity": 1,
            "opacity": 1,
        	};
    
        var landuse_layer = L.geoJson(landuse_count,{style: style_landuse})
        .addTo(map);
    
        landuse_layer.bringToBack();
    
    for (var i in landuse_count) {
      var area_obj = turf.area(landuse_count[i]);
      area_landuse += area_obj;
      landuse_count[i].properties.size = area_obj/1000000;
    }  
    area_landuse /= 1000000;
    area_landuse = Math.round(area_landuse * 100) / 100;
    
   for (var i in residential_count) {
      var area_obj = turf.area(residential_count[i]);
      area_residential += area_obj;
//      residential_count[i].properties.size = area_obj/1000000; // interest?
    }  
    area_residential /= 1000000;
    area_residential = Math.round(area_residential * 100) / 100;

    // awful but needs further comprehension to be improved
    if (tab == 0) {area_landuse_0.innerHTML = area_landuse+" km² of landuse<br>"+ area_residential +" km² of residential landuse" ;}
    else if (tab == 1) {area_landuse_1.innerHTML = area_landuse +" km² of landuse<br>"+ area_residential +" km² of residential landuse" ;}
    else if (tab == 2) {area_landuse_2.innerHTML = area_landuse +" km² of landuse<br>"+ area_residential +" km² of residential landuse" ;}
    else if (tab == 3) {area_landuse_3.innerHTML = area_landuse +" km² of landuse<br>"+ area_residential +" km² of residential landuse" ;}
    else {alert("Problème d'onglets, veuillez recharger votre navigateur.");}

    
    // graph landuse
    var ndx2;
    var chart2 = dc.pieChart("#tab"+tab+" .js-graph_area");
    ndx2 = crossfilter(landuse_count);
    var lu_graph_dim = ndx2.dimension(function(h){return h.properties.tags.landuse});
    var lu_graph_group = lu_graph_dim.group().reduceSum(function(h) {return h.properties.size});
    
	chart2
    .width(200)
    .height(200)
    .slicesCap(4)
    .innerRadius(40)
	.ordinalColors(['#e6251f', '#9fc659','#f9ec11','#58c4f2', '#f0772b' ])
    .dimension(lu_graph_dim)
    .group(lu_graph_group) // by default, pie charts will use group.key as the label
    .renderLabel(true)
	.render();
    
    });
    
});

/////progress bar
document.getElementById('validated_bar').style.width= task.properties.validated  +'%';
document.getElementById('done_bar').style.width= task.properties.done +'%';

}    


function supportsTemplate() {
  return 'content' in document.createElement('template');
}

if (supportsTemplate()) {
  // on récupère la div qu'on veut remplir
  var tab0 = document.querySelector("#tab0");
  // on récupère le template et on le clone
  var formTemplate = document.querySelector('#form-template');
  var form0 = document.importNode(formTemplate.content, true);
  // on le charge dans le HTML
  tab0.appendChild(form0);

  // idem avec une autre div à remplir avec le même template
  var tab1 = document.querySelector("#tab1");
  var form1 = document.importNode(formTemplate.content, true);
  tab1.appendChild(form1);
    
  var tab2 = document.querySelector("#tab2");
  var form2 = document.importNode(formTemplate.content, true);
  tab2.appendChild(form2);

  var tab3 = document.querySelector("#tab3");
  var form3 = document.importNode(formTemplate.content, true);
  tab3.appendChild(form3);
  
  $('.nav-tabs > li > a[data-toggle="tab"]').on('hidden.bs.tab', function (e) {
    // onglet fermé/hidden: $(e.target)
    // onglet ouvert/shown: $(e.relatedTarget)
    tabNumber = Number($('.tab-content .tab-pane.active').attr('id').slice(3));
    tabText = tabNumber.toString();
    var shortenedTitle = $(e.target).text().match(/#.*\|/);
    if (shortenedTitle) {
      $(e.target).text(shortenedTitle.toString().slice(0,-2));
    }
    var newTitle = $(".tab-pane.active .js-task_title").data('tabname')
    if (newTitle === undefined) {
      if (('task'+tabText in parameters) && ('start'+tabText in parameters)) {
//alert('getTask from new tab');
        getTask(parameters['task'+tabText], parameters["start"+tabText], tabText);
      }
    } else if (newTitle != "") {
      $(e.relatedTarget).text(newTitle);
    }
  });

} else {
  alert("Problème de compatibilité avec votre navigateur.\nIl est temps de le mettre à jour et/ou d'abandonner InternetExplorer.");
  // TODO Use old templating techniques or libraries.
}

var loading_value = 0;
function loading() {
  var popup = $("#loading_modal")
  popup.modal("show");
  loading_value++
  console.log(loading_value);
  document.getElementById('loading_bar').style.width= loading_value*25  +'%';
  if (loading_value==4){
    console.log("loaded");
    popup.modal("hide");
    loading_value = 0;
  }
}
