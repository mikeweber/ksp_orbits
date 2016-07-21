/* globals FlightPlanner Decimal jQuery */

function DunaMission(player, launch_time) {
    'use strict'

  // A launch from low Kerbin orbit (125km, starting at 0º cartesian angle)
  // will lead to an escape 123.23º counter clockwise from where the maneuver begins.
  // The ship's velocity will be 6440m/s (relative to Kerbin) and have a cartesian
  // prograde of 125.61º.
  // Note: the ship will be 112º from starting point when passing the Mün, and 121º
  // when passing Minmus
  // Time from low orbit to SOI escape: 27731s (1d 1:42:11)
  //
  // Ship parameters when captured at (MET 26527999/t+372640/17 days 1:30):
  //   velocity: 588.9719
  //   pos:
  //     phi: -0.79293
  //     r:    1336449.8949
  //   cartesian prograde: 1.619217
  //
  //   (ap: 5290.328km, pe: 499.707km

  // for Duna Intercept
  var low_orbit_time = launch_time - 27731

  var duna_mission = runDunaIntercept(player, 'Duna Mission', launch_time, jQuery)

  function runDunaIntercept(player, name, launch_time, $) {
    var stat = new FlightPlanner.View.FlightStatus(player.sim, 1, 'Launching from Kerbin'),
        duna = player.sim.getBody('Duna'),
        kerbin = player.sim.getBody('Kerbin')
    $('#status').append(stat.getPanel())

    var logger = new FlightPlanner.Util.FlightLog()
    var log_panel = new FlightPlanner.View.LogPanel(logger)
    $('#control-container').after(log_panel.getPanel())
    var plan = new FlightPlanner.Model.FlightPlan(player, name, stat, launch_time)
    placeShipAtEdgeOfSOI(plan, 12, launch_time)

    function placeShipAtEdgeOfSOI(flight_plan, maneuver_start_angle) {
      flight_plan.placeShip(
        kerbin,
        6440,
        { phi: (maneuver_start_angle + 123.23) / 360 * Math.TAU, r: kerbin.getSOI() - 1 },
        (maneuver_start_angle + 125.61) / 360 * Math.TAU,
        {
          throttle:         1,
          max_accel:        0.25,
          fuel_consumption: 0.000325,
          heading:          0,
          absolute_heading: false,
          target:           player.sim.getBody('Duna')
        }
      )
    }

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
      ship.setLaunchTime(low_orbit_time)
      player.setCurrentMission(ship)
      FlightPlanner.Sim.followShipAndTarget(ship, player.sim.getBody('Duna'), player, t)
    })

    var aim_for_duna = plan.addSOIChangeManeuver(player.sim.getBody('Kerbol'), 0, false, 1).done(function(status_tracker, ship, t) {;
      var msg = 'Left Kerbin SOI; aiming to where Duna is going to be.'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)
    })

    aim_for_duna.done(function() {
      var start_of_decel
      var decelerate = plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gt(1.73e5) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
        start_of_decel = ship.getMissionTime(t)
        var msg = 'Decelerating on approach to Duna.'
        logger.logShipTelemetry(ship, t, msg)
        status_tracker.setMessage(msg)
      })

      var match_trajectory = decelerate.done(function(status_tracker, ship, t) {
        return plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gt(start_of_decel.plus(1.755e5)) }, Math.PI / 2, false, 1).done(function(status_tracker, ship, t) {
          var msg = 'Matching trajectory with Duna.'
          logger.logShipTelemetry(ship, t, msg)
          status_tracker.setMessage(msg)
        })
      })

      var enter_duna_soi = plan.addSOIChangeManeuver(duna, Math.PI, false, 1)

      enter_duna_soi.done(function() {
        plan.addManeuver(function(t, ship) { return ship.getEccentricity().lt(1) && ship.getPeriapsis(t).lt(2e6) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
          var msg = 'Lowering Periapsis'
          logger.logShipTelemetry(ship, t, msg)
          status_tracker.setMessage(msg)
        })
      })
    })

    var duna_intercept = plan.addSOIChangeManeuver(player.sim.getBody('Duna'), Math.PI, false, 1).done(function(status_tracker, ship, t) {
      var msg = 'Reached Duna\'s SOI. Lowering Apoapsis.'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)
    })

    duna_intercept.done(function(status_tracker, ship, t) {
      var duna_capture = plan.addManeuver(function(t, ship) {
        return ship.getApoapsis().gt(0) && ship.getPeriapsis().lt(1e7)
      }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
        var msg = 'Lowering Periapsis'
        logger.logShipTelemetry(ship, t, msg)
        status_tracker.setMessage(msg)
      })

      duna_capture.done(function(status_tracker, ship, t) {
        var duna_lower_pe = plan.addManeuver(function(t, ship) { return ship.getPeriapsis().lt(5e5) }, 0, false, 0)
        var duna_circularize = duna_lower_pe.done(function(status_tracker, ship, t) {
          var time_of_pe  = t.plus(ship.timeToPeriapsis().minus(300)),
              arg_of_pe   = ship.getArgumentOfPeriapsis(t),
              angle_fn

          if (ship.orbitIsClockwise()) {
            angle_fn = 'plus'
          } else {
            angle_fn = 'minus'
          }
          var angle_of_pe = arg_of_pe[angle_fn](Math.TAU / 4)

          var msg = 'Coasting to Periapsis until ' + time_of_pe + 's.'
          logger.logShipTelemetry(ship, t, msg)
          status_tracker.setMessage(msg)

          plan.addManeuver(function(t, ship) { return t.gt(time_of_pe) }, angle_of_pe, false, 1).done(function(status_tracker, ship, t) {
            var msg = 'Circularizing orbit.'
            logger.logShipTelemetry(ship, t, msg)
            status_tracker.setMessage(msg)

            plan.addManeuver(function(t, ship) { return ship.getApoapsis(t).lt(6e5) }, 0, false, 0).done(function(status_tracker, ship, t) {
              var msg = 'Mission complete.'
              logger.logShipTelemetry(ship, t, msg)
              status_tracker.setMessage(msg)
            })
          })
        })
      })
    })

    return plan.ship
  }
}
