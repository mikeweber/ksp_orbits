/* globals FlightPlanner Decimal jQuery */

var player = initUniverse()
player.zoomTo(new Decimal(200))
player.run()
player.track('Ike')
startListeners(jQuery, player)
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
      sim       = new FlightPlanner.Controller.Simulator(t, [sun, duna, kerbin, mun, minmus, ike], 128)

  var runner = {
    sim:      sim,
    renderer: renderer,
    run:      function() { sim.run(renderer) },
    track:    function(obj_name) {
      var obj = sim.getPlanet(obj_name)
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

  var plan = new FlightPlanner.Model.FlightPlan('ship1', 1.8872e7).scheduleLaunchFromPlanet(
    sim.getPlanet('Kerbin'),
    70000,
    {
      throttle:         0,
      max_accel:        0.2,
      fuel_consumption: 0.19,
      initial_angle:    -Math.PI,
      heading:          0,
      absolute_heading: false,
      target:           sim.getPlanet('Duna')
    }
  )

  var stat = new FlightPlanner.View.FlightStatus(sim, 1, 'Launching from Kerbin')
  plan.addObserver(stat)
  $('#status').append(stat.getPanel())

  plan.addManeuver(function(t, ship) { sim.track(ship); return true }, 0, false, 1)
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(2.01e5) }, Math.PI, false, 1).done(function(observers) {
    for (var i = observers.length; i--; ) {
      observers[i].setMessage('Decelerating on approach to Duna')
    }
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(3.88e5) }, sim.getPlanet('Duna').getPrograde() - (Math.PI * 0.7), true, 1).done(function(observers) {
    for (var i = observers.length; i--; ) {
      observers[i].setMessage('Matching velocity and vector with planet')
    }
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(4.2e5) }, 0, false, 0).done(function(observers) {
    for (var i = observers.length; i--; ) {
      observers[i].setMessage('Waiting for intercept...')
    }
  })
  plan.addSOIChangeManeuver(sim.getPlanet('Kerbol'), Math.PI * 0.727, true, 1).done(function(observers) {
    for (var i = observers.length; i--; ) {
      observers[i].setMessage('Left Kerbin SOI; setting course')
    }
  })
  plan.addSOIChangeManeuver(sim.getPlanet('Duna'), Math.PI, false, 1).done(function(observers, ship, t) {
    var i, soi_change_time = t
    for (i = observers.length; i--; ) {
      observers[i].setMessage('Near destination; attempting to get captured')
    }

    plan.addManeuver(function(t, ship) { return ship.getVelocity().lt(ship.parent.mu.times(new Decimal(1).dividedBy(ship.pos.r)).sqrt()) }, 0, false, 0).done(function(observers) {

      for (i = observers.length; i--; ) {
        observers[i].setMessage('Capture complete; Shutting down engines')
      }

      var pe = ship.calcOrbitalParams().pe
      plan.addManeuver(function(t, ship) { return ship.pos.r.plus(10).lt(pe) }, -Math.PI, false, 1).done(function(observers) {
        for (i = observers.length; i--; ) {
          observers[i].setMessage('Lowering periapsis and circularizing orbit')
        }

        plan.addManeuver(function(t, ship) { return ship.getEccentricity().lt(0.1) }, 0, false, 0).done(function(observers) {
          for (i = observers.length; i--; ) {
            observers[i].setMessage('Orbit circularized')
          }
        })
      })
    })
  })

  sim.registerShipLaunch(plan)
}

function startListeners($, player) {
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
