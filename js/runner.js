/* globals FlightPlanner Decimal jQuery */

var player = initUniverse()
player.zoomTo(new Decimal(200))
player.run()
player.track('Ike')
addListeners(jQuery, player)
addManeuvers(player.sim, jQuery)

function initUniverse() {
  'use strict'

  var sun       = new FlightPlanner.Model.Sun(1.1723328e18, 2.616e8),
      kerbin    = new FlightPlanner.Model.Planet('Kerbin', sun,    6e5,   '#7777FF', 3.5316e12,    13599840256, -Math.PI,       0,    8.4159286e7),
      duna      = new FlightPlanner.Model.Planet('Duna',   sun,    3.2e5, '#FF3333', 3.0136321e11, 20726155264, -Math.PI,       0.05, 4.7921949e7),
      mun       = new FlightPlanner.Model.Planet('Mün',    kerbin, 2.0e5, '#DDDDDD', 6.5138398e10, 1.2e7,       -Math.PI * 1.7, 0,    2.4295591e6),
      minmus    = new FlightPlanner.Model.Planet('Minmus', kerbin, 6.0e5, '#A9D0D5', 1.7658000e9,  4.7e7,       -Math.PI * 0.9, 0,    2.2474284e6),
      ike       = new FlightPlanner.Model.Planet('Ike',    duna,   1.3e5, '#999999', 1.8568369e10, 3.2e6,       -Math.PI * 1.7, 0.03, 1.0495989e6),
      size      = 2.3e10,
      world     = { width: size, height: size },
      canvas    = { width: 500, height: 500 },
      renderer  = new FlightPlanner.View.Renderer($('#flightplan')[0], world, canvas),
      t         = 1.88719e7,
      sim       = new FlightPlanner.Controller.Simulator(t, [ike, duna, minmus, mun, kerbin, sun], 128)

  var runner = {
    sim:      sim,
    renderer: renderer,
    run:      function() { sim.run(renderer) },
    track:    function(obj_name) {
      var obj = sim.getBody(obj_name)
      if (!obj) {
        console.error('Could not find "' + obj_name + '"')
        return
      }

      sim.track(obj)
    },
    togglePaused:  sim.togglePaused.bind(sim),
    zoomTo:        renderer.zoomTo.bind(renderer),
    zoomIn:        renderer.zoomIn.bind(renderer),
    zoomOut:       renderer.zoomOut.bind(renderer),
    smoothZoomIn:  renderer.smoothZoomIn.bind(renderer),
    smoothZoomOut: renderer.smoothZoomOut.bind(renderer),
    speedUp:       sim.faster.bind(sim),
    slowDown:      sim.slower.bind(sim),
    trackNext:     sim.trackNext.bind(sim),
    trackPrev:     sim.trackPrev.bind(sim)
  }

  return runner
}

function addManeuvers(sim, $) {
  'use strict'

  var stat = new FlightPlanner.View.FlightStatus(sim, 1, 'Launching from Kerbin')
  $('#status').append(stat.getPanel())

  var plan = new FlightPlanner.Model.FlightPlan(sim, 'Duna Mission', stat, 1.8872e7).scheduleLaunchFromPlanet(
    sim.getBody('Kerbin'),
    70000,
    {
      throttle:         1,
      max_accel:        0.2,
      fuel_consumption: 0.19,
      initial_angle:    -Math.PI,
      heading:          0,
      absolute_heading: false,
      target:           sim.getBody('Duna')
    }
  )

  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(2.01e5) }, Math.PI, false, 1).done(function(status_tracker) {
    status_tracker.setMessage('Decelerating on approach to Duna')
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(3.88e5) }, sim.getBody('Duna').getPrograde().plus('' + (-Math.PI * 0.4)), true, 1).done(function(status_tracker) {
    status_tracker.setMessage('Matching velocity and vector with planet')
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(4.2e5) }, 0, false, 0).done(function(status_tracker) {
    status_tracker.setMessage('Waiting for intercept...')
  })
  plan.addSOIChangeManeuver(sim.getBody('Kerbol'), Math.PI * 0.727, true, 1).done(function(status_tracker) {
    status_tracker.setMessage('Left Kerbin SOI; setting course')
  })
  plan.addSOIChangeManeuver(sim.getBody('Duna'), Math.PI, false, 1).done(function(status_tracker, ship, t) {
    var i, soi_change_time = t
    status_tracker.setMessage('Near destination; attempting to get captured')

    plan.addManeuver(function(t, ship) { return ship.getVelocity().lt(ship.parent.mu.times(new Decimal(1).dividedBy(ship.pos.r)).sqrt()) }, 0, false, 0).done(function(status_tracker) {
      status_tracker.setMessage('Capture complete; Shutting down engines')

      var pe = ship.calcOrbitalParams().pe
      plan.addManeuver(function(t, ship) { return ship.pos.r.plus(100).lt(pe) }, -Math.PI, false, 1).done(function(status_tracker) {
        status_tracker.setMessage('Lowering periapsis and circularizing orbit')

        plan.addManeuver(function(t, ship) { return ship.getEccentricity().lt(0.1) }, 0, false, 0).done(function(status_tracker) {
          status_tracker.setMessage('Orbit circularized')
          sim.togglePaused()
        })
      })
    })
  })
}

function addListeners($, player) {
  'use strict'

  $('#pause').on(      'click', player.togglePaused)
  $('#zoom_in').on(    'click', player.zoomIn)
  $('#zoom_out').on(   'click', player.zoomOut)
  $('#faster').on(     'click', player.speedUp)
  $('#slower').on(     'click', player.slowDown)
  $('#prev_target').on('click', player.trackPrev)
  $('#next_target').on('click', player.trackNext)
  $(window).on('keyup', function(e) {
    var key = e.keyCode ? e.keyCode : e.which

    if (key === 27 || key === 32) {
      // esc
      player.togglePaused()
    } else if (key === 190) {
      // >
      player.speedUp()
    } else if (key === 188) {
      // <
      player.slowDown()
    } else if (key === 221) {
      // [
      player.trackNext()
    } else if (key === 219) {
      // ]
      player.trackPrev()
    }
  })

  $(window).on('keydown', function(e) {
    var key = e.keyCode ? e.keyCode : e.which
    if (key === 187) {
      // +
      player.smoothZoomIn()
    } else if (key === 189) {
      // -
      player.smoothZoomOut()
    }
  })
}
