/* globals FlightPlanner jQuery */

/*
 * Phase angle change from 125k orbit to leaving Duna SOI: 1.58427663414979
 * Heading: 1.60048989311702
 * Exit velocity: 6029.8377
 * Time: 15271.88
 */
function ExitDunaSOI(player, launch_time) {
  'use strict'

  leaveSOI(player, 'Kermes', launch_time, jQuery)

  function leaveSOI(player, name, launch_time, $) {
    var stat        = new FlightPlanner.View.FlightStatus(player.sim, 1, 'Launching from Kerbin'),
        duna        = player.sim.getBody('Duna'),
        logger      = new FlightPlanner.Util.FlightLog(),
        telem       = new FlightPlanner.Util.FlightLog(),
        log_panel   = new FlightPlanner.View.LogPanel(logger),
        telem_panel = new FlightPlanner.View.LogPanel(telem),
        plan        = new FlightPlanner.Model.FlightPlan(player, name, stat, launch_time)

    $('#status').append(stat.getPanel())
    $('#control-container').after(log_panel.getPanel())
    $('#control-container').after(telem_panel.getPanel())

    plan.placeShip(
      duna,
      822.98,
      { phi: Math.PI / 2, r: duna.radius.plus(125000) },
      Math.PI,
      {
        throttle:         1,
        max_thrust:       49420,
        mass:             110000,
        fuel_consumption: 0.000325,
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
      telem.execute('log_append', 'mode, t+, pe, ap, velocity, prograde, angle, altitude')
      plan.addObserver(function(current) {
        if (current.lt(lastTelem.plus(5))) return
        lastTelem = current
        telem.execute('log_append', 'exit, ' + current.round() + ', ' + ship.getPeriapsis(current) + ', ' + ship.getApoapsis(current) + ', ' + ship.getVelocity() + ', ' + ship.getCartesianPrograde() + ', ' + ship.getAngle(duna, t).times(180).dividedBy(Math.PI) + ', ' + ship.pos.r)
      })

      plan.addObserver('before:soiChange', function(ship, new_body, t) {
        var msg = 'Mission complete. Left Duna SOI.'
        logger.logShipTelemetry(ship, t, msg)
        player.togglePaused()
      })
    })
  }
}

