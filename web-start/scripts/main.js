
'use strict';

function signIn() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
}
function signOut() {
  firebase.auth().signOut();
}

function chartit( options ) {
  var chart = new Highcharts.Chart(options);
}

function setInput( type, day, name, value ) {
  var inputEl = '';
  switch ( day ) { 
    case 'sunday': 
      inputEl = 'day-0-';
      break;
    case 'monday': 
      inputEl = 'day-1-';
      break;
    case 'tuesday': 
      inputEl = 'day-2-';
      break;    
    case 'wednesday': 
      inputEl = 'day-3-';
      break;
    case 'thursday': 
      inputEl = 'day-4-';
      break;
    case 'friday': 
      inputEl = 'day-5-';
      break;
    case 'saturday': 
      inputEl = 'day-6-';
      break;
  }
  // name is time, duration, allday
  // type is text or checkbox
  if ( type=='text' ) {
    if ( name=='duration' ) {
      $("input[name=" + inputEl + name + "]").val(value);
    }
    if ( name=='time' ) {
      $("input[name=" + inputEl + name + "]").combodate('setValue', value);
    }
  }
  if ( type=='checkbox' ) {
    var checkboxEl = $("input[name=" + inputEl + name + "]");
    checkboxEl.prop('checked', value);
    checkboxEl.closest('div').find('.time-duration ').prop('disabled', value);
    checkboxEl.closest('div').find('.hour ').prop('disabled', value);
    checkboxEl.closest('div').find('.minute ').prop('disabled', value);
  }  
}

function resetInputs() {
  $("#general-availability").trigger('reset');
  $('.weekday-availability').show();
  $(':input','#general-availability')
  .prop('disabled', false);
}

function loadPlayerData( player, database ) {
  database.ref('players/' + player).once('value').then(function(snapshot) {
    var playerData = snapshot.val();
    //console.log(playerData);
    if ( playerData.available=='yes' ) {
      $("input[name=opt-in]").filter('[value=yes]').prop('checked', true);
    } else {
      $("input[name=opt-in]").filter('[value=no]').prop('checked', true);
    }
    for ( var dayOfWeek in playerData.data ) {        
      var dayStatus = playerData.data[dayOfWeek];
      setInput( 'text', dayOfWeek, 'duration', dayStatus.duration );
      setInput( 'text', dayOfWeek, 'time', dayStatus.time );
      setInput( 'checkbox', dayOfWeek, 'allday', dayStatus.allday );        
    }
  });
}

function showError( divlocation, msg ) {
  var errorDiv = divlocation.closest('div').find('div#errormsg').first();
  errorDiv.text(msg).css( "color", "red" );
  errorDiv.fadeIn( 300 ).delay( 3000 ).fadeOut( 400 );
}


$(function () {
  var now = moment();
  var timezone = jstz.determine() || 'UTC'; // get timezone
  var currentTzName = timezone.name();
  var nowFormatted = now.format('ddd, MMM D, hh:mm a z');
  $('#current_time').text( nowFormatted + ' ('+ currentTzName + ')' );


  var config = {
    apiKey: "AIzaSyBDFaDs4-uv1t98UL_mnbHmfgaJSORrs8Q",
    authDomain: "friendlychat-530ea.firebaseapp.com",
    databaseURL: "https://friendlychat-530ea.firebaseio.com",
    storageBucket: "friendlychat-530ea.appspot.com",
  };
  firebase.initializeApp(config);

  // Get a reference to the database service
  var database = firebase.database();
  var auth = firebase.auth();
  var storage = firebase.storage();

  var currPlayer = $('#currPlayer');
  var playersRef = database.ref('players');

  // toggle signin / signout, load player list to select
  auth.onAuthStateChanged(function(user) {
    if (user) {
      console.log('user logged in');
      $('#sign-out').toggle( true );
      $('#sign-in').toggle( false );
    } else {
      console.log('user logged out');
      $('#sign-in').toggle( true );
      $('#sign-out').toggle( false );
    } // end else

    playersRef.orderByChild("name").once('value').then(function(snapshot) {
      var data = snapshot.val();  // array of objects
      for ( var player in data ) {
        if ( !user && data[player].available!=='inactive' ) {
          $('#currPlayer').append($('<option>', {
              value: player,
              text: player
          }));
        } else if (user) {
          $('#currPlayer').append($('<option>', {
              value: player,
              text: player
          }));
        } 

      } // end for
    });

  });

  playersRef.orderByChild("available").equalTo("yes").on('value', function(snapshot) {
    var players = snapshot.val();  // object of objects
    //console.log(players);
    var pastSunday = moment().startOf('week');
    var pastSundayval = pastSunday.valueOf();
    //console.log(pastSunday.format('MMMM DD YYYY, h:mm:ss a'));
    // build array of categories: ['john', 'mark', 'paul']
    var categories = [];
    var data = [];

    for ( var player in players ) {
      //console.log('player: ' + player);
      categories.push(player);

      var playerDaysData = players[player].data;
      for (var day in playerDaysData) {
        //console.log( playerDaysData[day] );
        var daydata = [];
        daydata.push( categories.indexOf(player) ); // add index
        if ( playerDaysData[day].allday === true ) {
          var starttime = moment().startOf('week').day(day);
          var endtime = starttime.clone().add(23,'hours').add(59,'minutes');
          daydata.push( starttime.valueOf() );
          daydata.push( endtime.valueOf() );
        } else {
          if ( playerDaysData[day].time && playerDaysData[day].duration ) {
            var thetime = moment(playerDaysData[day].time, "HH:mm");
            var starttime = moment().startOf('week').day(day).add(thetime.hour(),'hours').add(thetime.minute(),'minutes');
            var endtime = starttime.clone().add(playerDaysData[day].duration,'hours');
          } else {
            var starttime = null;
            var endtime = null;
          }
          daydata.push( (starttime) ? starttime.valueOf() : null );
          daydata.push( (endtime) ? endtime.valueOf() : null );
        }
        if ( daydata.length > 0 ) {
          //console.log(daydata);
          data.push( daydata );      
        }
      } // end for day
    } // end for player
    /* build array of arrays for data
    data: [
        [0, guy1startval, guy1endval],  // each day's start and end
        [0, 1487635000000, 1487735000000],
        [1, 1487430000000, 1487435000000],
        [1, 1487535000000, 1487735000000],
        [2, 1487430000000, 1487435000000]
    ] */
    Highcharts.setOptions({
        global: {
            getTimezoneOffset: function (timestamp) {
                var chartTimezone = currentTzName;
                var timezoneOffset = -moment.tz(timestamp, chartTimezone).utcOffset();
                return timezoneOffset;
            }
        }
    });

    Highcharts.chart('graph-container', {
        chart: {
            type: 'columnrange',
            inverted: true
        },
        title : {
          text: 'Weekly schedule (Sun - Sat)'
        }, 
        xAxis: {
            categories: categories
        },
        yAxis: {
            min: pastSundayval,
            type: 'datetime',
            dateTimeLabelFormats: {
                day: '%a'
                //day: '%a %b %e'
            },
            startOfWeek: 0,
            startOnTick: false,
            minRange: 7 * 24 * 60 * 60 * 1000, // one week
            title: {
                text: 'Day of week'
            },
            plotLines: [{
              color: 'rgba(74,117,211,0.4)',
              value: moment(), // now
              width: 5,
              label: {
                  text: 'Now',
                  verticalAlign: 'middle',
                  textAlign: 'center'
              }
            }]
        },
        tooltip: {
          formatter: function (tooltip) {
              return this.point.category + ': ' + moment(this.point.low).format("ddd HH:mm") + ' - ' + moment(this.point.high).format("ddd HH:mm");
          }
        },
        plotOptions: {
            columnrange: {
                dataLabels: {
                    enabled: true,
                    formatter: function () {
                        //return moment(this.y);
                        return moment(this.y).format("HH:mm");
                        //return this.y;
                    }
                }
            }
        },
        series: [{
            name: 'Available times',
            data: data
        }]
    });

  });

  $('.time-selector').combodate({
    firstItem: 'name', //show 'hour' and 'minute' string at first item of dropdown
    minuteStep: 15
  });   
  $("input[name='opt-in']").on( "change", function() {
    var weekDays = $('.weekday-availability');
    if ( $(this).val() === 'yes' ) {
      weekDays.show();
    } else {
      weekDays.hide();
    }
  });
  $('.all-day').on( "click", function() {
    var thisWeekdayHour = $(this).closest('div').find('.hour ');
    var thisWeekdayMinute = $(this).closest('div').find('.minute ');
    var thisWeekdayDuration = $(this).closest('div').find('.time-duration ');
    if ( $(this).prop('checked') === true ) {
      thisWeekdayHour.val('');   // need resets?
      thisWeekdayMinute.val('');
      thisWeekdayDuration.val('');
      thisWeekdayHour.prop('disabled', true);
      thisWeekdayMinute.prop('disabled', true);
      thisWeekdayDuration.prop('disabled', true);
    } else {
      thisWeekdayHour.val('');   // need resets?
      thisWeekdayMinute.val('');
      thisWeekdayDuration.val('');
      thisWeekdayHour.prop('disabled', false);
      thisWeekdayMinute.prop('disabled', false);
      thisWeekdayDuration.prop('disabled', false);
    }
  });


  currPlayer.on( "change", function() {
    resetInputs();
    var player = $(this).val();
    if ( player!=='' ) {
      $('#general-availability').show();
      loadPlayerData( player, database );
    } else {
      $('#general-availability').hide();
    }
  });




  $('#sign-in').on( "click", function() {
    signIn();
  });
  $('#sign-out').on( "click", function() {
    signOut();
  });

  $('.save-times').on( "click", function(event) {
    event.preventDefault();
    var confirm = $(this).closest('div').find('span#success').first();
    var errormessages = '';
    if ( currPlayer.val() ) {
      var name = currPlayer.val();
      var available = $("input[name=opt-in]:checked").val();
      var update = {
          name: name,
          available: available,
          timezone: currentTzName
      }
      if ( available=='yes' ) {
        var data        = {}, 
            sunday      = {}, 
            monday      = {}, 
            tuesday     = {}, 
            wednesday   = {}, 
            thursday    = {}, 
            friday      = {}, 
            saturday    = {};

        $( "input[name|='day']" ).each(function( i ) {
          //<input name="day-0-time" id="day-0-time" class="time-selector" data-format="HH:mm" data-template="HH : mm" style="display: none;" type="text">
          //<input name="day-0-duration" id="day-0-duration" class="time-duration" placeholder="hours (ex: 1.5)" type="text">
          //<input name="day-0-allday" id="day-0-allday" class="all-day" type="checkbox">
          var parts = $(this).prop('name').split('-');
          var key = parts[2];
          var daynumber = parts[1];
          if ( key=='allday' ) {
            $(this).prop('checked') === true
            var value = ( $(this).prop('checked') ) ? true : false;
          } else {
            var value = $(this).val();
          }
          switch ( daynumber ) { 
            case '0': 
              sunday[key] = value;
              break;
            case '1': 
              monday[key] = value;
              break;
            case '2': 
              tuesday[key] = value;
              break;    
            case '3': 
              wednesday[key] = value;
              break;
            case '4': 
              thursday[key] = value;
              break;
            case '5': 
              friday[key] = value;
              break;
            case '6': 
              saturday[key] = value;
              break;
          }
        });
        var data = {
          "sunday" : sunday,
          "monday" : monday,
          "tuesday" : tuesday,
          "wednesday" : wednesday,
          "thursday" : thursday,
          "friday" : friday,
          "saturday" : saturday
        }
        // validation
        for(var day in data) {        
          var thisDay = data[day];
          if ( thisDay.allday === false ) {
            if ( thisDay.duration > 24 || thisDay.duration < 0 ) {
              errormessages = 'Duration must be between 0 and 24. (check ' + day + ')';
            }
            if ( thisDay.time!=='' && thisDay.duration=='' || thisDay.time=='' && thisDay.duration!=='') {
              errormessages = 'Each start time must have a duration. (check ' + day + ')';
            }
          }
        }
        update['data'] = data;
      }
      if ( errormessages.length > 0 ) {
        showError( $(this), errormessages );
      } else {
        firebase.database().ref( 'players/' + name ).set(update);
        confirm.fadeIn( 300 ).delay( 800 ).fadeOut( 400 );
      }
    } else {
      errormessages = 'No player selected.';
      showError( $(this), errormessages );
    }
  });
  
  // http://jsfiddle.net/74ojqrab/5/
});


