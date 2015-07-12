
var people_assets = {};

var sorters = {
  alpha: function(a, b){
    return a.name >= b.name ? 1 : -1;
  },
  quantity: function(a, b){
    var asset_count = people_assets[b.name] - people_assets[a.name];
    if (asset_count !== 0) {
      return asset_count;
    } else {
      return a.name >= b.name ? 1 : -1;
    }
  },
  income: function(a, b){
    var value_diff = b.min_income - a.min_income;
    if (value_diff !== 0) {
      return value_diff;
    } else {
      return a.name >= b.name ? 1 : -1;
    }
  },
  incomeAsc: function(a, b){
    var value_diff = a.min_income - b.min_income;
    if (value_diff !== 0) {
      return value_diff;
    } else {
      return a.name >= b.name ? 1 : -1;
    }
  },
  value: function(a, b){
    var value_diff = b.min_value - a.min_value;
    if (value_diff !== 0) {
      return value_diff;
    } else {
      return a.name >= b.name ? 1 : -1;
    }
  },
  valueAsc: function(a, b){
    var value_diff = a.min_value - b.min_value;
    if (value_diff !== 0) {
      return value_diff;
    } else {
      return a.name >= b.name ? 1 : -1;
    }
  }
};

function clean_name(name) {
  var parts = name.split(', ');
  return parts[1] + ' ' + parts[0];
}

function extract_address(address) {
  address = address.split(', ');
  var street = address[0];
  var city = address[1] ? address[1] : null;
  var state = address[2] ? address[2].slice(0, 2) : null;
  var fullstate = state && states[state] ? states[state] : null;

  return {
    street: street,
    city: city,
    state: state,
    fullstate: fullstate
  };
}


var LayerActions = {
  selection: function(ids){
    map.closePopup();
    d3.selectAll('.leaflet-zoom-animated g path').style('display', 'none');
    ids.forEach(function(id) {
      d3.selectAll('.' + id).style('display', 'block');
    });
  },
  all: function(){
    map.closePopup();
    d3.selectAll('.leaflet-zoom-animated g path').style('display', 'block');
  }
};

function createMap(data) {
  
  var accessToken = 'pk.eyJ1IjoiYmNsaWZ0b24iLCJhIjoicWNXT0Z6OCJ9.JvNO6GIbU8BZ-8LLSEwz2Q';
  var mapID = 'bclifton.9f0ca136';
  var mapboxTiles = L.tileLayer('https://{s}.tiles.mapbox.com/v4/' + mapID + '/{z}/{x}/{y}.png?access_token=' + accessToken, {
      attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>',
      detectRetina: true
  });

  map = new L.Map('map', {
    center: [39.8282, -98.5795],
    zoom: 2
  })
  .addLayer(mapboxTiles);

  var popup = L.popup({
    offset: new L.Point(0, 5)
  });

  data.forEach(function(d) {
    L.circleMarker([+d.lat, +d.lng], {
      fillColor: 'rgb(142, 108, 138)',
      fillOpacity: 0.45,
      radius: 3,
      stroke: false,
      className: d.pfid
    })
    .addTo(map)
    .on('click', function(e) {
      popup.setLatLng(e.latlng)
        .setContent('<img src="http://congress-home.s3.amazonaws.com/images/property/' + d.pfid + '.jpg" class="popup-img"/><br><h4>' + d.fullname + '</h4><p class="graph-description">' + d.google_address + '</p>')
        .openOn(map);
    });
  });
}

//////////////////////////////////////////////////////////////////////////////////////////

d3.csv('assets/property_with_income_edited____.csv', function(initialData){

  createMap(initialData);

  var data = initialData.map(function(d){
    d.fullname = clean_name(d.name);
    d.address = extract_address(d.google_address);
    return d;
  });

  data = data.sort(sorters.alpha);

  data.forEach(function(d){
    if (people_assets[d.name]){
      people_assets[d.name] ++;
    } else {
      people_assets[d.name] = 1;
    }
  });

  data = {items: data};

  var template_source = d3.select("#property-template").html();
  var property_template = Handlebars.compile(template_source);

  var html = property_template(data);
  d3.select('#properties-wrapper').html(html);


  var entry = d3.selectAll('.property')
    .data(data.items);

  entry.on('click', function(d){
      var me = d3.select(this);
      var embed_url = d.streetview_embed;
      var img = me.select('.main-image');
      var h = img.node().getBoundingClientRect().height;
      
      var iframe = me.select('.image-loc')
        .append('iframe')
        .attr('src', embed_url)
        .attr('width', '99.9%')
        .attr('height', h)
        .attr('frameborder', '0')
        .style('display', 'none');

      iframe.on('load', function(){
        iframe.style('display', 'block');
        img.remove();
      });

      me.on('click', null);

    });

  d3.select('select[name="sort"]').on('change', function(){
    d3.selectAll('.property').sort(sorters[this.value]);
  });

  d3.select('.click-filter').on('click', function(d){
    d3.event.preventDefault();
    var q = d3.select(this).attr('data-q');
    var i = document.getElementById('search');
    i.value = q;
    filter_people(q);
  });


  d3.select('input[name="search"]').on('keyup', function(){
    filter_people(this.value);
  });

  function filter_people(q) {
    q = q.toLowerCase();

    if (q.length < 1) {
      LayerActions.all();
    }    
    
    var pfids = {};

    d3.selectAll('.property').each(function(d){
      var name = d.fullname.toLowerCase();
      var city = d.address.city ? d.address.city.toLowerCase() : null;
      var state = d.address.fullstate ? d.address.fullstate.toLowerCase() : null;
      
      if (name.indexOf(q) > -1 || (city && city.indexOf(q) > -1) || (state && state.indexOf(q) > -1)) {
        pfids[d.pfid.toUpperCase()] = null;
        this.style.display = 'block';
      } else {
        this.style.display = 'none';
      }
    });

    if (q.length >= 1) {
      LayerActions.selection(Object.keys(pfids));
    }    
  }
});

function select(d){
  d3.selectAll('.property').each(function(d){
    var name = d.fullname.toLowerCase();
    var city = d.address.city ? d.address.city.toLowerCase() : null;
    var state = d.address.fullstate ? d.address.fullstate.toLowerCase() : null;

    if (d.id) {
      this.style.display = 'block';
    } else {
      this.style.display = 'none';
    }
  });
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Handlebars.registerHelper('display_value', function(minv, maxv){
//   if (!minv || !maxv) {
//     return 'unknown';
//   }
//   minv = +minv;
//   maxv = +maxv;
//   if (minv === maxv){
//     if (minv === 0) {
//       return '$0.0';
//     } else {
//       return 'Over $' + numberWithCommas(minv-1);
//     }
//   } else {
//     if (minv > 0) minv--;
//     return '$' + numberWithCommas(minv) + ' to $' + numberWithCommas(maxv);
//   }
// });

Handlebars.registerHelper('display_value', function(maxv, income){
  maxv = +maxv;

  if (income === true && maxv === 0) {
    return 'No Income';
  } else {
    return '$' + numberWithCommas(maxv);  
  }
  
});