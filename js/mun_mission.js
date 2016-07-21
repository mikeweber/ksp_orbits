/* globals FlightPlanner Decimal jQuery */

function MunMission(player, launch_time) {
  var mun_mission = runMunIntercept(player, 'Mün Mission', launch_time, jQuery)

  function runMunIntercept(player, name, launch_time, $) {
    'use strict'

    var stat = new FlightPlanner.View.FlightStatus(player.sim, 1, 'Launching from Kerbin'),
        mun = player.sim.getBody('Mün'),
        kerbin = player.sim.getBody('Kerbin'),
        kerbol = player.sim.getBody('Kerbol')
    $('#status').append(stat.getPanel())

    var logger = new FlightPlanner.Util.FlightLog()
    var log_panel = new FlightPlanner.View.LogPanel(logger)
    $('#control-container').after(log_panel.getPanel())

    var expected_phase = 78.14
    var mun_angle = mun.getPositionAtTime(launch_time).phi / Math.TAU * 360
    var begin_maneuver_angle = (mun_angle - expected_phase) / 360 * Math.TAU
    var plan = new FlightPlanner.Model.FlightPlan(player, name, stat, launch_time).scheduleLaunchFromPlanet(
      kerbin,
      125,
      {
        throttle:         1,
        max_accel:        0.25,
        fuel_consumption: 0.000325,
        initial_angle:    begin_maneuver_angle,
        heading:          0,
        absolute_heading: false,
        target:           mun,
        skip_tracking:    true
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
      var init_angle = ship.getCartesianAngleFromBody(t, kerbin)
      var before_soi_fn = function(ship, new_body, t) {
        var roundTo   = FlightPlanner.Helper.Helper.roundTo,
            clamp     = FlightPlanner.Helper.Helper.clampRadians,
            toDegrees = FlightPlanner.Helper.Helper.radianToDegrees

        var phase_angle            = clamp(init_angle.minus(ship.getCartesianAngleFromBody(t, kerbin)))
        var phase_angle_in_degrees = roundTo(toDegrees(phase_angle), 2)
        var prograde               = roundTo(toDegrees(ship.getCartesianPrograde()), 2)
        var msg                    = 'Left Kerbin\'s SOI. Phase angle of Maneuver start to SOI escape: ' + phase_angle_in_degrees + 'º. Velocity: ' + roundTo(ship.getVelocity(t), 1) + 'm/s. Cartesian Prograde: ' + prograde + 'º.'
        logger.logShipTelemetry(ship, t, msg)
        stat.setMessage(msg)

        ship.unobserve('before:soiChange', before_soi_fn)
      }
      ship.observe('before:soiChange', before_soi_fn)
      logger.logShipTelemetry(ship, t, 'Blast off (initial phase angle: ' + FlightPlanner.Helper.Helper.roundTo(FlightPlanner.Helper.Helper.radianToDegrees(ship.getPhaseAngle(ship.getTarget(), t)), 2) + 'º)')
      FlightPlanner.Sim.followShipAndTarget(ship, mun, player, t)
    })

    var aim_for_mun = plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).gt(8350) }, Math.PI, false, 1).done(function(status_tracker, ship, t) {
      var msg = 'Halfway point. Begin deceleration.'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)
    })

    var hit_mun = plan.addSOIChangeManeuver(mun, Math.PI, false, 1).done(function(status_tracker, ship, t) {
      var msg = 'Entered Mün\'s SOI'
      logger.logShipTelemetry(ship, t, msg)
      status_tracker.setMessage(msg)

      var getCaptured = plan.addManeuver(function(t, ship) { return ship.getApoapsis().gt(0) && ship.getPeriapsis().lt(2.5e5) }, 0, false, 0).done(function(status_tracker, ship, t) {
        msg = 'captured'
        logger.logShipTelemetry(ship, t, msg)
        status_tracker.setMessage(msg)

        player.sim.togglePaused()
      })
    })
  }
}
