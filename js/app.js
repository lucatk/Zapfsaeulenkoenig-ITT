var map = null;
var marker = null;
var markerPLZ = '';
var markerOrt = '';
var geocoder = null;
var loadingAddress = false;
var chart = null;

function initMap() {
  // Initialisiere Geocoder (um Koordinaten abzurufen)
  geocoder = new google.maps.Geocoder();
  // Initialisiere Google Maps API
  map = new google.maps.Map($('.map')[0], {
    center: { lat: 51.0347139, lng: 10.4951946 },
    zoom: 7,
    clickableIcons: false,
    streetViewControl: false,
    draggableCursor: 'default',
    draggingCursor: 'move'
  });
  // Setze Click-Handler fuer die Auswahl der Position
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

  if($('#inputPLZ').val().length < 1 && "geolocation" in navigator) {
    // Rufe Position vom Browser ab (wenn moeglich)
    navigator.geolocation.getCurrentPosition(function(position) {
      var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      google.maps.event.trigger(map, 'click', { stop: null, latLng: latLng });
      map.setCenter(latLng);
    });
  } else if($('#inputPLZ').val().length > 0) {
    // Rufe Position vom Browser ab (wenn moeglich)
    onPLZChange();
  }
}

function markerChange() {
  // Lade neue Adresse wenn Position auf Map markiert wurde
  loadingAddress = true;
  // GUI
  $('#inputPLZ').attr('placeholder', 'Lade Adresse...');
  $('#inputPLZ').val('');
  $('#inputPLZ').prop('readonly', true);

  // Lade Adresse von Geocoder
  geocoder.geocode({ 'location': marker.getPosition() }, function(results, status) {
    // Ergebnis angekommen
    loadingAddress = false;
    // GUI
    $('#inputPLZ').attr('placeholder', '70176 Stuttgart');
    $('#inputPLZ').prop('readonly', false);
    if(status == google.maps.GeocoderStatus.OK) {
      // Ergebnis erfolgreich
      var res = results[0].address_components;
      var isValid = false;
      var plz = '';
      var ort = '';
      // Adresse aus Ergebnis zusammensetzen
      for(var index in res) {
        if(res[index].types[0] == 'country') {
          // Position ist nur gueltig wenn in DE
          if(res[index].short_name == 'DE') isValid = true;
        } else if(res[index].types[0] == 'locality') {
          ort = res[index].long_name;
        } else if(res[index].types[0] == 'postal_code') {
          plz = res[index].long_name;
        }
      }

      if(!isValid || (ort == '' && plz == '')) {
        // Falls Position nicht gueltig ist, Marker von Map entfernen
        removeMarker();
      } else {
        // Falls Position gueltig ist, Adresse speichern und anzeigen.
        markerPLZ = plz;
        markerOrt = ort;

        var name = '';
        if(plz !== '') name += plz + ' ';
        name += ort;
        $('#inputPLZ').val(name);
        value = name;
        $('#search-button').removeClass('disabled');
      }
    } else {
      // Falls Geocode nicht erfolgreich war, Marker von Map entfernen.
      console.log("Geocode was not successful for the following reason: " + status);
      removeMarker();
    }
  });
}

function removeMarker() {
  // Methode um Marker von Map zu entfernen.
  if(marker !== null) {
    marker.setMap(null);
  }
  $('#search-button').addClass('disabled');
}

var keyDelayTimer = null;
var value = '';
function registerEvents() {
  // Registriere Events fuer Eingabe der PLZ
  $('#inputPLZ').keyup(function() {
    // GUI
    $('#search-button').addClass('disabled');
    // Warte 1s auf weitere Eingaben bevor Eingabe ueberprueft wird
    if(keyDelayTimer !== null) clearTimeout(keyDelayTimer);
    if($(this).val().length < 3) return;
    var oldV = value;
    value = $(this).val();
    if(oldV == $(this).val()) return;
    keyDelayTimer = setTimeout(function() {
      // Ueberpruefe Eingabe
      var matches = $('#inputPLZ').val().match(/\d{5}/g);
      var search = '';
      if(matches !== null && matches.length > 0) {
        // Eingabe gueltig
        search = matches[0];
      } else {
        matches = $('#inputPLZ').val().match(/(\w\D){1,}/g);
        if(matches !== null && matches.length > 0) {
          // Eingabe gueltig
          search = matches[0];
        } else {
          // Eingabe ungueltig
          return;
        }
      }

      // Lade Koordinaten zu Adresse
      geocoder.geocode({ 'address': search }, function(results, status) {
        // Ergebnis angekommen
        if(status == google.maps.GeocoderStatus.OK) {
          // Ergebnis erfolgreich
          for(var ri in results) {
            var res = results[ri];
            var address = res.address_components;
            var isValid = false;
            var plz = '';
            var ort = '';
            // Adresse aus Ergebnis zusammensetzen
            for(var i in address) {
              if(address[i].types[0] == 'country') {
                // Position ist nur gueltig wenn in DE
                if(address[i].short_name == 'DE') isValid = true;
              } else if(address[i].types[0] == 'locality') {
                ort = address[i].long_name;
              } else if(address[i].types[0] == 'postal_code') {
                plz = address[i].long_name;
              }
            }
            if(!isValid) continue;

            // Ergebnis speichern und anzeigen
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
            $('#search-button').removeClass('disabled');
            map.setCenter(position);

            var name = '';
            if(plz !== '') name += plz + ' ';
            name += ort;
            $('#inputPLZ').val(name);

            break;
          }
        } else {
          // Geocode nicht erfolgreich
          console.log("Geocode was not successful for the following reason: " + status);
        }
      });
    }, 1000);
  });
  $('#inputPLZ').focusout(function() {
    onPLZChange();
  });
  $('#search-button').click(function() {
    // Nur Ausfuehren wenn Position angegeben wurde
    if(marker == null) return;
    // GUI
    $('input, select').prop('disabled', true);
    $('#inputRange').get(0).setAttribute('disabled', true);
    $('#search-button').addClass('disabled');
    $('#price-card p').addClass('hidden');
    $('#price-card .preloader-wrapper').removeClass('hidden');
    $('#price-card .text').html('0,00');
    $('#price-card .card-content').tooltip('remove');
    $('#price-card .link').hide();

    // Eingabe auslesen
    var type = $('#inputType').val();
    var radius = $('#inputRange').get(0).noUiSlider.get();

    // Eingabe im Cache speichern um die Werte bei einem Reload widerherzustellen
    localStorage['lastQuery'] = (markerOrt.length > 0 ? (markerPLZ.length > 0 ? markerPLZ + ' ' : '') + markerOrt : (markerPLZ.length > 0 ? markerPLZ  : ''));
    localStorage['lastType'] = type;
    localStorage['lastRadius'] = radius;

    // Ergebnisse laden
    $.ajax({
      method: 'POST',
      url: 'api/getbestprice.php',
      data: {
        lat: marker.getPosition().lat(),
        lng: marker.getPosition().lng(),
        radius: radius,
        type: type
      },
      success: function(response) {
        // Request erfolgreich
        var result = JSON.parse(response);
        // Ergebnis anzeigen
        var priceString = result.bestStation.price.toString();

        $('#price-card .text').html(priceString.substr(0, 4).replace('.', ','));
        if(priceString.length >= 5) {
          $('#price-card .text').html($('#price-card .text').html() + '<span>' + priceString.substr(4, 5) + '</span>');
        }
        // GUI
        $('#price-card .card-content').tooltip({delay: 50});
        $('.material-tooltip > span').html(result.bestStation.name + '<br />' + result.bestStation.street + '<br />' + result.bestStation.postCode + ' ' + result.bestStation.place + '<br /><br />Entfernung (Luftlinie): ' + result.bestStation.dist + ' km');

        $('#price-card p').removeClass('hidden');
        $('#price-card .preloader-wrapper').addClass('hidden');
        $('#search-button').removeClass('disabled');
        $('input, select').prop('disabled', false);
        $('#inputRange').get(0).removeAttribute('disabled');
        setTimeout(function() {
          onResize();
        }, 10);

        // Chart initialisieren
        initChart(result.history);
        $('#price-card .link').show();
      }
    });
  });
  $('#price-card .link').click(function() {
    // Chart Modal oeffnen
    $('#history-modal').openModal();
  });

  $(window).resize(function() {
    onResize();
  });
}
function onResize() {
    $('#price-card .card-content').css('top', ($('#price-card').outerHeight() / 2 - $('#price-card .card-content').height() * (7/12)) + 'px');
}
function onPLZChange() {
  // Ueberpruefe Eingabe
  var matches = $('#inputPLZ').val().match(/\d{5}/g);
  var search = '';
  if(matches !== null && matches.length > 0) {
    // Eingabe gueltig
    search = matches[0];
  } else {
    matches = $('#inputPLZ').val().match(/(\w\D){1,}/g);
    if(matches !== null && matches.length > 0) {
      // Eingabe gueltig
      search = matches[0];
    } else {
      // Eingabe ungueltig
      return;
    }
  }

  // Lade Position von Adresse
  geocoder.geocode({ 'address': search }, function(results, status) {
    // Ergebnis angekommen
    if(status == google.maps.GeocoderStatus.OK) {
      // Ergebnis erfolgreich
      for(var ri in results) {
        var res = results[ri];
        var address = res.address_components;
        var isValid = false;
        var plz = '';
        var ort = '';
        // Adresse aus Ergebnis zusammensetzen
        for(var i in address) {
          if(address[i].types[0] == 'country') {
            // Position ist nur gueltig wenn in DE
            if(address[i].short_name == 'DE') isValid = true;
          } else if(address[i].types[0] == 'locality') {
            ort = address[i].long_name;
          } else if(address[i].types[0] == 'postal_code') {
            plz = address[i].long_name;
          }
        }
        if(!isValid) continue;

        // Ergebnis speichern und anzeigen
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
        $('#search-button').removeClass('disabled');
        map.setCenter(position);

        var name = '';
        if(plz !== '') name += plz + ' ';
        name += ort;
        $('#inputPLZ').val(name);

        break;
      }
    } else {
      // Geocode fehlgeschlagen
      console.log("Geocode was not successful for the following reason: " + status);
    }
  });
}

function initChart(history) {
  // Speichere Preisdaten
  var labels = [];
  var data = [];
  var counter = 0;
  for(var i = 0; i < 24; i++) {
    var p = history[i];
    if(typeof p !== 'undefined') {
      data[counter] = parseFloat(p);
      labels[counter] = i + ' Uhr';
      counter++;
    }
  }

  // Zeige Preis-Chart an
  chart = new Chart($('#history-modal canvas')[0].getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: "Durchschnittspreis",
          fill: true,
          lineTension: 0.1,
          backgroundColor: "#fbc02d",
          borderColor: "#f9a825",
          borderCapStyle: 'butt',
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: 'miter',
          pointBorderColor: "#f9a825",
          pointBackgroundColor: "#fff",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#f9a825",
          pointHoverBorderColor: "rgba(220,220,220,1)",
          pointHoverBorderWidth: 2,
          pointRadius: 1,
          pointHitRadius: 10,
          data: data
        }
      ]
    }
  });
}

onResize();
$(document).ready(function() {
  // Initialisiere Radius-Slider
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

  // Registriere Events
  registerEvents();

  // Lade vorherige Eingabewerte von Cache
  var lastQuery = localStorage['lastQuery'] || '';
  var lastRadius = localStorage['lastRadius'] || 10;
  var lastType = localStorage['lastType'] || 'e5';

  // Vorherige Eingabewerte anzeigen
  if(lastQuery.length > 0) {
    $('#inputPLZ').val(lastQuery);
    setTimeout(function() {
      onPLZChange();
    }, 20);
  }
  $('#inputRange').get(0).noUiSlider.set(lastRadius);
  $('#inputType').val(lastType).change();
  $('select').material_select();

  // GUI
  $('#price-card .card-content').tooltip({delay: 50});
  $('.material-tooltip > span').html('Um den besten Preis zu finden, einfach unten die Einstellungen anpassen und suchen!');
});
