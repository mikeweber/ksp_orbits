/* globals FlightPlanner Decimal jQuery */

// for Duna Intercept
var launch_time = 3 * DAY + 4 * HOUR
var start_time = launch_time - 1

var player = FlightPlanner.Sim.initUniverse(start_time)
player.zoomTo(new Decimal(1500))
player.run()
FlightPlanner.Sim.addListeners(player)
var mun_mission = runMunIntercept(player, 'Mün Mission', launch_time, jQuery)

function runMunIntercept(player, name, launch_time, $) {
  'use strict'

  // ship position with launch phase angle of -31.8 and about face as 6290 --  (Kerbin, 50, 2119.2626792253828821, { r: 6816444.2806136252258, phi: -2.66610616214890326 }, 0.20829248466088174, 3.7685509195579044, false)
  var initial_angle = 30.5 // 32 hits mun dead on
  var turn_around_time = 6270
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
      // testing at point where phase angle is 74.79 degrees less than the initial angle
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

  var turn_around = plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gt(turn_around_time) }, Math.PI, false, 0).done(function(status_tracker, ship, t) {
    var msg = 'Halfway point. Turning ship around.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })
  
  var aim_for_mun = plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gt(turn_around_time + 60) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
    var msg = 'Decelerating.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })
  
  var log_position_before_soi_change = plan.addManeuver(function(t, ship) { return ship.pos.r.gt(9.5e6) } , Math.PI, false, 1).done(function(status_tracker, ship, t) {
    var msg = 'Logging position.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)
  })

  var hit_mun = plan.addSOIChangeManeuver(mun, Math.PI, false, 1).done(function(status_tracker, ship, t) {
    var msg = 'Entered Mün\'s SOI.'
    logger.logShipTelemetry(ship, t, msg)
    status_tracker.setMessage(msg)

    var getCaptured = plan.addManeuver(function(t, ship) { return ship.getApoapsis().gt(0) && ship.getApoapsis().lt(2.0e6) && ship.getPeriapsis().lt(3.0e5) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
      msg = 'captured'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)

      player.sim.togglePaused()
    })
  })
}
