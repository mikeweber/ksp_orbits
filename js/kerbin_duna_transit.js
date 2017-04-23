/* globals FlightPlanner jQuery */

/*
 * Phase angle change from 125k orbit to leaving Kerbin SOI: (ksp: 111.18366324 - 108.60951838 = 2.57414486, sim: 0.04179283)
 * Heading (starting Math.PI / 2): (ksp: 1.98497157, sim: 0.09138781)
 * Exit velocity: 7985.1164 // from KSP
 * Time: 21920 // from KSP
 *
 * Mass of Kermes before leaving SOI: 134781 // from KSP
 * Mass of Kermes after leaving SOI:  125574 // from KSP
 * Mass delta:                          9207
 */
function KerbinDunaTransit(player, launch_time, initial_angle) {
  'use strict'

  transit(player, 'Kermes', launch_time, initial_angle, jQuery)

  function transit(player, name, launch_time, initial_angle, $) {
    var init_mission_time = launch_time + 21290
    var stat        = new FlightPlanner.View.FlightStatus(player.sim, 1, 'Left Kerbin SOI'),
        kerbin      = player.sim.getBody('Kerbin'),
        duna        = player.sim.getBody('Kerbin'),
        logger      = new FlightPlanner.Util.FlightLog(),
        telem       = new FlightPlanner.Util.FlightLog(),
        log_panel   = new FlightPlanner.View.LogPanel(logger),
        telem_panel = new FlightPlanner.View.LogPanel(telem),
        plan        = new FlightPlanner.Model.FlightPlan(player, name, stat, init_mission_time),
        soi         = 84153276,
        angle_delta = 3.25184 / 180 * Math.PI,
        prograde_delta = 0.09138 // 5.336 degrees
    player.sim.setTime(init_mission_time)

    $('#status').append(stat.getPanel())
    $('#control-container').after(log_panel.getPanel())
    $('#control-container').after(telem_panel.getPanel())

    plan.placeShip(
      kerbin,
      7985.1164,
      { phi: initial_angle + angle_delta, r: kerbin.radius.plus(soi) },
      initial_angle + prograde_delta,
      {
        throttle:         1,
        max_thrust:       49420,
        mass:             125574,
        fuel_consumption: 4.20046535, // units/second
        heading:          0,
        absolute_heading: false
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
      player.setCurrentMission(ship)
    })

    plan.observe('before:blastOff', function(ship, t) {
      var lastTelem = new Decimal(-5)
      telem.execute('log_append', 'mode, t+, pe, ap, velocity, prograde, altitude')
      plan.addObserver(function(current) {
        if (current.lt(lastTelem.plus(5))) return
        lastTelem = current
        telem.execute('log_append', 'exit, ' + current.round() + ', ' + ship.getPeriapsis(current) + ', ' + ship.getApoapsis(current) + ', ' + ship.getVelocity() + ', ' + ship.getCartesianPrograde() + ', ' + ship.getAngle(kerbin, t).times(180).dividedBy(Math.PI) + ', ' + ship.pos.r)
      })

    })
  }
}

