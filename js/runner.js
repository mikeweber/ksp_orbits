/* globals FlightPlanner Decimal jQuery */

var start_time = 0
// for Duna Intercept
var launch_time = 6.0e6
start_time = launch_time - 100

var player = initUniverse()
player.zoomTo(new Decimal(200))
player.run()
addListeners(jQuery, player)
runDunaIntercept(player, 'Duna Mission', launch_time, jQuery)

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

function initUniverse() {
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
      sim       = new FlightPlanner.Controller.Simulator(start_time, system, 64),
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
    var msg = 'Reached Duna\'s SOI.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })

  duna_intercept.done(function(status_tracker, ship, t) {
    var duna_circularization = plan.addManeuver(function(t, ship) {
      var e = ship.getEccentricity()
      return e.gt(0) && e.lt(1) && ship.getApoapsis().lt(ship.getParent().getSOI())
    }, 0, false, 0).done(function(status_tracker, ship, t) {
      var msg = 'Duna SOI capture complete. Coasting to Apoapsis.'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)

      var time_of_ap = t.plus(ship.timeToApoapsis(t))
      var duna_coast_to_ap = plan.addManeuver(function(t, ship) { return t.gte(time_of_ap) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
        msg = 'At Apoapsis. Lowering Periapsis.'
        logger.logShipTelemetry(ship, t, msg)
        status_tracker.setMessage(msg)

        var duna_orbit_lowered = plan.addManeuver(function(t, ship) { return ship.getPeriapsis().lt(500000) }, 0, false, 0).done(function(status_tracker, ship, t) {
          msg = 'Lowered Periapsis. Coasting to Periapsis.'
          logger.logShipTelemetry(ship, t, msg)
          status_tracker.setMessage(msg)

          var slowing_sim = plan.addManeuver(function(t, ship) { return ship.getDistanceFromParent().lt(1.0e6) }, 0, false, 0).done(function(status_tracker, ship, t) {
            player.sim.setTickSize(1)
            msg = 'Approaching Duna; Slowing simulation for better accuracy.'
            logger.logShipTelemetry(ship, t, msg)
            status_tracker.setMessage(msg)

            var time_of_pe = ship.timeToPeriapsis(t)
            var lower_apoapsis = plan.addManeuver(function(t, ship) { return t.gte(time_of_pe) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
              msg = 'At Periapsis. Circularizing orbit.'
              logger.logShipTelemetry(ship, t, msg)
              status_tracker.setMessage(msg)

              var starting_pe = ship.getPeriapsis()
              var lowered_apoapsis = plan.addManeuver(function(t, ship) { return ship.getApoapsis().lte(starting_pe.plus(10000)) }, 0, false, 0).done(function(status_tracker, ship, t) {
                msg = 'Apoapsis lowered.'
                logger.logShipTelemetry(ship, t, msg)
                status_tracker.setMessage(msg)
              })
            })
          })
        })
      })
    })
  })


  /*
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(2.03e5) }, Math.PI, false, 1).done(function(status_tracker) {
    status_tracker.setMessage('Decelerating on approach to Duna')
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(3.9e5) }, 0, true, 1).done(function(status_tracker, ship) {
    ship.setHeading(player.sim.getBody('Duna').getCartesianPrograde(player.sim.t).plus(Math.PI * 0.45), true)
    status_tracker.setMessage('Matching velocity and vector with planet')
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(4.2e5) }, 0, false, 0).done(function(status_tracker) {
    status_tracker.setMessage('Waiting for intercept...')
  })
  plan.addSOIChangeManeuver(player.sim.getBody('Kerbol'), Math.PI * 0.727, true, 1).done(function(status_tracker) {
    status_tracker.setMessage('Left Kerbin SOI; setting course')
  })
  plan.addSOIChangeManeuver(player.sim.getBody('Duna'), Math.PI, false, 1).done(function(status_tracker, ship, t) {
    var i, soi_change_time = t, orig_tick_size = player.sim.getTickSize()
    status_tracker.setMessage('Near destination; Reverse thrusters full in attempt to get captured')

    plan.addManeuver(function(t, ship) { var e = ship.getEccentricity(); return e > 0 && e < 1 }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
      status_tracker.setMessage('Elliptical orbit achieved. Slowing simulation for better accuracy')
      player.sim.setTickSize(1)

      plan.addManeuver(function(t, ship) { var pe = ship.getPeriapsis(); return pe.gt(0) && pe.lt(4.4e6) }, 0, false, 0).done(function(status_tracker) {
        status_tracker.setMessage('First capture complete; Waiting for periapsis')
        player.sim.setTickSize(orig_tick_size)
        var time_of_pe = t.plus(ship.getOrbitalPeriod().times((1 - (ship.getMeanAnomaly(t).plus(Math.PI)) / (2 * Math.PI)) % 1))

        plan.addManeuver(function(t, ship) { return time_of_pe.lt(t.plus(player.sim.getTickSize())) }, -Math.PI, false, 1).done(function(status_tracker) {
          var orig_tick_size = player.sim.getTickSize()
          player.sim.setTickSize(1)
          status_tracker.setMessage('Slowing sim; waiting for periapsis.')

          plan.addManeuver(function(t, ship) { return time_of_pe.lt(t) }, -Math.PI, false, 1).done(function(status_tracker) {
            status_tracker.setMessage('Lowering orbit again')

            plan.addManeuver(function(t, ship) { return ship.getPeriapsis().lt(500000) }, 0, false, 0).done(function(status_tracker) {
              var time_of_pe2 = t.plus(ship.getOrbitalPeriod().times((2 * Math.PI - ship.getClampedMeanAnomaly(t)) / (2 * Math.PI)))
              status_tracker.setMessage('Second step of capture complete; Waiting for periapsis.')
              player.sim.setTickSize(orig_tick_size)
              plan.addManeuver(function(t, ship) { return time_of_pe2.lt(t.plus(player.sim.getTickSize())) }, Math.PI, false, 1).done(function(status_tracker) {
                var orig_tick_size2 = player.sim.getTickSize()
                player.sim.setTickSize(1)
                status_tracker.setMessage('Slowing sim; waiting for periapsis.')

                plan.addManeuver(function(t, ship) { return time_of_pe2.lt(t) }, Math.PI, false, 1).done(function(status_tracker) {
                  status_tracker.setMessage('Final parking orbit maneuver.')
                  plan.addManeuver(function(t, ship) { return ship.getPeriapsis().lt(500000) }, 0, false, 0).done(function(status_tracker) {
                    player.sim.setTickSize(orig_tick_size)
                    status_tracker.setMessage('Parking orbit reached on ' + player.sim.getKerbalDate() + '. (t+ ' + t + ')')
                  })
                })
              })
            })
          })
        })
      })
    })
  })
  */
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
