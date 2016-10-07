/* globals FlightPlanner Decimal jQuery */

// for Duna Intercept
var launch_time = 3 * DAY + 4 * HOUR + 5 * MIN + 30
var start_time = launch_time - 1

var player = FlightPlanner.Sim.initUniverse(start_time)
player.zoomTo(new Decimal(1500))
player.run()
FlightPlanner.Sim.addListeners(player)
var mun_mission = runMunIntercept(player, 'Mün Mission', launch_time, jQuery)

function runMunIntercept(player, name, launch_time, $) {
  'use strict'

  var initial_angle = 31.4
  var turn_around_time = 6273
  // 85400.1 (t+6200): Mün Mission - (Kerbin, 50, 2097.0692117476370058, { r: 6527565.074370169754, phi: -2.67276385110575904 }, 0.18159158606929396, 0.6176410486172988, false) -- initial_angle: 30.55
  var stat = new FlightPlanner.View.FlightStatus(player.sim, 1, 'Launching from Kerbin'),
      mun = player.sim.getBody('Mün'),
      kerbin = player.sim.getBody('Kerbin')
  $('#status').append(stat.getPanel())

  var logger = new FlightPlanner.Util.FlightLog()
  var log_panel = new FlightPlanner.View.LogPanel(logger)
  $('#control-container').after(log_panel.getPanel())

  var plan = new FlightPlanner.Model.FlightPlan(player, name, stat, launch_time).scheduleLaunchFromPlanet(
    kerbin,
    125,
    {
      throttle:         1,
      max_accel:        49420 / 134780,
      fuel_consumption: 0.000325,
      initial_angle:    initial_angle / 360 * Math.TAU,
      heading:          0,
      absolute_heading: false,
      target:           mun
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
    logger.logShipTelemetry(ship, t, 'Blast off (initial phase angle: ' + FlightPlanner.Helper.Helper.roundTo(FlightPlanner.Helper.Helper.radianToDegrees(ship.getPhaseAngle(ship.getTarget(), t)), 2) + 'º)')
    FlightPlanner.Sim.followShipAndTarget(ship, mun, player, t)
  })

  var log_location = plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gte(6200) }, 0, false, 1).done(function(status_tracker, ship, t) {
    var msg = 'Logging location.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })

  var turn_around = plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gte(turn_around_time) }, Math.PI, false, 0).done(function(status_tracker, ship, t) {
    var msg = 'Halfway point. Turning ship around.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })

  var aim_for_mun = plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gte(turn_around_time + 60) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
    var msg = 'Decelerating.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })

  var hit_mun = plan.addSOIChangeManeuver(mun, Math.PI, false, 1).done(function(status_tracker, ship, t) {
    var msg = 'Entered Mün\'s SOI'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)

    var getCaptured = plan.addManeuver(function(t, ship) { return ship.getApoapsis().gt(0) && ship.getApoapsis().lt(2.0e6) && (ship.getPeriapsis().lt(3.0e5) || ship.getEccentricity().lt(0.02)) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
      msg = 'captured'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)

      player.sim.togglePaused()
    })
  })
}
