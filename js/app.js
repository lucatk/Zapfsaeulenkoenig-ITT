var map = null;
var marker = null;
var markerPLZ = '';
var markerOrt = '';
var geocoder = null;
var loadingAddress = false;

function initMap() {
  geocoder = new google.maps.Geocoder();
  map = new google.maps.Map($('.map')[0], {
    center: { lat: 51.0347139, lng: 10.4951946 },
    zoom: 7,
    clickableIcons: false,
    streetViewControl: false,
    draggableCursor: 'default',
    draggingCursor: 'move'
  });
  map.addListener('click', function(ev) {
    removeMarker();
    marker = new google.maps.Marker({
      position: ev.latLng,
      map: map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      crossOnDrag: false,
      cursor: 'pointer'
    });
    marker.addListener('dragend', function() {
      markerChange();
    });
    markerChange();
  });

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
      google.maps.event.trigger(map, 'click', { stop: null, latLng: new google.maps.LatLng(position.coords.latitude, position.coords.longitude) });
    });
  }
}

function markerChange() {
  loadingAddress = true;
  $('#inputPLZ').attr('placeholder', 'Lade Adresse...');
  $('#inputPLZ').val('');
  $('#inputPLZ').prop('readonly', true);
  geocoder.geocode({ 'location': marker.getPosition() }, function(results, status) {
    loadingAddress = false;
    $('#inputPLZ').attr('placeholder', '70176 Stuttgart');
    $('#inputPLZ').prop('readonly', false);
    if(status == google.maps.GeocoderStatus.OK) {
      var res = results[0].address_components;
      var isValid = false;
      var plz = '';
      var ort = '';
      for(var index in res) {
        if(res[index].types[0] == 'country') {
          if(res[index].short_name == 'DE') isValid = true;
        } else if(res[index].types[0] == 'locality') {
          ort = res[index].long_name;
        } else if(res[index].types[0] == 'postal_code') {
          plz = res[index].long_name;
        }
      }

      if(!isValid || (ort == '' && plz == '')) {
        removeMarker();
      } else {
        markerPLZ = plz;
        markerOrt = ort;

        var name = '';
        if(plz !== '') name += plz + ' ';
        name += ort;
        $('#inputPLZ').val(name);
      }
    } else {
      console.log("Geocode was not successful for the following reason: " + status);
      removeMarker();
    }
  });
}

function removeMarker() {
  if(marker !== null) {
    marker.setMap(null);
  }
}

function registerEvents() {
  $('#inputPLZ').keyup(function() {
    clearTimeout(keyDelayTimer);
    if($(this).val().length < 3) return;
    if(value === $(this).val()) return;
    value = $(this).val();
    keyDelayTimer = setTimeout(function() {
      var matches = $('#inputPLZ').val().match(/\d{5}/g);
      var search = '';
      if(matches !== null && matches.length > 0) {
        search = matches[0];
      } else {
        matches = $('#inputPLZ').val().match(/(\w\D){1,}/g);
        if(matches !== null && matches.length > 0) {
          search = matches[0];
        } else {
          return;
        }
      }

      geocoder.geocode({ 'address': search }, function(results, status) {
        if(status == google.maps.GeocoderStatus.OK) {
          for(var ri in results) {
            var res = results[ri];
            var address = res.address_components;
            var isValid = false;
            var plz = '';
            var ort = '';
            for(var i in address) {
              if(address[i].types[0] == 'country') {
                if(address[i].short_name == 'DE') isValid = true;
              } else if(address[i].types[0] == 'locality') {
                ort = address[i].long_name;
              } else if(address[i].types[0] == 'postal_code') {
                plz = address[i].long_name;
              }
            }
            if(!isValid) continue;

            markerPLZ = plz;
            markerOrt = ort;

            removeMarker();
            var position = new google.maps.LatLng({lat: res.geometry.location.lat(), lng: res.geometry.location.lng()});
            marker = new google.maps.Marker({
              position: position,
              map: map,
              draggable: true,
              animation: google.maps.Animation.DROP,
              crossOnDrag: false,
              cursor: 'pointer'
            });
            map.setCenter(position);

            var name = '';
            if(plz !== '') name += plz + ' ';
            name += ort;
            $('#inputPLZ').val(name);

            break;
          }
        } else {
          console.log("Geocode was not successful for the following reason: " + status);
        }
      });
    }, 600);
  });
}

var keyDelayTimer = null;
var value = '';
$(document).ready(function() {
  $('select').material_select();
  noUiSlider.create($('#inputRange').get(0), {
   start: [10],
   connect: 'lower',
   step: 1,
   range: {
     'min': 1,
     'max': 25
   },
   format: wNumb({
     decimals: 0
   })
  });

  registerEvents();
});
