/* globals FlightPlanner Decimal jQuery */

// for Duna Intercept
var launch_time = 6.0e6,
    return_launch_time = 6688564 + 8 * 6 * 3600
var start_time = launch_time - 100
var return_start_time = return_launch_time - 100

var player = initUniverse(return_start_time)
player.zoomTo(new Decimal(200))
player.run()
addListeners(jQuery, player)
// runDunaIntercept(player, 'Duna Mission', launch_time, jQuery)

runDunaReturn(player, 'Duna Mission', return_launch_time, jQuery)

function followShipAndTarget(ship, final_target, player, t) {
  'use strict'

  var zoom, coords1, coords3, zoom_x, zoom_y, dist_x, dist_y, dist_x2, dist_y2, port_x, port_y,
      closest_zoom = 500,
      coords2      = ship.getCoordinates(t),
      cur_target   = { getCoordinates: function() { return coords2 } }

  player.renderer.track(ship)
  function follow(t) {
    coords1 = ship.getCoordinates(t)
    coords2 = cur_target.getCoordinates(t)
    port_x  = player.renderer.getViewportX().times(0.8)
    port_y  = player.renderer.getViewportY().times(0.8)
    dist_x  = coords1.x.minus(coords2.x).abs()
    dist_y  = coords1.y.minus(coords2.y).abs()
    if (cur_target !== final_target) {
      coords3 = final_target.getCoordinates(t)
      dist_x2 = coords1.x.minus(coords3.x).abs()
      dist_y2 = coords1.y.minus(coords3.y).abs()
      if (dist_x2.lt(port_x) && dist_y2.lt(port_y)) {
        cur_target = final_target
        dist_x     = dist_x2
        dist_y     = dist_y2
      }
    }

    zoom = new Decimal(Math.min(player.renderer.world_size.width.dividedBy(dist_x), player.renderer.world_size.height.dividedBy(dist_y))).times(0.8)
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

function initUniverse(start_sim_at) {
  'use strict'

  var system    = new FlightPlanner.SolarSystem(),
      canvas    = $('#flightplan')[0],
      conics    = $('#flightpaths')[0],
      ships     = $('#ships')[0],
      info      = $('#info')[0],
      sun_r     = new FlightPlanner.View.PlanetRenderer(canvas, system.sun,    '#FFFF00', 7),
      kerbin_r  = new FlightPlanner.View.PlanetRenderer(canvas, system.kerbin, '#7777FF', 4),
      duna_r    = new FlightPlanner.View.PlanetRenderer(canvas, system.duna,   '#FF3333', 4),
      mun_r     = new FlightPlanner.View.PlanetRenderer(canvas, system.mun,    '#DDDDDD', 4),
      minmus_r  = new FlightPlanner.View.PlanetRenderer(canvas, system.minmus, '#A9D0D5', 4),
      ike_r     = new FlightPlanner.View.PlanetRenderer(canvas, system.ike,    '#999999', 4),
      sun_cr    = new FlightPlanner.View.ConicRenderer(conics, system.sun),
      kerbin_cr = new FlightPlanner.View.ConicRenderer(conics, system.kerbin),
      duna_cr   = new FlightPlanner.View.ConicRenderer(conics, system.duna),
      mun_cr    = new FlightPlanner.View.ConicRenderer(conics, system.mun),
      minmus_cr = new FlightPlanner.View.ConicRenderer(conics, system.minmus),
      ike_cr    = new FlightPlanner.View.ConicRenderer(conics, system.ike),
      size      = 2.3e10,
      world     = { width: size, height: size },
      canvas_dimensions = { width: 700, height: 700 },
      bg        = $('#background')[0],
      renderer  = new FlightPlanner.View.Renderer(canvas, world, canvas_dimensions),
      sim       = new FlightPlanner.Controller.Simulator(start_sim_at, system, 64),
      player    = new FlightPlanner.Controller.Player(sim, renderer)

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

function runDunaIntercept(player, name, launch_time, $) {
  'use strict'

  var stat = new FlightPlanner.View.FlightStatus(player.sim, 1, 'Launching from Kerbin'),
      duna = player.sim.getBody('Duna'),
      kerbin = player.sim.getBody('Kerbin')
  $('#status').append(stat.getPanel())

  var logger = new FlightPlanner.Util.FlightLog()
  var log_panel = new FlightPlanner.View.LogPanel(logger)
  $('#control-container').after(log_panel.getPanel())

  var plan = new FlightPlanner.Model.FlightPlan(player, name, stat, launch_time).scheduleLaunchFromPlanet(
    kerbin,
    70000,
    {
      throttle:         1,
      max_accel:        0.2,
      fuel_consumption: 0.19,
      initial_angle:    Math.PI / 4,
      heading:          0.1,
      absolute_heading: false,
      target:           player.sim.getBody('Duna')
    }
  )

  function addShipRenderer(ship) {
    var ship_r  = new FlightPlanner.View.PlanetRenderer(ships, ship, '#FFFFFF', 2),
        ship_cr = new FlightPlanner.View.ConicRenderer($('#flightpaths')[0], ship)
    player.renderer.registerRenderer(ship_r)
    player.renderer.registerRenderer(ship_cr)
    plan.unobserve('after:blastOff', addShipRenderer)
  }

  plan.observe('after:blastOff', addShipRenderer)
  plan.observe('after:blastOff', function(ship, t) {
    logger.logShipTelemetry(ship, t, 'Blast off')
    followShipAndTarget(ship, player.sim.getBody('Duna'), player, t)
  })

  var aim_for_duna = plan.addSOIChangeManeuver(player.sim.getBody('Kerbol'), Math.PI * 0.537, true, 1).done(function(status_tracker, ship, t) {
    var msg = 'Left Kerbin SOI; aiming to where Duna is going to be.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })

  aim_for_duna.done(function() {
    plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gt(2.005e5) }, Math.PI + Math.PI * 0.539, true, 1).done(function(status_tracker, ship, t) {
      var msg = 'Decelerating on approach to Duna.'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)
    })
  })

  var duna_intercept = plan.addSOIChangeManeuver(player.sim.getBody('Duna'), Math.PI, false, 1).done(function(status_tracker, ship, t) {
    var msg = 'Reached Duna\'s SOI. Lowering Apoapsis.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })

  duna_intercept.done(function(status_tracker, ship, t) {
    var duna_circularization = plan.addManeuver(function(t, ship) {
      var e = ship.getEccentricity()
      return e.gt(0) && e.lt(1) && ship.getApoapsis().lt(2e7)
    }, ship.getCartesianAngle(t), true, 1).done(function(status_tracker, ship, t) {
      var msg = 'Raising Periapsis. (slowing sim)'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)
      var orig_tick_size = player.sim.getTickSize()
      player.sim.setTickSize(1)

      var duna_raise_pe = plan.addManeuver(function(t, ship) { return ship.getPeriapsis().gt(5e5) }, 0, false, 0).done(function(status_tracker, ship, t) {
        player.sim.setTickSize(orig_tick_size)
        var time_of_ap = t.plus(ship.timeToApoapsis(t))
        var msg = 'Duna SOI capture complete. Coasting to Apoapsis (t+' + time_of_ap.round() + ').'
        logger.logShipTelemetry(ship, t, msg)
        status_tracker.setMessage(msg)

        var duna_coast_to_ap = plan.addManeuver(function(t, ship) { return t.gte(time_of_ap) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
          var msg = 'At Apoapsis. Lowering Periapsis. (slowing sim)'
          logger.logShipTelemetry(ship, t, msg)
          status_tracker.setMessage(msg)
          orig_tick_size = player.sim.getTickSize()
          player.sim.setTickSize(1)

          var duna_orbit_lowered = plan.addManeuver(function(t, ship) { return ship.getPeriapsis().lt(5e5) }, 0, false, 0).done(function(status_tracker, ship, t) {
            var time_of_pe = t.plus(ship.timeToPeriapsis(t).minus(300))
            var maneuver_angle = ship.getArgumentOfPeriapsis(t).plus(Math.PI / 2)
            var msg = 'Lowered Periapsis. Coasting to Periapsis (t+' + time_of_pe.round() + '). (resuming sim speed)'
            logger.logShipTelemetry(ship, t, msg)
            status_tracker.setMessage(msg)
            player.sim.setTickSize(orig_tick_size)

            var lower_apoapsis = plan.addManeuver(function(t, ship) { return ship.timeToPeriapsis(t).lt(300) }, maneuver_angle, true, 1).done(function(status_tracker, ship, t) {
              var target_ap = 5e5
              var msg = 'At Periapsis. Circularizing orbit to ' + target_ap + '.'
              logger.logShipTelemetry(ship, t, msg)
              status_tracker.setMessage(msg)

              var lowered_apoapsis = plan.addManeuver(function(t, ship) { return ship.getApoapsis().lte(target_ap) }, 0, false, 0).done(function(status_tracker, ship, t) {
                var msg = 'Apoapsis lowered.'
                logger.logShipTelemetry(ship, t, msg)
                status_tracker.setMessage(msg)
              })
            })
          })
        })
      })
    })
  })
}

function runDunaReturn(player, name, launch_time, $) {
  'use strict'

  var stat = new FlightPlanner.View.FlightStatus(player.sim, 1, 'Launching from Duna'),
      kerbol = player.sim.getBody('Kerbol'),
      duna = player.sim.getBody('Duna'),
      kerbin = player.sim.getBody('Kerbin')
  $('#status').append(stat.getPanel())

  var logger = new FlightPlanner.Util.FlightLog()
  var log_panel = new FlightPlanner.View.LogPanel(logger)
  $('#control-container').after(log_panel.getPanel())

  var plan = new FlightPlanner.Model.FlightPlan(player, name, stat, launch_time).scheduleLaunchFromPlanet(
    duna,
    280,
    {
      throttle:         1,
      max_accel:        0.2,
      fuel_consumption: 0.19,
      initial_angle:    Math.PI / 2,
      heading:          0,
      absolute_heading: false,
      target:           kerbin,
      clockwise_orbit:  true
    }
  )

  function addShipRenderer(ship) {
    var ship_r  = new FlightPlanner.View.PlanetRenderer(ships, ship, '#FFFFFF', 2),
        ship_cr = new FlightPlanner.View.ConicRenderer($('#flightpaths')[0], ship)
    player.renderer.registerRenderer(ship_r)
    player.renderer.registerRenderer(ship_cr)
    plan.unobserve('after:blastOff', addShipRenderer)
  }

  plan.observe('after:blastOff', addShipRenderer)
  plan.observe('after:blastOff', function(ship, t) {
    logger.logShipTelemetry(ship, t, 'Blast off')
    followShipAndTarget(ship, kerbin, player, t)
  })

  var aim_for_kerbin = plan.addSOIChangeManeuver(kerbol, -1.38, true, 1).done(function(status_tracker, ship, t) {
    var msg = 'Left Duna SOI; aiming to where Kerbin is going to be.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })

  aim_for_kerbin.done(function() {
    plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gt(1.76e5) }, Math.PI / 2, true, 1).done(function(status_tracker, ship, t) {
      var msg = 'Halfway point. Beginning deceleration.'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)

      var circularize_before_kerbin_intercept = plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gt(3.3e5) }, kerbin.getCartesianPrograde(t).minus(0.3), true, 1).done(function(status_tracker, ship, t) {
        var msg = 'Attempting to match speed with Kerbin.'
        logger.logShipTelemetry(ship, t, msg)
        status_tracker.setMessage(msg)

        var catch_up_with_kerbin = plan.addSOIChangeManeuver(kerbin, -Math.PI, false, 1).done(function(status_tracker, ship, t) {
          var msg = 'Entered Kerbin\'s SOI. Attempting capture.'
          logger.logShipTelemetry(ship, t, msg)
          status_tracker.setMessage(msg)

          var complete_capture = plan.addManeuver(function(t, ship) { var ap = ship.getApoapsis(); return ap.gt(0) && ap.lt(kerbin.getSOI()) }, 0, false, 0).done(function(status_tracker, ship, t) {
            var msg = 'Capture complete'
            logger.logShipTelemetry(ship, t, msg)
            status_tracker.setMessage(msg)
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
  $('#reset').on(      'click', function() { player.execute('reset') })
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
