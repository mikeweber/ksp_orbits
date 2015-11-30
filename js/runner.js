/* globals FlightPlanner Decimal jQuery */

var player = initUniverse()
player.zoomTo(new Decimal(200))
player.run()
player.track('Ike')
addListeners(jQuery, player)
runDunaIntercept(player, jQuery)
//runFlightBack(player, jQuery)

function followShipAndTarget(ship, player) {
  'use strict'

  var zoom, coords1, coords3, zoom_x, zoom_y, dist_x, dist_y, dist_x2, dist_y2, port_x, port_y,
      closest_zoom = 500,
      kerbin       = player.sim.getBody('Kerbin'),
      coords2      = kerbin.getCoordinates(),
      duna         = player.sim.getBody('Duna'),
      cur_target   = { getCoordinates: function() { return coords2 } }

  function follow() {
    coords1 = ship.getCoordinates()
    coords2 = cur_target.getCoordinates()
    port_x  = player.renderer.getViewportX().times(0.8)
    port_y  = player.renderer.getViewportY().times(0.8)
    dist_x  = coords1.x.minus(coords2.x).abs()
    dist_y  = coords1.y.minus(coords2.y).abs()
    if (cur_target !== duna) {
      coords3 = duna.getCoordinates()
      dist_x2 = coords1.x.minus(coords3.x).abs()
      dist_y2 = coords1.y.minus(coords3.y).abs()
      if (dist_x2.lt(port_x) || dist_y2.lt(port_y)) {
        cur_target = duna
        dist_x     = dist_x2
        dist_y     = dist_y2
      }
    }

    zoom = new Decimal('' + Math.min(player.renderer.world_size.width.dividedBy('' + dist_x), player.renderer.world_size.height.dividedBy('' + dist_y))).times(0.8)
    if (zoom.lt(closest_zoom)) {
      player.renderer.zoomTo(zoom)
    }
  }

  player.renderer.observe('before:render', follow)
  player.observe('after:smoothZoomIn',  function() { player.renderer.unobserve('before:render', follow) })
  player.observe('after:smoothZoomOut', function() { player.renderer.unobserve('before:render', follow) })
  player.observe('after:trackNext',     function() { player.renderer.unobserve('before:render', follow) })
  player.observe('after:trackPrev',     function() { player.renderer.unobserve('before:render', follow) })
}

function runFlightBack(player, $) {
  'use strict'

  var stat = new FlightPlanner.View.FlightStatus(sim, 1, 'Launching from Duna')
  $('#status').append(stat.getPanel())

  sim.removeBody('Duna Mission')
  var plan = new FlightPlanner.Model.FlightPlan(sim, 'Return Mission', stat, 18872150).scheduleLaunchFromPlanet(
    sim.getBody('Duna'),
    2200,
    {
      throttle:         1,
      max_accel:        0.2,
      fuel_consumption: 0.19,
      initial_angle:    Math.PI / 2,
      heading:          0,
      absolute_heading: true,
      target:           sim.getBody('Kerbin')
    }
  )
  function addShipRenderer(ship) {
    var ship_r  = new FlightPlanner.View.PlanetRenderer(ships, ship, '#FFFFFF', 2),
        ship_cr = new FlightPlanner.View.ConicRenderer(conics, ship)
    player.renderer.registerRenderer(ship_r)
    // player.renderer.registerRenderer(ship_cr)
    followShipAndTarget(ship, player)
    plan.unobserve('after:blastOff', addShipRenderer)
  }

  plan.observe('after:blastOff', addShipRenderer)
}

function initUniverse() {
  'use strict'

  var sun       = new FlightPlanner.Model.Sun(1.1723328e18, 2.616e8),
      kerbin    = new FlightPlanner.Model.Planet('Kerbin', 6e5,   3.5316e12,    13599840256, -Math.PI,       0,    8.4159286e7),
      duna      = new FlightPlanner.Model.Planet('Duna',   3.2e5, 3.0136321e11, 20726155264, -Math.PI,       0.05, 4.7921949e7),
      mun       = new FlightPlanner.Model.Planet('Mün',    2.0e5, 6.5138398e10, 1.2e7,       -Math.PI * 1.7, 0,    2.4295591e6),
      minmus    = new FlightPlanner.Model.Planet('Minmus', 6.0e5, 1.7658000e9,  4.7e7,       -Math.PI * 0.9, 0,    2.2474284e6),
      ike       = new FlightPlanner.Model.Planet('Ike',    1.3e5, 1.8568369e10, 3.2e6,       -Math.PI * 1.7, 0.03, 1.0495989e6),
      canvas    = $('#flightplan')[0],
      conics    = $('#flightpaths')[0],
      ships     = $('#ships')[0],
      info      = $('#info')[0],
      sun_r     = new FlightPlanner.View.PlanetRenderer(canvas, sun,    '#FFFF00', 7),
      kerbin_r  = new FlightPlanner.View.PlanetRenderer(canvas, kerbin, '#7777FF', 4),
      duna_r    = new FlightPlanner.View.PlanetRenderer(canvas, duna,   '#FF3333', 4),
      mun_r     = new FlightPlanner.View.PlanetRenderer(canvas, mun,    '#DDDDDD', 4),
      minmus_r  = new FlightPlanner.View.PlanetRenderer(canvas, minmus, '#A9D0D5', 4),
      ike_r     = new FlightPlanner.View.PlanetRenderer(canvas, ike,    '#999999', 4),
      sun_cr    = new FlightPlanner.View.ConicRenderer(conics, sun),
      kerbin_cr = new FlightPlanner.View.ConicRenderer(conics, kerbin),
      duna_cr   = new FlightPlanner.View.ConicRenderer(conics, duna),
      mun_cr    = new FlightPlanner.View.ConicRenderer(conics, mun),
      minmus_cr = new FlightPlanner.View.ConicRenderer(conics, minmus),
      ike_cr    = new FlightPlanner.View.ConicRenderer(conics, ike),
      size      = 2.3e10,
      world     = { width: size, height: size },
      canvas_dimensions = { width: 500, height: 500 },
      bg        = $('#background')[0],
      renderer  = new FlightPlanner.View.Renderer(canvas, world, canvas_dimensions),
      launch_t  = 1.88719e7,
      return_t  = 1.887215e7,
      sim       = new FlightPlanner.Controller.Simulator(launch_t, [ike, duna, minmus, mun, kerbin, sun], 64),
      player    = new FlightPlanner.Controller.Player(sim, renderer)

  kerbin.addChild(mun)
  kerbin.addChild(minmus)
  duna.addChild(ike)
  sun.addChild(kerbin)
  sun.addChild(duna)
  renderer.registerRenderer(new FlightPlanner.View.BackgroundRenderer(bg))
  renderer.registerRenderer(new FlightPlanner.View.SimDetails(info, player))
  renderer.registerRenderer(sun_cr)
  renderer.registerRenderer(kerbin_cr)
  renderer.registerRenderer(duna_cr)
  renderer.registerRenderer(mun_cr)
  renderer.registerRenderer(minmus_cr)
  renderer.registerRenderer(ike_cr)
  renderer.registerRenderer(sun_r)
  renderer.registerRenderer(kerbin_r)
  renderer.registerRenderer(duna_r)
  renderer.registerRenderer(mun_r)
  renderer.registerRenderer(minmus_r)
  renderer.registerRenderer(ike_r)

  return player
}

function runDunaIntercept(player, $) {
  'use strict'

  var stat = new FlightPlanner.View.FlightStatus(player.sim, 1, 'Launching from Kerbin')
  $('#status').append(stat.getPanel())

  var plan = new FlightPlanner.Model.FlightPlan(player.sim, 'Duna Mission', stat, 1.8872e7).scheduleLaunchFromPlanet(
    player.sim.getBody('Kerbin'),
    70000,
    {
      throttle:         1,
      max_accel:        0.2,
      fuel_consumption: 0.19,
      initial_angle:    -Math.PI,
      heading:          0,
      absolute_heading: false,
      target:           player.sim.getBody('Duna')
    }
  )

  function addShipRenderer(ship) {
    var ship_r  = new FlightPlanner.View.PlanetRenderer(ships, ship, '#FFFFFF', 2),
        ship_cr = new FlightPlanner.View.ConicRenderer($('#flightpaths')[0], ship)
    player.renderer.registerRenderer(ship_r)
    // player.renderer.registerRenderer(ship_cr)
    followShipAndTarget(ship, player)
    plan.unobserve('after:blastOff', addShipRenderer)
  }

  plan.observe('after:blastOff', addShipRenderer)
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(2.01e5) }, Math.PI, false, 1).done(function(status_tracker) {
    status_tracker.setMessage('Decelerating on approach to Duna')
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(3.88e5) }, player.sim.getBody('Duna').getPrograde().plus('' + (-Math.PI * 0.45)), true, 1).done(function(status_tracker) {
    status_tracker.setMessage('Matching velocity and vector with planet')
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(4.18e5) }, 0, false, 0).done(function(status_tracker) {
    status_tracker.setMessage('Waiting for intercept...')
  })
  plan.addSOIChangeManeuver(player.sim.getBody('Kerbol'), Math.PI * 0.727, true, 1).done(function(status_tracker) {
    status_tracker.setMessage('Left Kerbin SOI; setting course')
  })
  plan.addSOIChangeManeuver(player.sim.getBody('Duna'), Math.PI, false, 1).done(function(status_tracker, ship, t) {
    var i, soi_change_time = t
    status_tracker.setMessage('Near destination; attempting to get captured')

    plan.addManeuver(function(t, ship) { return ship.getVelocity().lt(ship.parent.mu.times(new Decimal(1).dividedBy(ship.pos.r)).sqrt()) }, 0, false, 0).done(function(status_tracker) {
      status_tracker.setMessage('Capture complete; Shutting down engines')

      plan.addManeuver(function(t, ship) { return ship.pos.r.minus(500).lt(ship.calcOrbitalParams().pe) }, -Math.PI, false, 1).done(function(status_tracker) {
        status_tracker.setMessage('Lowering periapsis and circularizing orbit')

        plan.addManeuver(function(t, ship) { return ship.calcOrbitalParams().pe.lt(500000) }, 0, false, 0).done(function(status_tracker) {
          status_tracker.setMessage('Waiting to reach parking orbit')

          plan.addManeuver(function(t, ship) { return ship.pos.r.minus(35000).lt(ship.calcOrbitalParams().pe) }, -Math.PI, false, 1).done(function(status_tracker) {
            status_tracker.setMessage('Circularizing orbit...')

            // Circular orbit at 600km from center of Duna has a velocity of 818 m/s
            plan.addManeuver(function(t, ship) { return ship.getVelocity().lt(820) }, 0, false, 0).done(function(status_tracker) {
              status_tracker.setMessage('Parking orbit reached')
            })
          })
        })
      })
    })
  })
}

function addListeners($, player) {
  'use strict'

  $('#pause').on(      'click', function() { player.execute('togglePaused') })
  $('#zoom_in').on(    'click', function() { player.execute('zoomIn') })
  $('#zoom_out').on(   'click', function() { player.execute('zoomOut') })
  $('#faster').on(     'click', function() { player.execute('speedUp') })
  $('#slower').on(     'click', function() { player.execute('slowDown') })
  $('#prev_target').on('click', function() { player.execute('trackPrev') })
  $('#next_target').on('click', function() { player.execute('trackNext') })
  $(window).on('keyup', function(e) {
    var key = e.keyCode ? e.keyCode : e.which

    if (key === 27 || key === 32) {
      // esc
      player.execute('togglePaused')
    } else if (key === 190) {
      // >
      player.execute('speedUp')
    } else if (key === 188) {
      // <
      player.execute('slowDown')
    } else if (key === 221) {
      // [
      player.execute('trackNext')
    } else if (key === 219) {
      // ]
      player.execute('trackPrev')
    }
  })

  $(window).on('keydown', function(e) {
    var key = e.keyCode ? e.keyCode : e.which
    if (key === 187) {
      // +
      player.execute('smoothZoomIn')
    } else if (key === 189) {
      // -
      player.execute('smoothZoomOut')
    }
  })
}
